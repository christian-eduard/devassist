// src/utils/validators.js — Zod schemas for API input validation
const { z } = require('zod');

/** POST /api/fichas — Submit a video URL for processing */
const submitUrlSchema = z.object({
    url: z.string().url('URL inválida').refine(
        (u) => /tiktok\.com|youtube\.com|youtu\.be|instagram\.com/.test(u),
        { message: 'Solo se aceptan URLs de TikTok, YouTube o Instagram' }
    ),
    channel: z.enum(['app', 'telegram', 'whatsapp', 'api']).default('api'),
});

/** POST /api/search — RAG semantic search */
const searchSchema = z.object({
    query: z.string().min(3, 'La búsqueda debe tener al menos 3 caracteres').max(500),
    limit: z.coerce.number().min(1).max(20).default(5),
});

module.exports = { submitUrlSchema, searchSchema };
