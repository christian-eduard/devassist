/**
 * electron/ipc/agents.js
 * IPC Handler para el motor de agentes TESS
 * Gestiona: CRUD de agentes, memoria cross-channel, y chat con Gemini
 */
const { loadConfig } = require('./config');
const nexus = require('../db_nexus');
const logger = require('./logger');
const aiRotator = require('../services/ai_rotator');

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
 * Ahora con capa RAG (Retrieval-Augmented Generation) para proyectos y vault.
 */
async function chatWithAgent(message, agentId = 'main', channel = 'local') {
    try {
        logger.info(`[Agents:Chat] Procesando mensaje: "${message.substring(0, 50)}..."`);
        
        // 1. Guardar mensaje del usuario en memoria inmediata
        await nexus.saveAgentMemory({ agentId, role: 'user', content: message, channel });

        // 2. Verificar comandos rápidos
        const cmdResponse = await processCommand(message);
        if (cmdResponse) {
            await nexus.saveAgentMemory({ agentId, role: 'assistant', content: cmdResponse, channel });
            return cmdResponse;
        }

        // 3. RECUPERACIÓN SEMÁNTICA (Capa Nexus RAG)
        let semanticContext = '';
        try {
            const queryVector = await aiRotator.generateEmbedding(message);
            
            // Buscar proyectos relacionados
            const relatedProjects = await nexus.searchProjects(queryVector, 2);
            if (relatedProjects.length > 0) {
                semanticContext += "\n--- PROYECTOS RELACIONADOS DETECTADOS ---\n";
                relatedProjects.forEach(p => {
                    semanticContext += `- ${p.name} (Ruta: ${p.path})\n  Tecnologías: ${p.stack?.join(', ')}\n  Metadata: ${JSON.stringify(p.codeStats || p.fullContext).substring(0, 500)}\n`;
                });
            }

            // Buscar fichas de conocimiento (Vault)
            const relatedVault = await nexus.searchVault(queryVector, 3);
            if (relatedVault.length > 0) {
                semanticContext += "\n--- CONOCIMIENTO DEL VAULT ---\n";
                relatedVault.forEach(f => {
                    semanticContext += `- Título: ${f.title || f.titulo}\n  Resumen: ${f.tlDr || f.resumen || ''}\n  Contenido Clave: ${f.transcripcion?.substring(0, 1000) || ''}\n`;
                });
            }
        } catch (ragErr) {
            logger.warn(`[Agents:RAG] No se pudo recuperar contexto semántico: ${ragErr.message}`);
        }

        // 4. Construir Prompt con Instrucciones de TESS + Contexto Recuperado
        const systemPrompt = await getSystemPrompt(agentId);
        const history = await nexus.getAgentMemory(agentId, 15);
        
        let promptTemplate = `SYSTEM INITIALIZATION: ${systemPrompt}\n\n`;
        
        if (semanticContext) {
            promptTemplate += `CONTEXTO DINÁMICO RECUPERADO (Nexus RAG):\n${semanticContext}\n\n`;
            promptTemplate += `INSTRUCCIÓN TÉCNICA: Si el usuario pregunta por el código, usa los datos anteriores para dar una respuesta precisa. No inventes rutas ni stacks.\n\n`;
        }

        promptTemplate += "CONVERSATION HISTORY:\n";
        for (const m of history) {
            promptTemplate += `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}\n`;
        }
        
        promptTemplate += `User (Actual): ${message}\nAssistant:`;

        // 5. Generación con Resiliencia (Multi-Modelo)
        let responseText = await aiRotator.complete(promptTemplate, {
            providers: ['gemini', 'openrouter', 'groq']
        });

        // 6. Limpieza Quirúrgica (Estilo TESS)
        responseText = responseText.replace(/^(Reasoning|Thinking|Razonamiento|\[TESS\]|🤖):\s*/i, '');
        responseText = responseText.replace(/Reasoning:[\s\S]*?(?=\n\n|$)/gi, ''); 
        responseText = responseText.trim();

        // 7. Persistir Respuesta
        await nexus.saveAgentMemory({ agentId, role: 'assistant', content: responseText, channel });
        
        return responseText;
    } catch (e) {
        logger.error('[Agents] Error crítico en core loop:', e.message);
        return `Error en el núcleo de TESS: ${e.message}. Verifique la conexión a la base de datos Nexus y las API Keys.`;
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
