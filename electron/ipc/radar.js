const logger = require('./logger');
const db_nexus = require('../db_nexus');

/**
 * Fase 8: Tech Radar & Obsolescence Monitor
 * Gestiona el ciclo de vida de las tecnologías del usuario.
 */

function registerRadarHandlers(ipcMain) {
    
    // Obtener todas las tecnologías y su estado en el radar
    ipcMain.handle('radar:get-all', async () => {
        logger.info('[Radar] Recuperando estado del Tech Radar...');
        try {
            // En una implementación real, tendríamos una tabla 'tech_radar'
            // Por ahora, lo inferimos de las fichas y metadatos
            const fichas = await db_nexus.getFichas();
            const radar = {
                adopt: [],
                trial: [],
                assess: [],
                hold: []
            };

            fichas.forEach(f => {
                const stack = f.tech_stack || f.metadata?.tech_stack || [];
                stack.forEach(tech => {
                    const entry = { name: tech, fichaId: f.id, urgency: f.urgency, obsolescence: f.obsolescenceScore };
                    
                    // Lógica de clasificación automática basada en obsolescencia y urgencia
                    if (f.obsolescenceScore >= 8) {
                        if (!radar.hold.find(t => t.name === tech)) radar.hold.push(entry);
                    } else if (f.confidenceScore > 0.8 && f.urgency >= 4) {
                        if (!radar.adopt.find(t => t.name === tech)) radar.adopt.push(entry);
                    } else if (f.urgency === 3) {
                        if (!radar.trial.find(t => t.name === tech)) radar.trial.push(entry);
                    } else {
                        if (!radar.assess.find(t => t.name === tech)) radar.assess.push(entry);
                    }
                });
            });

            return { success: true, radar };
        } catch (err) {
            logger.error('[Radar] Error al obtener datos:', err.message);
            throw err;
        }
    });

    // Actualizar estado manualmente
    ipcMain.handle('radar:update-status', async (event, { techName, status }) => {
        logger.info(`[Radar] Actualizando ${techName} a estado: ${status}`);
        // TODO: Persistir en tabla dedicada si es necesario
        return { success: true };
    });

    // Nuevo: Escaneo de Obsolescencia Activo (Fase 8 Scan Engine)
    ipcMain.handle('radar:trigger-scan', async (event) => {
        logger.info('[Radar] Iniciando Escáner de Vigilancia Tecnológica...');
        try {
            const fichas = await db_nexus.getFichas();
            const results = [];
            
            // Recolectar tecnologías únicas
            const allTechs = new Set();
            fichas.forEach(f => {
                const stack = f.tech_stack || f.metadata?.tech_stack || [];
                stack.forEach(t => allTechs.add(t));
            });

            // Simular escaneo de salud tecnológica (Vigilancia CTO)
            for (const tech of allTechs) {
                // En una fase posterior, esto dispararía búsquedas reales automatizadas
                // Por ahora, simulamos la detección de anomalías
                results.push({
                    tech,
                    status: 'active',
                    healthScore: Math.floor(Math.random() * 10),
                    lastCheck: new Date().toISOString()
                });
            }

            return { success: true, results };
        } catch (err) {
            logger.error('[Radar] Error en escaneo:', err.message);
            throw err;
        }
    });
}

module.exports = registerRadarHandlers;
