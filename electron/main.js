const electron = require('electron');
const logger = require('./ipc/logger');
const environment = require('./environment'); // Carga configuración .env
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

const { app, BrowserWindow, ipcMain, dialog, shell, Notification, protocol, net } = require('electron');

// Hardware Acceleration: Mantener habilitada para el renderizado visual de videos (V27)

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
// Se ha movido al bloque after app.ready para mayor seguridad en el arranque.

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
    
    let windowState = { width: 1400, height: 900, x: undefined, y: undefined };
    const statePath = path.join(DATA_DIR, 'window-state.json');
    
    try {
        if (fs.existsSync(statePath)) {
            windowState = JSON.parse(fs.readFileSync(statePath, 'utf8'));
        }
    } catch (e) {
        logger.warn('[Main] No se pudo cargar el estado de ventana previo.');
    }

    mainWindow = new BrowserWindow({
        width: windowState.width,
        height: windowState.height,
        x: windowState.x,
        y: windowState.y,
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

    if (windowState.isMaximized) {
        mainWindow.maximize();
    }

    // Mostrar la ventana cuando el contenido esté listo (evita pantalla negra)
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    const saveState = () => {
        try {
            const bounds = mainWindow.getBounds();
            const state = {
                ...bounds,
                isMaximized: mainWindow.isMaximized()
            };
            fs.writeFileSync(statePath, JSON.stringify(state));
        } catch (e) {
            // Ignore save errors
        }
    };

    mainWindow.on('resize', saveState);
    mainWindow.on('move', saveState);

    // Capturar errores de carga de la página
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
        logger.error(`[Main] Fallo cargando URL: ${validatedURL} — ${errorDescription} (code: ${errorCode})`);
    });

    mainWindow.webContents.on('did-finish-load', () => {
        logger.info('[Main] HTML cargado. Esperando render de React...');
    });

    // Capturar TODOS los logs/errores del renderer en la terminal
    mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
        const levels = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
        const tag = levels[level] || 'LOG';
        if (level >= 2) { // solo WARN y ERROR
            logger.error(`[Renderer:${tag}] ${message} (${sourceId}:${line})`);
        } else {
            logger.info(`[Renderer:${tag}] ${message}`);
        }
    });

    if (isDev) {
        const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:3123';
        logger.info(`[Main] Cargando URL de desarrollo: ${devUrl}`);
        mainWindow.loadURL(devUrl);
        // Abrir DevTools para diagnóstico en desarrollo
        mainWindow.webContents.openDevTools({ mode: 'detach' });
    } else {
        mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
    }

    // Fallback: si la ventana no se muestra en 8 segundos, forzar show
    setTimeout(() => {
        if (mainWindow && !mainWindow.isVisible()) {
            logger.warn('[Main] Timeout: forzando show de ventana.');
            mainWindow.show();
        }
    }, 8000);

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

