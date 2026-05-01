const { ipcMain } = require('electron');
const logger = require('./logger');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

/**
 * Módulo de Integración con Google Workspace (Fase 6)
 * Utiliza el servidor MCP de Presto AI para evitar configuración manual de Google Cloud.
 */

function registerGoogleHandlers(ipcMain) {
    
    // Handler para exportar una ficha a Google Docs
    ipcMain.handle('google:export-ficha', async (event, fichaData) => {
        logger.info(`[Google:Docs] Exportando ficha: ${fichaData.title}`);
        
        try {
            // Comando MCP para crear documento
            // Usamos un pequeño script bridge o llamamos directamente al npx si está configurado como herramienta
            const docContent = `
# ${fichaData.title}
**Fecha:** ${new Date(fichaData.createdAt).toLocaleDateString()}
**Fuente:** ${fichaData.urlOriginal || 'Local'}

## TL;DR
${fichaData.resumen || 'Sin resumen'}

## Investigación Profunda
${fichaData.investigacion_profunda || 'Pendiente de análisis'}

## Stack Tecnológico
${(fichaData.tech_stack || []).join(', ')}
            `.trim();

            // Aquí llamaríamos a la herramienta del MCP: google_docs_create_document
            // Por ahora simulamos la integración técnica hasta que el OAuth esté listo
            return { success: true, message: 'Ficha enviada a la cola de exportación de Google Docs' };
        } catch (err) {
            logger.error('[Google:Docs] Error en exportación:', err.message);
            throw err;
        }
    });

    // Handler para sincronizar calendario
    ipcMain.handle('google:sync-calendar', async (event) => {
        logger.info('[Google:Calendar] Sincronizando eventos técnicos...');
        try {
            return { success: true, events: [] };
        } catch (err) {
            logger.error('[Google:Calendar] Error en sync:', err.message);
            throw err;
        }
    });

    // Nuevo: Buscar huecos libres para aprendizaje (Fase 10)
    ipcMain.handle('google:find-slots', async (event, { durationMinutes }) => {
        logger.info(`[Google:Secretary] Buscando hueco de ${durationMinutes} min...`);
        try {
            // Aquí llamaríamos al MCP: google_calendar_list_events para hoy/mañana
            // Simulamos la lógica de detección de huecos
            const now = new Date();
            const tomorrow = new Date(now);
            tomorrow.setDate(now.getDate() + 1);
            
            // Proponemos mañana a las 17:30 como ejemplo de slot encontrado
            const proposedStart = new Date(tomorrow);
            proposedStart.setHours(17, 30, 0, 0);
            const proposedEnd = new Date(proposedStart.getTime() + durationMinutes * 60000);

            return { 
                success: true, 
                slot: {
                    start: proposedStart.toISOString(),
                    end: proposedEnd.toISOString(),
                    display: proposedStart.toLocaleString()
                }
            };
        } catch (err) {
            logger.error('[Google:Secretary] Error al buscar huecos:', err.message);
            throw err;
        }
    });

    // Nuevo: Agendar evento de aprendizaje (Fase 10)
    ipcMain.handle('google:schedule-learning', async (event, { title, start, end, fichaId }) => {
        logger.info(`[Google:Secretary] Agendando: ${title}`);
        try {
            // Llamada al MCP: google_calendar_create_event
            // { calendarId: 'primary', summary: title, start, end, description: `Ficha: ${fichaId}` }
            return { success: true, eventId: 'mock_event_123' };
        } catch (err) {
            logger.error('[Google:Secretary] Error al agendar:', err.message);
            throw err;
        }
    });

    // Nuevo: Iniciar Auth
    ipcMain.handle('google:start-auth', async () => {
        logger.info('[Google] Iniciando flujo de autorización Presto AI...');
        // El npx ya corre en background, pero si el usuario quiere "re-vincular"
        // o si iniciamos el servidor MCP por primera vez.
        // npx @presto-ai/google-workspace-mcp abrirá el navegador.
        exec('npx -y @presto-ai/google-workspace-mcp', (err) => {
            if (err) logger.error('[Google:MCP] Error al lanzar auth:', err.message);
        });
        return { success: true };
    });

    // Nuevo: Consultar estado
    ipcMain.handle('google:get-status', async () => {
        try {
            // El servidor MCP Presto AI guarda la configuración en la carpeta del usuario
            const configPath = path.join(os.homedir(), '.config', '@presto-ai', 'google-workspace-mcp', 'config.json');
            const exists = fs.existsSync(configPath);
            
            return {
                connected: exists,
                account: exists ? 'Cuenta Vinculada (@presto-ai MCP)' : 'Desconectado',
                mcpReady: true,
                configFound: exists
            };
        } catch (err) {
            logger.error('[Google:Status] Error:', err.message);
            return { connected: false, error: err.message };
        }
    });
}

module.exports = registerGoogleHandlers;
