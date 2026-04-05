const { exec } = require('child_process');
const TelegramBot = require('node-telegram-bot-api');
const { Client, LocalAuth } = require('whatsapp-web.js');
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
    if (!config.clawbot_whatsappEnabled) {
        if (waClient) {
            waClient.destroy();
            waClient = null;
            currentWaQr = null;
            logger.info('[Clawbot] WhatsApp apagado.');
            if (mainWindow) mainWindow.webContents.send('clawbot:wa-status', { status: 'disconnected' });
        }
        return;
    }

    if (!waClient) {
        logger.info('[Clawbot] Iniciando WhatsApp...');
        if (mainWindow) mainWindow.webContents.send('clawbot:wa-status', { status: 'starting' });

        waClient = new Client({
            authStrategy: new LocalAuth({ dataPath: './.devassist/whatsapp_auth' }),
            puppeteer: {
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-accelerated-2d-canvas', '--no-first-run', '--no-zygote', '--single-process', '--disable-gpu']
            }
        });

        waClient.on('qr', async (qrRaw) => {
            logger.info('[Clawbot] QR de WhatsApp generado.');
            try {
                currentWaQr = await qrcode.toDataURL(qrRaw);
                if (mainWindow) mainWindow.webContents.send('clawbot:wa-qr', currentWaQr);
            } catch (err) {
                logger.error('[Clawbot] Error generando QR imagen:', err);
            }
        });

        waClient.on('ready', () => {
            logger.info('[Clawbot] WhatsApp Listo y Conectado.');
            currentWaQr = null;
            if (mainWindow) mainWindow.webContents.send('clawbot:wa-status', { status: 'connected' });
        });

        waClient.on('message', async (message) => {
            const text = message.body || '';
            const from = message.from;
            // Opcional: whitelist from el numero que dio el usuario, pero lo abrimos a cualquier numero q lo contacte?
            // "te voy pasando los datos del whasap que seria el numero : 644 984 173"
            const freshConfig = await loadConfig();
            handleMessage(text, 'whatsapp', from, freshConfig);
        });

        waClient.on('disconnected', (reason) => {
            logger.info('[Clawbot] WhatsApp desconectado:', reason);
            if (mainWindow) mainWindow.webContents.send('clawbot:wa-status', { status: 'disconnected' });
            waClient = null;
            currentWaQr = null;
            // auto restart si sigue activado
            setTimeout(async () => {
                const conf = await loadConfig();
                initWhatsApp(conf, mainWindow);
            }, 5000);
        });

        waClient.initialize().catch(err => {
            logger.error('[Clawbot] Error inicializando WhatsApp:', err);
        });
    }
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
