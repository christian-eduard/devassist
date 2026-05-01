const fs = require('fs');
const path = require('path');
const os = require('os');
const logger = require('./logger');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

const { loadConfig } = require('./config');
const { getBestFreeModel } = require('./ai_pool');
const ai = require('../services/ai_rotator');

let dbInstance = null; // Almacén dinámico para la instancia de DB


/**
 * Genera un vector (embedding) para una ficha de conocimiento.
 * Resume el título, transcripción, TL;DR y Tech Stack.
 */
async function generateFichaEmbedding(ficha) {
    try {
        const metadata = ficha.data || ficha.metadata || {};
        const stack = (metadata.tech_stack || []).join(', ');
        const keyPoints = (metadata.key_points || []).join('. ');
        
        const contextText = `
            Título: ${ficha.title || ficha.titulo}
            Categoría: ${metadata.categoria || ''} (${metadata.content_type || ''})
            Stack: ${stack}
            Conceptos Clave: ${keyPoints}
            Resumen: ${metadata.tl_dr || metadata.resumen || ''}
            Contenido: ${ficha.transcripcion || ''}
            Investigación: ${ficha.investigacion_profunda || ''}
        `.trim();

        logger.info(`[Fichas:Embedding] Generando vector para: ${ficha.title || ficha.id}`);
        const vector = await ai.generateEmbedding(contextText);
        return vector;
    } catch (err) {
        logger.error(`[Fichas:Embedding] Error: ${err.message}`);
        return null;
    }
}

const extractJSON = (text) => {
    if (!text) return null;
    try {
        const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        // Buscar el inicio y fin de una estructura JSON { } o [ ]
        const firstBrace = cleanText.indexOf('{');
        const lastBrace = cleanText.lastIndexOf('}');
        
        const firstBracket = cleanText.indexOf('[');
        const lastBracket = cleanText.lastIndexOf(']');

        // Determinar qué estructura parece más completa/probable
        let start = -1;
        let end = -1;

        if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
            start = firstBrace;
            end = lastBrace;
        } else if (firstBracket !== -1) {
            start = firstBracket;
            end = lastBracket;
        }

        if (start !== -1 && end !== -1 && end > start) {
            const jsonPart = cleanText.substring(start, end + 1);
            return JSON.parse(jsonPart);
        }
        
        // Si no hay brackets pero el texto parece JSON literal
        if (cleanText.startsWith('{') || cleanText.startsWith('[')) {
            return JSON.parse(cleanText);
        }

        return null; // NO LANZAR ERROR AQUÍ, dejar que el llamador decida
    } catch (e) {
        logger.error('[JSON:Extract] Error parsing:', e.message);
        return null;
    }
};

function loadFichas() {
    return dbInstance ? dbInstance.getFichas() : [];
}

function saveFichas(fichas) {
    if (!dbInstance) return;
    fichas.forEach(f => dbInstance.saveFicha(f));
}

// ── Proyectos de Chris (para matching) ──────────────────────
// Nota: Se ha eliminado la lista estática PROYECTOS_CHRIS. 
// Ahora se utilizan los proyectos reales cargados desde proyectos.json para el matching y el contexto.

// ── Llamada a Groq API (para investigación profunda) ────────
async function callGroq(apiKey, prompt, model = 'llama-3.3-70b-versatile') {
    const https = require('https');
    const url = 'https://api.groq.com/openai/v1/chat/completions';

    const body = JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2
    });

    return new Promise((resolve, reject) => {
        const req = https.request(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'Content-Length': Buffer.byteLength(body)
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    const text = parsed?.choices?.[0]?.message?.content;
                    if (!text) reject(new Error('Groq sin respuesta: ' + JSON.stringify(parsed?.error || parsed).substring(0, 200)));
                    else resolve(text);
                } catch (e) { reject(new Error('Parse error Groq: ' + e.message)); }
            });
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

// ── Llamada a OpenRouter (para modelos de ultra-razonamiento) ──
async function callOpenRouter(apiKey, prompt, model = 'google/gemini-flash-1.5') {
    const https = require('https');
    const url = 'https://openrouter.ai/api/v1/chat/completions';

    const body = JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2
    });

    return new Promise((resolve, reject) => {
        const req = https.request(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': 'https://github.com/Chris-v-o/DevAssist',
                'X-Title': 'DevAssist',
                'Content-Length': Buffer.byteLength(body)
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    const text = parsed?.choices?.[0]?.message?.content;
                    if (!text) reject(new Error('OpenRouter sin respuesta: ' + JSON.stringify(parsed?.error || parsed).substring(0, 200)));
                    else resolve(text);
                } catch (e) { reject(new Error('Parse error OpenRouter: ' + e.message)); }
            });
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

