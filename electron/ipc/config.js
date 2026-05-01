const logger = require("./logger");
const fs = require('fs');
const path = require('path');
const http = require('http');
const os = require('os');

const db = require('../db');

const DEFAULT_CONFIG = {
    gemini: {
        apiKey: '',
        credentialsPath: '',
        project: '',
        location: 'us-central1',
        model: 'gemini-2.5-flash',
    },
    apiKeys: {
        openrouter: '',
        groq: '',
        openai: '',
        huggingface: '',
        anthropic: '',
    },
    aiAssignments: {
        'vault-transcribe': { provider: 'groq', model: 'whisper-large-v3' },
        'vault-analyze': { provider: 'gemini', model: 'gemini-2.5-flash' },
        'vault-research': { provider: 'openrouter', model: 'google/gemini-2.5-flash' },
        'vault-matcher': { provider: 'openai', model: 'gpt-4o-mini' },
        'vault-explore': { provider: 'groq', model: 'llama-3.3-70b-versatile' },
    },
    providers: [],
    watchFolder: '',
    reminderDays: 7,
    antigravityAppName: 'Antigravity',
};

async function loadConfig() {
    try {
        const stored = await db.getSettings();
        let config = { ...DEFAULT_CONFIG };
        if (stored && stored.app_config) {
            config = { ...config, ...stored.app_config };
        }
        
        // Persistencia crítica: Si no hay clave en BD, usar la del entorno
        if (!config.gemini?.apiKey && process.env.GOOGLE_API_KEY) {
            config.gemini = config.gemini || {};
            config.gemini.apiKey = process.env.GOOGLE_API_KEY;
        }

        return config;
    } catch (err) {
        logger.error('[config:load] Error from Postgres:', err.message);
    }
    return { ...DEFAULT_CONFIG };
}

async function saveConfig(config) {
    await db.saveSetting('app_config', config);
}

module.exports = function registerConfigHandlers(ipcMain, dataDir, shell, dialog) {
    ipcMain.handle('config:load', async () => {
        return loadConfig();
    });

    ipcMain.handle('config:save', async (_event, config) => {
        saveConfig(config);
        return { ok: true };
    });

    ipcMain.handle('config:check-ytdlp', async () => {
        const { exec } = require('child_process');
        return new Promise((resolve) => {
            exec('yt-dlp --version', (err, stdout) => {
                if (err) resolve({ ok: false });
                else resolve({ ok: true, version: stdout.trim() });
            });
        });
    });

    ipcMain.handle('config:open-url', async (_event, url) => {
        if (url) shell.openExternal(url);
        return { ok: true };
    });

    ipcMain.handle('config:select-credentials-file', async () => {
        const result = await dialog.showOpenDialog({
            title: 'Seleccionar credentials.json de Google Cloud',
            filters: [{ name: 'JSON', extensions: ['json'] }],
            properties: ['openFile']
        });
        if (!result.canceled && result.filePaths.length > 0) {
            return result.filePaths[0];
        }
        return null;
    });

    ipcMain.handle('config:get-cache-stats', async () => {
        const videosDir = path.join(dataDir, 'videos');
        try {
            if (!fs.existsSync(videosDir)) return { count: 0, sizeMB: '0.0' };
            const files = fs.readdirSync(videosDir).filter(f => /\.(mp4|webm|mkv|mov)$/.test(f));
            const totalSize = files.reduce((sum, f) => {
                try {
                    return sum + fs.statSync(path.join(videosDir, f)).size;
                } catch { return sum; }
            }, 0);
            return { count: files.length, sizeMB: (totalSize / 1024 / 1024).toFixed(1) };
        } catch (err) {
            return { count: 0, sizeMB: '0.0' };
        }
    });

    ipcMain.handle('config:clear-cache', async () => {
        const videosDir = path.join(dataDir, 'videos');
        try {
            if (!fs.existsSync(videosDir)) return { ok: true, freed: '0.0', count: 0 };
            const files = fs.readdirSync(videosDir).filter(f => /\.(mp4|webm|mkv|mov)$/.test(f));
            let freed = 0;
            let deletedCount = 0;
            for (const f of files) {
                const p = path.join(videosDir, f);
                try {
                    freed += fs.statSync(p).size;
                    fs.unlinkSync(p);
                    deletedCount++;
                } catch (e) {
                    logger.error(`[config:clear-cache] Failed to delete ${f}:`, e.message);
                }
            }
            return { ok: true, freed: (freed / 1024 / 1024).toFixed(1), count: deletedCount };
        } catch (e) {
            return { ok: false, error: e.message };
        }
    });

    ipcMain.handle('config:load-openclaw', async () => {
        const ocPath = path.join(os.homedir(), '.openclaw', 'openclaw.json');
        try {
            if (!fs.existsSync(ocPath)) return null;
            const content = fs.readFileSync(ocPath, 'utf8');
            return JSON.parse(content);
        } catch (err) {
            logger.error('[config:load-openclaw] Error:', err.message);
            return null;
        }
    });

    ipcMain.handle('config:save-openclaw', async (_event, ocConfig) => {
        const ocPath = path.join(os.homedir(), '.openclaw', 'openclaw.json');
        try {
            fs.writeFileSync(ocPath, JSON.stringify(ocConfig, null, 2));
            return { ok: true };
        } catch (err) {
            logger.error('[config:save-openclaw] Error:', err.message);
            return { ok: false, error: err.message };
        }
    });
};

module.exports.loadConfig = loadConfig;
module.exports.saveConfig = saveConfig;
