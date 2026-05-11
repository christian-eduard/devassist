// src/routes/admin.js — Admin-only routes
const express = require('express');
const { pool } = require('../db/connection');
const logger = require('../utils/logger');

const router = express.Router();

// GET /api/admin/stats — Global system metrics
router.get('/stats', async (req, res) => {
    try {
        const [usersResult, fichasResult, jobsResult, aiResult] = await Promise.all([
            pool.query('SELECT count(*) as total, count(*) FILTER (WHERE created_at > NOW() - INTERVAL \'24 hours\') as today FROM users'),
            pool.query('SELECT count(*) as total, count(*) FILTER (WHERE created_at > NOW() - INTERVAL \'7 days\') as week FROM fichas'),
            pool.query('SELECT count(*) as total, count(*) FILTER (WHERE status = \'completed\') as completed, count(*) FILTER (WHERE status = \'failed\') as failed FROM jobs'),
            pool.query('SELECT COALESCE(SUM(tokens), 0) as tokens, COALESCE(SUM(cost_saved), 0) as cost FROM ai_usage'),
        ]);

        res.json({
            ok: true,
            stats: {
                users: { total: parseInt(usersResult.rows[0].total), today: parseInt(usersResult.rows[0].today) },
                fichas: { total: parseInt(fichasResult.rows[0].total), thisWeek: parseInt(fichasResult.rows[0].week) },
                jobs: {
                    total: parseInt(jobsResult.rows[0].total),
                    completed: parseInt(jobsResult.rows[0].completed),
                    failed: parseInt(jobsResult.rows[0].failed),
                },
                ai: { tokens: parseInt(aiResult.rows[0].tokens), cost: parseFloat(aiResult.rows[0].cost) },
            },
        });
    } catch (err) {
        logger.error({ err: err.message }, 'Failed to get admin stats');
        res.status(500).json({ ok: false, error: 'Error interno' });
    }
});

// GET /api/admin/users — List all users
router.get('/users', async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT u.id, u.name, u.email, u.role, u.plan, u.created_at,
                    (SELECT count(*) FROM fichas f WHERE f.user_id = u.id) as fichas_count,
                    (SELECT count(*) FROM api_keys ak WHERE ak.user_id = u.id AND ak.is_active = true) as active_keys
             FROM users u ORDER BY u.created_at DESC`
        );
        res.json({ ok: true, users: rows });
    } catch (err) {
        logger.error({ err: err.message }, 'Failed to list users');
        res.status(500).json({ ok: false, error: 'Error interno' });
    }
});

// PATCH /api/admin/users/:id — Update user (plan, role)
router.patch('/users/:id', async (req, res) => {
    try {
        const { plan, role } = req.body;
        const updates = [];
        const values = [];
        let i = 1;

        if (plan) { updates.push(`plan = $${i++}`); values.push(plan); }
        if (role) { updates.push(`role = $${i++}`); values.push(role); }

        if (updates.length === 0) {
            return res.status(400).json({ ok: false, error: 'Nada que actualizar' });
        }

        updates.push(`updated_at = NOW()`);
        values.push(req.params.id);

        await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = $${i}`, values);

        logger.info({ targetUserId: req.params.id, plan, role }, 'Admin updated user');
        res.json({ ok: true, message: 'Usuario actualizado' });
    } catch (err) {
        logger.error({ err: err.message }, 'Failed to update user');
        res.status(500).json({ ok: false, error: 'Error interno' });
    }
});

module.exports = router;
