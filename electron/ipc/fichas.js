const fs = require('fs');
const path = require('path');
const os = require('os');
const logger = require('./logger');

const FICHAS_FILE = 'fichas.json';
const VIDEOS_DIR = path.join(os.homedir(), '.devassist', 'videos');

function loadFichas(dataDir) {
    const filePath = path.join(dataDir, FICHAS_FILE);
    try {
        if (fs.existsSync(filePath)) {
            return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        }
    } catch (err) {
        logger.error('[fichas:load] Error:', err.message);
    }
    return [];
}

function saveFichas(dataDir, fichas) {
    const filePath = path.join(dataDir, FICHAS_FILE);
    fs.writeFileSync(filePath, JSON.stringify(fichas, null, 2), 'utf-8');
}

// ── Proyectos de Chris (para matching) ──────────────────────
// Nota: Se ha eliminado la lista estática PROYECTOS_CHRIS. 
// Ahora se utilizan los proyectos reales cargados desde proyectos.json para el matching y el contexto.

// ── Llamada a Groq API (para investigación profunda) ────────
async function callGroq(apiKey, prompt) {
    const https = require('https');
    const model = 'llama-3.3-70b-versatile';
    const url = 'https://api.groq.com/openai/v1/chat/completions';

    const body = JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1
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
async function callOpenRouter(apiKey, prompt) {
    const https = require('https');
    const model = 'deepseek/deepseek-r1:free';
    const url = 'https://openrouter.ai/api/v1/chat/completions';

    const body = JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1
    });

    return new Promise((resolve, reject) => {
        const req = https.request(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': 'https://github.com/Chris-v-o/DevAssist',
                'X-Title': 'DevAssist Agent',
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
// Orden: 1. Gemini 3.1 Pro → 2. Groq (Llama 3.3 70B) → 3. OpenRouter (DeepSeek R1)
async function callIntelligentAI(config, prompt) {
    const keys = getKeys();
    const geminiKey = keys.gemini || (config.gemini ? config.gemini.apiKey : null);
    const groqKey = keys.groq || (config.apiKeys ? config.apiKeys.groq : null);
    const orKey = keys.openrouter || (config.apiKeys ? config.apiKeys.openrouter : null);

    // 1. Gemini 3.1 Pro Preview (Cerebro principal)
    if (geminiKey) {
        try {
            logger.info('[AI:Priority] Utilizando Gemini 3.1 Pro Preview...');
            return await callGemini(geminiKey, prompt, null, null, 'gemini-3.1-pro-preview');
        } catch (e) { logger.warn('[AI:Priority] Gemini 3.1 Pro falló:', e.message); }
    }

    // 2. Groq (Ultra-rápido)
    if (groqKey) {
        try {
            logger.info('[AI:Priority] Utilizando Groq (Llama 3.3 70B)...');
            return await callGroq(groqKey, prompt);
        } catch (e) { logger.warn('[AI:Priority] Groq falló:', e.message); }
    }

    // 3. OpenRouter (DeepSeek R1)
    if (orKey) {
        try {
            logger.info('[AI:Priority] Utilizando OpenRouter (DeepSeek R1)...');
            return await callOpenRouter(orKey, prompt);
        } catch (e) { logger.warn('[AI:Priority] OpenRouter falló:', e.message); }
    }

    throw new Error('Ningún proveedor de IA está configurado o disponible.');
}

// ── Obtener keys de OpenClaw ─────────────────────────────────
function getKeys() {
    try {
        const ocConfig = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.openclaw/openclaw.json'), 'utf8'));
        return {
            gemini: ocConfig?.env?.GOOGLE_API_KEY || ocConfig?.env?.GEMINI_API_KEY,
            groq: ocConfig?.env?.GROQ_API_KEY
        };
    } catch { return {}; }
}

// ── Búsqueda web vía DuckDuckGo ──────────────────────────────
async function callGemini(apiKey, prompt, audioBase64 = null, mimeType = 'audio/mp3', model = 'gemini-2.0-flash') {
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
                    if (!text) reject(new Error('Gemini sin respuesta: ' + JSON.stringify(parsed?.error || parsed).substring(0, 200)));
                    else resolve(text);
                } catch (e) { reject(new Error('Parse error Gemini: ' + e.message)); }
            });
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
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

// ── Pipeline TikTok completo (7 etapas) ──────────────────────
async function processTikTokUrl(url, config) {
    const { execSync } = require('child_process');
    const videosDir = path.join(os.homedir(), '.devassist', 'videos');
    if (!fs.existsSync(videosDir)) fs.mkdirSync(videosDir, { recursive: true });

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tiktok-'));
    const keys = getKeys();
    const apiKey = keys.gemini || config.gemini?.apiKey;

    if (!apiKey) throw new Error('No se encontró API Key de Gemini. Configúrala en Ajustes.');

    logger.info(`[TikTok] Pipeline iniciado para Chris: ${url}`);

    try {

        // ── ETAPA 1: Metadatos + descarga video + extracción audio ──
        logger.info('[TikTok] Etapa 1: Descarga y extracción de audio...');

        let titulo = 'Video TikTok';
        let autor = 'desconocido';
        try {
            const meta = execSync(
                `yt-dlp --no-playlist --print "%(title)s|||%(uploader)s" "${url}"`,
                { encoding: 'utf8', timeout: 30000 }
            ).trim();
            const parts = meta.split('|||');
            titulo = parts[0] || titulo;
            autor = parts[1] || autor;
        } catch (e) { logger.warn(`[TikTok] Metadatos fallidos: ${e.message}`); }


        const videoOutputTemplate = path.join(videosDir, '%(id)s.%(ext)s');
        execSync(
            `yt-dlp -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" -o "${videoOutputTemplate}" --no-playlist --max-filesize 100m "${url}"`,
            { encoding: 'utf8', timeout: 120000 }
        );

        const videoFiles = fs.readdirSync(videosDir)
            .filter(f => /\.(mp4|webm|mkv)$/.test(f))
            .map(f => ({ name: f, time: fs.statSync(path.join(videosDir, f)).mtimeMs }))
            .sort((a, b) => b.time - a.time);

        if (!videoFiles.length) throw new Error('yt-dlp no generó ningún archivo de video');
        const videoName = videoFiles[0].name;
        const videoPath = path.join(videosDir, videoName);

        const audioPath = path.join(tmpDir, 'audio.mp3');
        try {
            execSync(
                `ffmpeg -i "${videoPath}" -vn -ar 16000 -ac 1 -ab 64k "${audioPath}" -y 2>&1`,
                { encoding: 'utf8', timeout: 60000 }
            );
        } catch (e) {
            logger.warn('[TikTok] ffmpeg falló, intentando yt-dlp -x...', e.message);
            execSync(
                `yt-dlp --no-playlist -x --audio-format mp3 --audio-quality 5 -o "${path.join(tmpDir, 'audio.%(ext)s')}" "${url}" 2>&1`,
                { encoding: 'utf8', timeout: 60000 }
            );
        }

        const audioFile = fs.readdirSync(tmpDir).find(f => f.includes('audio') && (f.endsWith('.mp3') || f.endsWith('.m4a') || f.endsWith('.opus') || f.endsWith('.ogg')));
        if (!audioFile) throw new Error('No se pudo extraer audio del video');

        const audioFullPath = path.join(tmpDir, audioFile);
        const audioBuffer = fs.readFileSync(audioFullPath);
        const mimeType = audioFile.endsWith('.mp3') ? 'audio/mp3' : audioFile.endsWith('.m4a') ? 'audio/mp4' : 'audio/ogg';

        // ── ETAPA 2: Transcripción (Gemini 2.0 Flash) ──
        logger.info('[TikTok] Etapa 2: Transcripción con Gemini 2.0 Flash...');
        const transcripcion = await callGemini(
            apiKey,
            `Transcribe exhaustivamente el audio y acompáñalo SIEMPRE de una traducción exacta. 
Para facilitar la lectura en la interfaz, IMPRIME OBLIGATORIAMENTE CADA FRASE O PARRAFO usando los siguientes prefijos en líneas separadas (intercaladas entre el idioma original y el traducido de forma recurrente):

#ORIGINAL# [texto en el idioma nativo del video]
#TRADUCCION# [traducción literal en el otro idioma]

Ejemplo:
#ORIGINAL# Esto es una prueba.
#TRADUCCION# This is a test.`,
            audioBuffer.toString('base64'),
            mimeType,
            'gemini-2.0-flash'
        );
        if (!transcripcion) throw new Error('No se pudo obtener transcripción del video.');

        // ── ETAPA 3: Análisis técnico (Gemini 2.0 Flash) ──
        logger.info('[TikTok] Etapa 3: Análisis de contenido con Gemini 2.0 Flash...');
        const analisisRaw = await callGemini(
            apiKey,
            `Analiza esta transcripción de video y extrae una FICHA TÉCNICA PREMIUM.
TU MISIÓN: Identificar herramientas, conceptos técnicos y crear puntos de exploración.

Respuesta SOLO JSON (obligatorio):
{
  "titulo": "Título profesional atractivo",
  "concepto": "Resumen técnico de 2-3 frases",
  "herramientas": [{"nombre": "...", "tipo": "...", "descripcion": "...", "precio": "...", "url_oficial": ""}],
  "conceptos_clave": [],
  "puntos_exploracion": [{"tema": "Aspecto técnico 1", "pregunta": "¿Cómo implementar...?"}, {"tema": "Aspecto técnico 2", "pregunta": "¿Por qué usar...?"}, {"tema": "Aspecto técnico 3", "pregunta": "¿Qué ventajas...?"}],
  "nivel": "principiante|intermedio|avanzado",
  "idioma": "ES|EN|OTRO"
}
TRANSCRIPCIÓN: ${transcripcion}`,
            null,
            null,
            'gemini-2.0-flash'
        );

        let analisis = {
            titulo,
            concepto: 'Resumen no disponible',
            herramientas: [],
            puntos_exploracion: [],
            nivel: 'intermedio',
            idioma: 'ES'
        };
        try {
            const cleanJSON = analisisRaw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            analisis = JSON.parse(cleanJSON);
        } catch (e) { logger.warn('[TikTok] Error parseando análisis:', e.message); }

        // ── ETAPA 3.5: Clasificación y Priorización (Gemini 2.0 Flash) ──
        logger.info('[TikTok] Etapa 3.5: Clasificando importancia...');
        let prioridad = 3;
        let categoria = 'Información';
        try {
            const classRaw = await callGemini(
                apiKey,
                `Clasifica este video técnico.
Categorías: "Herramienta Nueva", "Tutorial/Skill", "News IA", "Opinión".
Prioridad: 1 (Urgent/Actionable) a 5 (General Knowledge).
TRANSCRIPCIÓN: ${transcripcion.substring(0, 1000)}
Response SOLO JSON: {"categoria": "...", "prioridad": 1-5}`,
                null,
                null,
                'gemini-2.0-flash'
            );
            const classData = JSON.parse(classRaw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
            prioridad = classData.prioridad || 3;
            categoria = classData.categoria || 'Información';
        } catch (e) { }

        // ── ETAPA 4: Deep Search de cada herramienta ──
        logger.info(`[TikTok] Etapa 4: Research profundo de herramientas...`);
        const herramientasConLinks = await Promise.all(
            (analisis.herramientas || []).map(async (h) => {
                const searchQueries = [
                    `${h.nombre} official website`,
                    `${h.nombre} github repository`,
                    `${h.nombre} technical documentation`
                ];
                const allResults = await Promise.all(searchQueries.map(q => buscarWeb(q)));
                const flatResults = allResults.flat();

                const githubResult = flatResults.find(r => r.url?.includes('github.com'));
                const docsResult = flatResults.find(r => r.url?.includes('docs.') || r.url?.includes('/docs') || r.url?.includes('/guide'));

                return {
                    ...h,
                    url_oficial: githubResult?.url || docsResult?.url || (flatResults[0]?.url || h.url_oficial || null),
                    busqueda_web: flatResults.slice(0, 5)
                };
            })
        );

        // ── ETAPA 4.5: INVESTIGACIÓN PROFUNDA (Gemini 3.1 Pro Preview) ──
        let investigacionProfunda = "";
        logger.info('[TikTok] Etapa 4.5: Generando investigación técnica con Gemini 3.1 Pro...');

        const deepSearchPrompt = `Actúa como un CTO experto. Analiza técnicamente esta transcripción y las herramientas encontradas:
TRANSCRIPCIÓN: ${transcripcion}
HERRAMIENTAS: ${herramientasConLinks.map(h => `${h.nombre} (${h.tipo}): ${h.descripcion}`).join('\n')}

TU MISIÓN:
1. Explica la arquitectura técnica y el valor real de lo mencionado.
2. Identifica desafíos de implementación o "gotchas".
3. Sugiere un flujo de trabajo para integrar esto en un stack moderno.
4. Resumen ejecutivo de 3 párrafos súper técnicos.
USA FORMATO MARKDOWN LIMPIO.`;

        try {
            investigacionProfunda = await callGemini(apiKey, deepSearchPrompt, null, null, 'gemini-3.1-pro-preview');
        } catch (e) {
            logger.warn('[TikTok] Gemini 3.1 Pro falló, usando fallback inteligente...', e.message);
            investigacionProfunda = await callIntelligentAI(config, deepSearchPrompt);
        }

        // ── ETAPA 5: Matching con proyectos REALES de la aplicación ──
        logger.info('[TikTok] Etapa 5: Matching con proyectos cargados en la APP...');
        const { loadProjects } = require('./projects');

        // El DATA_DIR es el padre de la carpeta videos
        const appDataDir = path.dirname(videosDir);
        const proyectosCargados = loadProjects(appDataDir);

        let sugerenciasProyectos = [];

        if (proyectosCargados && proyectosCargados.length > 0) {
            // Match base por palabras clave (fallback)
            sugerenciasProyectos = matchProyectos(transcripcion, herramientasConLinks, proyectosCargados);

            try {
                const projectContext = proyectosCargados.map(p => `- ${p.name}: ${p.description || 'Sin descripción'}`).join('\n');
                logger.info(`[TikTok] Consultando IA para matching específico con ${proyectosCargados.length} proyectos.`);

                const sugerenciasRaw = await callGemini(
                    apiKey,
                    `Actúa como un arquitecto de software experto. Chris tiene los siguientes proyectos cargados en su aplicación:
${projectContext}

TU MISIÓN:
1. Basado en esta transcripción de video: "${transcripcion.substring(0, 2000)}"
2. Identifica si alguna herramienta o concepto mencionado puede mejorar ALGUNO de los proyectos de la lista.
3. Sé MUY ESPECÍFICO. No digas "puede ayudar", di "puedes usar X para automatizar Y en el proyecto Z".
4. Si NO hay relación clara, no inventes, deja el array vacío.
5. NO menciones proyectos que NO estén en la lista anterior.

Respuesta SOLO JSON: { "matches": [ { "proyecto": "Nombre exacto", "sugerencia": "Explicación técnica premium", "relevancia": "alta/media" } ] }`,
                    null,
                    null,
                    'gemini-2.0-flash'
                );

                const cleanSug = sugerenciasRaw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                const parsed = JSON.parse(cleanSug);
                if (parsed.matches && parsed.matches.length > 0) {
                    sugerenciasProyectos = parsed.matches;
                }
            } catch (e) {
                logger.error('[TikTok] Error en matching IA:', e.message);
                // Mantenemos las sugerencias base si la IA falla
            }
        } else {
            logger.info('[TikTok] No hay proyectos cargados para realizar matching.');
        }

        // ── ETAPA 5.5: Generación de Manual de Uso (Si es Skill o Herramienta nueva) ──
        let manualUso = null;
        if (prioridad <= 2 || categoria === 'Skill') {
            logger.info('[TikTok] Etapa 5.5: Generando Manual de Uso con Gemini 3.1 Pro...');
            try {
                manualUso = await callGemini(
                    apiKey,
                    `Actúa como un redactor técnico de alta gama.
Basado en esta transcripción y análisis, crea un MANUAL DE USO RÁPIDO para Chris.
Pasos exactos, comandos si existen, y consejos de optimización.
Si es sobre Antigravity o agentes IA, sé muy sofisticado.
TRANSCRIPCIÓN: ${transcripcion}
Usa Markdown elegante.`,
                    null,
                    null,
                    'gemini-3.1-pro-preview'
                );
            } catch (e) { }
        }

        // ── ETAPA 6: Puntos clave para exploración ──
        logger.info('[TikTok] Etapa 6: Generando puntos de exploración con Gemini 2.0 Flash...');
        let exploraciones = [];
        try {
            const expRaw = await callGemini(
                apiKey,
                `Sugerir 3 temas para profundizar.
Respuesta SOLO JSON: [ {"tema": "...", "pregunta": "..."} ]
TRANSCRIPCIÓN: ${transcripcion.substring(0, 1000)}`,
                null,
                null,
                'gemini-2.0-flash'
            );
            exploraciones = JSON.parse(expRaw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
        } catch (e) { }

        // ── ETAPA 7: Construir ficha ──
        logger.info('[TikTok] Etapa 7: Guardando ficha completa...');
        const ficha = {
            titulo: analisis.tema_principal || titulo,
            concepto: transcripcion.substring(0, 350),
            funcionalidades: (analisis.herramientas || []).map(h => `${h.nombre}: ${h.descripcion}`).slice(0, 6),
            tags: analisis.conceptos_clave || [],
            aplicabilidad: sugerenciasProyectos.map(m => `${m.proyecto}: ${m.sugerencia}`).join(' | '),
            transcripcion: transcripcion,
            autor: autor,
            nivel: analisis.nivel || 'intermedio',
            idioma: analisis.idioma_video || 'es',
            prioridad,
            categoria,
            manual_uso: manualUso,
            herramientas: herramientasConLinks,
            aplicaciones_proyectos: sugerenciasProyectos,
            investigacion_profunda: investigacionProfunda,
            puntos_exploracion: exploraciones,
            url_video: url,
            createdAt: new Date().toISOString()
        };

        return { ficha, videoPath, videoName };

    } finally {
        try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { }
    }
}


// ── Análisis de video local con Gemini (handler fichas:analyze-gemini) ──
async function analyzeVideoWithGemini(fileName, config) {
    const keys = getKeys();
    const apiKey = keys.gemini || config.gemini?.apiKey;
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

        // Transcripción rápida con Gemini 2.0 Flash
        const transcripcion = await callGemini(
            apiKey,
            'Transcribe exhaustivamente este audio. Si es en otro idioma, incluye también la traducción al español.',
            audioBuffer.toString('base64'),
            'audio/mp3',
            'gemini-2.0-flash'
        );

        // Análisis técnico con Gemini 2.0 Flash
        const analisisRaw = await callGemini(
            apiKey,
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
TRANSCRIPCIÓN: ${transcripcion}`,
            null, null, 'gemini-2.0-flash'
        );

        let analisis = { titulo: fileName, concepto: 'Sin análisis', herramientas: [], nivel: 'intermedio', idioma: 'ES' };
        try {
            analisis = JSON.parse(analisisRaw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
        } catch (e) { logger.warn('[analyze-gemini] Error parseando:', e.message); }

        return { transcripcion, analisis };
    } finally {
        try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { }
    }
}


module.exports = function registerFichasHandlers(ipcMain, dataDir, dialog) {
    ipcMain.handle('fichas:load', async () => {
        return loadFichas(dataDir);
    });

    ipcMain.handle('fichas:save', async (_event, ficha) => {
        const fichas = loadFichas(dataDir);
        const idx = fichas.findIndex((f) => f.id === ficha.id);
        if (idx >= 0) {
            fichas[idx] = { ...fichas[idx], ...ficha };
        } else {
            fichas.push(ficha);
        }
        saveFichas(dataDir, fichas);
        return ficha;
    });

    ipcMain.handle('fichas:delete', async (_event, id) => {
        let fichas = loadFichas(dataDir);
        const fichaToDelete = fichas.find(f => f.id === id);

        // ── Borrado físico del video asociado ──
        if (fichaToDelete) {
            const videosDir = path.join(os.homedir(), '.devassist', 'videos');
            const pathsToTry = [];
            if (fichaToDelete.videoPath) pathsToTry.push(fichaToDelete.videoPath);
            if (fichaToDelete.videoName) pathsToTry.push(path.join(videosDir, fichaToDelete.videoName));

            for (const vp of pathsToTry) {
                if (fs.existsSync(vp)) {
                    try {
                        fs.unlinkSync(vp);
                        logger.info(`[fichas:delete] Archivo de video borrado: ${vp}`);
                        break;
                    } catch (err) {
                        logger.warn(`[fichas:delete] No se pudo borrar el archivo físico ${vp}:`, err.message);
                    }
                }
            }
        }

        fichas = fichas.filter((f) => f.id !== id);
        saveFichas(dataDir, fichas);
        return { ok: true };
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
            const config = loadConfig(dataDir);
            const result = await processTikTokUrl(url, config);
            return { ok: true, ...result };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    });

    ipcMain.handle('fichas:analyze-gemini', async (_event, fileName) => {
        try {
            const { loadConfig } = require('./config');
            const config = loadConfig(dataDir);
            const data = await analyzeVideoWithGemini(fileName, config);
            return { ok: true, data };
        } catch (err) {
            logger.error('[fichas:analyze-gemini] Error:', err.message);
            return { ok: false, error: err.message };
        }
    });

    ipcMain.handle('fichas:generate-deep', async (_event, id) => {
        try {
            const fichas = loadFichas(dataDir);
            const idx = fichas.findIndex(f => f.id === id);
            if (idx === -1) throw new Error('Ficha no encontrada');

            const ficha = fichas[idx];
            const { loadConfig } = require('./config');
            const config = loadConfig(dataDir);
            const apiKeyGemini = config.gemini?.apiKey;
            if (!apiKeyGemini) throw new Error('API Key de Gemini no configurada');

            const transcripcion = ficha.transcripcion || '';
            const herramientasDesc = (ficha.herramientas || []).map(h => `${h.nombre}: ${h.descripcion}`).join('\n');

            const projectContext = fichas.length > 0 ? (await require('./projects').loadProjects(dataDir)).map(p => p.name).join(', ') : 'DevAssist';

            // ── EXPERT INSTRUCTION ──
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

            logger.info('[fichas:generate-deep] Usando Gemini 3.1 Pro Preview para análisis profundo...');
            const investigacionProfunda = await callGemini(apiKeyGemini, deepPrompt, null, null, 'gemini-3.1-pro-preview');

            fichas[idx].investigacion_profunda = investigacionProfunda;
            saveFichas(dataDir, fichas);

            return { ok: true, investigacion_profunda: investigacionProfunda };
        } catch (err) {
            logger.error('[fichas:generate-deep] Error:', err.message);
            return { ok: false, error: err.message };
        }
    });

    ipcMain.handle('fichas:research-point', async (_event, { tema, pregunta }) => {
        try {
            const { loadConfig } = require('./config');
            const config = loadConfig(dataDir);

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

            const result = await callIntelligentAI(config, prompt);
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

module.exports.processTikTokUrl = processTikTokUrl;
