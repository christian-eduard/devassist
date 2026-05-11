// src/routes/apiKeys.js — API Key management routes
const express = require('express');
const crypto = require('crypto');
const { pool } = require('../db/connection');
const logger = require('../utils/logger');

const router = express.Router();

function generateApiKey(userId) {
    const prefix = 'da_live_' + userId.substring(0, 5) + '_';
    const secret = crypto.randomBytes(24).toString('base64url');
    return prefix + secret;
}

function hashKey(key) {
    return crypto.createHash('sha256').update(key).digest('hex');
}

// GET /api/v1/api-keys — List user's API keys
router.get('/', async (req, res) => {
    try {
        const { rows } = await pool.query(
            'SELECT id, key_prefix, name, last_used_at, is_active, created_at FROM api_keys WHERE user_id = $1 ORDER BY created_at DESC',
            [req.user.id]
        );
        res.json({ ok: true, keys: rows });
    } catch (err) {
        logger.error({ err: err.message }, 'Failed to list API keys');
        res.status(500).json({ ok: false, error: 'Error interno' });
    }
});

// POST /api/v1/api-keys — Create a new API key
router.post('/', async (req, res) => {
    try {
        const { name } = req.body;

        // Check plan limits
        const planLimits = { free: 1, starter: 3, pro: 10, enterprise: 100, super_premium: 1000 };
        const limit = planLimits[req.user.plan] || 1;

        const { rows: existing } = await pool.query(
            'SELECT count(*) as count FROM api_keys WHERE user_id = $1 AND is_active = true',
            [req.user.id]
        );

        if (parseInt(existing[0].count) >= limit) {
            return res.status(403).json({
                ok: false,
                error: `Tu plan "${req.user.plan}" permite máximo ${limit} API key(s) activas`,
            });
        }

        const rawKey = generateApiKey(req.user.id);
        const keyHash = hashKey(rawKey);
        const keyPrefix = rawKey.substring(0, 15) + '...';

        await pool.query(
            'INSERT INTO api_keys (id, user_id, key_hash, key_prefix, name) VALUES ($1, $2, $3, $4, $5)',
            [crypto.randomUUID(), req.user.id, keyHash, keyPrefix, name || 'Default']
        );

        logger.info({ userId: req.user.id }, 'API key created');

        // Return the raw key ONLY this time
        res.status(201).json({
            ok: true,
            key: rawKey,
            prefix: keyPrefix,
            message: 'Guarda esta clave. No se mostrará de nuevo.',
        });
    } catch (err) {
        logger.error({ err: err.message }, 'Failed to create API key');
        res.status(500).json({ ok: false, error: 'Error interno' });
    }
});

// DELETE /api/v1/api-keys/:id — Revoke an API key
router.delete('/:id', async (req, res) => {
    try {
        const { rowCount } = await pool.query(
            'UPDATE api_keys SET is_active = false WHERE id = $1 AND user_id = $2',
            [req.params.id, req.user.id]
        );

        if (rowCount === 0) {
            return res.status(404).json({ ok: false, error: 'API key no encontrada' });
        }

        logger.info({ userId: req.user.id, keyId: req.params.id }, 'API key revoked');
        res.json({ ok: true, message: 'API key revocada' });
    } catch (err) {
        logger.error({ err: err.message }, 'Failed to revoke API key');
        res.status(500).json({ ok: false, error: 'Error interno' });
    }
});

module.exports = router;
