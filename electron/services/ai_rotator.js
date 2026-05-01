const axios = require('axios');
const fs = require('fs');
const path = require('path');
const logger = require('../ipc/logger');
const aiPool = require('../ipc/ai_pool');
const configLoader = require('../ipc/config');
const { EventEmitter } = require('events');

/**
 * AIRotator - Servicio de Resiliencia Multi-Modelo (Fase 17)
 * Gestiona fallbacks automáticos entre Gemini, OpenRouter y Groq.
 */
class AIRotator extends EventEmitter {
    constructor() {
        super();
        this.configPath = path.join(process.env.HOME, '.openclaw', 'openclaw.json');
        this.keys = {};
        this.loadKeys();

        // Mapa de Traducción de Modelos Tácticos (V20: Restauración de Estado Dorado)
        this.MODEL_MAP = {
            'gemini-2.5-flash': {
                'gemini': 'gemini-2.5-flash' 
            },
            'gemini-3.1-flash': {
                'gemini': 'gemini-2.5-flash' 
            },
            'gemini-2.5-pro': {
                'gemini': 'gemini-2.5-pro' 
            },
            'gemini-1.5-pro': {
                'gemini': 'gemini-2.5-pro'
            },
            'gemini-1.5-flash': {
                'gemini': 'gemini-2.5-flash'
            }
        };
    }

    loadKeys() {
        try {
            if (fs.existsSync(this.configPath)) {
                const config = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
                this.keys = config.env || {};
                logger.info('[AIRotator] Claves cargadas desde openclaw.json');
            }
        } catch (err) {
            logger.error('[AIRotator] Error cargando openclaw.json:', err.message);
        }
    }

