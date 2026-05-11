// src/routes/fichas.js — CRUD + video submission endpoints
const { Router } = require('express');
const { v4: uuidv4 } = require('uuid');
const { submitUrlSchema } = require('../utils/validators');
const { processVideo } = require('../workers/videoProcessor');
const db = require('../db/queries');
const logger = require('../utils/logger');

const router = Router();

/**
 * POST /api/fichas — Submit a URL for processing
 * The job runs asynchronously. Returns a jobId to poll for status.
 */
router.post('/', async (req, res) => {
    const parsed = submitUrlSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ ok: false, errors: parsed.error.flatten().fieldErrors });
    }

    const { url, channel } = parsed.data;
    const jobId = uuidv4();

    // Create job record
    await db.createJob({ id: jobId, url, channel });

    // Process in background (don't await — return immediately)
    processVideo(jobId, url, channel).catch((err) => {
        logger.error({ err: err.message, jobId }, 'Background video processing failed');
    });

    res.status(202).json({ ok: true, jobId, message: 'Video encolado para procesamiento' });
});

/**
 * GET /api/fichas — List all fichas
 */
router.get('/', async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const offset = parseInt(req.query.offset) || 0;
    const fichas = await db.getAllFichas(limit, offset);
    res.json({ ok: true, fichas, count: fichas.length });
});

/**
 * GET /api/fichas/jobs/:jobId — Get job status
 */
router.get('/jobs/:jobId', async (req, res) => {
    const job = await db.getJobById(req.params.jobId);
    if (!job) {
        return res.status(404).json({ ok: false, error: 'Job no encontrado' });
    }
    res.json({ ok: true, job });
});

/**
 * GET /api/fichas/:id — Get ficha detail
 */
router.get('/:id', async (req, res) => {
    const ficha = await db.getFichaById(req.params.id);
    if (!ficha) {
        return res.status(404).json({ ok: false, error: 'Ficha no encontrada' });
    }
    res.json({ ok: true, ficha });
});

/**
 * DELETE /api/fichas/:id — Delete a ficha
 */
router.delete('/:id', async (req, res) => {
    const deleted = await db.deleteFicha(req.params.id);
    if (!deleted) {
        return res.status(404).json({ ok: false, error: 'Ficha no encontrada' });
    }
    res.json({ ok: true, message: 'Ficha eliminada' });
});

module.exports = router;