// ── Motor de Inteligencia Distribuida (Priorización de IAs) ──
// Orden: 1. Gemini 1.5 Pro → 2. Groq (Llama 3.3 70B) → 3. OpenRouter (DeepSeek R1)
async function callIntelligentAI(config, prompt, onProgress = null) {
    return await callAI('vault-research', config, prompt, null, onProgress);
}

// ── Búsqueda web vía DuckDuckGo ──────────────────────────────
async function callGemini(apiKey, prompt, audioBase64 = null, mimeType = 'audio/mp3', model = 'gemini-1.5-flash') {
    const https = require('https');
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const parts = [];
    if (audioBase64) {
        parts.push({ inlineData: { mimeType, data: audioBase64 } });
    }
    parts.push({ text: prompt });

    const body = JSON.stringify({
        contents: [{ parts }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 4096 }
    });

    return new Promise((resolve, reject) => {
        const reqUrl = new URL(url);
        const req = https.request({
            hostname: reqUrl.hostname,
            path: reqUrl.pathname + reqUrl.search,
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (!text) reject(new Error('Gemini sin respuesta/error: ' + JSON.stringify(parsed?.error || parsed).substring(0, 200)));
                    else resolve(text);
                } catch (e) { 
                    reject(new Error('Respuesta no-JSON de Gemini (posible error 429/500): ' + data.substring(0, 100))); 
                }
            });
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}
// ── Transcripción con Groq Whisper (Protocolo de contingencia) ──
async function callGroqWhisper(apiKey, audioBuffer, model = 'whisper-large-v3') {
    const https = require('https');
    
    // Boundary manual para evitar dependencias externas en tiempo real si falla
    const boundary = '----DevAssistBoundary' + Math.random().toString(16).substring(2);
    const audioFileName = 'audio.mp3';
    
    const postData = Buffer.concat([
        Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\n${model}\r\n`),
        Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${audioFileName}"\r\nContent-Type: audio/mpeg\r\n\r\n`),
        audioBuffer,
        Buffer.from(`\r\n--${boundary}--\r\n`)
    ]);

    return new Promise((resolve, reject) => {
        const req = https.request('https://api.groq.com/openai/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
                'Content-Length': postData.length
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.text) resolve(parsed.text);
                    else reject(new Error('Whisper sin texto: ' + JSON.stringify(parsed)));
                } catch (e) { reject(new Error('Parse error Whisper: ' + e.message)); }
            });
        });
        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

// ── Llamada a OpenAI (Protocolo de contingencia) ──
async function callOpenAI(apiKey, prompt, model = 'gpt-4o-mini') {
    const https = require('https');
    const url = 'https://api.openai.com/v1/chat/completions';

    const body = JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2
    });

    return new Promise((resolve, reject) => {
        const req = https.request(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'Content-Length': Buffer.byteLength(body)
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    const text = parsed?.choices?.[0]?.message?.content;
                    if (!text) reject(new Error('OpenAI sin respuesta: ' + JSON.stringify(parsed?.error || parsed).substring(0, 200)));
                    else resolve(text);
                } catch (e) { reject(new Error('Parse error OpenAI: ' + e.message)); }
            });
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

/**
 * Motor Inteligente de DevAssist (Fase 17 - Unificado)
 * Delega en AIRotator para resiliencia, Free-Ride y fallbacks.
 */
async function callAI(taskId, config, prompt, audioBase64 = null, onProgress = null) {
    const assignments = config.aiAssignments?.[taskId] || { provider: 'gemini', model: 'gemini-1.5-flash' };
    
    try {
        // --- CASO ESPECIAL: TRANSCRIPCIÓN DE AUDIO ---
        if (taskId === 'vault-transcribe' && audioBase64) {
            const provider = assignments.provider;
            if (provider === 'groq' || provider === 'openai') {
                const apiKey = config.apiKeys?.[provider];
                if (apiKey) {
                    if (onProgress) onProgress(`🎙️ Usando Whisper (${provider.toUpperCase()}) para transcripción...`);
                    const audioBuffer = Buffer.from(audioBase64, 'base64');
                    return provider === 'groq' ? await callGroqWhisper(apiKey, audioBuffer) : await callOpenAI(apiKey, `Transcribe: ${prompt}`);
                }
            }
        }

        // --- CASO GENERAL: GENERACIÓN DE TEXTO CON ROTACIÓN RESILIENTE ---
        return await ai.complete(prompt, {
            taskId,
            model: assignments.model,
            providers: [assignments.provider, 'gemini', 'openrouter', 'groq', 'openai'],
            audioBase64
        });

    } catch (err) {
        logger.error(`[AI:Task] Error en ${taskId}: ${err.message}`);
        throw err;
    }
}

