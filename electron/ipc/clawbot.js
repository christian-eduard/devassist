const { ipcMain, net } = require('electron');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');
const { isAgentActive, touchAgentActivity } = require('./agents_manager');
const { loadConfig } = require('./config');

module.exports = function registerClawbotHandlers(ipcMain, mainWindow, DATA_DIR, config) {

    const { processMessageWithClawbot } = require('./ai_processor');

    // ── 1D: History Manager ──
    function loadHistory(dataDir) {
        const filePath = path.join(dataDir, 'history.json');
        try {
            if (fs.existsSync(filePath)) {
                return JSON.parse(fs.readFileSync(filePath, 'utf8'));
            }
        } catch (e) { }
        return [];
    }

    function saveToHistory(entry, dataDir) {
        const filePath = path.join(dataDir, 'history.json');
        try {
            let history = loadHistory(dataDir);
            history.push(entry);
            if (history.length > 200) history = history.slice(-200);
            fs.writeFileSync(filePath, JSON.stringify(history, null, 2));
        } catch (e) { }
    }

    ipcMain.handle('clawbot:get-history', async () => loadHistory(DATA_DIR));
    ipcMain.handle('clawbot:clear-history', async () => {
        const filePath = path.join(DATA_DIR, 'history.json');
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        return { ok: true };
    });

    ipcMain.handle('clawbot:get-system-status', async () => {
        const status = {
            whatsapp: 'checking'
        };

        try {
            const checkWA = async () => {
                return new Promise((resolve) => {
                    const req = net.request({ method: 'GET', protocol: 'http:', hostname: '127.0.0.1', port: 18789, path: '/' });
                    req.on('response', (res) => {
                        resolve(res.statusCode === 200 ? 'connected' : 'disconnected');
                    });
                    req.on('error', () => resolve('disconnected'));
                    req.end();
                });
            };
            const waRes = await checkWA();
            status.whatsapp = waRes;
            status.status = waRes;
            status.message = waRes === 'connected' ? 'Conectado via OpenClaw' : 'Desconectado';
        } catch (e) {
            logger.error('Status check general error:', e.message);
        }
        return status;
    });


    ipcMain.handle('clawbot:send-command', async (_event, text) => {
        logger.info(`[IPC] Comando recibido: ${text}`);
        if (text && (text.startsWith('ERROR_REPORT:') || text.startsWith('DEBUG_TTS:') || text.startsWith('LOG:'))) {
            if (text.startsWith('ERROR_REPORT:')) logger.error(`[Renderer Crash] ${text}`);
            else logger.info(`[Renderer Debug] ${text}`);
            return { ok: true };
        }
        try {
            const currentConfig = loadConfig(DATA_DIR);
            const isStartup = (text === 'GREET_USER_STARTUP');

            if (!isStartup) {
                mainWindow.webContents.send('clawbot:message-received', {
                    channel: 'voice', text, userId: 'user', timestamp: Date.now()
                });
                saveToHistory({ channel: 'voice', type: 'received', text, timestamp: Date.now() }, DATA_DIR);
            }

            if (!isAgentActive(DATA_DIR, 'voz_vectron') && !isStartup) {
                // Agent check logic...
            } else if (!isStartup) {
                touchAgentActivity(DATA_DIR, 'voz_vectron');
            }

            const response = await processMessageWithClawbot(text, currentConfig, DATA_DIR, mainWindow);
            
            if (!response) return { ok: false, error: 'Respuesta vacía' };

            const actionMatch = response.match(/\[ACTION:(.*?)\|(.*?)\]/);
            if (actionMatch) {
                if (!isAgentActive(DATA_DIR, 'antigravity_control')) {
                    const cleanResponse = response.replace(/\[ACTION:.*?\]/g, '').trim() + "\n\n(Nota: El agente 'Control Antigravity' está desactivado).";
                    mainWindow.webContents.send('clawbot:response-chunk', { text: cleanResponse });
                    return { ok: true, response: cleanResponse };
                }
                touchAgentActivity(DATA_DIR, 'antigravity_control');
                const actionType = actionMatch[1];
                const params = actionMatch[2];
                if (actionType === 'OPEN_PROJECT') {
                    const { exec } = require('child_process');
                    exec(`cursor "${params}" || open "${params}"`);
                } else if (actionType === 'RUN_BASH') {
                    const { exec } = require('child_process');
                    exec(params);
                }
            }

            const cleanResponse = response.replace(/\[ACTION:.*?\]/g, '').trim();
            if (mainWindow && mainWindow.webContents) {
                // If not already sent by chunks in ai_processor
                mainWindow.webContents.send('clawbot:message-sent', {
                    channel: 'voice', text: cleanResponse, userId: 'vectron', timestamp: Date.now()
                });
            }
            saveToHistory({ channel: 'voice', type: 'sent', text: cleanResponse, timestamp: Date.now() }, DATA_DIR);
            return { ok: true, response: cleanResponse };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    });

    // ── Telegram Bot ──
    // (Re-importado para mantener funcionalidad)
    const TelegramBot = require('node-telegram-bot-api');
    let telegramBot = null;
    
    async function startTelegramBot(token) {
        if (telegramBot) { telegramBot.stopPolling(); telegramBot = null; }
        try {
            telegramBot = new TelegramBot(token, { polling: true });
            telegramBot.on('message', async (msg) => {
                const chatId = msg.chat.id;
                const currentConfig = loadConfig(DATA_DIR);
                const allowedChatId = currentConfig.clawbot?.telegram?.chatId;
                if (!allowedChatId) {
                    currentConfig.clawbot.telegram.chatId = chatId.toString();
                    currentConfig.clawbot.telegram.enabled = true;
                    require('./config').saveConfig(DATA_DIR, currentConfig);
                }
                const text = msg.text || '';
                if (text.includes('tiktok.com') || text.includes('youtube.com')) {
                    if (isAgentActive(DATA_DIR, 'video_pipeline')) touchAgentActivity(DATA_DIR, 'video_pipeline');
                }
                const response = await processMessageWithClawbot(text, currentConfig, DATA_DIR, mainWindow);
                telegramBot.sendMessage(chatId, response);
                saveToHistory({ channel: 'telegram', type: 'received', text, timestamp: Date.now() }, DATA_DIR);
                saveToHistory({ channel: 'telegram', type: 'sent', text: response, timestamp: Date.now() }, DATA_DIR);
            });
            return { ok: true };
        } catch (e) { return { ok: false, error: e.message }; }
    }

    if (config.clawbot?.telegram?.enabled && config.clawbot?.telegram?.token) {
        startTelegramBot(config.clawbot.telegram.token);
    }
};
