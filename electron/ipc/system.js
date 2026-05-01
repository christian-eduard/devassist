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
                const stats = fs.statSync(LOG_FILE);
                const MAX_SIZE = 100 * 1024; // 100KB
                
                if (stats.size > MAX_SIZE) {
                    const fd = fs.openSync(LOG_FILE, 'r');
                    const buffer = Buffer.alloc(MAX_SIZE);
                    fs.readSync(fd, buffer, 0, MAX_SIZE, stats.size - MAX_SIZE);
                    fs.closeSync(fd);
                    return { 
                        ok: true, 
                        logs: `... (truncado por tamaño) ...\n${buffer.toString('utf-8')}`,
                        isTruncated: true
                    };
                }

                const logs = fs.readFileSync(LOG_FILE, 'utf-8');
                return { ok: true, logs, isTruncated: false };
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
