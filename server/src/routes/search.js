// src/routes/search.js — RAG semantic search
const { Router } = require('express');
const { searchSchema } = require('../utils/validators');
const gemini = require('../services/gemini');
const db = require('../db/queries');
const logger = require('../utils/logger');

const router = Router();

/**
 * POST /api/search — Semantic search across all fichas
 * Uses pgvector cosine similarity to find the most relevant fichas.
 */
router.post('/', async (req, res) => {
    const parsed = searchSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ ok: false, errors: parsed.error.flatten().fieldErrors });
    }

    const { query, limit } = parsed.data;

    try {
        // Generate query embedding
        const queryEmbedding = await gemini.generateEmbedding(query);

        // Search by vector similarity
        const results = await db.searchByEmbedding(queryEmbedding, limit);

        // Optionally synthesize a summary
        let synthesis = null;
        if (results.length > 0) {
            const context = results.map((r, i) =>
                `[${i + 1}] "${r.title}": ${r.tl_dr || 'Sin resumen'}`
            ).join('\n');

            synthesis = await gemini.complete(
                `El usuario busca: "${query}"\n\nResultados relevantes del vault:\n${context}\n\nGenera una respuesta concisa y útil basada en estos resultados. Si no hay resultados relevantes, dilo claramente.`
            );
        }

        res.json({
            ok: true,
            results: results.map(r => ({
                id: r.id,
                title: r.title,
                tl_dr: r.tl_dr,
                similarity: parseFloat(r.similarity).toFixed(4),
                key_points: r.key_points,
                tech_stack: r.tech_stack,
            })),
            synthesis,
        });
    } catch (err) {
        logger.error({ err: err.message }, 'Search failed');
        res.status(500).json({ ok: false, error: 'Error en la búsqueda semántica' });
    }
});

module.exports = router;
