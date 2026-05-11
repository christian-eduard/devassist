// src/routes/health.js — System health check
const { Router } = require('express');
const { pool } = require('../db/connection');

const router = Router();

/**
 * GET /api/health — Public endpoint (no auth required)
 */
router.get('/', async (req, res) => {
    const checks = { api: true, database: false };

    try {
        const result = await pool.query('SELECT 1 AS ok');
        checks.database = result.rows[0]?.ok === 1;
    } catch {
        checks.database = false;
    }

    const healthy = checks.api && checks.database;

    res.status(healthy ? 200 : 503).json({
        ok: healthy,
        service: 'devassist-cloud',
        version: '1.0.0',
        checks,
        timestamp: new Date().toISOString(),
    });
});

module.exports = router;
