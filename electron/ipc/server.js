const http = require('http');
const { processTikTokUrl } = require('./fichas');
const { loadConfig } = require('./config');
const { chatWithAgent } = require('./agents');
const logger = require('./logger');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

const environment = require('../environment');
const ai = require('../services/ai_rotator');
const AUTH_TOKEN = process.env.INGESTION_AUTH_TOKEN || '26e40563b27bfced68711596ce47334c772a3293bd41e9bdf70ca07c70f21c89';
const PORT = parseInt(process.env.PORT || '4242');

// Envía mensaje de progreso de vuelta al canal de origen (SOLO Telegram)
async function sendProgressToChannel(message, channel = 'local') {
    if (channel === 'whatsapp') return; // CANAL ELIMINADO
    try {
        const targets = environment.getNotificationTargets();
        const target = channel === 'telegram' ? (targets.telegram || 'tg:guest') : null;
        if (!target) return;

        const openclawPath = environment.getOpenClawPath();
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
                    } else if (type === 'vault-query') {
                        // Semantic search integration
                        const { searchVault } = require('./db_nexus'); // Assuming implemented
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ response: `⏳ Buscando en tu Knowledge Vault: "${message}"...` }));

                        try {
                            const { loadConfig } = require('./config');
                            const config = await loadConfig();
                            
                            // 1. Vectorize query
                            const queryVector = await ai.generateEmbedding(message);

                            if (!queryVector) {
                                sendProgressToChannel(`⚠️ Búsqueda fallida: Fallo en la vectorización semántica con Gemini.`, sourceChannel);
                                return;
                            }

                            // 2. Search Database via pgvector
                            const results = await searchVault(queryVector, 4);
                            if (results.length === 0) {
                                sendProgressToChannel(`🔍 No encontré información en tu Knowledge Vault relacionada con esta consulta.`, sourceChannel);
                                return;
                            }

                            const vaultContext = results.map((r, i) => `[Doc ${i+1}]: ${r.investigacion_profunda?.substring(0, 1000) || r.transcripcion?.substring(0, 500)}`).join('\n\n');

                            // 3. Summarize using Llama/Gemini (OpenRouter fallback for flexibility)
                            const openrouterKey = config.apiKeys?.openrouter;
                            let finalAnswer = "Falta llave de OpenRouter para sintetizar la búsqueda.";
                            
                            if (openrouterKey && openrouterKey.length > 5) {
                                const userName = environment.getUserName();
                                const sysPrompt = `Eres la Inteligencia Artificial del Knowledge Vault Enterprise de ${userName} (DevAssist).
Se te hace una petición directa por chat privado. 
Buscamos en la base de datos y logramos aislar el siguiente contexto técnico.
Construye una respuesta que entregue valor profundo, basado en estos hallazgos. Responde directamente y resuelve su duda.

CONTEXTO AISLADO EN EL VAULT:
${vaultContext}

PREGUNTA DE ${userName.toUpperCase()}:
${message}`;

                                const llmRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                                    method: "POST",
                                    headers: {
                                        "Authorization": `Bearer ${openrouterKey}`,
                                        "Content-Type": "application/json"
                                    },
                                    body: JSON.stringify({
                                        model: "meta-llama/llama-3.3-70b-instruct", 
                                        messages: [{ role: "user", content: sysPrompt }]
                                    })
                                });
                                const llmData = await llmRes.json();
                                if (llmData?.choices?.[0]?.message?.content) {
                                    finalAnswer = llmData.choices[0].message.content;
                                } else {
                                    finalAnswer = `⚠️ Error al sintetizar contexto: ${JSON.stringify(llmData)}`;
                                }
                            }

                            // Send final results
                            sendProgressToChannel(`📚 **Search Data:**\n\n${finalAnswer}`, sourceChannel);
                        } catch(e) {
                            logger.error(`[Server:VaultQuery] Error: ${e.message}`);
                        }
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
