const electron = require('electron');
const logger = require('./ipc/logger');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { exec } = require('child_process');

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

const DATA_DIR = path.join(os.homedir(), '.devassist');

// -- Inicializar Base de Datos SQLite (legacy local) --
try {
    const db = require('./db');
    (async () => {
        await db.initDB(DATA_DIR);
    })();
} catch (err) {
    logger.error('[DB] Fallo crítico al inicializar base de datos local:', err);
}

// -- Nexus PostgreSQL -- inicializado en app.whenReady después de registrar IPC

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(path.join(DATA_DIR, 'videos'))) {
    fs.mkdirSync(path.join(DATA_DIR, 'videos'), { recursive: true });
}

const isDev = app ? !app.isPackaged : true;
let mainWindow = null;

function createWindow() {
    if (!BrowserWindow) return;
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1100,
        minHeight: 700,
        titleBarStyle: 'hiddenInset',
        backgroundColor: '#07070f',
        show: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    mainWindow.maximize();
    mainWindow.show();

    if (isDev) {
        let retries = 0;
        const maxRetries = 15;
        const tryLoadUrl = () => {
            mainWindow.loadURL('http://localhost:3123').catch(err => {
                retries++;
                if (retries < maxRetries) {
                    setTimeout(tryLoadUrl, 2000);
                } else {
                    mainWindow.loadFile(path.join(__dirname, '..', 'build', 'index.html'));
                }
            });
        };
        tryLoadUrl();
    } else {
        mainWindow.loadFile(path.join(__dirname, '..', 'build', 'index.html'));
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

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
        const { loadConfig } = require('./ipc/config');

        createWindow();
        visionHandlers(ipcMain);

        // Register IPCs
        require('./ipc/config')(ipcMain, DATA_DIR, shell, dialog);
        require('./ipc/projects')(ipcMain, DATA_DIR, dialog, shell, exec);
        require('./ipc/fichas')(ipcMain, DATA_DIR, dialog);
        require('./ipc/notes')(ipcMain, DATA_DIR);
        require('./ipc/ai')(ipcMain);
        require('./ipc/notifications')(ipcMain, DATA_DIR);
        require('./ipc/fs')(ipcMain);
        require('./ipc/system')(ipcMain, DATA_DIR);
        require('./ipc/clawbot')(ipcMain, mainWindow);

        // Init Nexus (migrations + seed TESS) → luego registramos agents IPC
        try {
            const nexus = require('./db_nexus');
            await nexus.initNexus();
        } catch (err) {
            logger.error('[NEXUS] Error en init dentro de whenReady:', err.message);
        }
        require('./ipc/agents').registerAgentsHandlers(ipcMain);
        
        // Iniciar puente de comunicaciones con OpenClaw TESS (Port 4242)
        const { startIngestionServer } = require('./ipc/server');
        startIngestionServer();

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
