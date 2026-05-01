const net = require('net');
const logger = require('./logger');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

module.exports = function registerBrowsingHandlers(ipcMain) {
    
    // Función para testear si un puerto está abierto
    const checkPort = (port) => {
        return new Promise((resolve) => {
            const socket = new net.Socket();
            const onError = () => {
                socket.destroy();
                resolve(false);
            };
            socket.setTimeout(1500);
            socket.on('error', onError);
            socket.on('timeout', onError);
            socket.connect(port, '127.0.0.1', () => {
                socket.destroy();
                resolve(true);
            });
        });
    };

    const getConfig = () => {
        try {
            const configPath = path.join(process.env.HOME, '.openclaw', 'openclaw.json');
            if (fs.existsSync(configPath)) {
                return JSON.parse(fs.readFileSync(configPath, 'utf8'));
            }
        } catch (e) {
            logger.error('[Browsing] Error leyendo openclaw.json:', e.message);
        }
        return null;
    };

    ipcMain.handle('browsing:get-status', async () => {
        try {
            const config = getConfig();
            const port = config?.gateway?.port || 18789;
            const token = config?.gateway?.auth?.token;
            
            const gatewayUp = await checkPort(port);
            const ingestionUp = await checkPort(4242);
            
            let extensionStatus = 'missing_tab';
            if (gatewayUp && token) {
                try {
                    // Consultar clientes conectados al gateway si tiene API de status
                    const response = await axios.get(`http://127.0.0.1:${port}/status`, {
                        headers: { 'Authorization': `Bearer ${token}` },
                        timeout: 1000
                    });
                    // Si el gateway responde con clientes, verificamos si hay un browser
                    const clients = response.data.clients || [];
                    extensionStatus = clients.some(c => c.type === 'browser') ? 'connected' : 'missing_tab';
                } catch (e) {
                    extensionStatus = 'unauthorized_or_no_api';
                }
            }

            return {
                gateway: gatewayUp ? 'online' : 'offline',
                ingestion: ingestionUp ? 'online' : 'offline',
                extension: extensionStatus,
                port: port
            };
        } catch (err) {
            logger.error('[Browsing] Error en check-status:', err.message);
            return { gateway: 'error', ingestion: 'error', extension: 'unknown' };
        }
    });

    ipcMain.handle('browsing:restart-gateway', async () => {
        logger.info('[Browsing] Solicitud de reinicio de OpenClaw Gateway...');
        try {
            const environment = require('../environment');
            // Intentar detener si existe
            exec('pkill -f openclaw', (err) => {
                // Independientemente del error de pkill, intentamos arrancar
                const openclawBin = environment.getOpenClawPath();
                exec(`${openclawBin} gateway start`, (startErr) => {
                    if (startErr) {
                        logger.error('[Browsing] Fallo al arrancar Gateway:', startErr.message);
                    } else {
                        logger.info('[Browsing] Gateway arrancado correctamente.');
                    }
                });
            });
            return { ok: true, message: 'Se ha enviado la señal de reinicio. El servicio puede tardar unos segundos en volver a línea.' };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    });
};
