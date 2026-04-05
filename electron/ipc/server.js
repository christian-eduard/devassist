const http = require('http');
const { processTikTokUrl } = require('./fichas');
const { loadConfig } = require('./config');
const { chatWithAgent } = require('./agents');
const logger = require('./logger');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

const AUTH_TOKEN = '26e40563b27bfced68711596ce47334c772a3293bd41e9bdf70ca07c70f21c89';
const PORT = 4242;

// Envía mensaje de progreso de vuelta al canal de origen
async function sendProgressToChannel(message, channel = 'whatsapp') {
    try {
        const target = channel === 'telegram' ? 'tg:6541399577' : '34644984173';
        const openclawPath = '/Users/chris/homebrew/bin/openclaw';
        logger.info(`[Server:Notify] Enviando [${channel}] a ${target}: ${message.substring(0, 50)}...`);
        
        await execAsync(
            `${openclawPath} message send --channel ${channel} --target "${target}" --message "${message.replace(/"/g, '\\"')}"`,
            { timeout: 15000 }
        );
        logger.info(`[Server:Notify] OK`);
    } catch (e) {
        logger.warn(`[Server:Notify] No se pudo notificar por ${channel}: ${e.message}`);
    }
}

function startIngestionServer() {
    const server = http.createServer(async (req, res) => {
        if (req.method === 'POST' && req.url === '/clawbot') {
            const authHeader = req.headers['authorization'];
            if (authHeader !== `Bearer ${AUTH_TOKEN}`) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Unauthorized' }));
            }

            let body = '';
            req.on('data', chunk => { body += chunk.toString(); });
            req.on('end', async () => {
                try {
                    const data = JSON.parse(body);
                    const { type, url, message, source, chatId, channel } = data;
                    const config = await loadConfig();
                    const sourceChannel = channel || source || 'external';

                    logger.info(`[Server] Petición [${type}] de ${chatId} vía ${sourceChannel}`);

                    if (type === 'tiktok-link' || type === 'link') {
                        // Respuesta inmediata al cliente
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ response: "⏳ Procesando... Te iré informando del progreso." }));

                        // Iniciar ingesta asíncrona CON progreso
                        processTikTokUrl(url, config, {
                            channel: sourceChannel,
                            onProgress: async (msg) => {
                                logger.info(`[Server:Ingesta] ${msg}`);
                                // Enviar progreso de vuelta al canal de origen
                                await sendProgressToChannel(msg, sourceChannel);
                            }
                        }).then(result => {
                            if (result && result.duplicate) {
                                sendProgressToChannel(
                                    `⚠️ Enlace duplicado: "${result.existingTitle}"`,
                                    sourceChannel
                                );
                            } else if (result && result.title) {
                                sendProgressToChannel(
                                    `✅ Ficha lista: "${result.title}"`,
                                    sourceChannel
                                );
                            }
                        }).catch(e => {
                            logger.error(`[Server:Ingesta] Error: ${e.message}`);
                            sendProgressToChannel(
                                `❌ Error procesando enlace: ${e.message}`,
                                sourceChannel
                            );
                        });
                    } else {
                        // Mensaje de texto plano (procesado por TESS)
                        const response = await chatWithAgent(message || body, 'main', source || 'external');
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ response }));
                    }
                } catch (err) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Invalid JSON' }));
                }
            });
        } else if (req.method === 'GET' && req.url === '/health') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'ok', service: 'devassist-ingestion', port: PORT }));
        } else {
            res.writeHead(404);
            res.end();
        }
    });

    server.listen(PORT, '127.0.0.1', () => {
        logger.info(`[Server] Puente de Ingestión activo en http://127.0.0.1:${PORT}`);
    });
}

module.exports = { startIngestionServer };
