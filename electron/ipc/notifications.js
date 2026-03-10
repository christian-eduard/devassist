const fs = require('fs');
const path = require('path');
const logger = require('./logger');

const NOTIFICATIONS_FILE = 'notifications.json';

function loadNotifications(dataDir) {
    const filePath = path.join(dataDir, NOTIFICATIONS_FILE);
    try {
        if (fs.existsSync(filePath)) {
            return JSON.parse(fs.readFileSync(filePath, 'utf-8') || '[]');
        }
    } catch (err) {
        logger.error('[notifications:load] Error:', err.message);
    }
    return [];
}

function saveNotifications(dataDir, notifications) {
    const filePath = path.join(dataDir, NOTIFICATIONS_FILE);
    try {
        // Guardamos máximo 100 para no saturar el JSON
        const toSave = notifications.slice(0, 100);
        fs.writeFileSync(filePath, JSON.stringify(toSave, null, 2), 'utf-8');
    } catch (err) {
        logger.error('[notifications:save] Error:', err.message);
    }
}

module.exports = function registerNotificationHandlers(ipcMain, dataDir) {
    ipcMain.handle('notifications:load', async () => {
        return loadNotifications(dataDir);
    });

    ipcMain.handle('notifications:save', async (_event, notifications) => {
        saveNotifications(dataDir, notifications);
        return { ok: true };
    });
};