if (app) {
    app.whenReady().then(async () => {
        // -- Inicializar Base de Datos (Fase Industrial) --
        let db;
        try {
            db = require('./db');
            await db.initDB(DATA_DIR);
        } catch (err) {
            logger.error('[DB] Fallo en arranque:', err);
        }

        if (protocol && typeof protocol.handle === 'function') {
            protocol.handle('devassist-video', (request) => {
                const { pathToFileURL } = require('url');
                const fileName = decodeURIComponent(request.url.replace('devassist-video://', ''));
                const filePath = path.join(DATA_DIR, 'videos', fileName);
                
                if (!fs.existsSync(filePath)) {
                    return new Response('Video not found', { status: 404 });
                }
                
                // RESTAURACIÓN V24: Usar net.fetch (Golden Method) para streaming por rangos
                // Esto soluciona la pantalla negra al permitir que el navegador solicite trozos del video.
                return net.fetch(pathToFileURL(filePath).toString());
            });
        }

        const visionHandlers = require('./ipc/vision');
        const { loadConfig } = require('./ipc/config');
        const dockerManager = require('./services/docker_manager');

        // Fase Industrial: Orquestación de Base de Datos
        try {
            logger.info('[Boot:DEBUG] Checkpoint 1: Orquestación Docker');
            const dockerStatus = await dockerManager.ensureDatabaseService();
            if (!dockerStatus.ok) {
                logger.error(`[Boot:ERROR] Falló la orquestación Docker: ${dockerStatus.message}`);
                dialog.showErrorBox(
                    'Fallo Crítico: Base de Datos No Disponible', 
                    `DevAssist no puede iniciar el motor de inteligencia (PostgreSQL).\n\nCausa: ${dockerStatus.message}\n\nPor favor, verifica que Docker Desktop esté iniciado y funcionando.`
                );
            }
        } catch (err) {
            logger.error('[Boot:STRIKE] Fallo catastrófico en boot Docker:', err.message);
        }

        logger.info('[Boot:DEBUG] Checkpoint 2: createWindow');
        createWindow();
        visionHandlers(ipcMain);

        // Register IPCs
        require('./ipc/config')(ipcMain, DATA_DIR, shell, dialog);
        require('./ipc/projects')(ipcMain, DATA_DIR, dialog, shell, exec);
        require('./ipc/fichas')(ipcMain, DATA_DIR, dialog, db);
        require('./ipc/notes')(ipcMain, DATA_DIR);
        require('./ipc/ai')(ipcMain);
        require('./ipc/notifications')(ipcMain, DATA_DIR);
        require('./ipc/fs')(ipcMain);
        require('./ipc/system')(ipcMain, DATA_DIR);
        require('./ipc/clawbot')(ipcMain, mainWindow);

        // Init Nexus (post-docker)
        try {
            logger.info('[Boot:DEBUG] Checkpoint 3: initNexus');
            const nexus = require('./db_nexus');
            await nexus.initNexus();
        } catch (err) {
            logger.error('[NEXUS] Error en init dentro de whenReady:', err.message);
        }
        require('./ipc/agents').registerAgentsHandlers(ipcMain);
        
        // Iniciar puente de comunicaciones con OpenClaw TESS (Port 4242)
        const { startIngestionServer } = require('./ipc/server');
        logger.info('[Boot:DEBUG] Checkpoint 4: startIngestionServer');
        startIngestionServer();

        // Iniciar Research Daemon Autónomo
        const { startResearchDaemon } = require('./daemon');
        logger.info('[Boot:DEBUG] Checkpoint 5: startResearchDaemon');
        startResearchDaemon();

        // Iniciar Project Watcher (Monitorización IA) (Fase 32)
        const projectWatcher = require('./services/project_watcher');
        projectWatcher.init();

        // Puente de Pulsos AI Hub (V8)
        const aiRotator = require('./services/ai_rotator');
        aiRotator.on('pulse', (data) => {
            if (mainWindow) {
                mainWindow.webContents.send('ai:pulse', data);
            }
        });

        // Puente de Logs (V8)
        logger.on('message', (data) => {
            if (mainWindow) {
                mainWindow.webContents.send('logger:message', data);
            }
        });

        // Registrar Integración Google (Fase 6)
        const googleHandlers = require('./ipc/google');
        googleHandlers(ipcMain);

        // Registrar Tutorial Engine (Fase 7)
        const tutorialHandlers = require('./ipc/tutorials');
        tutorialHandlers(ipcMain);

        // Registrar Tech Radar (Fase 8)
        const radarHandlers = require('./ipc/radar');
        radarHandlers(ipcMain);

        // Registrar Skills Module (Fase 11)
        const skillsHandlers = require('./ipc/skills');
        skillsHandlers(ipcMain, mainWindow);

        // Registrar Browsing & Gateway Diagnostics (Fase 16)
        const browsingHandlers = require('./ipc/browsing');
        browsingHandlers(ipcMain);

        // Iniciar Escáner de Skills (Fase 11) - 1 sugerencia diaria
        const skillIntelligence = require('./services/skill_intelligence');
        setTimeout(async () => {
            try {
                await skillIntelligence.scanClawHub();
                await skillIntelligence.generateDailySuggestion();
            } catch (err) {
                logger.error('[Skills] Error en escaneo inicial:', err.message);
            }
        }, 1000 * 60 * 2); // Esperar 2 minutos tras arranque

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
