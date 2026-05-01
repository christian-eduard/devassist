// db.js - Puente asíncrono para el motor Nexus (PostgreSQL)
const nexus = require('./db_nexus');
const logger = require('./ipc/logger');

async function initDB() {
    try {
        await nexus.initNexus();
        logger.info('[DB] Puente Nexus activado.');
    } catch (err) {
        logger.error('[DB] Error activando puente Nexus:', err.message);
    }
}

module.exports = {
    initDB,
    getSettings: nexus.getSettings,
    saveSetting: nexus.saveSetting,
    getFichas: nexus.getFichas,
    saveFicha: nexus.saveFicha,
    deleteFicha: nexus.deleteFicha,
    getProjects: nexus.getProjects,
    getProjectById: nexus.getProjectById,
    saveProject: nexus.saveProject,
    deleteProject: nexus.deleteProject,
    getNotifications: nexus.getNotifications,
    saveNotification: nexus.saveNotification,
    getNotes: nexus.getNotes,
    saveNote: nexus.saveNote
};
