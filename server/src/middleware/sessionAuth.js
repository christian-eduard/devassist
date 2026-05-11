// src/middleware/sessionAuth.js — Session-based authentication middleware
const crypto = require('crypto');
const { pool } = require('../db/connection');

/**
 * Middleware: authenticate via Bearer token (session) or x-api-key (API key).
 * Sets req.user with { id, name, email, role, plan }.
 */
async function sessionAuth(req, res, next) {
    try {
        // Try Bearer token first (session)
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
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
        }

        // Try x-api-key (API key)
        const apiKey = req.headers['x-api-key'];
        if (apiKey) {
            const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
            const { rows } = await pool.query(
                `SELECT u.id, u.name, u.email, u.role, u.plan, ak.id as key_id
                 FROM api_keys ak JOIN users u ON ak.user_id = u.id
                 WHERE ak.key_hash = $1 AND ak.is_active = true`,
                [keyHash]
            );

            if (rows.length > 0) {
                req.user = rows[0];
                // Update last_used_at
                pool.query('UPDATE api_keys SET last_used_at = NOW() WHERE id = $1', [rows[0].key_id]);
                return next();
            }
        }

        return res.status(401).json({ ok: false, error: 'Autenticación requerida' });
    } catch (err) {
        return res.status(500).json({ ok: false, error: 'Error de autenticación' });
    }
}

/**
 * Middleware: require super_admin role.
 * Must be used AFTER sessionAuth.
 */
function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'super_admin') {
        return res.status(403).json({ ok: false, error: 'Acceso denegado: se requiere rol de administrador' });
    }
    next();
}

module.exports = { sessionAuth, requireAdmin };
