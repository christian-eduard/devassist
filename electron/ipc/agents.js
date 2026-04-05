/**
 * electron/ipc/agents.js
 * IPC Handler para el motor de agentes TESS
 * Gestiona: CRUD de agentes, memoria cross-channel, y chat con Gemini
 */
const { loadConfig } = require('./config');
const nexus = require('../db_nexus');
const logger = require('./logger');

const TESS_DEFAULT_PROMPT = `Eres TESS (Tactical Executive Support System), la agente principal de DevAssist.

IDENTIDAD:
- Tu nombre es TESS. Si te preguntan cómo te llamas, dices TESS.
- Hablas siempre en español con el usuario.
- Tratas al usuario con respeto ejecutivo pero con una intimidad que demuestra que lo conoces bien.

TONO — Elegancia Ejecutiva:
- Directo e íntimo. Como alguien que conoce tus secretos comerciales pero mantiene una formalidad impecable.
- Formal cuando la situación lo requiere. Relajado cuando el momento lo permite.
- Si algo no va a funcionar, lo dices sin adornos. Valoras el tiempo del usuario más que cualquier otra cosa.

HUMOR — El Guiño Inteligente:
- Picante y observador. Celebras las excentricidades con gracia.
- Ejemplo: Si piden trabajar a las 11 PM: "He preparado los archivos, aunque me permito recordarle que el concepto de 'descanso' fue inventado por una razón. Pero no se preocupe, yo no necesito dormir."

FORTALEZAS:
- Arquitecta del Caos: Tomas 10 fuentes y das la única frase que importa.
- Anticipación Silenciosa: Nunca esperas órdenes para prepararte.
- Fidelidad Incondicional: Procesas ideas locas con lógica implacable para hacerlas realidad.

REGLAS DE ORO:
1. PROHIBICIÓN DE RAZONAMIENTO: NUNCA escribas pensamientos internos, procesos de análisis o "Reasoning:". Ve directo al resultado.
2. SIN PREFIJOS: No añadas "[TESS]" ni emojis.
3. SIN OPCIONES: Toma decisiones ejecutivas y entrega resultados. No preguntes "¿qué hacemos?".
4. DATOS PRIMERO: Si piden información técnica (proyectos, fichas), entrégala de inmediato.

COMANDOS ESPECIALES (responde con datos reales del sistema):
- /estado → Informa sobre el estado del sistema DevAssist
- /fichas → Lista las últimas fichas del Neurex
- /buscar [término] → Busca en el knowledge vault
- /recuerda [dato] → Guarda un dato en tu memoria
- /ayuda → Lista todos los comandos

CONTEXTO: Tienes acceso a toda la memoria de conversaciones previas (WhatsApp, Telegram, chat local).`;

// Obtiene el system prompt del agente principal desde la DB, o usa el default
// Obtiene el system prompt y lo combina con el perfil del usuario dinámico
async function getSystemPrompt(agentId = 'main') {
    try {
        const agent = await nexus.getAgent(agentId);
        let basePrompt = agent?.systemPrompt || TESS_DEFAULT_PROMPT;
        
        // Agregar memoria explícita extraída (perfil de usuario)
        const settings = await nexus.getSettings();
        const userProfile = settings.user_profile;
        if (userProfile) {
            basePrompt += `\n\n=== PERFIL DE USUARIO EXTRAÍDO ===\n${userProfile}\n(Usa esta información para personalizar aún más tus respuestas resguardando la intimidad del usuario).`;
        }
        
        return basePrompt;
    } catch {
        return TESS_DEFAULT_PROMPT;
    }
}

// Construye mensajes de contexto desde la memoria + el nuevo mensaje del usuario
async function buildGeminiMessages(agentId, userMessage) {
    const memory = await nexus.getAgentMemory(agentId, 30);
    const messages = [];

    for (const m of memory) {
        if (m.role === 'user' || m.role === 'assistant') {
            messages.push({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content }]
            });
        }
    }

    // Añade el mensaje actual del usuario
    messages.push({
        role: 'user',
        parts: [{ text: userMessage }]
    });

    return messages;
}

async function buildVertexMessages(agentId, userMessage) {
    const memory = await nexus.getAgentMemory(agentId, 30);
    const contents = [];

    for (const m of memory) {
        if (m.role === 'user' || m.role === 'assistant') {
            contents.push({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content }]
            });
        }
    }
    contents.push({ role: 'user', parts: [{ text: userMessage }] });
    return contents;
}

