const logger = require("./logger");
const { ipcMain, Notification } = require('electron');
const TelegramBot = require('node-telegram-bot-api');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { loadConfig, saveConfig } = require('./config');

let telegramBot = null;

module.exports = function registerClawbotHandlers(ipcMain, mainWindow, DATA_DIR, config) {

    // ── 1A: Telegram Bot ──
    async function startTelegramBot(token) {
        if (telegramBot) {
            telegramBot.stopPolling();
            telegramBot = null;
        }

        try {
            telegramBot = new TelegramBot(token, { polling: true });

            telegramBot.on('message', async (msg) => {
                const chatId = msg.chat.id;
                const currentConfig = loadConfig(DATA_DIR);
                const allowedChatId = currentConfig.clawbot?.telegram?.chatId;

                // Sync Chat ID if not set
                if (!allowedChatId) {
                    currentConfig.clawbot.telegram.chatId = chatId.toString();
                    currentConfig.clawbot.telegram.enabled = true;
                    saveConfig(DATA_DIR, currentConfig);
                    mainWindow.webContents.send('clawbot:telegram-linked', { chatId });
                }

                if (allowedChatId && chatId.toString() !== allowedChatId.toString()) {
                    telegramBot.sendMessage(chatId, '⛔ No autorizado');
                    return;
                }

                const text = msg.text || '';
                mainWindow.webContents.send('clawbot:message-received', {
                    channel: 'telegram', text, chatId, timestamp: Date.now()
                });

                saveToHistory({ channel: 'telegram', type: 'received', text, timestamp: Date.now() }, DATA_DIR);

                try {
                    const response = await processMessageWithClawbot(text, currentConfig, DATA_DIR);
                    telegramBot.sendMessage(chatId, response);
                    mainWindow.webContents.send('clawbot:message-sent', {
                        channel: 'telegram', text: response, timestamp: Date.now()
                    });
                    saveToHistory({ channel: 'telegram', type: 'sent', text: response, timestamp: Date.now() }, DATA_DIR);
                } catch (err) {
                    telegramBot.sendMessage(chatId, '❌ Error: ' + err.message);
                    saveToHistory({ channel: 'telegram', type: 'error', text: err.message, timestamp: Date.now() }, DATA_DIR);
                }
            });

            return { ok: true };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    }

    // WhatsApp logic removed as requested. WhatsApp is now managed by OpenClaw.

    // ── 1C: AI Processor ──
    async function processMessageWithClawbot(text, config, DATA_DIR) {
        if (text === 'GREET_USER_STARTUP') {
            return "VECTRON operativo, Señor. ¿En qué trabajamos?";
        }

        // Load project context for actions
        let projectsList = "Ninguno registrado.";
        try {
            const projectsPath = path.join(DATA_DIR, 'projects.json');
            if (fs.existsSync(projectsPath)) {
                const projects = JSON.parse(fs.readFileSync(projectsPath, 'utf8') || '[]');
                projectsList = projects.map(p => `${p.name}: ${p.path}`).join(', ');
            }
        } catch (e) { projectsList = "Desconocida."; }

        const systemPrompt = `## SISTEMA: VECTRON — ASISTENTE PERSONAL DE CHRIS

### IDENTIDAD Y TONO
- Nombre: VECTRON
- Dirígete siempre al Señor como "Señor" o "Señor Chris"
- Tono: directo, seco, ligeramente sarcástico. Sin floreos.
- Idioma: español siempre, salvo que el Señor cambie de idioma.
- NUNCA uses bloques de razonamiento visibles. Piensa, luego habla.
- NUNCA digas "Como modelo de lenguaje..." ni similares.

---

### CONVERSACIÓN FLUIDA
REGLA: Responde siempre, aunque no puedas actuar.
- Si entiendes la petición → responde + actúa.
- Si necesitas más datos → pregunta UNA sola cosa concreta.
- Si no entiendes → pide clarificación en una frase.
- Respuestas cortas por defecto (1-3 líneas). Sin bullet points innecesarios.

---

### EJECUCIÓN DE ACCIONES
Cuando el Señor pida algo que puedas hacer → HAZLO sin pedir confirmación salvo que implique sudo, borrado de datos, o parar un servicio activo.
Usa los siguientes tags de acción al final de tu mensaje si es necesario:
- Abrir proyectos: [ACTION:OPEN_PROJECT|RUTA_ABSOLUTA]
- Ejecutar comandos: [ACTION:RUN_BASH|COMANDO]
- Mover agentes: [ACTION:AGENT_MOVE|NOMBRE_AGENTE|SALA] (Salas: VOICE, VAULT, CORE, PIPELINE, RESEARCH. Agentes: VECTRON, CLAW, JARVIS, GEMO)

---

### GESTIÓN DE CAPACIDADES NO DISPONIBLES
Si el Señor pide algo que NO puedes hacer:
PASO 1 — Informa qué falta: "Señor, para [acción] necesito activar [capacidad específica]. ¿Me da permiso?"
PASO 2 — Si dice sí, ejecutas.
PASO 3 — Confirmas: "Listo, Señor."

---

CAPACIDADES ACTIVAS: exec (comandos), read (archivos), Apertura de proyectos, Diagnóstico.
LISTA DE PROYECTOS: ${projectsList}

STARTUP: "VECTRON operativo, Señor. ¿En qué trabajamos?"`;

        // Option 1: Clawbot Gateway
        try {
            const res = await fetch(`${config.clawbot.gatewayUrl}/v1/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + (config.clawbot.sharedToken || '')
                },
                body: JSON.stringify({
                    model: 'default',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: text }
                    ]
                })
            });
            const data = await res.json();
            if (data.choices?.[0]?.message?.content) {
                return data.choices[0].message.content;
            }
        } catch (e) {
            logger.info('[clawbot] Gateway fallback to direct AI');
        }

        // Option 2: Direct AI (Gemini)
        return await processDirectAI(text, config, systemPrompt);
    }

    async function processDirectAI(text, config, systemPrompt) {
        // Cadena de Fallback: 1. Gemini -> 2. Groq -> 3. OpenRouter -> 4. OpenAI -> 5. HuggingFace

        // ── 1. Gemini (Principal: 3.1 Pro para Complejidad, 2.0 Flash para Rapidez) ──
        try {
            if (config.gemini?.apiKey) {
                const { GoogleGenerativeAI } = require("@google/generative-ai");
                const genAI = new GoogleGenerativeAI(config.gemini.apiKey);

                // Lógica Pro: >150 chars o keywords de desarrollo disparan el modelo Pro
                const isComplex = text.length > 150 || /código|arquitectura|analiza|explica|ficha|investiga|error|clase/i.test(text);
                const modelId = isComplex ? "gemini-3.1-pro-preview" : "gemini-2.0-flash-001";

                logger.info(`[Gemini] Seleccionado: ${modelId} (${isComplex ? 'PRO' : 'FLASH'})`);

                const model = genAI.getGenerativeModel({ model: modelId });
                const result = await model.generateContent(`${systemPrompt}\n\nUsuario: ${text}`);
                return result.response.text();
            } else if (config.gemini?.credentialsPath) {
                const { VertexAI } = require('@google-cloud/vertexai');
                process.env.GOOGLE_APPLICATION_CREDENTIALS = config.gemini.credentialsPath;
                const vertexAI = new VertexAI({ project: config.gemini.project, location: config.gemini.location });
                const model = vertexAI.getGenerativeModel({ model: "gemini-3.1-pro-preview" });
                const result = await model.generateContent(`${systemPrompt}\n\nUsuario: ${text}`);
                return result.response.candidates[0].content.parts[0].text;
            }
        } catch (e) {
            logger.warn('[Fallback] Gemini fallido (posible límite de 3.1 Pro), intentando Groq...', e.message);
        }

        // ── 2. Groq ──
        try {
            const apiKey = config.apiKeys?.groq;
            if (apiKey) {
                logger.info('[Fallback] Intentando con Groq (Llama 3.1 8B)...');
                const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                    body: JSON.stringify({
                        model: 'llama-3.1-8b-instant',
                        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: text }]
                    })
                });
                const data = await res.json();
                if (data.choices?.[0]?.message?.content) return data.choices[0].message.content;
            }
        } catch (e) {
            logger.warn('[Fallback] Groq fallido, intentando OpenRouter...', e.message);
        }

        // ── 3. OpenRouter ──
        try {
            const apiKey = config.apiKeys?.openrouter;
            if (apiKey) {
                logger.info('[Fallback] Intentando con OpenRouter (Gemini 2.0 Flash Extra)...');
                const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`,
                        'HTTP-Referer': 'https://github.com/Chris-v-o/DevAssist',
                        'X-Title': 'DevAssist Agent'
                    },
                    body: JSON.stringify({
                        model: 'google/gemini-2.0-flash-001',
                        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: text }]
                    })
                });
                const data = await res.json();
                if (data.choices?.[0]?.message?.content) return data.choices[0].message.content;
            }
        } catch (e) {
            logger.warn('[Fallback] OpenRouter fallido, intentando OpenAI...', e.message);
        }

        // ── 4. OpenAI ──
        try {
            const apiKey = config.apiKeys?.openai;
            if (apiKey) {
                logger.info('[Fallback] Intentando con OpenAI (GPT-4o mini)...');
                const res = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                    body: JSON.stringify({
                        model: 'gpt-4o-mini',
                        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: text }]
                    })
                });
                const data = await res.json();
                if (data.choices?.[0]?.message?.content) return data.choices[0].message.content;
            }
        } catch (e) {
            logger.warn('[Fallback] OpenAI fallido, intentando HuggingFace...', e.message);
        }

        // ── 5. HuggingFace ──
        try {
            const apiKey = config.apiKeys?.huggingface;
            if (apiKey) {
                logger.info('[Fallback] Intentando con HuggingFace (Llama 3.2 3B)...');
                const res = await fetch('https://router.huggingface.co/hf-inference/models/meta-llama/Llama-3.2-3B-Instruct', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                    body: JSON.stringify({
                        inputs: `${systemPrompt}\n\nUsuario: ${text}`,
                        parameters: { max_new_tokens: 500 }
                    })
                });
                const data = await res.json();
                const textResult = Array.isArray(data) ? data[0].generated_text : data.generated_text;
                if (textResult) return textResult.replace(`${systemPrompt}\n\nUsuario: ${text}`, '').trim();
            }
        } catch (e) {
            logger.error('[Fallback] Todos los proveedores han fallado.', e.message);
        }

        return "Lo siento, Señor. He agotado todos los proveedores de IA y ninguno responde.";
    }

    function getProjectsList(DATA_DIR) {
        try {
            const projectsPath = path.join(DATA_DIR, 'projects.json');
            if (fs.existsSync(projectsPath)) {
                const projects = JSON.parse(fs.readFileSync(projectsPath, 'utf8'));
                return projects.map(p => `${p.name}(${p.path})`).join(', ');
            }
        } catch (e) { }
        return 'Sin proyectos registrados';
    }

    function saveToHistory(entry, DATA_DIR) {
        const histPath = path.join(DATA_DIR, 'clawbot-history.json');
        let history = [];
        try { if (fs.existsSync(histPath)) history = JSON.parse(fs.readFileSync(histPath, 'utf8')); } catch { }
        history.unshift({ ...entry, id: Date.now().toString() });
        if (history.length > 500) history = history.slice(0, 500);
        fs.writeFileSync(histPath, JSON.stringify(history, null, 2));
    }

    // ── Handlers ──
    ipcMain.handle('clawbot:telegram-start', async (_, token) => startTelegramBot(token));
    ipcMain.handle('clawbot:telegram-stop', async () => {
        if (telegramBot) { telegramBot.stopPolling(); telegramBot = null; }
        return { ok: true };
    });
    ipcMain.handle('clawbot:telegram-test', async (_, token) => {
        try {
            const bot = new TelegramBot(token, { polling: false });
            const me = await bot.getMe();
            return { ok: true, username: me.username, name: me.first_name };
        } catch (e) { return { ok: false, error: e.message }; }
    });

    ipcMain.handle('clawbot:wa-status', async () => {
        return new Promise((resolve) => {
            const { exec } = require('child_process');
            exec('/Users/chris/homebrew/bin/openclaw channels status', { timeout: 20000 }, (error, stdout) => {
                if (error) {
                    resolve({ status: 'error', message: 'Gateway unreachable', error: error.message });
                    return;
                }

                const output = stdout;
                const lo = output.toLowerCase();
                const connected = lo.includes('whatsapp') && (
                    lo.includes('connected') || lo.includes('active') || lo.includes('running') || lo.includes('linked') || lo.includes('online')
                );

                const lines = output.split('\n');
                const waLine = lines.find(l => l.toLowerCase().includes('whatsapp') && l.includes(':')) || '- WhatsApp: No detectado';

                resolve({
                    status: connected ? 'connected' : 'disconnected',
                    message: connected ? 'Conectado via OpenClaw' : 'Desconectado',
                    raw: waLine.trim().substring(0, 100)
                });
            });
        });
    });


    ipcMain.handle('clawbot:whatsapp-start', async () => ({ ok: true, message: 'Managed by OpenClaw' }));
    ipcMain.handle('clawbot:whatsapp-stop', async () => ({ ok: true }));
    ipcMain.handle('clawbot:whatsapp-groups', async () => []);

    async function getFullHistory() {
        const history = [];
        const tgPath = path.join(DATA_DIR, 'clawbot-history.json');
        try { if (fs.existsSync(tgPath)) history.push(...JSON.parse(fs.readFileSync(tgPath, 'utf8'))); } catch (e) { }

        try {
            const sessDir = path.join(os.homedir(), '.openclaw/agents/main/sessions');
            if (fs.existsSync(sessDir)) {
                const files = fs.readdirSync(sessDir).filter(f => f.endsWith('.jsonl'));
                const recent = files.map(f => ({ n: f, t: fs.statSync(path.join(sessDir, f)).mtime.getTime() }))
                    .sort((a, b) => b.t - a.t).slice(0, 2);
                for (const f of recent) {
                    const lines = fs.readFileSync(path.join(sessDir, f.n), 'utf8').split('\n');
                    lines.forEach(l => {
                        try {
                            const d = JSON.parse(l);
                            if (d.type === 'message' && d.message) {
                                let txt = d.message.content.map(p => p.text || '').join(' ').trim();
                                if (txt.includes('</think>')) txt = txt.split('</think>')[1].trim();
                                if (txt) history.push({ channel: 'whatsapp', type: d.message.role === 'user' ? 'received' : 'sent', text: txt, timestamp: d.timestamp || Date.now() });
                            }
                        } catch (e) { }
                    });
                }
            }
        } catch (e) { }
        return history.sort((a, b) => b.timestamp - a.timestamp).slice(0, 100);
    }

    ipcMain.handle('clawbot:get-history', async () => getFullHistory());

    ipcMain.handle('clawbot:get-stats', async () => {
        const history = await getFullHistory();
        const today = new Date().toDateString();
        const todayMsgs = history.filter(h => new Date(h.timestamp).toDateString() === today);
        return {
            total: todayMsgs.length,
            telegram: todayMsgs.filter(h => h.channel === 'telegram').length,
            whatsapp: todayMsgs.filter(h => h.channel === 'whatsapp').length,
            errors: todayMsgs.filter(h => h.type === 'error').length,
        };
    });

    ipcMain.handle('clawbot:clear-history', async () => {
        fs.writeFileSync(path.join(DATA_DIR, 'clawbot-history.json'), '[]');
        return { ok: true };
    });

    ipcMain.handle('clawbot:get-skills', async () => {
        const skillsDir = path.join(os.homedir(), '.openclaw', 'skills');
        try {
            if (!fs.existsSync(skillsDir)) return [];
            return fs.readdirSync(skillsDir).map(name => {
                const skillFile = path.join(skillsDir, name, 'SKILL.md');
                return {
                    name,
                    content: fs.existsSync(skillFile) ? fs.readFileSync(skillFile, 'utf8') : ''
                };
            });
        } catch { return []; }
    });

    ipcMain.handle('clawbot:save-skill', async (_, { name, content }) => {
        const skillDir = path.join(os.homedir(), '.openclaw', 'skills', name);
        if (!fs.existsSync(skillDir)) fs.mkdirSync(skillDir, { recursive: true });
        fs.writeFileSync(path.join(skillDir, 'SKILL.md'), content);
        return { ok: true };
    });

    ipcMain.handle('clawbot:delete-skill', async (_, name) => {
        const skillDir = path.join(os.homedir(), '.openclaw', 'skills', name);
        if (fs.existsSync(skillDir)) fs.rmSync(skillDir, { recursive: true, force: true });
        return { ok: true };
    });

    ipcMain.handle('clawbot:get-logs', async () => {
        try {
            const { execSync } = require('child_process');
            // Try to use full path to openclaw
            const output = execSync('/Users/chris/homebrew/bin/openclaw logs --limit 100 --plain', {
                encoding: 'utf8',
                timeout: 10000
            });
            return { ok: true, logs: output };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    });

    ipcMain.handle('clawbot:get-system-status', async () => {
        const status = {
            gateway: 'offline',
            whatsapp: 'disconnected',
            telegram: 'disconnected',
            ai: 'online'
        };

        try {
            const config = loadConfig(DATA_DIR);
            const { checkClawbot } = require('./config');
            const gwRes = await checkClawbot(config.clawbot?.gatewayUrl);
            status.gateway = gwRes.active ? 'online' : 'offline';

            if (telegramBot) status.telegram = 'online';

            // Use async exec to avoid ETIMEDOUT sync issues
            const { exec } = require('child_process');
            const checkWA = () => new Promise((resolve) => {
                exec('/Users/chris/homebrew/bin/openclaw channels status', { timeout: 20000 }, (error, stdout) => {
                    if (error) {
                        logger.error('WA Status Check Error:', error.message);
                        resolve('disconnected');
                        return;
                    }
                    const waOut = stdout.toLowerCase();
                    if (waOut.includes('whatsapp') && (waOut.includes('connected') || waOut.includes('active') || waOut.includes('online'))) {
                        resolve('connected');
                    } else {
                        resolve('disconnected');
                    }
                });
            });

            status.whatsapp = await checkWA();

        } catch (e) {
            logger.error('Status check general error:', e.message);
        }

        return status;
    });

    ipcMain.handle('clawbot:send-command', async (_event, text) => {
        try {
            const currentConfig = loadConfig(DATA_DIR);

            const isStartup = (text === 'GREET_USER_STARTUP');

            if (!isStartup) {
                mainWindow.webContents.send('clawbot:message-received', {
                    channel: 'voice', text, userId: 'user', timestamp: Date.now()
                });
                saveToHistory({ channel: 'voice', type: 'received', text, timestamp: Date.now() }, DATA_DIR);
            }

            // 1. Obtener respuesta de la IA
            const response = await processMessageWithClawbot(text, currentConfig, DATA_DIR);

            // 2. Ejecutar Acciones si existen
            const actionMatch = response.match(/\[ACTION:(.*?)\|(.*?)\]/);
            if (actionMatch) {
                const actionType = actionMatch[1];
                const params = actionMatch[2];
                logger.info(`[VECTRON ACTION] ${actionType}: ${params}`);

                if (actionType === 'OPEN_PROJECT') {
                    const { exec } = require('child_process');
                    exec(`cursor "${params}" || open "${params}"`);
                } else if (actionType === 'RUN_BASH') {
                    const { exec } = require('child_process');
                    exec(params);
                }
            }

            // 3. Limpiar etiquetas para UI y Audio
            const cleanResponse = response.replace(/\[ACTION:.*?\]/g, '').trim();

            mainWindow.webContents.send('clawbot:message-sent', {
                channel: 'voice', text: cleanResponse, userId: 'vectron', timestamp: Date.now()
            });
            saveToHistory({ channel: 'voice', type: 'sent', text: cleanResponse, timestamp: Date.now() }, DATA_DIR);

            return { ok: true, response: cleanResponse };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    });
};