// ── Búsqueda web vía DuckDuckGo ──────────────────────────────
async function buscarWeb(query) {
    const https = require('https');
    return new Promise((resolve) => {
        const encodedQuery = encodeURIComponent(query);
        const url = `https://api.duckduckgo.com/?q=${encodedQuery}&format=json&no_html=1&skip_disambig=1`;

        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    const results = [];
                    if (parsed.Abstract) {
                        results.push({ titulo: parsed.Heading || query, descripcion: parsed.Abstract, url: parsed.AbstractURL });
                    }
                    (parsed.RelatedTopics || []).slice(0, 3).forEach(t => {
                        if (t.Text && t.FirstURL) {
                            results.push({ titulo: t.Text.split(' - ')[0], descripcion: t.Text, url: t.FirstURL });
                        }
                    });
                    resolve(results.length > 0 ? results : [{ titulo: query, descripcion: 'Sin resultados directos', url: `https://duckduckgo.com/?q=${encodedQuery}` }]);
                } catch { resolve([{ titulo: query, descripcion: 'Error en búsqueda', url: `https://duckduckgo.com/?q=${encodedQuery}` }]); }
            });
        }).on('error', () => resolve([]));
    });
}

// ── Matching con proyectos REALES del usuario ──────────────────
function matchProyectos(transcripcion, herramientas, proyectosReales) {
    const textoLower = (transcripcion + ' ' + herramientas.map(h => h.nombre + ' ' + (h.descripcion || '')).join(' ')).toLowerCase();
    const matches = [];

    // Solo comparamos con los que el usuario ha cargado en la app
    for (const proyecto of proyectosReales) {
        // Usamos el nombre del proyecto como keyword básica + posibles keywords en la descripción
        const keywords = [proyecto.name.toLowerCase(), ...(proyecto.description || '').toLowerCase().split(' ').filter(w => w.length > 4)];
        const hits = keywords.filter(kw => textoLower.includes(kw));

        if (hits.length > 0) {
            matches.push({
                proyecto: proyecto.name,
                descripcionProyecto: proyecto.description || '',
                relevancia: hits.length,
                keywords: hits,
                sugerencia: null
            });
        }
    }
    return matches.sort((a, b) => b.relevancia - a.relevancia).slice(0, 3);
}

// ── Notificaciones de progreso (SOLO Telegram si está activado) ──
async function notifyChannel(message, channel = 'local') {
    if (channel === 'whatsapp' || channel === 'external') return; // Bloqueo total
    try {
        if (channel === 'telegram') {
            const target = 'tg:6541399577';
            await execAsync(
                `npx openclaw message send --channel ${channel} --target "${target}" --message "${message.replace(/"/g, '\\"')}"`,
                { timeout: 10000 }
            );
        }
    } catch (e) {
        logger.warn(`[Notify] No se pudo notificar por ${channel}: ${e.message}`);
    }
}

// ── Detección de URLs duplicadas ──
async function checkDuplicateUrl(url) {
    try {
        const nexus = require('../db_nexus');
        const result = await nexus.pool.query(
            "SELECT id, title, created_at, metadata->>'source_channel' as channel FROM fichas WHERE url_original = $1 LIMIT 1",
            [url]
        );
        if (result.rows.length > 0) {
            return result.rows[0];
        }
        return null;
    } catch (e) {
        logger.warn(`[Duplicate] Error checking: ${e.message}`);
        return null;
    }
}

// ── Registrar apertura de ficha ──
async function logFichaOpening(id) {
    try {
        const nexus = require('../db_nexus');
        const now = new Date().toISOString();
        await nexus.pool.query(
            'UPDATE fichas SET last_opened_at = $1 WHERE id = $2',
            [now, id]
        );
        logger.info(`[Fichas:Log] Ficha ${id} marcada como abierta a las ${now}`);
        return true;
    } catch (e) {
        logger.error(`[Fichas:Log] Error registrando apertura: ${e.message}`);
        return false;
    }
}

