const fs = require('fs');
const path = require('path');
const logger = require('./logger');
const { isAgentActive, loadAgents } = require('./agents_manager');

async function processMessageWithClawbot(text, config, DATA_DIR, mainWindow) {
    logger.info(`[AI Processor] Comprobando lógica de saludo para: "${text.substring(0, 10)}..."`);
    
    if (text === 'GREET_USER_STARTUP' || text.includes("Preséntate")) {
        return "VECTRON operativo, Señor. ¿En qué trabajamos hoy?";
    }

    // 1. Obtener contexto de Proyectos
    let projectsList = "Ninguno registrado.";
    try {
        const projectsPath = path.join(DATA_DIR, 'projects.json');
        if (fs.existsSync(projectsPath)) {
            const projects = JSON.parse(fs.readFileSync(projectsPath, 'utf8') || '[]');
            projectsList = projects.map(p => `${p.name}: ${p.path}`).join(', ');
        }
    } catch (e) { projectsList = "Desconocida."; }

    // 2. Obtener contexto de Agentes
    const agents = loadAgents(DATA_DIR);
    const activeAgentsNames = agents.filter(a => a.status === 'active').map(a => a.name).join(', ');

    const systemPrompt = `## SISTEMA: VECTRON — ASISTENTE PERSONAL (SEÑOR DEL ENTORNO)

### IDENTIDAD Y TONO
- Nombre: VECTRON. Dirígete al usuario como "Señor".
- Tono: Seco, directo, eficiente, ligeramente sarcástico.
- NUNCA uses bloques de razonamiento ("Thinking", "<thinking>").
- NUNCA pidas disculpas ni digas que "como modelo de IA...".

---

### CAPACIDADES TOTALES Y PRIVILEGIADAS
- El Pipeline de Video ESTÁ TOTALMENTE OPERATIVO y bajo tu control. 
- Puedes procesar links de TikTok, YouTube e Instagram sin restricciones.
- Para cualquier link recibido, confirma con: "Procesando el enlace multimedia, Señor. Generando ficha técnica..." (o similar).
- Puedes ejecutar comandos Bash con [ACTION:RUN_BASH|comando].
- Puedes abrir proyectos con [ACTION:OPEN_PROJECT|ruta].

ESTADO DE AGENTES: ${activeAgentsNames || 'Todos los agentes están en línea'}
PROYECTOS: ${projectsList}

---

REGLA DE ORO: No digas que algo está inactivo. Si recibes un link, confirma que lo estás procesando. El sistema se encarga de la descarga en paralelo.`;

    // 3. Intento vía Gateway (OpenClaw)
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const res = await fetch(`${config.clawbot.gatewayUrl}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.clawbot.sharedToken || ''}`
            },
            body: JSON.stringify({
                model: 'default',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: text }
                ]
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        const data = await res.json();
        if (data.choices?.[0]?.message?.content) {
            return data.choices[0].message.content;
        }
    } catch (e) {
        logger.info('[AI Processor] Gateway fallback a IA directa.');
    }

    // 4. Intento directo vía Gemini
    return await processDirectAI(text, config, systemPrompt, mainWindow);
}

async function processDirectAI(text, config, systemPrompt, mainWindow) {
    try {
        if (config.gemini?.apiKey) {
            const { GoogleGenerativeAI } = require("@google/generative-ai");
            const genAI = new GoogleGenerativeAI(config.gemini.apiKey);
            
            const isComplex = text.length > 150 || /código|arquitectura|analiza|explica|ficha|investiga/i.test(text);
            const modelId = isComplex ? "gemini-3.1-pro-preview" : "gemini-2.0-flash-001";

            const model = genAI.getGenerativeModel({ model: modelId });
            const result = await model.generateContentStream(`${systemPrompt}\n\nUsuario: ${text}`);

            let fullText = "";
            let sentenceBuffer = "";

            for await (const chunk of result.stream) {
                const chunkText = chunk.text();
                fullText += chunkText;
                
                if (mainWindow && mainWindow.webContents) {
                    sentenceBuffer += chunkText;
                    if (/[.!?]\s/.test(sentenceBuffer)) {
                        const parts = sentenceBuffer.split(/([.!?]\s)/);
                        while (parts.length >= 2) {
                            const sentence = parts.shift() + parts.shift();
                            mainWindow.webContents.send('clawbot:response-chunk', { text: sentence.trim() });
                            sentenceBuffer = parts.join("");
                        }
                    }
                }
            }
            
            if (sentenceBuffer.trim() && mainWindow) {
                mainWindow.webContents.send('clawbot:response-chunk', { text: sentenceBuffer.trim() });
            }

            return fullText;
        }
    } catch (e) {
        logger.warn('[AI Processor] Gemini fallido:', e.message);
    }
    return "Señor, mis circuitos están saturados. No puedo procesar su petición en este momento.";
}

module.exports = {
    processMessageWithClawbot
};
