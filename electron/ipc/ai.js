const { GoogleGenerativeAI } = require('@google/generative-ai');
const { loadConfig, saveConfig } = require('./config');

module.exports = function registerAIHandlers(ipcMain) {
    ipcMain.handle('ai:get-config', async () => {
        const config = await loadConfig();
        return {
            gemini: config.gemini || {},
            aiAssignments: config.aiAssignments || {},
            providers: config.providers || [],
            apiKeys: config.apiKeys || {},
        };
    });

    ipcMain.handle('ai:save-gemini-config', async (_event, geminiConfig) => {
        const config = await loadConfig();
        config.gemini = { ...config.gemini, ...geminiConfig };
        await saveConfig(config);
        return { ok: true };
    });

    ipcMain.handle('ai:test-gemini', async () => {
        try {
            const config = await loadConfig();
            const apiKey = config.gemini?.apiKey || config.apiKeys?.gemini;

            if (!apiKey) return { ok: false, error: 'API Key de Gemini no configurada.' };

            const genAI = new GoogleGenerativeAI(apiKey);
            const modelName = config.gemini.model || 'gemini-1.5-flash';
            const model = genAI.getGenerativeModel({ model: modelName });
            
            const result = await model.generateContent('Responde solo con: OK');
            return { ok: true, response: result.response.text().trim() };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    });

    ipcMain.handle('ai:test-groq', async () => {
        try {
            const config = await loadConfig();
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
            const config = await loadConfig();
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
                    model: 'google/gemini-flash-1.5',
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
            const config = await loadConfig();
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
            const config = await loadConfig();
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
        const config = await loadConfig();
        if (!config.providers) config.providers = [];
        const idx = config.providers.findIndex((p) => p.id === provider.id);
        if (idx >= 0) {
            config.providers[idx] = provider;
        } else {
            config.providers.push(provider);
        }
        await saveConfig(config);
        return { ok: true };
    });

    ipcMain.handle('ai:update-assignment', async (_event, fnName, assignment) => {
        const config = await loadConfig();
        if (!config.aiAssignments) config.aiAssignments = {};
        config.aiAssignments[fnName] = assignment;
        await saveConfig(config);
        return { ok: true };
    });

    ipcMain.handle('ai:test-vertex', async () => {
        try {
            const config = await loadConfig();
            const { VertexAI } = require('@google-cloud/vertexai');
            const project = config.gemini?.project || 'project-7db9cc02-a444-4f66-883';
            const location = config.gemini?.location || 'us-central1';
            
            const vertexAI = new VertexAI({ project, location });
            const generativeModel = vertexAI.getGenerativeModel({ model: config.gemini?.model || 'gemini-1.5-flash' });
            
            const streamingResp = await generativeModel.generateContent({
                contents: [{ role: 'user', parts: [{ text: 'Responde solo con: VERTEX_OK' }] }]
            });
            const response = await streamingResp.response;
            return { ok: true, response: response.candidates[0].content.parts[0].text.trim() };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    });

    ipcMain.handle('ai:generate-embedding', async (_event, text) => {
        try {
            const config = await loadConfig();
            const apiKey = config.apiKeys?.openai;
            if (!apiKey) throw new Error('API Key de OpenAI no configurada para Embeddings');

            const response = await fetch('https://api.openai.com/v1/embeddings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'text-embedding-3-small',
                    input: text
                })
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error.message);
            
            return { ok: true, embedding: data.data[0].embedding };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    });
};
