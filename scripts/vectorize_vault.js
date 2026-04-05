const { db, initNexus } = require('../electron/db_nexus');
const { fichas } = require('../electron/schema');
const { eq, isNull } = require('drizzle-orm');
const { loadConfig } = require('../electron/ipc/config');
const logger = require('../electron/ipc/logger');

async function vectorize() {
    logger.info('🧠 Iniciando Auto-Vectorizer (OpenAI text-embedding-3-small)...');
    
    // 1. Inicializar DB
    await initNexus();

    // 2. Cargar Configuración
    const config = await loadConfig();
    const apiKey = config.apiKeys?.openai;
    
    if (!apiKey) {
        logger.error('❌ No se encontró API Key de OpenAI. Abortando.');
        process.exit(1);
    }

    // 3. Buscar fichas sin embedding
    const pending = await db.select().from(fichas).where(isNull(fichas.embedding));
    logger.info(`🔍 Encontradas ${pending.length} fichas sin vectorizar.`);

    for (const f of pending) {
        try {
            const textToEmbed = `Ficha: ${f.title}\nTranscripción: ${f.transcripcion || ''}\nMetadata: ${JSON.stringify(f.metadata)}`;
            
            logger.info(`✨ Generando vector OpenAI para: ${f.title}...`);
            
            const response = await fetch('https://api.openai.com/v1/embeddings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'text-embedding-3-small',
                    input: textToEmbed
                })
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error.message);
            
            const vector = data.data[0].embedding;

            // 4. Guardar en Postgres
            await db.update(fichas)
                .set({ embedding: vector })
                .where(eq(fichas.id, f.id));
            
            logger.info(`✅ Ficha ${f.id} vectorizada con éxito (1536 dims).`);
        } catch (err) {
            logger.error(`❌ Error vectorizando ${f.id}:`, err.message);
        }
    }

    logger.info('🎉 Proceso de vectorización completado.');
    process.exit(0);
}

vectorize();