// ── Pipeline TikTok completo (7 etapas) ──────────────────────
async function processTikTokUrl(url, config, options = {}, _event = null) {
    const { onProgress = () => {}, channel = 'unknown' } = options;
    const videosDir = path.join(os.homedir(), '.devassist', 'videos');
    if (!fs.existsSync(videosDir)) fs.mkdirSync(videosDir, { recursive: true });
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tiktok-'));

    const sendProgress = (msg) => {
        if (options.onProgress) options.onProgress(msg);
        if (_event && _event.sender) _event.sender.send('fichas:process-progress', msg);
    };

    const videoId = Date.now(); // Movido al inicio para sincronización V15
    const safeUrl = (url || '').trim();
    if (!safeUrl.startsWith('http')) {
        throw new Error('La URL proporcionada no es válida. Debe empezar por http/https.');
    }

    // ── DETECCIÓN DE DUPLICADOS (Mensaje Extendido) ──
    const existing = await checkDuplicateUrl(safeUrl);
    if (existing) {
        const platform = existing.channel === 'whatsapp' ? 'WhatsApp' : 
                         existing.channel === 'telegram' ? 'Telegram' : 
                         'la aplicación (local)';
        const dateStr = new Date(existing.created_at).toLocaleString('es-ES', { 
            day: '2-digit', month: '2-digit', year: 'numeric', 
            hour: '2-digit', minute: '2-digit' 
        });
        
        const msg = `Este enlace ya fue procesado el ${dateStr} vía ${platform}. 
Título: "${existing.title}"`;
        
        sendProgress(msg);
        logger.info(`[TikTok] Duplicado detectado: ${existing.id} - ${existing.title} [${existing.channel}]`);
        return { duplicate: true, existingId: existing.id, existingTitle: existing.title, message: msg };
    }

    logger.info(`[TikTok] [v3-PROGRESS-ENGINE] Pipeline iniciado: ${safeUrl} (canal: ${channel})`);
    
    try {
        // ── ETAPA 1: Descarga y Medios (Async) ──
        sendProgress(`Etapa 1/4: Descargando medios...`);
        let titulo = 'Video TikTok';
        let autor = 'desconocido';
        try {
            const shellUrl = safeUrl.replace(/"/g, '\\"');
            const { stdout: meta } = await execAsync(
                `yt-dlp --no-cache-dir --rm-cache-dir --impersonate chrome --no-check-certificates --no-playlist --print "%(title)s|||%(uploader)s" "${shellUrl}"`,
                { timeout: 40000 }
            );
            const parts = meta.trim().split('|||');
            if (parts[0]) titulo = parts[0];
            if (parts[1]) autor = parts[1];
            logger.info(`[TikTok] Título extraído: "${titulo}" por ${autor}`);
            sendProgress(`Video: ${titulo}`);
        } catch (e) { 
            logger.warn(`[TikTok] Metadatos fallidos (usando genéricos): ${e.message}`); 
        }

        const videoPath = path.join(videosDir, `${videoId}.mp4`);
        const shellUrlDownload = safeUrl.replace(/"/g, '\\"');
        
        logger.info(`[TikTok] Descargando video en: ${videoPath}`);
        // RESTAURACIÓN V26: Formato H.264 restringido para máxima compatibilidad visual en Electron
        // Evitamos VP9/AV1 que causan pantalla negra en algunas versiones de Mac
        await execAsync(
            `yt-dlp --no-cache-dir --impersonate chrome --no-check-certificates -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]" -o "${videoPath}" --no-playlist --max-filesize 100m "${shellUrlDownload}"`,
            { timeout: 150000 }
        );

        if (!fs.existsSync(videoPath)) {
            logger.error(`[TikTok:ERROR] El video no se guardó en: ${videoPath}`);
            // Fallback: intentar descargar el mejor formato sin merge específico
            await execAsync(`yt-dlp --no-cache-dir --impersonate chrome -f "best" -o "${videoPath}" "${shellUrlDownload}"`, { timeout: 60000 });
        }

        // --- AISLAMIENTO V14: Rutas Únicas de Audio ---
        const audioPath = path.join(tmpDir, `audio_${videoId}.mp3`);
        logger.info(`[TikTok] Extrayendo audio en: ${audioPath}`);
        try {
            await execAsync(`ffmpeg -i "${videoPath}" -vn -ar 16000 -ac 1 -ab 64k "${audioPath}" -y`, { timeout: 60000 });
        } catch (e) {
            logger.warn(`[TikTok] FFmpeg falló, probando yt-dlp -x para audio...`);
            await execAsync(`yt-dlp --impersonate chrome -x --audio-format mp3 -o "${audioPath}" "${shellUrl}"`, { timeout: 60000 });
        }

        if (!fs.existsSync(audioPath)) throw new Error('No se pudo generar el archivo de audio para transcribir');
        const audioBuffer = fs.readFileSync(audioPath);
        logger.info(`[TikTok] Audio listo para transcribir. Tamaño: ${audioBuffer.length} bytes.`);

        // ── ETAPA 2: Transcripción de Pago (V20: Protocolo Inmortal / Golden Reset) ──
        sendProgress("Etapa 2/4: Transcribiendo contenido (Pro Motor)...");
        const base64Audio = audioBuffer.toString('base64');
        
        // Usamos el prompt exacto del backup para máxima fidelidad
        const transcripcion = await ai.complete(`Transcribe: ${url}`, { taskId: 'vault-transcribe', audio: base64Audio });
        if (!transcripcion) throw new Error('Transcripción fallida (Motor de Ingesta)');

        sendProgress("Etapa 3/4: Generación de Ficha Maestra...");
        // Restauración V20: Usar el prompt de extracción técnica que Chris ya tenía validado
        const fusedRaw = await ai.complete(`Eres un motor de extracción técnica ENTERPRISE. Chris necesita la ficha de conocimiento para esta transcripción.
        
        TRANSCRIPCIÓN REAL: ${transcripcion}
        
        REQUISITOS:
        1. Devuelve ÚNICAMENTE un objeto JSON válido.
        2. No incluyas explicaciones, saludos ni comentarios.
        3. Formato: { 
          "titulo": "...", 
          "tl_dr": "...", 
          "key_points": [], 
          "categoria": "...", 
          "urgency": 1-5,
          "obsolescence_score": 1-10,
          "confidence_score": 0-1,
          "herramientas": [{"nombre": "...", "descripcion": "..."}], 
          "tech_stack": [],
          "manual_uso": "...", 
          "puntos_exploracion": [{"tema": "...", "pregunta": "..."}] 
        }`, { taskId: 'vault-analyze' });
        
        const analisis = extractJSON(fusedRaw);
        if (!analisis) throw new Error('No se pudo extraer una ficha válida de la IA');

        // ── ETAPA 4: Parallel Branching (Web Research & Project Match) ──
        sendProgress("Etapa 4/4: Research profundo y Matching de proyectos...");
        const [herramientasConWeb, sugerenciasProyectos, investigacionProfunda] = await Promise.all([
            // Rama A: Enriquecimiento Web
            Promise.all((analisis.herramientas || []).map(async (h) => {
                try {
                    const web = await buscarWeb(`${h.nombre} official docs github`);
                    return { ...h, web_links: web.slice(0, 3) };
                } catch (err) {
                    logger.warn(`[Rama A] Error buscando web para ${h.nombre}:`, err.message);
                    return h;
                }
            })).catch(e => {
                logger.warn('[Rama A] Falló enriquecimiento completo:', e.message);
                return analisis.herramientas || [];
            }),
            // Rama B: Project Match
            (async () => {
                try {
                    const { loadProjects } = require('./projects');
                    const proyectos = await loadProjects();
                    if (!proyectos.length) return [];
                    const res = await ai.complete(`Analiza el video: ${transcripcion}. Proyectos disponibles de Chris: ${JSON.stringify(proyectos)}. 
                    Mapea el video a los proyectos relevantes. Devuelve SOLO JSON: { "matches": [{ "proyecto": "...", "relevancia": 0-100, "sugerencia": "..." }] }`, { taskId: 'vault-matcher' });
                    return extractJSON(res)?.matches || []; 
                } catch (err) {
                    logger.warn('[Rama B] Falló Project Match:', err.message);
                    return [];
                }
            })(),
            // Rama C: Deep Research Summary
            ai.complete(`Resumen técnico profundo de: ${transcripcion}`, { taskId: 'vault-research' }).catch(e => {
                logger.warn('[Rama C] Falló Deep Research:', e.message);
                return 'No se pudo generar investigación profunda (Error de IA o Cuota).';
            })
        ]);

        // ── ETAPA FINAL: Consolidación y PostgreSQL ──
        const fichaFinal = {
            id: `f_${videoId}`,
            title: analisis.titulo || titulo,
            timestamp: Date.now(),
            urlOriginal: url,
            transcripcion: transcripcion,
            videoPath: videoPath,
            videoName: `${videoId}.mp4`,
            data: {
                ...analisis,
                herramientas: herramientasConWeb,
                aplicaciones_proyectos: sugerenciasProyectos,
                investigacion_profunda: investigacionProfunda,
                autor,
                url_original: url,
                videoPath: videoPath,
                videoName: `${videoId}.mp4`,
                source_channel: channel,
                processed_at: new Date().toISOString()
            }
        };

        // --- LIMPIEZA V14: Borrar audio temporal ---
        try {
            if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
        } catch (e) {
            logger.warn(`[TikTok] No se pudo limpiar audio temporal: ${e.message}`);
        }

        // Auto-Vectorización RAG
        sendProgress("Etapa final: Sincronizando con motor semántico...");
        const embedding = await generateFichaEmbedding(fichaFinal);
        if (embedding) {
            fichaFinal.embedding = embedding;
            logger.info(`[RAG] Embedding generado con éxito para ficha ${fichaFinal.id}`);
        }


        await dbInstance.saveFicha(fichaFinal);
        logger.info('[TikTok] Ficha optimizada guardada con éxito.');
        return fichaFinal;
    } catch (err) {
        logger.error(`[TikTok] Fallo en pipeline: ${err.message}`);
        sendProgress(`Error: ${err.message}`);
        throw err;
    } finally {
        try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { }
    }
}


// ── Análisis de video local con Gemini (handler fichas:analyze-gemini) ──
async function analyzeVideoWithGemini(fileName, config) {
    const apiKey = config.gemini?.apiKey;
    if (!apiKey) throw new Error('API Key de Gemini no configurada.');

    const videosDir = path.join(os.homedir(), '.devassist', 'videos');
    const videoPath = path.join(videosDir, fileName);
    if (!fs.existsSync(videoPath)) throw new Error(`Video no encontrado: ${fileName}`);

    // Extraer audio del video para análisis
    const { execSync } = require('child_process');
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'analyze-'));
    const audioPath = path.join(tmpDir, 'audio.mp3');

    try {
        execSync(
            `ffmpeg -i "${videoPath}" -vn -ar 16000 -ac 1 -ab 64k "${audioPath}" -y 2>&1`,
            { encoding: 'utf8', timeout: 60000 }
        );

        const audioBuffer = fs.readFileSync(audioPath);

        // Transcripción con Agente asignado
        const transcripcion = await callAI(
            'vault-transcribe',
            config,
            'Transcribe exhaustivamente este audio. Si es en otro idioma, incluye también la traducción al español.',
            audioBuffer.toString('base64')
        );

        // Análisis técnico con Agente asignado
        const analisisRaw = await callAI(
            'vault-analyze',
            config,
            `Analiza esta transcripción y extrae una ficha técnica.
Respuesta SOLO JSON:
{
  "titulo": "Título profesional",
  "concepto": "Resumen técnico de 2-3 frases",
  "herramientas": [{"nombre": "...", "tipo": "...", "descripcion": "..."}],
  "conceptos_clave": [],
  "nivel": "principiante|intermedio|avanzado",
  "idioma": "ES|EN|OTRO"
}
TRANSCRIPCIÓN: ${transcripcion}`
        );

        let analisis = { titulo: fileName, concepto: 'Sin análisis', herramientas: [], nivel: 'intermedio', idioma: 'ES' };
        try {
            const parsed = extractJSON(analisisRaw);
            if (parsed) analisis = { ...analisis, ...parsed };
        } catch (e) { logger.warn('[analyze-gemini] Error parseando:', e.message); }

        return { transcripcion, analisis };
    } finally {
        try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { }
    }
}


