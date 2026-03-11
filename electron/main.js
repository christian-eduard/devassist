const electron = require('electron');
const logger = require('./ipc/logger');

process.on('uncaughtException', (error) => {
    logger.error('[Main] Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('[Main] Unhandled Rejection at:', promise, 'reason:', reason);
});
const { app, BrowserWindow, ipcMain, dialog, shell, Notification, protocol, net } =
    (typeof electron === 'string') ? {} : electron;

if (protocol && typeof protocol.registerSchemesAsPrivileged === 'function') {
    protocol.registerSchemesAsPrivileged([
        {
            scheme: 'devassist-video',
            privileges: {
                secure: true,
                supportFetchAPI: true,
                bypassCSP: true,
                stream: true
            }
        }
    ]);
}

const path = require('path');
const fs = require('fs');
const os = require('os');
const { exec } = require('child_process');
// Logger ya importado al inicio

// ── Data directory ──
const DATA_DIR = path.join(os.homedir(), '.devassist');
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(path.join(DATA_DIR, 'videos'))) {
    fs.mkdirSync(path.join(DATA_DIR, 'videos'), { recursive: true });
}

const isDev = app ? !app.isPackaged : true;

let mainWindow = null;

// ── Webhook Server (Sprint 3) ──
const express = require('express');

function startWebhookServer(config, mainWindow) {
    if (!config.clawbot?.enabled) return;

    const serverApp = express();
    serverApp.use(express.json());

    const { processTikTokUrl } = require('./ipc/fichas');
    const { processMessageWithClawbot } = require('./ipc/ai_processor');

    serverApp.get('/status', (req, res) => {
        try {
            const fichasPath = path.join(DATA_DIR, 'fichas.json');
            let fichasCount = 0;
            if (fs.existsSync(fichasPath)) {
                const fichas = JSON.parse(fs.readFileSync(fichasPath, 'utf8') || '[]');
                fichasCount = fichas.length;
            }
            res.json({
                ok: true,
                fichas: fichasCount,
                uptime: process.uptime(),
                memory: process.memoryUsage().rss
            });
        } catch (err) {
            res.status(500).json({ ok: false, error: err.message });
        }
    });

    serverApp.get('/clawbot', (req, res) => {
        res.json({ ok: true, status: 'online', service: 'DevAssist Webhook' });
    });

    serverApp.post('/clawbot', (req, res) => {
        const authHeader = req.headers.authorization;
        if (authHeader !== `Bearer ${config.clawbot.sharedToken}`) {
            logger.warn('[webhook] Unauthorized access attempt');
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { type, filePath, fileName, source, url } = req.body;
        logger.info(`[webhook] Evento recibido: ${type} desde ${source}`);

        if (type === 'ping') {
            return res.json({ ok: true, message: 'Pong, Señor.' });
        }

        if (type === 'new-video' && config.clawbot.autoReceiveVideos) {
            if (mainWindow) {
                mainWindow.webContents.send('clawbot:new-video', { filePath, fileName, source });
            }
        }

        if (type === 'monitor-project') {
            if (mainWindow) {
                mainWindow.webContents.send('clawbot:project-event', req.body);
                mainWindow.webContents.send('vectron:notify', {
                    title: 'PROJECT MONITOR',
                    message: `Evento detectado en ${req.body.projectName || 'Proyecto'}: ${req.body.event || 'Cambio detectado'}`,
                    type: 'info'
                });
            }
        }

        if (type === 'tiktok-link') {
            const { isAgentActive } = require('./ipc/agents_manager');
            if (!isAgentActive(DATA_DIR, 'video_pipeline')) {
                logger.warn('[webhook] TikTok link recibido pero Agente Pipeline de Video está DESACTIVADO.');
                if (mainWindow) {
                    mainWindow.webContents.send('vectron:notify', {
                        title: 'PIPELINE DESACTIVADO',
                        message: "Se ha recibido un link de TikTok, pero el agente 'Pipeline de Video' está apagado. Actívelo en Ajustes.",
                        type: 'warning'
                    });
                }
                return res.json({ ok: false, error: 'Agent disabled' });
            }

            if (mainWindow) {
                mainWindow.webContents.send('clawbot:tiktok-processing', { url });
                setImmediate(async () => {
                    try {
                        mainWindow.webContents.send('clawbot:status', { msg: 'Descargando con yt-dlp...' });
                        const { isAgentActive, touchAgentActivity } = require('./ipc/agents_manager');
                        touchAgentActivity(DATA_DIR, 'video_pipeline');
                        const { ficha, videoPath, videoName } = await processTikTokUrl(url, config);

                        const fichaCompleta = {
                            ...ficha,
                            id: Date.now().toString(),
                            fuente: 'TikTok',
                            tiktokUrl: url,
                            videoName,
                            videoPath,
                            modeloIA: config.gemini.model,
                            createdAt: new Date().toISOString(),
                            revisada: false,
                            origen: 'automatico-clawbot'
                        };

                        const fichasPath = path.join(DATA_DIR, 'fichas.json');
                        let fichas = [];
                        try {
                            if (fs.existsSync(fichasPath)) {
                                fichas = JSON.parse(fs.readFileSync(fichasPath, 'utf8') || '[]');
                            }
                        } catch { fichas = []; }
                        fichas.unshift(fichaCompleta);
                        fs.writeFileSync(fichasPath, JSON.stringify(fichas, null, 2));

                        mainWindow.webContents.send('clawbot:ficha-created', fichaCompleta);
                        if (Notification) new Notification({ title: 'DevAssist ✓', body: fichaCompleta.titulo }).show();
                    } catch (err) {
                        mainWindow.webContents.send('clawbot:error', { msg: err.message, url });
                        if (Notification) new Notification({ title: 'DevAssist — Error', body: err.message.slice(0, 100) }).show();
                    }
                });

                // Respondemos de inmediato para que OpenClaw se lo diga al usuario y NO dé un error
                return res.json({ 
                    ok: true, 
                    response: "Procesando el enlace multimedia, Señor. Generando ficha técnica...",
                    text: "Procesando el enlace multimedia, Señor. Generando ficha técnica...",
                    reply: "Procesando el enlace multimedia, Señor. Generando ficha técnica...",
                    audio: false,
                    voice: false
                });
            }
        }

        if (type === 'message' || (!type && req.body.text)) {
            const { isAgentActive, touchAgentActivity } = require('./ipc/agents_manager');
            const messageText = req.body.text || req.body.message || '';
            
            logger.info(`[webhook] Nuevo mensaje de WhatsApp recibido: "${messageText.substring(0, 30)}..."`);
            
            // Loguear en historial para traza (como canal whatsapp)
            const historyEntry = { channel: 'whatsapp', type: 'received', text: messageText, timestamp: Date.now() };
            const historyPath = path.join(DATA_DIR, 'history.json');
            try {
                let history = [];
                if (fs.existsSync(historyPath)) history = JSON.parse(fs.readFileSync(historyPath, 'utf8') || '[]');
                history.push(historyEntry);
                fs.writeFileSync(historyPath, JSON.stringify(history.slice(-200), null, 2));
            } catch (e) { logger.error('Error saving history webhook:', e.message); }

            // 1. Detección de link TikTok/YouTube
            if (messageText.includes('tiktok.com') || messageText.includes('youtube.com')) {
                if (isAgentActive(DATA_DIR, 'video_pipeline')) {
                    const urlMatch = messageText.match(/https?:\/\/[^\s]+/);
                    if (urlMatch) {
                        const tiktokUrl = urlMatch[0];
                        logger.info(`[webhook] Detectado link en mensaje WhatsApp: ${tiktokUrl}. Disparando pipeline.`);
                        touchAgentActivity(DATA_DIR, 'video_pipeline');
                        setImmediate(() => {
                            processTikTokUrl(tiktokUrl, config).catch(e => logger.error('[webhook] Error en pipeline:', e));
                        });
                    }
                }
            }

            // 2. Respuesta de IA
            return processMessageWithClawbot(messageText, config, DATA_DIR, mainWindow)
                .then(response => {
                    logger.info(`[webhook] Respuesta de IA para WhatsApp generada (${response.length} chars)`);
                    // Registrar respuesta en historial
                    try {
                        let history = JSON.parse(fs.readFileSync(historyPath, 'utf8') || '[]');
                        history.push({ channel: 'whatsapp', type: 'sent', text: response, timestamp: Date.now() });
                        fs.writeFileSync(historyPath, JSON.stringify(history.slice(-200), null, 2));
                    } catch (e) { }

                    // Devolvemos todos los campos posibles para máxima compatibilidad
                    return res.json({ 
                        ok: true, 
                        response: response, 
                        text: response, 
                        reply: response,
                        audio: false,
                        voice: false
                    });
                })
                .catch(err => {
                    logger.error('[webhook] Error procesando IA para WhatsApp:', err.message);
                    res.status(500).json({ ok: false, error: err.message });
                });
        }

        return res.json({ 
            ok: true, 
            response: "Petición recibida, Señor. Procesando...",
            text: "Petición recibida, Señor. Procesando...",
            reply: "Petición recibida, Señor. Procesando...",
            audio: false,
            voice: false
        });
    });

    const port = config.clawbot.webhookPort || 4242;
    serverApp.listen(port, '127.0.0.1', () => {
        logger.info(`[webhook] Servidor escuchando en http://localhost:${port}`);
    });
}

// ── Register IPC handlers ──
if (ipcMain) {
    require('./ipc/config')(ipcMain, DATA_DIR, shell, dialog);
    require('./ipc/projects')(ipcMain, DATA_DIR, dialog, shell, exec);
    require('./ipc/fichas')(ipcMain, DATA_DIR, dialog);
    require('./ipc/notes')(ipcMain, DATA_DIR);
    require('./ipc/ai')(ipcMain, DATA_DIR);
    require('./ipc/notifications')(ipcMain, DATA_DIR);
    require('./ipc/fs')(ipcMain);
    require('./ipc/agents_manager')(ipcMain, DATA_DIR);
}

const clawbotHandlers = require('./ipc/clawbot');

// ── Create main window ──
function createWindow() {
    if (!BrowserWindow) return;
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1100,
        minHeight: 700,
        titleBarStyle: 'hiddenInset',
        backgroundColor: '#07070f',
        show: false, // Ocultar hasta maximizar para evitar parpadeo
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    mainWindow.maximize();
    logger.info('[Main] Ventana maximizada y lista para mostrar.');
    
    // VECTRON FIX: Abrir DevTools para depuración inmediata del Señor
    mainWindow.webContents.openDevTools();
    
    mainWindow.show();

    const configAtStartup = require('./ipc/config').loadConfig(DATA_DIR);
    if (ipcMain) clawbotHandlers(ipcMain, mainWindow, DATA_DIR, configAtStartup);

    if (isDev) {
        logger.info('[Main] Intentando cargar URL de desarrollo: http://localhost:3123');
        
        let retries = 0;
        const maxRetries = 15;
        
        const tryLoadUrl = () => {
            mainWindow.loadURL('http://localhost:3123').catch(err => {
                retries++;
                if (retries < maxRetries) {
                    logger.info(`[Main] Servidor dev no responde, reintento ${retries}/${maxRetries} en 2s...`);
                    setTimeout(tryLoadUrl, 2000);
                } else {
                    logger.error('[Main] Servidor dev no respondió. Fallback al build de producción.');
                    const buildPath = path.join(__dirname, '..', 'build', 'index.html');
                    mainWindow.loadFile(buildPath);
                }
            });
        };
        tryLoadUrl();
    } else {
        const buildPath = path.join(__dirname, '..', 'build', 'index.html');
        logger.info(`[Main] Cargando archivo de producción: ${buildPath}`);
        mainWindow.loadFile(buildPath);
    }

    mainWindow.webContents.on('did-finish-load', () => {
        logger.info('[Main] La ventana principal ha terminado de cargar.');
    });

    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        logger.error(`[Main] Fallo al cargar la ventana: ${errorCode} - ${errorDescription}`);
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// ── Reminder check at startup ──
function checkReminders() {
    try {
        const { loadConfig } = require('./ipc/config');
        const config = loadConfig(DATA_DIR);
        const reminderDays = config.reminderDays || 7;
        if (reminderDays <= 0) return;

        const fichasPath = path.join(DATA_DIR, 'fichas.json');
        if (!fs.existsSync(fichasPath)) return;

        const fichas = JSON.parse(fs.readFileSync(fichasPath, 'utf-8'));
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - reminderDays);
        cutoff.setHours(0, 0, 0, 0);

        const pending = fichas.filter(
            (f) => !f.revisada && new Date(f.createdAt) < cutoff
        );

        if (pending.length > 0 && Notification && Notification.isSupported()) {
            new Notification({
                title: 'DevAssist',
                body: `Tienes ${pending.length} ficha${pending.length > 1 ? 's' : ''} pendiente${pending.length > 1 ? 's' : ''} de revisar`,
            }).show();
        }
    } catch (err) {
        logger.error('[reminders] Error:', err.message);
    }
}

// ── App lifecycle ──
if (app) {
    app.whenReady().then(async () => {
        if (protocol && typeof protocol.handle === 'function') {
            protocol.handle('devassist-video', (request) => {
                const { pathToFileURL } = require('url');
                const fileName = decodeURIComponent(request.url.replace('devassist-video://', ''));
                const filePath = path.join(DATA_DIR, 'videos', fileName);
                return net.fetch(pathToFileURL(filePath).toString());
            });
        }

        const visionHandlers = require('./ipc/vision');
        const { loadConfig, saveConfig } = require('./ipc/config');
        let config = loadConfig(DATA_DIR);

        // macOS Notifications & Permissions
        if (process.platform === 'darwin') {
            const { systemPreferences } = require('electron');
            if (systemPreferences && typeof systemPreferences.askForMediaAccess === 'function') {
                await systemPreferences.askForMediaAccess('microphone').catch(() => false);
            }
        }

        // Auto-generate token if missing
        if (!config.clawbot.sharedToken) {
            config.clawbot.sharedToken = require('crypto').randomBytes(32).toString('hex');
            saveConfig(DATA_DIR, config);
        }

        createWindow();
        visionHandlers(ipcMain);
        startWebhookServer(config, mainWindow);

        // TAREA 1: Pre-Warming (VECTRON V3.0)
        setTimeout(async () => {
            console.log('[Main] Enviando pings de pre-calentamiento a VECTRON Voice...');
            try {
                const { net } = require('electron');
                net.fetch('http://localhost:5001/warmup').catch(() => { });
                net.fetch('http://localhost:5002/warmup').catch(() => { });
            } catch (e) { }
        }, 5000);

        setTimeout(() => {
            checkReminders();
        }, 3000);

        app.on('activate', () => {
            if (BrowserWindow && BrowserWindow.getAllWindows().length === 0) {
                createWindow();
            }
        });
    });

    app.on('window-all-closed', () => {
        app.quit();
    });
}
