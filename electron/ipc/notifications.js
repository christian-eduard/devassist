const db = require('../db');
const logger = require('./logger');

module.exports = function registerNotificationHandlers(ipcMain) {
    ipcMain.handle('notifications:load', async () => {
        try {
            return await db.getNotifications();
        } catch (err) {
            logger.error('[notifications:load] Error:', err.message);
            return [];
        }
    });

    ipcMain.handle('notifications:save', async (_event, notifications) => {
        try {
            // Guardar en paralelo para máximo rendimiento Postgres
            await Promise.all(notifications.map(n => db.saveNotification(n)));
            return { ok: true };
        } catch (err) {
            logger.error('[notifications:save] Error:', err.message);
            return { ok: false, error: err.message };
        }
    });
};
