const db = require('../db_nexus');
const logger = require('./logger');
const skillIntelligence = require('../services/skill_intelligence');
const { Notification, shell } = require('electron');

module.exports = function registerSkillsHandlers(ipcMain, mainWindow) {
    
    ipcMain.handle('skills:load', async () => {
        return await db.getSkills();
    });

    ipcMain.handle('skills:get-suggested', async () => {
        return await db.getSuggestedSkills();
    });

    ipcMain.handle('skills:trigger-scan', async () => {
        logger.info('[Skills] Forzando escaneo de ClawHub...');
        const lists = await skillIntelligence.scanClawHub();
        const suggestion = await skillIntelligence.generateDailySuggestion();
        
        if (suggestion) {
            // Notificación nativa de Escritorio
            const notify = new Notification({
                title: '⚡ Nueva Skill Sugerida por TESS',
                body: `He encontrado "${suggestion.name}" y creo que encaja con tus proyectos actuales.`,
                icon: require('path').join(__dirname, '../../public/logo192.png'),
            });
            notify.on('click', () => {
                mainWindow.show();
                mainWindow.webContents.send('skills:navigate-to-suggestions');
            });
            notify.show();
            
            // También al sistema interno de notificaciones
            await db.saveNotification({
                id: `skill-${Date.now()}`,
                title: 'Nueva Sugerencia de Skill',
                message: `Descargada: ${suggestion.name}`,
                type: 'success',
                notes: suggestion.fullReport
            });
        }
        
        return { success: true, suggestion };
    });

    ipcMain.handle('skills:delete', async (_event, id) => {
        await db.deleteSkill(id);
        return { success: true };
    });

    ipcMain.handle('skills:open-folder', async (_event, id) => {
        const skill = (await db.getSkills()).find(s => s.id === id);
        if (skill && skill.localPath) {
            shell.openPath(skill.localPath);
        } else {
            // Path por defecto si no lo tiene guardado
            const defaultPath = require('path').join(process.env.HOME || process.env.USERPROFILE, 'Desktop', 'DevAssist', 'mejoras', 'downloads', 'skills', id);
            shell.openPath(defaultPath);
        }
        return { ok: true };
    });
};
