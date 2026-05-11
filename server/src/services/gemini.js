// src/services/gemini.js — Pure Gemini service (migrated from Electron version)
const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config');
const logger = require('../utils/logger');
const db = require('../db/queries');

class GeminiService {
    constructor() {
        this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
        this.defaultModel = config.gemini.model;
        this.embeddingModel = config.gemini.embeddingModel;
    }

    /**
     * Generate text completion with Gemini.
     * @param {string} prompt - The text prompt
     * @param {Object} options - { model, temperature, maxTokens, audio }
     * @returns {string} Generated text
     */
    async complete(prompt, options = {}) {
        const modelName = options.model || this.defaultModel;
        const model = this.genAI.getGenerativeModel({ model: modelName });

        logger.info({ model: modelName }, 'Gemini completion request');

        const parts = [{ text: prompt }];

        // Native audio support — Gemini can process audio directly
        if (options.audio) {
            logger.info('Injecting audio buffer into Gemini request');
            parts.push({
                inlineData: {
                    data: options.audio,
                    mimeType: options.audioMimeType || 'audio/mp3',
                },
            });
        }

        const result = await model.generateContent({
            contents: [{ role: 'user', parts }],
            generationConfig: {
                temperature: options.temperature ?? 0.2,
                maxOutputTokens: options.maxTokens ?? 8192,
            },
        });

        const responseText = result.response.text();

        // Telemetry
        try {
            const tokensCount = Math.ceil((prompt.length + responseText.length) / 4);
            await db.saveAIUsage({
                provider: 'gemini',
                model: modelName,
                tokens: tokensCount,
                costSaved: (tokensCount / 1000) * 0.005,
            });
        } catch (err) {
            logger.warn({ err: err.message }, 'Failed to save AI usage telemetry');
        }

        return responseText;
    }

    /**
     * Generate embedding vector for RAG search.
     * @param {string} text - Text to embed
     * @returns {number[]} Embedding vector (768 dimensions for text-embedding-004)
     */
    async generateEmbedding(text) {
        const model = this.genAI.getGenerativeModel({ model: this.embeddingModel });
        const cleanText = (text || '').substring(0, 8000);

        logger.debug({ model: this.embeddingModel, textLength: cleanText.length }, 'Generating embedding');

        const result = await model.embedContent(cleanText);
        return result.embedding.values;
    }
}

// Singleton
module.exports = new GeminiService();