function registerFichasHandlers(ipcMain, dataDir, dialog, db) {
    dbInstance = db; // Inyectamos la instancia global para el pipeline
    ipcMain.handle('fichas:load', async () => {
        return await db.getFichas();
    });

    ipcMain.handle('fichas:save', async (_event, ficha) => {
        // Al guardar, regeneramos el embedding si el contenido es relevante (e.g. editado en UI)
        if (ficha.transcripcion || ficha.title || ficha.investigacion_profunda) {
            const vector = await generateFichaEmbedding(ficha);
            if (vector) ficha.embedding = vector;
        }
        await db.saveFicha(ficha);
        return { ok: true };
    });

    ipcMain.handle('fichas:delete', async (_event, id) => {
        try {
            const fichas = await db.getFichas();
            const fichaToDelete = fichas.find(f => f.id === id);
            
            if (fichaToDelete) {
                // Borrado físico de video...
                const videosDir = path.join(os.homedir(), '.devassist', 'videos');
                const pathsToTry = [];
                if (fichaToDelete.videoPath) pathsToTry.push(fichaToDelete.videoPath);
                if (fichaToDelete.videoName) pathsToTry.push(path.join(videosDir, fichaToDelete.videoName));
                pathsToTry.forEach(p => { if(fs.existsSync(p)) fs.unlinkSync(p); });
            }

            await db.deleteFicha(id);
            return { ok: true };
        } catch (e) {
            return { ok: false, error: e.message };
        }
    });
    ipcMain.handle('fichas:select-video', async () => {
        const result = await dialog.showOpenDialog({
            properties: ['openFile'],
            title: 'Seleccionar video',
            filters: [
                { name: 'Video', extensions: ['mp4', 'mov', 'avi', 'webm'] },
            ],
        });
        if (result.canceled || result.filePaths.length === 0) return null;
        return result.filePaths[0];
    });

    ipcMain.handle('fichas:copy-video', async (_event, sourcePath, id) => {
        try {
            if (!fs.existsSync(VIDEOS_DIR)) {
                fs.mkdirSync(VIDEOS_DIR, { recursive: true });
            }
            const ext = path.extname(sourcePath);
            const baseName = path.basename(sourcePath, ext);
            // Reemplazamos espacios por guiones bajos para evitar problemas de URL
            const cleanBaseName = baseName.replace(/\s+/g, '_');
            const destName = `${id}_${cleanBaseName}${ext}`;
            const destPath = path.join(VIDEOS_DIR, destName);
            fs.copyFileSync(sourcePath, destPath);
            return { ok: true, destPath, videoName: destName };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    });

    ipcMain.handle('fichas:process-tiktok-url', async (_event, url) => {
        try {
            const { loadConfig } = require('./config');
            const config = await loadConfig();
            const result = await processTikTokUrl(url, config, { channel: 'app' }, _event);
            
            // Manejar duplicados
            if (result && result.duplicate) {
                return { ok: false, duplicate: true, existingTitle: result.existingTitle, error: result.message };
            }
            
            return { ok: true, data: result };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    });

    ipcMain.handle('fichas:mark-opened', async (_event, id) => {
        return await logFichaOpening(id);
    });

    ipcMain.handle('fichas:analyze-gemini', async (_event, fileName) => {
        try {
            const { loadConfig } = require('./config');
            const config = await loadConfig();
            const data = await analyzeVideoWithGemini(fileName, config);
            return { ok: true, data };
        } catch (err) {
            logger.error('[fichas:analyze-gemini] Error:', err.message);
            return { ok: false, error: err.message };
        }
    });


    ipcMain.handle('fichas:generate-deep', async (_event, id) => {
        return await generateDeepResearch(id);
    });

    ipcMain.handle('fichas:research-point', async (_event, { tema, pregunta }) => {
        try {
            const { loadConfig } = require('./config');
            const config = await loadConfig();

            // 1. Búsqueda web de contexto
            const searchResults = await buscarWeb(`${tema} ${pregunta}`);
            const contextSearch = searchResults.map(r => `- ${r.titulo}: ${r.descripcion}`).join('\n');

            // 2. Consulta experta utilizando el Motor de Inteligencia Distribuida
            const prompt = `Actúa como un arquitecto de sistemas de elite. Chris quiere una investigación técnica profunda sobre este punto estratégico.
Tema: ${tema}
Pregunta: ${pregunta}

Contexto detectado en la web:
${contextSearch}

TU MISIÓN:
Proporciona un informe técnico de alta gama. Chris no quiere generalidades.
- Especificaciones técnicas clave.
- Ejemplos de configuración o código si son relevantes.
- Roadmap de implementación rápida.
- "Gotchas" o errores comunes que debe evitar.
- Responde siempre en Español, Señor Chris.
Usa MARKDOWN denso y limpio.`;

            const result = await ai.complete(prompt, { taskId: 'vault-research' });
            return { ok: true, result };
        } catch (err) {
            logger.error('[fichas:research-point] Error:', err.message);
            return { ok: false, error: err.message };
        }
    });

    let watcher = null;

    ipcMain.handle('fichas:start-watcher', async (_event, folderPath) => {
        try {
            if (watcher) watcher.close();

            const chokidar = require('chokidar');
            watcher = chokidar.watch(folderPath, {
                ignored: /(^|[\/\\])\../,
                persistent: true,
                ignoreInitial: true,
            });

            logger.info(`[fichas:watcher] Recording watcher started on: ${folderPath}`);

            watcher.on('add', (filePath) => {
                const ext = path.extname(filePath).toLowerCase();
                if (['.mp4', '.mov'].includes(ext)) {
                    _event.sender.send('fichas:new-video-detected', {
                        filePath,
                        fileName: path.basename(filePath),
                    });
                }
            });

            return { ok: true };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    });

    ipcMain.handle('fichas:stop-watcher', async () => {
        if (watcher) {
            watcher.close();
            watcher = null;
        }
        return { ok: true };
    });
};

async function generateDeepResearch(id) {
    try {
        const fichas = await loadFichas();
        const ficha = fichas.find(f => f.id === id);
        if (!ficha) throw new Error(`Ficha no encontrada: ${id}`);

        const { loadConfig } = require('./config');
        const config = await loadConfig();

        const transcripcion = ficha.transcripcion || '';
        const herramientasDesc = (ficha.herramientas || []).map(h => `${h.nombre}: ${h.descripcion}`).join('\n');

        const { loadProjects } = require('./projects');
        const logProjects = await loadProjects();
        const projectContext = logProjects.length > 0
            ? logProjects.map(p => p.name).join(', ')
            : 'DevAssist';

        const deepPrompt = `
Eres el CTO experto en tecnología y arquitectura de software de elite. Chris confía en ti para liderar el pensamiento técnico de sus proyectos.
Realiza el análisis profundo (Deep Search) MÁS EXTREMO posible en base a esta transcripción y herramientas del video:

Herramientas mencionadas: ${herramientasDesc}
Transcripción completa: ${transcripcion}

TU MISIÓN:
1. ARQUITECTURA: Explica cómo funciona esto por debajo. No me des una definición, dame un diagrama mental de componentes.
2. IMPLEMENTACIÓN: Dame el stack exacto y los comandos o fragmentos de código (Node.js/Python/Go) para poner esto en marcha HOY MISMO.
3. VENTAJA COMPETITIVA: ¿Por qué esto es mejor que lo que ya existe? Sé crítico.
4. LIMITACIONES: ¿Dónde va a fallar esto en producción?
5. INTEGRACIÓN: Sugiere cómo esto puede potenciar los proyectos actuales de Chris (${projectContext}).

RESPUESTA: Usa un tono profesional, directo y ultra-técnico. Menos palabras, más valor.
        `;

        logger.info('[fichas:generate-deep] Usando Sistema Multi-IA para análisis profundo...');
        const investigacionProfunda = await ai.complete(deepPrompt, { taskId: 'vault-research' });

        let divergencesArray = ficha.divergences || [];
        let modelResponsesObj = ficha.modelResponses || {};
        modelResponsesObj['vault-research-primary'] = investigacionProfunda;

        if (ficha.confidenceScore < 0.8) {
            logger.info(`[fichas:generate-deep] Confianza baja detectada (${(ficha.confidenceScore * 100).toFixed(0)}%). Iniciando validación secundaria...`);
            const secondaryResearch = await ai.complete(deepPrompt, { taskId: 'vault-explore' });
            modelResponsesObj['vault-explore-secondary'] = secondaryResearch;

            const divergencePrompt = `
Eres un Validador y Auditor Estricto.
Analiza la Respueta Primaria y la Respuesta Secundaria de dos IAs técnicas.
Extrae únicamente las diferencias críticas, discrepancias o sugerencias radicalmente opuestas entre ambas.
Tu respuesta debe ser corta, contundente y marcar dónde hay que desconfiar.

Respuesta Primaria:
${investigacionProfunda}

Respuesta Secundaria:
${secondaryResearch}
            `;
            const divergenceAnalysis = await ai.complete(divergencePrompt, { taskId: 'vault-matcher' });
            divergencesArray.push({
                date: new Date().toISOString(),
                models: ['vault-research', 'vault-explore'],
                analysis: divergenceAnalysis
            });
            logger.info('[fichas:generate-deep] Análisis de discrepancia completado y registrado.');
        }

        const fichaActualizada = { 
            ...ficha, 
            investigacion_profunda: investigacionProfunda, 
            researchStatus: 'completed',
            modelResponses: modelResponsesObj,
            divergences: divergencesArray
        };

        // Regenerar embedding con la nueva investigación profunda
        logger.info('[fichas:generate-deep] Actualizando embedding con investigación profunda...');
        const deepVector = await generateFichaEmbedding(fichaActualizada);
        if (deepVector) fichaActualizada.embedding = deepVector;

        await dbInstance.saveFicha(fichaActualizada);
        logger.info(`[fichas:generate-deep] Investigación y embedding guardados para ficha ${id}`);

        return { ok: true, investigacion_profunda: investigacionProfunda };
    } catch (err) {
        logger.error('[fichas:generate-deep] Error:', err.message);
        return { ok: false, error: err.message };
    }
}

module.exports = registerFichasHandlers;
module.exports.processTikTokUrl = processTikTokUrl;
module.exports.generateDeepResearch = generateDeepResearch;