    /**
     * Realiza una petición de completion con fallback inteligente y soporte para Free-Ride
     */
    async complete(prompt, options = {}) {
        const config = await configLoader.loadConfig(); // Necesitamos cargar la config real
        const taskId = options.taskId || 'brain-supervisor';
        const assignments = config.aiAssignments?.[taskId] || { provider: 'gemini', model: 'gemini-1.5-flash' };
        
        let mainProvider = options.provider || assignments.provider;
        let mainModel = options.model || assignments.model;
        
        // EXCLUSIVIDAD GEMINI V39: Anulando rotación por petición del usuario.
        // Solo Gemini está permitido por el momento.
        const providers = ['gemini'];
        const uniqueProviders = providers;

        let lastError = null;

        for (const provider of uniqueProviders) {
            try {
                if (lastError) logger.warn(`[AIRotator] Reintentando tras error con: ${provider}`);
                logger.info(`[AIRotator] Intentando con proveedor: ${provider} (Task: ${taskId || 'generic'})`);
                
                // --- FUENTE DE VERDAD: BASE DE DATOS NEXUS (V37) ---
                // Las claves se cargan dinámicamente desde Postgres para permitir cambios en tiempo real.
                const keys = {
                    gemini: config.gemini?.apiKey || config.apiKeys?.gemini || process.env.GOOGLE_API_KEY,
                    openrouter: config.apiKeys?.openrouter || process.env.OPENROUTER_API_KEY,
                    groq: config.apiKeys?.groq || process.env.GROQ_API_KEY,
                    huggingface: config.apiKeys?.huggingface || process.env.HUGGING_FACE_TOKEN,
                    openai: config.apiKeys?.openai || process.env.OPENAI_API_KEY,
                    anthropic: config.apiKeys?.anthropic || process.env.ANTHROPIC_API_KEY
                };

                let currentOptions = { ...options, ...assignments };
                
                // --- INTELIGENCIA DE TRADUCCIÓN V38 (Sincronización Total) ---
                // Aplicamos el mapeo de modelos SIEMPRE (incluso para el proveedor principal)
                // Esto garantiza que si Chris tiene un modelo 2.5 en la DB, se use el ID real nativo.
                const translation = this.MODEL_MAP[mainModel]?.[provider];
                if (translation) {
                    logger.info(`[AIRotator:V38] Traducción Activa: ${mainModel} -> ${translation} para ${provider}`);
                    currentOptions.model = translation;
                } else if (provider !== mainProvider) {
                    // Si es un fallback y no hay traducción, reseteamos el modelo
                    logger.info(`[AIRotator:V38] Reset de modelo para fallback en ${provider}`);
                    delete currentOptions.model;
                }
                
                // Especial para Google Gemini Direct (V35-38)
                if (provider === 'gemini' && currentOptions.model && !currentOptions.model.startsWith('models/')) {
                    currentOptions.model = `models/${currentOptions.model}`;
                }

                // --- LÓGICA FREE-RIDE ---
                if (provider === 'openrouter' && (currentOptions.model === 'auto' || !currentOptions.model)) {
                    const apiKey = keys.openrouter;
                    if (apiKey) {
                        const bestFree = await aiPool.getBestFreeModel(apiKey);
                        if (bestFree) {
                            logger.info(`[AIRotator:FreeRide] Usando mejor modelo gratuito: ${bestFree}`);
                            currentOptions.model = bestFree;
                        }
                    }
                }

                let response;
                switch (provider) {
                    case 'gemini':
                        response = await this.callGemini(prompt, { ...currentOptions, apiKey: keys.gemini });
                        break;
                    case 'openrouter':
                        try {
                            response = await this.callOpenRouter(prompt, { ...currentOptions, apiKey: keys.openrouter });
                        } catch (err) {
                            // --- AUTO-DOWNGRADE A GRATUITOS V30 ---
                            if (err.response?.status === 402 && keys.openrouter) {
                                logger.warn('[AIRotator:402] Sin créditos en OpenRouter. Reintentando con modelo GRATUITO (Free-Ride Mode)...');
                                const bestFree = await aiPool.getBestFreeModel(keys.openrouter);
                                if (bestFree) {
                                    logger.info(`[AIRotator:FreeRide] Forzando modelo gratuito: ${bestFree}`);
                                    response = await this.callOpenRouter(prompt, { ...currentOptions, model: bestFree, apiKey: keys.openrouter });
                                } else { throw err; } // Si no hay gratuitos, fallar
                            } else { throw err; }
                        }
                        break;
                    case 'groq':
                        if (taskId === 'vault-transcribe' && options.audio) {
                             logger.info('[AIRotator:V20] Usando Protocolo de Emergencia: Whisper (Groq) + Transcripción (Llama)');
                             const audioBuffer = Buffer.from(options.audio, 'base64');
                             const rawText = await this.callGroqWhisper(audioBuffer, keys.groq);
                             const finalPrompt = `${prompt}\n\nAQUÍ TIENES EL TEXTO BRUTO DEL AUDIO PARA DARLE FORMATO:\n${rawText}`;
                             // FORZAR LLAMA para el formateo (no Whisper)
                             response = await this.callGroq(finalPrompt, { ...currentOptions, model: 'llama-3.3-70b-versatile', apiKey: keys.groq });
                        } else {
                             response = await this.callGroq(prompt, { ...currentOptions, apiKey: keys.groq });
                        }
                        break;
                    case 'huggingface':
                        response = await this.callHuggingFace(prompt, { ...currentOptions, apiKey: keys.huggingface });
                        break;
                    default:
                        throw new Error(`Proveedor ${provider} no soportado`);
                }

                // --- TELEMETRÍA V8 (Post-Success) ---
                const nexus = require('../db_nexus');
                const tokensCount = this.estimateTokens(prompt + response);
                const costSaved = this.calculateSavings(provider, tokensCount);
                
                nexus.saveAIUsage({
                    provider,
                    model: currentOptions.model || 'auto',
                    tokens: tokensCount,
                    costSaved
                }).catch(e => logger.error('[AIRotator] Error guardando uso:', e.message));

                this.emit('pulse', { provider, model: currentOptions.model });

                return response;

            } catch (err) {
                lastError = err;
                const status = err.response?.status;
                const errorMsg = err.response?.data?.error?.message || err.message;
                logger.warn(`[AIRotator] Falló ${provider} (Status: ${status}): ${errorMsg}`);
                
                if (status === 403 || status === 401 || status === 429) continue;
                continue;
            }
        }

        throw new Error(`[AIRotator] Todos los proveedores fallaron. Último error: ${lastError?.message}`);
    }

    async callGemini(prompt, options) {
        const apiKey = options.apiKey;
        if (!apiKey) throw new Error('API Key de Gemini no configurada');

        const baseModel = (options.model || 'gemini-1.5-flash').replace('models/', '');
        
        // --- FÓRMULA GANADORA V42 (PROBADA EN LABORATORIO) ---
        // Chris, he validado que v1beta + gemini-2.5-flash es la clave de tu éxito.
        const version = 'v1beta';
        try {
            const url = `https://generativelanguage.googleapis.com/${version}/models/${baseModel}:generateContent?key=${apiKey}`;
            logger.info(`[AIRotator:V42] Usando Fórmula Nuclear: .../${version}/models/${baseModel} (URL Blindada)`);
                
                const parts = [{ text: prompt }];

                // Soporte Multimodal V16: Inyección de Audio Nativo
                if (options.audio) {
                    parts.push({
                        inline_data: {
                            mime_type: "audio/mpeg",
                            data: options.audio
                        }
                    });
                    logger.info(`[AIRotator:Gemini] Inyectando buffer de audio nativo para ${baseModel}`);
                }
                
                const response = await axios.post(url, {
                    contents: [{ parts }],
                    safetySettings: [
                        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
                    ]
                }, {
                    timeout: 60000 // 60 segundos para tutoriales pesados V41
                });
            return response.data.candidates[0].content.parts[0].text;
        } catch (err) {
            const status = err.response?.status;
            const errorDetail = err.response?.data?.error?.message || err.message;
            logger.error(`[AIRotator:V42] Fallo Atómico: ${errorDetail}`);
            throw err;
        }
    }

