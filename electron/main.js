const { app, BrowserWindow, ipcMain, dialog, shell, Notification, protocol, net } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { exec } = require('child_process');
const logger = require('./ipc/logger');

app.setName('DevAssist');

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

// ── Data directory ──
const DATA_DIR = path.join(os.homedir(), '.devassist');
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(path.join(DATA_DIR, 'videos'))) {
    fs.mkdirSync(path.join(DATA_DIR, 'videos'), { recursive: true });
}

const isDev = !app.isPackaged;

let mainWindow = null;

// ── Webhook Server (Sprint 3) ──
const express = require('express');

function startWebhookServer(config, mainWindow) {
    if (!config.clawbot?.enabled) return;

    const serverApp = express();
    serverApp.use(express.json());

    const { processTikTokUrl } = require('./ipc/fichas');

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
            if (mainWindow) {
                mainWindow.webContents.send('clawbot:tiktok-processing', { url });
                setImmediate(async () => {
                    try {
                        mainWindow.webContents.send('clawbot:status', { msg: 'Descargando con yt-dlp...' });
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
                        new Notification({ title: 'DevAssist ✓', body: fichaCompleta.titulo }).show();
                    } catch (err) {
                        mainWindow.webContents.send('clawbot:error', { msg: err.message, url });
                        new Notification({ title: 'DevAssist — Error', body: err.message.slice(0, 100) }).show();
                    }
                });
            }
        }

        res.json({ ok: true });
    });

    const port = config.clawbot.webhookPort || 4242;
    serverApp.listen(port, '127.0.0.1', () => {
        logger.info(`[webhook] Servidor escuchando en http://localhost:${port}`);
    });
}

// ── Register IPC handlers ──
require('./ipc/config')(ipcMain, DATA_DIR, shell, dialog);
require('./ipc/projects')(ipcMain, DATA_DIR, dialog, shell, exec);
require('./ipc/fichas')(ipcMain, DATA_DIR, dialog);
require('./ipc/notes')(ipcMain, DATA_DIR);
require('./ipc/ai')(ipcMain, DATA_DIR);
require('./ipc/notifications')(ipcMain, DATA_DIR);

const clawbotHandlers = require('./ipc/clawbot');

// ── Create main window ──
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1100,
        minHeight: 700,
        titleBarStyle: 'hiddenInset',
        backgroundColor: '#07070f',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    // Register Clawbot handlers after window creation to pass mainWindow
    const configAtStartup = require('./ipc/config').loadConfig(DATA_DIR);
    clawbotHandlers(ipcMain, mainWindow, DATA_DIR, configAtStartup);

    if (isDev) {
        mainWindow.loadURL('http://localhost:3123');
    } else {
        mainWindow.loadFile(path.join(__dirname, '..', 'build', 'index.html'));
    }

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

        const pending = fichas.filter(
            (f) => !f.revisada && new Date(f.createdAt) < cutoff
        );

        if (pending.length > 0 && Notification.isSupported()) {
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
app.whenReady().then(async () => {
    // ── Register Video Protocol ──
    protocol.handle('devassist-video', (request) => {
        const { pathToFileURL } = require('url');
        const fileName = decodeURIComponent(request.url.replace('devassist-video://', ''));
        const filePath = path.join(DATA_DIR, 'videos', fileName);
        return net.fetch(pathToFileURL(filePath).toString());
    });

    const { loadConfig, saveConfig } = require('./ipc/config');
    let config = loadConfig(DATA_DIR);

    // macOS Notifications & Permissions
    if (process.platform === 'darwin') {
        const { systemPreferences } = require('electron');
        // Simple permission check (not requiring mic but triggering system init)
        if (typeof systemPreferences.askForMediaAccess === 'function') {
            await systemPreferences.askForMediaAccess('microphone').catch(() => false);
        }
    }

    // Auto-generate token if missing
    if (!config.clawbot.sharedToken) {
        config.clawbot.sharedToken = require('crypto').randomBytes(32).toString('hex');
        saveConfig(DATA_DIR, config);
    }

    createWindow();
    startWebhookServer(config, mainWindow);

    // Check reminders and start watchers
    setTimeout(() => {
        checkReminders();

        const configAtStartup = loadConfig(DATA_DIR);

        if (configAtStartup.watchFolder && fs.existsSync(configAtStartup.watchFolder)) {
            logger.info('[main] Auto-starting watcher on:', configAtStartup.watchFolder);
        }
    }, 3000);

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    app.quit();
});
