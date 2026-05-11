const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../db/connection');
const logger = require('../utils/logger');

// GET /api/projects
router.get('/', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT id, name, path, stack, created_at, updated_at FROM projects ORDER BY created_at DESC');
        res.json({ ok: true, projects: rows });
    } catch (err) {
        logger.error({ err }, 'Error fetching projects');
        res.status(500).json({ ok: false, error: 'Error interno' });
    }
});

// GET /api/projects/:id
router.get('/:id', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM projects WHERE id = $1', [req.params.id]);
        if (!rows.length) return res.status(404).json({ ok: false, error: 'Proyecto no encontrado' });
        res.json({ ok: true, project: rows[0] });
    } catch (err) {
        logger.error({ err }, 'Error fetching project');
        res.status(500).json({ ok: false, error: 'Error interno' });
    }
});

// POST /api/projects
router.post('/', async (req, res) => {
    try {
        const { name, path, stack } = req.body;
        if (!name || !path) return res.status(400).json({ ok: false, error: 'Nombre y ruta son obligatorios' });
        
        const id = uuidv4();
        await pool.query(
            'INSERT INTO projects (id, name, path, stack) VALUES ($1, $2, $3, $4)',
            [id, name, path, stack || 'Detectando...']
        );
        res.json({ ok: true, project: { id, name, path, stack } });
    } catch (err) {
        logger.error({ err }, 'Error creating project');
        res.status(500).json({ ok: false, error: 'Error interno' });
    }
});

// DELETE /api/projects/:id
router.delete('/:id', async (req, res) => {
    try {
        const { rowCount } = await pool.query('DELETE FROM projects WHERE id = $1', [req.params.id]);
        if (rowCount === 0) return res.status(404).json({ ok: false, error: 'Proyecto no encontrado' });
        res.json({ ok: true });
    } catch (err) {
        logger.error({ err }, 'Error deleting project');
        res.status(500).json({ ok: false, error: 'Error interno' });
    }
});

module.exports = router;