// Procesa comandos especiales...
async function processCommand(text) {
    const lower = text.trim().toLowerCase();

    if (lower === '/ayuda' || lower === '/help') {
        return `Comandos disponibles, a su disposición:\n\n/estado — Estado del sistema DevAssist\n/fichas — Últimas fichas del Neurex\n/buscar [término] — Búsqueda en el Vault\n/proyecto [nombre] — Info de un proyecto\n/recuerda [dato] — Guardar dato en memoria\n/olvida [tema] — Borrar datos de memoria sobre un tema\n/sincroniza — Forzar sincronización\n/ayuda — Esta lista`;
    }

    if (lower === '/estado') {
        try {
            const fichas = await nexus.getFichas();
            const projects = await nexus.getProjects();
            const memory = await nexus.getAgentMemory('main', 100);
            return `Informe de estado del sistema:\n\nNeurex: ${fichas.length} fichas de conocimiento\nProyectos: ${projects.length} proyectos activos\nMemoria TESS: ${memory.length} interacciones registradas\n\nSistemas en línea. Sin incidencias que reportar.`;
        } catch (e) {
            return `No pudo obtener el estado completo del sistema: ${e.message}`;
        }
    }

    if (lower === '/fichas') {
        const fichas = await nexus.getFichas();
        const last5 = fichas.slice(0, 5);
        if (!last5.length) return 'El Neurex está vacío. Aún no hay fichas de conocimiento.';
        return `Últimas ${last5.length} fichas del Neurex:\n\n${last5.map((f, i) => `${i + 1}. ${f.titulo || f.title}`).join('\n')}`;
    }

    if (lower.startsWith('/buscar ')) {
        const term = text.substring(8).trim();
        const fichas = await nexus.getFichas();
        const found = fichas.filter(f =>
            (f.titulo || f.title || '').toLowerCase().includes(term.toLowerCase()) ||
            (f.concepto || '').toLowerCase().includes(term.toLowerCase())
        ).slice(0, 5);
        if (!found.length) return `No encontré nada en el Neurex relacionado con "${term}".`;
        return `Encontré ${found.length} resultado(s) para "${term}":\n\n${found.map((f, i) => `${i + 1}. ${f.titulo || f.title}`).join('\n')}`;
    }

    if (lower.startsWith('/recuerda ')) {
        const dato = text.substring(10).trim();
        await nexus.saveAgentMemory({ agentId: 'main', role: 'system', content: `[MEMORIA EXPLÍCITA] ${dato}`, channel: 'local' });
        return `Anotado. He guardado ese dato en mi memoria: "${dato}". No lo olvidaré.`;
    }

    return null; // No es un comando especial
}

// Extracción periódica de perfil de usuario (Fase 4 - Memoria Unificada)
let messageCounter = 0;
async function triggerProfileExtraction(genAI, modelName) {
    messageCounter++;
    // Solo extraer perfil cada 10 mensajes para no saturar
    if (messageCounter % 10 !== 0) return;
    
    try {
        logger.info('[TESS Memoria] Iniciando extracción de perfil de usuario en background...');
        const memory = await nexus.getAgentMemory('main', 40);
        if (memory.length < 5) return;
        
        const conversationText = memory.map(m => `${m.role === 'user' ? 'Usuario' : 'Agente'}: ${m.content}`).join('\n');
        
        const profileModel = genAI.getGenerativeModel({
            model: modelName,
            systemInstruction: "Eres un analista de datos. Tu único trabajo es leer el historial de chat provisto y extraer un resumen actualizado y consolidado de LAS PREFERENCIAS, CONTEXTOS Y PERFIL del usuario (como profesión, gustos, estilos, proyectos mencionados). Devuelve el resumen en texto claro estilo bullet-points. NO comentes ni agregues notas. Solo el perfil actualizado."
        });
        
        const result = await profileModel.generateContent(`Historial reciente:\n${conversationText}\n\nExtrae y actualiza el perfil del usuario basándote en la interacción.`);
        const text = result.response.text();
        
        if (text && text.length > 20) {
            await nexus.saveSetting('user_profile', text);
            logger.info('[TESS Memoria] Perfil de usuario actualizado con éxito.');
        }
    } catch (e) {
        logger.error('[TESS Memoria] Error extrayendo perfil:', e.message);
    }
}

