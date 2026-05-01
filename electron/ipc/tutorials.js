const logger = require('./logger');
const ai = require('../services/ai_rotator');
const db_nexus = require('../db_nexus');

/**
 * Fase 7: Motor de Tutoriales Adaptativos
 * Transforma investigaciones en guías prácticas adaptadas al stack del usuario.
 */

function registerTutorialHandlers(ipcMain) {
    
    ipcMain.handle('tutorials:generate', async (event, fichaId) => {
        logger.info(`[Tutorials] Generando tutorial adaptativo para ficha: ${fichaId}`);
        
        try {
            // 1. Obtener datos de la ficha
            const ficha = await db_nexus.getFichaById(fichaId);
            if (!ficha) throw new Error('Ficha no encontrada');

            // 2. Obtener contexto de proyectos locales para adaptación
            const userProjects = await db_nexus.getProjects();
            const projectContext = userProjects.length > 0 
                ? `El usuario tiene los siguientes proyectos locales: ${userProjects.map(p => `${p.name} (${p.tech_stack || 'n/a'})`).join(', ')}.`
                : 'No se detectaron proyectos locales específicos.';

            // 3. Prompt de generación
            const prompt = `
Eres un Ingeniero de Software Senior. Tu misión es convertir una investigación técnica en un TUTORIAL PASO A PASO.

DATOS DE LA INVESTIGACIÓN:
Título: ${ficha.title}
Concepto: ${ficha.resumen || ficha.metadata?.resumen || ''}
Investigación: ${ficha.investigacion_profunda || ''}

CONTEXTO DEL USUARIO:
${projectContext}

INSTRUCCIONES:
1. Crea un tutorial dividido en: Objetivos, Requisitos, Implementación (paso a paso) y Verificación.
2. ADAPTACIÓN: Si detectas que alguno de los proyectos del usuario puede beneficiarse de esto, escribe los ejemplos de código específicos para ese proyecto (usando sus nombres de archivos o rutas si están disponibles).
3. Formatea todo en Markdown profesional.
4. Usa un tono directo, técnico y ejecutivo.

Genera el tutorial ahora:
            `.trim();

            // 4. Llamada a la IA (Motor Unificado V28: AIRotator + Fallbacks)
            const tutorialMarkdown = await ai.complete(prompt, { 
                taskId: 'vault-research' // Reutilizamos el motor de investigación profunda
            });

            // 5. Persistencia Real V43: Guardar el tutorial en el campo 'manual_uso' de la ficha
            await db_nexus.updateFicha(fichaId, { manualUso: tutorialMarkdown });
            logger.info(`[Tutorials] Tutorial guardado con éxito en la ficha: ${fichaId}`);

            return { success: true, markdown: tutorialMarkdown, tutorial: tutorialMarkdown };

        } catch (err) {
            logger.error('[Tutorials] Error al generar tutorial:', err.message);
            throw err;
        }
    });
}

module.exports = registerTutorialHandlers;
