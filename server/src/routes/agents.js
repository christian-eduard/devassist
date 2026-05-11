const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../db/connection');
const logger = require('../utils/logger');
// const { geminiChat } = require('../services/gemini'); // Pendiente integrar con memoria

// GET /api/agents
router.get('/', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM agents ORDER BY created_at ASC');
        res.json({ ok: true, agents: rows });
    } catch (err) {
        logger.error({ err }, 'Error fetching agents');
        res.status(500).json({ ok: false, error: 'Error interno' });
    }
});

// POST /api/agents (Crear agente base si no existe)
router.post('/init', async (req, res) => {
    try {
        const id = 'tess-core';
        await pool.query(`
            INSERT INTO agents (id, name, role, system_prompt) 
            VALUES ($1, 'TESS', 'Asistente Principal', 'Eres TESS, la IA central de DevAssist Cloud.')
            ON CONFLICT DO NOTHING
        `, [id]);
        res.json({ ok: true });
    } catch (err) {
        logger.error({ err }, 'Error init agent');
        res.status(500).json({ ok: false, error: 'Error interno' });
    }
});

// POST /api/agents/chat
router.post('/chat', async (req, res) => {
    try {
        const { agentId, message, channel } = req.body;
        if (!agentId || !message) return res.status(400).json({ ok: false, error: 'Datos incompletos' });
        
        // Guardar mensaje del usuario
        await pool.query(
            'INSERT INTO agent_memory (agent_id, channel, role, content) VALUES ($1, $2, $3, $4)',
            [agentId, channel || 'default', 'user', message]
        );

        // Simulamos respuesta de TESS (Para la próxima iteración, conectamos con Gemini + RAG)
        const responseText = `(Respuesta simulada de TESS) He recibido tu mensaje: "${message}"`;

        // Guardar respuesta del asistente
        await pool.query(
            'INSERT INTO agent_memory (agent_id, channel, role, content) VALUES ($1, $2, $3, $4)',
            [agentId, channel || 'default', 'assistant', responseText]
        );

        res.json({ ok: true, reply: responseText });
    } catch (err) {
        logger.error({ err }, 'Error in agent chat');
        res.status(500).json({ ok: false, error: 'Error interno' });
    }
});

// GET /api/agents/:agentId/memory/:channel
router.get('/:agentId/memory/:channel', async (req, res) => {
    try {
        const { agentId, channel } = req.params;
        const { rows } = await pool.query(
            'SELECT role, content, created_at FROM agent_memory WHERE agent_id = $1 AND channel = $2 ORDER BY created_at ASC LIMIT 50',
            [agentId, channel]
        );
        res.json({ ok: true, memory: rows });
    } catch (err) {
        logger.error({ err }, 'Error fetching memory');
        res.status(500).json({ ok: false, error: 'Error interno' });
    }
});

module.exports = router;
