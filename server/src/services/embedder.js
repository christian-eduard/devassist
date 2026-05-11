// src/services/embedder.js — Text → pgvector embedding for RAG
const gemini = require('./gemini');
const logger = require('../utils/logger');

/**
 * Generate an embedding vector for a ficha (combining title, tl_dr, and key content).
 * @param {Object} ficha - The ficha data with title, tl_dr, transcripcion, etc.
 * @returns {number[]|null} Embedding vector or null on failure
 */
async function generateFichaEmbedding(ficha) {
    try {
        const textForEmbedding = [
            ficha.title || '',
            ficha.tl_dr || '',
            (ficha.key_points || []).join('. '),
            (ficha.tech_stack || []).join(', '),
            (ficha.manual_uso || '').substring(0, 2000),
        ].filter(Boolean).join(' | ');

        if (textForEmbedding.length < 10) {
            logger.warn('Not enough text to generate meaningful embedding');
            return null;
        }

        const embedding = await gemini.generateEmbedding(textForEmbedding);
        logger.info({ dimensions: embedding.length }, 'Embedding generated');
        return embedding;
    } catch (err) {
        logger.error({ err: err.message }, 'Failed to generate embedding');
        return null;
    }
}

module.exports = { generateFichaEmbedding };
