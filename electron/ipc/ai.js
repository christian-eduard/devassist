const fs = require('fs');
const path = require('path');

const { loadConfig, saveConfig } = require('./config');

module.exports = function registerAIHandlers(ipcMain, dataDir) {
    ipcMain.handle('ai:get-config', async () => {
        const config = loadConfig(dataDir);
        return {
            gemini: config.gemini || {},
            aiAssignments: config.aiAssignments || {},
            providers: config.providers || [],
            apiKeys: config.apiKeys || {},
        };
    });

    ipcMain.handle('ai:save-gemini-config', async (_event, geminiConfig) => {
        const config = loadConfig(dataDir);
        config.gemini = { ...config.gemini, ...geminiConfig };
        saveConfig(dataDir, config);
        return { ok: true };
    });

    ipcMain.handle('ai:test-gemini', async () => {
        try {
            const config = loadConfig(dataDir);

            if (config.gemini?.apiKey) {
                const { GoogleGenerativeAI } = require('@google/generative-ai');
                const genAI = new GoogleGenerativeAI(config.gemini.apiKey);
                const model = genAI.getGenerativeModel({ model: config.gemini.model || 'gemini-2.0-flash-001' });
                const result = await model.generateContent('Responde solo con: OK');
                return { ok: true, response: result.response.text().trim() };
            }

            if (!config.gemini?.credentialsPath || !config.gemini?.project) {
                return { ok: false, error: 'API Key o Credenciales de Gemini no configuradas.' };
            }

            process.env.GOOGLE_APPLICATION_CREDENTIALS = config.gemini.credentialsPath;

            const { VertexAI } = require('@google-cloud/vertexai');
            const vertexAI = new VertexAI({
                project: config.gemini.project,
                location: config.gemini.location || 'us-central1',
            });

            const model = vertexAI.getGenerativeModel({
                model: config.gemini.model || 'gemini-2.0-flash-001',
            });

            const result = await model.generateContent('Responde solo con: OK');
            const text = result.response.candidates[0].content.parts[0].text;

            return { ok: true, response: text.trim() };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    });

    ipcMain.handle('ai:test-groq', async () => {
        try {
            const config = loadConfig(dataDir);
            const apiKey = config.apiKeys?.groq;
            if (!apiKey) return { ok: false, error: 'API Key de Groq no configurada.' };

            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'llama-3.1-8b-instant',
                    messages: [{ role: 'user', content: 'Say OK' }],
                    max_tokens: 10
                })
            });

            const data = await response.json();
            if (data.error) return { ok: false, error: data.error.message };
            return { ok: true, response: data.choices[0].message.content.trim() };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    });

    ipcMain.handle('ai:test-openrouter', async () => {
        try {
            const config = loadConfig(dataDir);
            const apiKey = config.apiKeys?.openrouter;
            if (!apiKey) return { ok: false, error: 'API Key de OpenRouter no configurada.' };

            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'HTTP-Referer': 'https://github.com/Chris-v-o/DevAssist',
                    'X-Title': 'DevAssist'
                },
                body: JSON.stringify({
                    model: 'google/gemini-2.0-flash-001',
                    messages: [{ role: 'user', content: 'Say OK' }],
                    max_tokens: 10
                })
            });

            const data = await response.json();
            if (data.error) return { ok: false, error: data.error.message };
            return { ok: true, response: data.choices[0].message.content.trim() };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    });

    ipcMain.handle('ai:test-openai', async () => {
        try {
            const config = loadConfig(dataDir);
            const apiKey = config.apiKeys?.openai;
            if (!apiKey) return { ok: false, error: 'API Key de OpenAI no configurada.' };

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [{ role: 'user', content: 'Say OK' }],
                    max_tokens: 10
                })
            });

            const data = await response.json();
            if (data.error) return { ok: false, error: data.error.message };
            return { ok: true, response: data.choices[0].message.content.trim() };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    });

    ipcMain.handle('ai:test-huggingface', async () => {
        try {
            const config = loadConfig(dataDir);
            const apiKey = config.apiKeys?.huggingface;
            if (!apiKey) return { ok: false, error: 'Token de Hugging Face no configurado.' };

            const response = await fetch('https://router.huggingface.co/hf-inference/models/meta-llama/Llama-3.2-3B-Instruct', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    inputs: 'Say OK',
                    parameters: { max_new_tokens: 10 }
                })
            });

            if (!response.ok) {
                const errData = await response.json();
                return { ok: false, error: errData.error || 'Error en la petición a HF' };
            }

            return { ok: true, response: 'Conexión exitosa' };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    });

    ipcMain.handle('ai:test-elevenlabs', async () => {
        try {
            const config = loadConfig(dataDir);
            const apiKey = config.apiKeys?.elevenlabs;
            if (!apiKey) return { ok: false, error: 'API Key de ElevenLabs no configurada.' };

            const response = await fetch('https://api.elevenlabs.io/v1/user', {
                method: 'GET',
                headers: { 'xi-api-key': apiKey }
            });

            if (!response.ok) {
                const errData = await response.json();
                return { ok: false, error: errData.detail?.status || 'Error en ElevenLabs' };
            }

            const data = await response.json();
            return { ok: true, response: `Suscripción: ${data.subscription.tier}` };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    });

    ipcMain.handle('ai:synthesize-speech', async (_event, text, options = {}) => {
        const { provider = 'elevenlabs' } = options;

        try {
            const config = loadConfig(dataDir);

            if (provider === 'elevenlabs') {
                const apiKey = config.apiKeys?.elevenlabs;
                if (!apiKey) return { ok: false, error: 'API Key de ElevenLabs no configurada.' };

                // Voice ID: opciones del caller > config de DevAssist > default ElevenLabs
                const voiceId = options.voiceId
                    || config.clawbot?.elevenlabs?.voiceId
                    || 'LlZr3QuzbW4WrPjgATHG';

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 6000);

                const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
                    method: 'POST',
                    headers: {
                        'xi-api-key': apiKey,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        text,
                        model_id: 'eleven_multilingual_v2',
                        voice_settings: { stability: 0.5, similarity_boost: 0.75 }
                    }),
                    signal: controller.signal
                });

                clearTimeout(timeoutId);
                if (!response.ok) {
                    const errData = await response.json();
                    return { ok: false, error: errData.detail?.status || 'Error en ElevenLabs' };
                }

                const arrayBuffer = await response.arrayBuffer();
                return { ok: true, audioBase64: Buffer.from(arrayBuffer).toString('base64') };
            }

            // Fallback a Gemini
            return { ok: false, error: 'Proveedor TTS no soportado o en desarrollo.' };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    });


    ipcMain.handle('ai:fetch-openrouter-models', async () => {
        try {
            const res = await fetch('https://openrouter.ai/api/v1/models');
            const data = await res.json();
            const freeModels = (data.data || []).filter(
                (m) => m.pricing && m.pricing.prompt === '0'
            );
            return { ok: true, models: freeModels };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    });

    ipcMain.handle('ai:save-provider', async (_event, provider) => {
        const config = loadConfig(dataDir);
        if (!config.providers) config.providers = [];
        const idx = config.providers.findIndex((p) => p.id === provider.id);
        if (idx >= 0) {
            config.providers[idx] = provider;
        } else {
            config.providers.push(provider);
        }
        saveConfig(dataDir, config);
        return { ok: true };
    });

    ipcMain.handle('ai:update-assignment', async (_event, fnName, assignment) => {
        const config = loadConfig(dataDir);
        if (!config.aiAssignments) config.aiAssignments = {};
        config.aiAssignments[fnName] = assignment;
        saveConfig(dataDir, config);
        return { ok: true };
    });

    ipcMain.handle('ai:live-chat', async (_event, audioBufferB64) => {
        try {
            const config = loadConfig(dataDir);
            const apiKey = config.gemini?.apiKey;
            if (!apiKey) return { ok: false, error: "No Gemini API Key" };

            let systemInstruction = "Eres VECTRON, el asistente personal avanzado de Chris.";
            try {
                const soulText = fs.readFileSync(path.join(os.homedir(), '.openclaw/workspace/SOUL.md'), 'utf8');
                systemInstruction = soulText;
            } catch (e) {
                // Not fatal
            }

            const { GoogleGenAI } = require('@google/genai');
            const ai = new GoogleGenAI({ apiKey });

            // Note: Currently @google/genai may use string "TEXT" instead of Modality.TEXT
            const session = await ai.live.connect({
                model: "gemini-3.1-pro-preview",
                config: {
                    responseModalities: ["TEXT"],
                    systemInstruction: { parts: [{ text: systemInstruction }] }
                }
            });

            await session.send({
                realtimeInput: {
                    mediaChunks: [{
                        data: audioBufferB64,
                        mimeType: "audio/pcm;rate=16000"
                    }]
                }
            });

            let fullResponse = "";
            for await (const message of session.receive()) {
                if (message.text) fullResponse += message.text;
                if (message.serverContent?.modelTurn?.parts) {
                    for (const p of message.serverContent.modelTurn.parts) {
                        if (p.text) fullResponse += p.text;
                    }
                }
            }
            // we probably only need one round for this prompt
            return { ok: true, text: fullResponse };
        } catch (err) {
            console.error(err);
            return { ok: false, error: err.message };
        }
    });
};
