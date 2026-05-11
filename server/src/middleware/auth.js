// src/middleware/auth.js — API Key authentication
const config = require('../config');

/**
 * Middleware to verify API Key from x-api-key header.
 * Simple and effective for single-user setup.
 */
function apiKeyAuth(req, res, next) {
    const key = req.headers['x-api-key'];

    if (!key || key !== config.auth.apiKey) {
        return res.status(401).json({ ok: false, error: 'API Key inválida o ausente' });
    }

    next();
}

module.exports = { apiKeyAuth };
