const ai = require('../electron/services/ai_rotator');
const db = require('../electron/db_nexus');
const logger = require('../electron/ipc/logger');
require('dotenv').config();

// Configuración de la ficha de prueba de Chris
const FICHA_ID = "f_1775599139063";

async function forceGenerateTutorial() {
    console.log('🚀 INICIANDO GENERACIÓN FORZADA V43 PARA CHRIS...');
    
    try {
        const ficha = await db.getFichaById(FICHA_ID);
        if (!ficha) throw new Error('Ficha no hallada en Postgres');

        console.log(`📦 Ficha cargada: ${ficha.title}`);

        const prompt = `
        Genera un tutorial técnico y paso a paso basado en esta investigación:
        Título: ${ficha.title}
        Concepto: ${ficha.resumen || ''}
        
        Usa formato Markdown profesional.
        `.trim();

        console.log('🧠 Llamando a Gemini 2.5 Flash (Fórmula Nuclear)...');
        const tutorial = await ai.complete(prompt, { taskId: 'vault-research' });

        console.log('✅ Tutorial generado con éxito de Gemini.');
        console.log('-------------------------------------------');
        console.log(tutorial.substring(0, 200) + '...');
        console.log('-------------------------------------------');

        console.log('💾 Guardando en manual_uso (Persistencia V43)...');
        await db.updateFicha(FICHA_ID, { manualUso: tutorial });
        
        console.log('🏆 OPERACIÓN COMPLETADA CON ÉXITO. Chris, abre tu ficha y verás el tutorial.');

    } catch (err) {
        console.error('❌ ERROR ATÓMICO:', err.message);
    } finally {
        process.exit();
    }
}

forceGenerateTutorial();
