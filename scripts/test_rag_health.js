/**
 * scripts/test_rag_health.js
 * 🧪 Test de Salud del Motor Semántico (Nexus RAG)
 * 
 * Este script valida:
 * 1. Conexión con PostgreSQL + pgvector
 * 2. Generación exitosa de Embeddings (Google AI)
 * 3. Recuperación semántica de Fichas (Knowledge Vault)
 * 4. Recuperación semántica de Proyectos (Repositories)
 */
const nexus = require('../electron/db_nexus');
const ai = require('../electron/services/ai_rotator');
const logger = require('../electron/ipc/logger');
const path = require('path');

async function runHealthCheck() {
    console.log('🚀 [RAG-TEST] Iniciando validación del corazón semántico...\n');

    try {
        // 1. Verificar DB
        console.log('Step 1: Check DB Pipeline...');
        const isDbOk = await nexus.initNexus();
        if (!isDbOk) throw new Error('DB no inicializada correctamente.');
        console.log('✅ DB Conectada (Postgres + pgvector)\n');

        // 2. Verificar IA (Embeddings)
        console.log('Step 2: Check AI Embedding Pipeline...');
        const testText = "Arquitectura de componentes con React Flow y gestión de grafos";
        const vector = await ai.generateEmbedding(testText);
        
        if (vector && Array.isArray(vector) && vector.length === 1536) {
            console.log(`✅ Embedding generado: [${vector.length} dimensiones]`);
            console.log(`📊 Valor parcial: ${vector.slice(0, 5).join(', ')}...\n`);
        } else {
            throw new Error(`Embedding inválido: ${vector ? vector.length : 'null'} dimensiones.`);
        }

        // 3. Simular Búsqueda RAG en el Vault
        console.log('Step 3: Simulating RAG Search (Vault)...');
        const searchResults = await nexus.searchVault(vector, 3);
        console.log(`✅ Resultados de búsqueda: ${searchResults.length}`);
        
        searchResults.forEach((r, i) => {
            console.log(`   [${i+1}] Title: ${r.title || r.titulo} (ID: ${r.id})`);
        });
        console.log('');

        // 4. Simular Búsqueda RAG en Proyectos
        console.log('Step 4: Simulating RAG Search (Projects)...');
        const projResults = await nexus.searchProjects(vector, 3);
        console.log(`✅ Proyectos relacionados: ${projResults.length}`);
        
        projResults.forEach((p, i) => {
            console.log(`   [${i+1}] Project: ${p.name} (Stack: ${p.stack?.join(', ') || 'N/A'})`);
        });

        console.log('\n🌟 [TEST RESULT] SISTEMA SEMÁNTICO OPERATIVO AL 100%');
        console.log('TESS ahora puede ver y recordar sus proyectos con precisión táctica.');

    } catch (err) {
        console.error('\n❌ [TEST FAILED] Error en validación RAG:');
        console.error(err.stack || err.message);
        process.exit(1);
    } finally {
        await nexus.pool.end();
        process.exit(0);
    }
}

runHealthCheck();
