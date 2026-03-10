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

    ipcMain.handle('ai:synthesize-speech', async (_event, text, voiceId = 'LlZr3QuzbW4WrPjgATHG') => {
        try {
            const config = loadConfig(dataDir);
            const apiKey = config.apiKeys?.elevenlabs;
            if (!apiKey) return { ok: false, error: 'API Key de ElevenLabs no configurada.' };

            const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
                method: 'POST',
                headers: {
                    'xi-api-key': apiKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text,
                    model_id: 'eleven_multilingual_v2',
                    voice_settings: {
                        stability: 0.5,
                        similarity_boost: 0.75
                    }
                })
            });

            if (!response.ok) {
                const errData = await response.json();
                return { ok: false, error: errData.detail?.status || 'Error en síntesis' };
            }

            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            return { ok: true, audioBase64: buffer.toString('base64') };
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

    ipcMain.handle('ai:transcribe-audio', async (_event, audioBuffer) => {
        try {
            const config = loadConfig(dataDir);
            const apiKey = config.apiKeys?.openai;
            if (!apiKey) {
                console.error('[STT] Error: No se encontró API Key de OpenAI');
                return { ok: false, error: 'API Key de OpenAI no configurada (necesaria para Whisper).' };
            }

            console.log(`[STT] Recibido buffer de audio: ${audioBuffer.byteLength} bytes`);

            const tempPath = path.join(dataDir, 'input_audio.webm');
            fs.writeFileSync(tempPath, Buffer.from(audioBuffer));

            console.log(`[STT] Enviando a Whisper API...`);

            const FormData = require('form-data');
            const form = new FormData();
            form.append('file', fs.createReadStream(tempPath), 'audio.webm');
            form.append('model', 'whisper-1');
            form.append('language', 'es');

            const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    ...form.getHeaders()
                },
                body: form
            });

            if (!response.ok) {
                const errData = await response.json();
                return { ok: false, error: errData.error?.message || 'Error en Whisper' };
            }

            const data = await response.json();
            return { ok: true, text: data.text };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    });
};
