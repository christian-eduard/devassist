/**
 * scripts/vectorize_projects.js
 * 🧬 Vectorización de Repositorios
 * 
 * Genera embeddings para todos los proyectos que aún no tienen.
 */
const nexus = require('../electron/db_nexus');
const ai = require('../electron/services/ai_rotator');
const logger = require('../electron/ipc/logger');

async function vectorize() {
    console.log('🧬 [PROJECT-VECTOR] Iniciando indexación semántica de repositorios...\n');

    try {
        await nexus.initNexus();
        const projects = await nexus.getProjects();
        console.log(`🔍 Encontrados ${projects.length} proyectos en el sistema.`);

        let count = 0;
        for (const p of projects) {
            // Re-vectorizamos todos para asegurar 1536 dims consistentes
            const stackList = p.stack ? p.stack.join(', ') : 'Desconocido';
            const contextText = `
                Proyecto: ${p.name}
                Senda: ${p.path}
                Tecnologías: ${stackList}
                Líneas de Código: ${p.codeStats?.loc || 0}
                Archivos: ${p.codeStats?.totalFiles || 0}
                Descripción: ${p.description || ''}
            `.trim();

            console.log(`   🔸 Procesando: ${p.name}...`);
            const embedding = await ai.generateEmbedding(contextText);
            
            if (embedding) {
                await nexus.saveProject({
                    ...p,
                    projectEmbedding: embedding
                });
                count++;
                console.log(`      ✅ Vector guardado (${embedding.length} dims)`);
            }
        }

        console.log(`\n🎉 Indexación completada. ${count} proyectos actualizados.`);

    } catch (err) {
        console.error('\n❌ Fallo en vectorización de proyectos:');
        console.error(err.message);
    } finally {
        await nexus.pool.end();
        process.exit(0);
    }
}

vectorize();
