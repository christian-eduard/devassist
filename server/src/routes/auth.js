// src/routes/auth.js — Authentication routes
const express = require('express');
const crypto = require('crypto');
const { pool } = require('../db/connection');
const logger = require('../utils/logger');

const router = express.Router();

function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return salt + ':' + hash;
}

function verifyPassword(password, stored) {
    const [salt, hash] = stored.split(':');
    const verify = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return hash === verify;
}

function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ ok: false, error: 'Nombre, email y contraseña son obligatorios' });
        }
        if (password.length < 8) {
            return res.status(400).json({ ok: false, error: 'La contraseña debe tener al menos 8 caracteres' });
        }

        const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existing.rows.length > 0) {
            return res.status(409).json({ ok: false, error: 'Este email ya está registrado' });
        }

        const id = crypto.randomUUID();
        const passwordHash = hashPassword(password);

        await pool.query(
            'INSERT INTO users (id, name, email, password_hash) VALUES ($1, $2, $3, $4)',
            [id, name, email.toLowerCase(), passwordHash]
        );

        const token = generateToken();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        await pool.query(
            'INSERT INTO sessions (id, user_id, token, expires_at, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5, $6)',
            [crypto.randomUUID(), id, token, expiresAt, req.ip, req.headers['user-agent']]
        );

        logger.info({ userId: id, email }, 'User registered');

        res.status(201).json({
            ok: true,
            user: { id, name, email, role: 'user', plan: 'free' },
            token,
            expiresAt: expiresAt.toISOString(),
        });
    } catch (err) {
        logger.error({ err: err.message }, 'Registration failed');
        res.status(500).json({ ok: false, error: 'Error interno del servidor' });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ ok: false, error: 'Email y contraseña son obligatorios' });
        }

        const { rows } = await pool.query(
            'SELECT id, name, email, password_hash, role, plan FROM users WHERE email = $1',
            [email.toLowerCase()]
        );

        if (rows.length === 0 || !verifyPassword(password, rows[0].password_hash)) {
            return res.status(401).json({ ok: false, error: 'Email o contraseña incorrectos' });
        }

        const user = rows[0];
        const token = generateToken();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        await pool.query(
            'INSERT INTO sessions (id, user_id, token, expires_at, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5, $6)',
            [crypto.randomUUID(), user.id, token, expiresAt, req.ip, req.headers['user-agent']]
        );

        logger.info({ userId: user.id, email }, 'User logged in');

        res.json({
            ok: true,
            user: { id: user.id, name: user.name, email: user.email, role: user.role, plan: user.plan },
            token,
            expiresAt: expiresAt.toISOString(),
        });
    } catch (err) {
        logger.error({ err: err.message }, 'Login failed');
        res.status(500).json({ ok: false, error: 'Error interno del servidor' });
    }
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ ok: false, error: 'No autenticado' });
        }

        const { rows } = await pool.query(
            `SELECT u.id, u.name, u.email, u.role, u.plan, u.created_at
             FROM sessions s JOIN users u ON s.user_id = u.id
             WHERE s.token = $1 AND s.expires_at > NOW()`,
            [token]
        );

        if (rows.length === 0) {
            return res.status(401).json({ ok: false, error: 'Sesión expirada o inválida' });
        }

        res.json({ ok: true, user: rows[0] });
    } catch (err) {
        logger.error({ err: err.message }, 'Auth check failed');
        res.status(500).json({ ok: false, error: 'Error interno' });
    }
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
        await pool.query('DELETE FROM sessions WHERE token = $1', [token]);
    }
    res.json({ ok: true });
});

module.exports = router;
