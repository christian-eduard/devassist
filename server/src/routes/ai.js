const express = require('express');
const router = express.Router();
const queries = require('../db/queries');
const logger = require('../utils/logger');

// GET /api/ai/config
router.get('/config', async (req, res) => {
    try {
        const config = await queries.getSetting('ai_config') || {
            provider: 'gemini',
            geminiApiKey: '',
            openRouterApiKey: '',
            defaultModel: 'gemini-1.5-pro'
        };
        // Ocultar las claves reales al enviarlas al cliente, solo enviar si están configuradas
        const safeConfig = {
            ...config,
            geminiApiKey: config.geminiApiKey ? '***' : '',
            openRouterApiKey: config.openRouterApiKey ? '***' : ''
        };
        res.json(safeConfig);
    } catch (err) {
        logger.error({ err }, 'Error getting AI config');
        res.status(500).json({ error: 'Error interno' });
    }
});

// PATCH /api/ai/config
router.patch('/config', async (req, res) => {
    try {
        const currentConfig = await queries.getSetting('ai_config') || {};
        const updates = req.body;
        
        // Evitar sobreescribir con '***'
        if (updates.geminiApiKey === '***') delete updates.geminiApiKey;
        if (updates.openRouterApiKey === '***') delete updates.openRouterApiKey;
        
        const newConfig = { ...currentConfig, ...updates };
        await queries.setSetting('ai_config', newConfig);
        
        res.json({ message: 'Config updated' });
    } catch (err) {
        logger.error({ err }, 'Error updating AI config');
        res.status(500).json({ error: 'Error interno' });
    }
});

module.exports = router;
