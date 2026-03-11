const fs = require('fs');
const path = require('path');
const logger = require('./logger');

const AGENTS_FILE = 'agents.json';

function loadAgents(dataDir) {
    const filePath = path.join(dataDir, AGENTS_FILE);
    try {
        if (fs.existsSync(filePath)) {
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            return data.agents || [];
        }
    } catch (err) {
        logger.error('[Agents] Error loading agents.json:', err.message);
    }
    return [];
}

function saveAgents(dataDir, agents) {
    const filePath = path.join(dataDir, AGENTS_FILE);
    fs.writeFileSync(filePath, JSON.stringify({ agents }, null, 2), 'utf8');
}

function getAgentById(dataDir, agentId) {
    const agents = loadAgents(dataDir);
    return agents.find(a => a.id === agentId) || null;
}

function isAgentActive(dataDir, agentId) {
    const agent = getAgentById(dataDir, agentId);
    return agent ? agent.status === 'active' : false;
}

function logAgentError(dataDir, agentId, errorMessage) {
    const agents = loadAgents(dataDir);
    const agent = agents.find(a => a.id === agentId);
    if (agent) {
        if (!agent.errors) agent.errors = [];
        agent.errors.unshift({
            message: errorMessage,
            timestamp: new Date().toISOString()
        });
        if (agent.errors.length > 50) agent.errors = agent.errors.slice(0, 50);
        saveAgents(dataDir, agents);
    }
}

function touchAgentActivity(dataDir, agentId) {
    const agents = loadAgents(dataDir);
    const agent = agents.find(a => a.id === agentId);
    if (agent) {
        agent.last_active = new Date().toISOString();
        saveAgents(dataDir, agents);
    }
}

module.exports = function registerAgentsHandlers(ipcMain, dataDir) {

    // ── Obtener todos los agentes ──
    ipcMain.handle('agents:get-all', async () => {
        try {
            return { ok: true, agents: loadAgents(dataDir) };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    });

    // ── Alternar estado de un agente (active/disabled) ──
    ipcMain.handle('agents:toggle', async (_event, agentId) => {
        try {
            const agents = loadAgents(dataDir);
            const agent = agents.find(a => a.id === agentId);
            if (!agent) return { ok: false, error: 'Agente no encontrado' };

            if (agent.status === 'pending') {
                return { ok: false, error: 'Este agente está en construcción y no puede activarse aún.' };
            }

            agent.status = agent.status === 'active' ? 'disabled' : 'active';
            saveAgents(dataDir, agents);
            logger.info(`[Agents] ${agent.name} → ${agent.status}`);
            return { ok: true, agent };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    });

    // ── Actualizar configuración de un agente ──
    ipcMain.handle('agents:update-config', async (_event, { agentId, config }) => {
        try {
            const agents = loadAgents(dataDir);
            const agent = agents.find(a => a.id === agentId);
            if (!agent) return { ok: false, error: 'Agente no encontrado' };

            agent.config = { ...agent.config, ...config };
            saveAgents(dataDir, agents);
            logger.info(`[Agents] Config actualizada para ${agent.name}`);
            return { ok: true, agent };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    });

    // ── Obtener logs de un agente ──
    ipcMain.handle('agents:get-logs', async (_event, agentId) => {
        try {
            const agent = getAgentById(dataDir, agentId);
            if (!agent) return { ok: false, error: 'Agente no encontrado' };
            return { ok: true, errors: agent.errors || [] };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    });

    // ── Reiniciar un agente ──
    ipcMain.handle('agents:restart', async (_event, agentId) => {
        try {
            const agents = loadAgents(dataDir);
            const agent = agents.find(a => a.id === agentId);
            if (!agent) return { ok: false, error: 'Agente no encontrado' };

            // Limpiar errores recientes al reiniciar
            agent.errors = [];
            agent.status = 'active';
            agent.last_active = new Date().toISOString();
            saveAgents(dataDir, agents);

            logger.info(`[Agents] ${agent.name} reiniciado`);
            return { ok: true, agent };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    });
};

// Exportar utilidades para uso en clawbot.js
module.exports.isAgentActive = isAgentActive;
module.exports.touchAgentActivity = touchAgentActivity;
module.exports.logAgentError = logAgentError;
module.exports.getAgentById = getAgentById;
module.exports.loadAgents = loadAgents;
