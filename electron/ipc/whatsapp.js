const fs = require('fs');
const path = require('path');
const os = require('os');
const Database = require('better-sqlite3');

let watcherInterval = null;

function startWhatsAppWatcher(mainWindow, config, dataDir) {
    if (watcherInterval) clearInterval(watcherInterval);
    if (!config.whatsapp?.watcherEnabled) return;

    const dbPath = path.join(os.homedir(), 'Library/Group Containers/group.net.whatsapp.WhatsApp.shared/ChatStorage.sqlite');
    if (!fs.existsSync(dbPath)) {
        console.warn('[whatsapp] DB not found at:', dbPath);
        return;
    }

    console.log('[whatsapp] Starting watcher for chat:', config.whatsapp.chatName);

    watcherInterval = setInterval(() => {
        try {
            const { loadConfig, saveConfig } = require('./config');
            const currentConfig = loadConfig(dataDir);
            if (!currentConfig.whatsapp.watcherEnabled) {
                clearInterval(watcherInterval);
                return;
            }

            const db = new Database(dbPath, { readonly: true });
            const lastCheck = currentConfig.whatsapp.lastCheckDate || (Date.now() / 1000 - 978307200);

            const query = `
                SELECT ZWAMESSAGE.ZTEXT, ZWAMESSAGE.ZMESSAGEDATE
                FROM ZWAMESSAGE
                JOIN ZWACHATSESSION ON ZWAMESSAGE.ZCHATSESSION = ZWACHATSESSION.Z_PK
                WHERE ZWACHATSESSION.ZPARTNERNAME = ?
                  AND ZWAMESSAGE.ZTEXT LIKE '%tiktok.com%'
                  AND ZWAMESSAGE.ZMESSAGEDATE > ?
                ORDER BY ZWAMESSAGE.ZMESSAGEDATE DESC
                LIMIT 20
            `;

            const rows = db.prepare(query).all(currentConfig.whatsapp.chatName, lastCheck);

            if (rows.length > 0) {
                console.log(`[whatsapp] Detected ${rows.length} new potential TikTok links`);

                // Update last check date to the newest message
                const newest = rows[0].ZMESSAGEDATE;
                currentConfig.whatsapp.lastCheckDate = newest;
                saveConfig(dataDir, currentConfig);

                rows.forEach(row => {
                    const tiktokRegex = /(https?:\/\/(?:www\.|vm\.)?tiktok\.com\/[^\s]+)/;
                    const match = row.ZTEXT.match(tiktokRegex);
                    if (match) {
                        const url = match[0];
                        console.log('[whatsapp] TikTok link detected:', url);
                        mainWindow.webContents.send('whatsapp:tiktok-detected', { url });
                    }
                });
            }

            db.close();
        } catch (err) {
            console.error('[whatsapp] Watcher error:', err.message);
        }
    }, 30000);
}

module.exports = function registerWhatsAppHandlers(ipcMain, dataDir) {
    ipcMain.handle('whatsapp:start-watcher', (event) => {
        const { loadConfig } = require('./config');
        const config = loadConfig(dataDir);
        const mainWindow = require('electron').BrowserWindow.fromWebContents(event.sender);
        startWhatsAppWatcher(mainWindow, config, dataDir);
        return { ok: true };
    });

    ipcMain.handle('whatsapp:stop-watcher', () => {
        if (watcherInterval) {
            clearInterval(watcherInterval);
            watcherInterval = null;
        }
        return { ok: true };
    });
};

module.exports.startWhatsAppWatcher = startWhatsAppWatcher;