    async callOpenRouter(prompt, options) {
        const apiKey = options.apiKey;
        if (!apiKey) throw new Error('API Key de OpenRouter no configurada');

        const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
            model: options.model || 'google/gemini-2.0-flash-001',
            messages: [{ role: 'user', content: prompt }]
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': 'https://devassist.local',
                'X-Title': 'DevAssist'
            }
        });

        return response.data.choices[0].message.content;
    }

    /**
     * Protocolo de Emergencia V20: Transcripción con Groq Whisper
     * Extraído del estado dorado (6 Abril)
     */
    async callGroqWhisper(audioBuffer, apiKey, model = 'whisper-large-v3') {
        const FormData = require('form-data');
        const form = new FormData();
        form.append('model', model);
        form.append('file', audioBuffer, { filename: 'audio.mp3', contentType: 'audio/mpeg' });

        const response = await axios.post('https://api.groq.com/openai/v1/audio/transcriptions', form, {
            headers: {
                ...form.getHeaders(),
                'Authorization': `Bearer ${apiKey}`
            }
        });

        return response.data.text;
    }

    async callGroq(prompt, options) {
        const apiKey = options.apiKey;
        if (!apiKey) throw new Error('API Key de Groq no configurada');

        const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
            model: options.model || 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: prompt }]
        }, {
            headers: { 'Authorization': `Bearer ${apiKey}` },
            timeout: 20000 // Protección contra hangs (V33)
        });

        return response.data.choices[0].message.content;
    }

    async callHuggingFace(prompt, options) {
        const apiKey = options.apiKey;
        if (!apiKey) throw new Error('Token de Hugging Face no configurado');

        const model = options.model || 'meta-llama/Llama-3.2-3B-Instruct';
        const response = await axios.post(`https://api-inference.huggingface.co/models/${model}`, {
            inputs: prompt,
            parameters: { max_new_tokens: 1000 }
        }, {
            headers: { 'Authorization': `Bearer ${apiKey}` },
            timeout: 25000
        });

        // HF devuelve un array o un objeto según el modelo
        if (Array.isArray(response.data)) {
            return response.data[0].generated_text || response.data[0].summary_text;
        }
        return response.data.generated_text;
    }
    /**
     * Genera un vector (embedding) de 1536 dimensiones.
     * Prioriza Gemini (text-embedding-004) por coherencia soberana.
     */
    async generateEmbedding(text) {
        const config = await configLoader.loadConfig();
        const apiKey = config.gemini?.apiKey || config.apiKeys?.gemini || this.keys.GOOGLE_API_KEY;
        const cleanText = (text || '').substring(0, 8000);
        
        if (apiKey) {
            try {
                logger.info('[AIRotator] Generando embedding con Gemini (1536 dims)');
                const modelPath = "models/text-embedding-004";
                const url = `https://generativelanguage.googleapis.com/v1beta/${modelPath}:embedContent?key=${apiKey}`;
                const response = await axios.post(url, {
                    model: modelPath,
                    content: { parts: [{ text: cleanText }] },
                    outputDimensionality: 1536 // pgvector compatible
                });

                if (response.data.embedding && response.data.embedding.values) {
                    return response.data.embedding.values;
                }
            } catch (err) {
                const status = err.response?.status;
                logger.warn(`[AIRotator] Falló Gemini embedding (Status: ${status}), intentando fallback: ${err.message}`);
            }
        }

        // 2. FALLBACK A OPENAI (Solo si Gemini falla o no tiene key)
        if (this.keys.OPENAI_API_KEY) {
            try {
                logger.info('[AIRotator] Generando embedding con OpenAI (Fallback)');
                const response = await axios.post('https://api.openai.com/v1/embeddings', {
                    model: 'text-embedding-3-small',
                    input: cleanText
                }, {
                    headers: { 'Authorization': `Bearer ${this.keys.OPENAI_API_KEY}` }
                });
                return response.data.data[0].embedding;
            } catch (err) {
                logger.error(`[AIRotator] Error crítico en fallback de OpenAI: ${err.message}`);
            }
        }

        throw new Error('[AIRotator] No hay API keys configuradas o funcionales para generar embeddings.');
    }

    // Helpers de Telemetría (Estimaciones)
    estimateTokens(text) {
        return Math.ceil((text || '').length / 4); // Estimación rápida 1 token ~ 4 caracteres
    }

    calculateSavings(provider, tokens) {
        // Ahorro estimado vs Tier 1 pro (ej. GPT-4 original)
        // Free-Ride (OpenRouter free) = 100% ahorro (~0.01$ por 1k tokens)
        if (provider === 'openrouter') return (tokens / 1000) * 0.015;
        if (provider === 'gemini' && tokens < 1000000) return (tokens / 1000) * 0.005; // Tier gratuito Gemini
        return 0.001; // Base simbólica
    }
}

module.exports = new AIRotator();