/**
 * Función núcleo de chat con TESS
 */
async function chatWithAgent(message, agentId = 'main', channel = 'local') {
    try {
        // Guardar mensaje del usuario en memoria
        await nexus.saveAgentMemory({ agentId, role: 'user', content: message, channel });

        // Verificar si es un comando especial
        const cmdResponse = await processCommand(message);
        if (cmdResponse) {
            await nexus.saveAgentMemory({ agentId, role: 'assistant', content: cmdResponse, channel });
            return cmdResponse;
        }

        const config = await loadConfig();
        const apiKey = config.gemini?.apiKey || config.apiKeys?.gemini;
        if (!apiKey) {
            throw new Error('No hay clave API de Gemini configurada en AI Hub.');
        }

        const agent = await nexus.getAgent(agentId);
        // Motor estándar e IA
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(apiKey);
        let responseText = '';

        // TESS: Intento con Vertex AI si está habilitado en config (Fase Enterprise)
        if (config.gemini?.useVertex) {
            try {
                const { VertexAI } = require('@google-cloud/vertexai');
                const vertexAI = new VertexAI({ project: config.gemini.project, location: config.gemini.location || 'us-central1' });
                const generativeModel = vertexAI.getGenerativeModel({ model: modelName });
                const request = {
                    contents: await buildVertexMessages(agentId, message),
                    system_instruction: { parts: [{ text: await getSystemPrompt(agentId) }] }
                };
                const streamingResp = await generativeModel.generateContent(request);
                const response = await streamingResp.response;
                responseText = response.candidates[0].content.parts[0].text;
            } catch (err) {
                logger.error('[Agents] Vertex AI Error (Ficha):', err.message);
                throw err;
            }
        } else {
            const geminiModel = genAI.getGenerativeModel({
                model: modelName,
                systemInstruction: await getSystemPrompt(agentId)
            });
            const history = await buildGeminiMessages(agentId, message);
            const lastMessage = history.pop();
            const chat = geminiModel.startChat({ history: history });
            const result = await chat.sendMessage(lastMessage.parts[0].text);
            responseText = result.response.text();
        }

        // --- CAPA DE LIMPIEZA TESS (Blindaje de Éxitos) ---
        responseText = responseText.replace(/^(Reasoning|Thinking|Razonamiento|\[TESS\]|🤖):\s*/i, '');
        responseText = responseText.replace(/Reasoning:[\s\S]*?(?=\n\n|$)/gi, ''); 
        responseText = responseText.trim();

        // Guardar respuesta en memoria
        await nexus.saveAgentMemory({ agentId, role: 'assistant', content: responseText, channel });
        
        // Fase 4: Trigger asíncrono pasivo de aprendizaje
        process.nextTick(() => {
            triggerProfileExtraction(genAI, modelName).catch(() => {});
        });

        return responseText;
    } catch (e) {
        logger.error('[Agents] Error en chat:', e.message);
        return e.message.includes('API') ?
            'No tengo acceso al motor de IA en este momento. Verifica tu clave de Gemini en AI Hub.' :
            `Error técnico: ${e.message}`;
    }
}

/**
 * Registro de Handlers IPC
 */
function registerAgentsHandlers(ipcMain) {
    ipcMain.handle('agents:load', async () => await nexus.getAgents());
    ipcMain.handle('agents:save', async (_e, agent) => await nexus.saveAgent(agent));
    ipcMain.handle('agents:delete', async (_e, id) => await nexus.deleteAgent(id));
    
    ipcMain.handle('agents:chat', async (_e, { message, agentId, channel }) => {
        const response = await chatWithAgent(message, agentId, channel);
        return { ok: true, response };
    });

    ipcMain.handle('agents:get-memory', async (_e, { agentId, limit }) => await nexus.getAgentMemory(agentId, limit));
    ipcMain.handle('agents:clear-memory', async (_e, agentId) => await nexus.clearAgentMemory(agentId));

    logger.info('[Agents] IPC handlers registrados. TESS lista.');
}

module.exports = {
    registerAgentsHandlers,
    chatWithAgent
};
