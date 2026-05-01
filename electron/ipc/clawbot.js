const { exec } = require('child_process');
// Lazy-loaded: node-telegram-bot-api crashes on Electron 28's Node runtime (readable-stream incompatibility)
let TelegramBot = null;
const qrcode = require('qrcode');
const { loadConfig, saveConfig } = require('./config');
const { processTikTokUrl } = require('./fichas');
const { chatWithAgent } = require('./agents');
const logger = require('./logger');

let tgBot = null;
let waClient = null;
let currentWaQr = null;

function isUrl(text) {
    const regex = /(https?:\/\/[^\s]+)/g;
    return text.match(regex);
}

// Envía progreso al bot correspondiente (si existe un chat_id o phoneNumber)
async function sendToUser(platform, destination, message) {
    try {
        if (platform === 'telegram' && tgBot) {
            await tgBot.sendMessage(destination, message);
        } else if (platform === 'whatsapp' && waClient) {
            // Asegurar que el destino es un JID válido si solo recibimos número
            const target = destination.includes('@') ? destination : `${destination.replace(/\D/g, '')}@c.us`;
            await waClient.sendMessage(target, message);
        }
    } catch (e) {
        logger.error(`[Clawbot] Error enviando mensaje a ${platform}:`, e);
    }
}

async function handleMessage(text, platform, destination, config) {
    logger.info(`[Clawbot] Mensaje recibido [${platform}] de ${destination}: "${text}"`);
    const urls = isUrl(text);
    if (!urls) {
        // Integración con TESS para mensajes directos
        const response = await chatWithAgent(text, 'main', platform);
        await sendToUser(platform, destination, response);
        return;
    }

    const url = urls[0];
    await sendToUser(platform, destination, `Reconocido enlace: ${url}\nIniciando ingesta en DevAssist...`);

    try {
        await processTikTokUrl(url, config, {
            onProgress: (msg) => sendToUser(platform, destination, msg)
        });
        await sendToUser(platform, destination, `Registro finalizado con éxito. Guardado en el Vault.`);
    } catch (err) {
        await sendToUser(platform, destination, `Falla en la ingesta: ${err.message}`);
    }
}

function initTelegram(config) {
    if (!config.clawbot_telegramEnabled || !config.clawbot_telegramToken) {
        if (tgBot) {
            tgBot.stopPolling();
            tgBot = null;
            logger.info('[Clawbot] Telegram apagado.');
        }
        return;
    }

    if (!tgBot) {
        try {
            if (!TelegramBot) TelegramBot = require('node-telegram-bot-api');
        } catch (err) {
            logger.error('[Clawbot] No se pudo cargar node-telegram-bot-api:', err.message);
            return;
        }
        tgBot = new TelegramBot(config.clawbot_telegramToken, { polling: true });
        logger.info('[Clawbot] Telegram iniciado.');

        tgBot.on('message', async (msg) => {
            const chatId = msg.chat.id;
            const text = msg.text || '';
            const freshConfig = await loadConfig(); // refresh config for keys
            handleMessage(text, 'telegram', chatId, freshConfig);
        });

        tgBot.on('polling_error', (error) => {
            logger.error('[Clawbot] Telegram Polling Error:', error);
        });
    }
}

function initWhatsApp(config, mainWindow) {
    // WHATSAPP ELIMINADO TOTALMENTE POR SOLICITUD DEL USUARIO
    return;
}

module.exports = function registerClawbotHandlers(ipcMain, mainWindow) {
    // TESS: Desactivamos bot interno para evitar conflictos con el gateway OpenClaw (Port 18789)
    // El gateway es ahora el único punto de entrada de comunicaciones.
    // loadConfig().then(config => {
    //     initTelegram(config);
    //     initWhatsApp(config, mainWindow);
    // });

    ipcMain.handle('clawbot:sync-config', async (event, configChanges) => {
        const config = await loadConfig();
        const merged = { ...config, ...configChanges };
        await saveConfig(merged);
        // TESS: NO re-inicializar bots internos. OpenClaw Gateway es el único dueño de canales.
        // initTelegram(merged);
        // initWhatsApp(merged, mainWindow);
        return { ok: true };
    });

    ipcMain.handle('clawbot:get-wa-status', () => {
        if (!waClient) return { status: 'disconnected' };
        if (currentWaQr) return { status: 'waiting_qr', qr: currentWaQr };
        return { status: 'connected' };
    });
};
