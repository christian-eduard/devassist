// src/middleware/auth.js — Dual authentication: API Key + Bearer Session Token
const config = require('../config');
const { pool } = require('../db/connection');

/**
 * Middleware that accepts EITHER:
 * 1. x-api-key header (for Tess, WhatsApp, M2M clients)
 * 2. Authorization: Bearer <token> (for dashboard sessions)
 *
 * If Bearer token is valid, req.user is populated with the user object.
 * If API key is valid, req.user is set to a system user.
 */
async function apiKeyAuth(req, res, next) {
    // Path 1: API Key (M2M)
    const apiKey = req.headers['x-api-key'];
    if (apiKey && apiKey === config.auth.apiKey) {
        req.user = { id: 'system', name: 'System', role: 'admin', plan: 'enterprise' };
        return next();
    }

    // Path 2: Bearer Token (Dashboard session)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        try {
            const { rows } = await pool.query(
                `SELECT u.id, u.name, u.email, u.role, u.plan
                 FROM sessions s JOIN users u ON s.user_id = u.id
                 WHERE s.token = $1 AND s.expires_at > NOW()`,
                [token]
            );
            if (rows.length > 0) {
                req.user = rows[0];
                return next();
            }
        } catch (err) {
            // Fall through to 401
        }
    }

    return res.status(401).json({ ok: false, error: 'Autenticación requerida' });
}

module.exports = { apiKeyAuth };
