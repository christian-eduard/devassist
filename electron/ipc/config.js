const logger = require("./logger");
const fs = require('fs');
const path = require('path');
const http = require('http');
const os = require('os');

const CONFIG_FILE = 'config.json';
const OPENCLAW_CONFIG = path.join(os.homedir(), '.openclaw', 'openclaw.json');

const DEFAULT_CONFIG = {
    gemini: {
        apiKey: '',
        credentialsPath: '',
        project: '',
        location: 'us-central1',
        model: 'gemini-2.0-flash-001',
    },
    apiKeys: {
        openrouter: '',
        groq: '',
        openai: '',
        huggingface: '',
        elevenlabs: '',
        anthropic: '',
    },
    aiAssignments: {
        'vault-analyze': { provider: 'gemini', model: 'gemini-2.0-flash-001' },
        'vault-summarize': { provider: 'gemini', model: 'gemini-2.0-flash-001' },
    },
    providers: [],
    clawbot: {
        enabled: false,
        gatewayUrl: 'http://localhost:18789',
        webhookPort: 4242,
        sharedToken: '',
        autoReceiveVideos: true,
        telegram: {
            botToken: '',
            chatId: '',
            enabled: false,
            botUsername: ''
        },
        whatsapp: {
            groupName: 'DevAssist Agent',
            enabled: false,
            connected: false
        }
    },
    whatsapp: {
        watcherEnabled: false,
        chatName: 'Chris Personal',
        lastCheckDate: 0,
    },
    watchFolder: '',
    reminderDays: 7,
    antigravityAppName: 'Antigravity',
};

function loadConfig(dataDir) {
    const filePath = path.join(dataDir, CONFIG_FILE);
    try {
        if (fs.existsSync(filePath)) {
            const raw = fs.readFileSync(filePath, 'utf-8');
            return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
        }
    } catch (err) {
        logger.error('[config:load] Error reading config:', err.message);
    }
    return { ...DEFAULT_CONFIG };
}

function saveConfig(dataDir, config) {
    const filePath = path.join(dataDir, CONFIG_FILE);
    fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf-8');
}

function checkClawbot(url) {
    return new Promise((resolve) => {
        const fullUrl = new URL('/health', url || 'http://localhost:18789');
        const req = http.get(fullUrl.href, { timeout: 2000 }, (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => resolve({ active: res.statusCode === 200, data }));
        });
        req.on('error', () => resolve({ active: false, data: null }));
        req.on('timeout', () => {
            req.destroy();
            resolve({ active: false, data: null });
        });
    });
}

module.exports = function registerConfigHandlers(ipcMain, dataDir, shell, dialog) {
    ipcMain.handle('config:load', async () => {
        return loadConfig(dataDir);
    });

    ipcMain.handle('config:save', async (_event, config) => {
        saveConfig(dataDir, config);
        return { ok: true };
    });

    ipcMain.handle('config:check-clawbot', async () => {
        const config = loadConfig(dataDir);
        const result = await checkClawbot(config.clawbot?.gatewayUrl);
        return result;
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



    ipcMain.handle('config:get-openclaw-ai', async () => {
        try {
            if (!fs.existsSync(OPENCLAW_CONFIG)) return null;
            const data = JSON.parse(fs.readFileSync(OPENCLAW_CONFIG, 'utf-8'));
            return {
                model: data.agents?.defaults?.model || {},
                heartbeat: data.agents?.defaults?.heartbeat || {},
                env: data.env || {}
            };
        } catch (e) { return null; }
    });

    ipcMain.handle('config:save-openclaw-ai', async (_event, updates) => {
        try {
            if (!fs.existsSync(OPENCLAW_CONFIG)) return { ok: false, error: 'openclaw.json not found' };
            let config = JSON.parse(fs.readFileSync(OPENCLAW_CONFIG, 'utf-8'));

            if (updates.env) {
                config.env = { ...config.env, ...updates.env };
            }
            if (updates.model) {
                config.agents.defaults.model = { ...config.agents.defaults.model, ...updates.model };
            }

            fs.writeFileSync(OPENCLAW_CONFIG, JSON.stringify(config, null, 2));
            return { ok: true };
        } catch (e) { return { ok: false, error: e.message }; }
    });

    ipcMain.handle('config:open-url', async (_event, url) => {
        if (url) shell.openExternal(url);
        return { ok: true };
    });

    ipcMain.handle('config:open-clawbot-site', async () => {
        shell.openExternal('https://docs.openclaw.ai');
        return { ok: true };
    });

    ipcMain.handle('config:install-skill-clawbot', async () => {
        try {
            const config = loadConfig(dataDir);
            const os = require('os');
            const skillPath = path.join(os.homedir(), '.openclaw', 'skills', 'devassist');
            if (!fs.existsSync(skillPath)) {
                fs.mkdirSync(skillPath, { recursive: true });
            }

            const chatName = config.whatsapp?.chatName || 'Chris Personal';

            const skillContent = `# DevAssist — WhatsApp TikTok Watcher

## Tu misión
Monitoriza ChatStorage.sqlite de WhatsApp Mac cada 30 segundos.
Detecta mensajes nuevos con enlaces de TikTok en el chat "${chatName}".
Envía cada enlace nuevo al webhook de DevAssist.

## Base de datos
~/Library/Group Containers/group.net.whatsapp.WhatsApp.shared/ChatStorage.sqlite

## Por cada resultado nuevo
Extrae la URL con regex: /(https?:\\/\\/(?:www\\.|vm\\.)?tiktok\\.com\\/[^\\s]+)/

Envía POST a http://localhost:4242/clawbot:
{
  "type": "tiktok-link",
  "url": "<url extraída>",
  "rawText": "<texto completo del mensaje>",
  "source": "whatsapp-${chatName.toLowerCase().replace(/\s+/g, '-')}"
}
Header: Authorization: Bearer ${config.clawbot.sharedToken}

## Estado persistente
Guarda ZMESSAGEDATE del último mensaje procesado para no reprocesar.`;

            fs.writeFileSync(path.join(skillPath, 'SKILL.md'), skillContent);
            return { ok: true };
        } catch (err) {
            return { ok: false, error: err.message };
        }
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
        const os = require('os');
        const videosDir = path.join(os.homedir(), '.devassist', 'videos');
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
        const os = require('os');
        const videosDir = path.join(os.homedir(), '.devassist', 'videos');
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
};

module.exports.loadConfig = loadConfig;
module.exports.saveConfig = saveConfig;
module.exports.checkClawbot = checkClawbot;
