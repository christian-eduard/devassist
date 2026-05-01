const { db } = require('./db_nexus');
const { fichas } = require('./schema');
const { eq, or, and, lt } = require('drizzle-orm');
const logger = require('./ipc/logger');
const { generateDeepResearch } = require('./ipc/fichas'); // Extracted logic for research

let daemonInterval = null;
let isDaemonRunning = false;

async function runResearchDaemonCycle() {
    if (isDaemonRunning) return;
    isDaemonRunning = true;
    try {
        // Encontrar fichas pendientes de research o expiradas
        const now = new Date();
        const pendingFichas = await db.select().from(fichas).where(
            or(
                eq(fichas.researchStatus, 'pending'),
                and(
                    eq(fichas.researchStatus, 'completed'),
                    lt(fichas.nextResearchAt, now)
                )
            )
        ).limit(1);

        if (pendingFichas.length > 0) {
            const f = pendingFichas[0];
            logger.info(`[Daemon] Initiating autonomous deep research for: ${f.title}`);
            
            // Mark as 'researching' to prevent double processing
            await db.update(fichas).set({ researchStatus: 'researching' }).where(eq(fichas.id, f.id));
            
            try {
                // Call the actual AI logic
                const researchResult = await generateDeepResearch(f.id);
                
                if (researchResult.ok) {
                    // Update successfully
                    await db.update(fichas).set({ 
                        researchStatus: 'completed',
                        investigacion_profunda: researchResult.investigacion_profunda, // Legacy property mapped to DB metadata mapping
                        // Calculate next check based on obsolescence score (e.g. 10 = fast change, check often)
                        nextResearchAt: new Date(Date.now() + (30 * 24 * 60 * 60 * 1000) / (f.obsolescenceScore || 5)),
                        researchLog: [...(f.researchLog || []), `[${new Date().toISOString()}] Automated successful research`]
                    }).where(eq(fichas.id, f.id));
                    
                    logger.info(`[Daemon] Research complete for: ${f.title}`);
                } else {
                    throw new Error(researchResult.error);
                }
            } catch (err) {
                logger.warn(`[Daemon] Research failed for ${f.id}: ${err.message}`);
                await db.update(fichas).set({ 
                    researchStatus: 'failed',
                    researchLog: [...(f.researchLog || []), `[${new Date().toISOString()}] Failed: ${err.message}`]
                }).where(eq(fichas.id, f.id));
            }
        }
    } catch (e) {
        logger.error(`[Daemon] Error in loop: ${e.message}`);
    } finally {
        isDaemonRunning = false;
    }
}

function startResearchDaemon() {
    if (daemonInterval) return;
    // Ejecutar cada 1 minuto (para evaluación, puede subirse en prod)
    daemonInterval = setInterval(runResearchDaemonCycle, 60000);
    logger.info('[Daemon] Research Daemon started.');
    // Iniciar primer ciclo de inmediato
    runResearchDaemonCycle();
}

function stopResearchDaemon() {
    if (daemonInterval) {
        clearInterval(daemonInterval);
        daemonInterval = null;
        logger.info('[Daemon] Research Daemon stopped.');
    }
}

module.exports = { startResearchDaemon, stopResearchDaemon };
