const logger = require('./logger');
const fs = require('fs');
const path = require('path');
const os = require('os');
const net = require('net');

module.exports = function registerSystemHandlers(ipcMain, dataDir) {
    const LOG_FILE = path.join(dataDir, 'app.log');

    ipcMain.handle('system:get-logs', async () => {
        try {
            if (fs.existsSync(LOG_FILE)) {
                const logs = fs.readFileSync(LOG_FILE, 'utf-8');
                return { ok: true, logs };
            }
            return { ok: true, logs: 'Archivo de logs no encontrado.' };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    });

    ipcMain.handle('system:get-system-status', async () => {
        try {
            return {
                status: 'online',
                gateway: 'unavailable',
                ai: 'online',
                version: '1.5.0-clean',
                platform: process.platform,
                uptime: process.uptime()
            };
        } catch (err) {
            return { status: 'error', gateway: 'none', ai: 'error' };
        }
    });
};
