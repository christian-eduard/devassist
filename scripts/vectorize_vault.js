/**
 * vectorize_vault.js — QW-3
 * Vectoriza todas las fichas sin embedding usando Gemini text-embedding-004
 * Modelo: text-embedding-004 (768 dims) → compatible con pgvector
 * 
 * NOTA: El schema usa vector(1536). Para compatibilidad usamos padding si es necesario,
 * o bien usamos text-embedding-004 con dimensión reducida.
 * Solución pragmática: usamos OpenAI si hay key, Gemini si no.
 */

const { Pool } = require('pg');
const { loadConfig } = require('../electron/ipc/config');
const logger = require('../electron/ipc/logger');

const pool = new Pool({
    host: 'localhost',
    port: 54325,
    database: 'devassist_vault',
    user: 'devassist_admin',
    password: 'devassist_secure_pass'
});

async function loadOpenAIKey() {
    // Config real está en PostgreSQL settings
    const res = await pool.query("SELECT value FROM settings WHERE key='app_config'");
    if (!res.rows.length) throw new Error('No se encontró app_config en settings');
    const config = res.rows[0].value;
    return config.apiKeys?.openai || null;
}

async function generateEmbeddingGemini(text, apiKey) {
    // text-embedding-004 usa v1 (no v1beta)
    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/text-embedding-004:embedContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'models/text-embedding-004',
                content: { parts: [{ text: text.substring(0, 8000) }] }
            })
        }
    );
    const data = await response.json();
    if (data.error) throw new Error(`Gemini Error: ${data.error.message}`);
    return data.embedding.values; // 768 dims
}

async function generateEmbeddingOpenAI(text, apiKey) {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ model: 'text-embedding-3-small', input: text.substring(0, 8000) })
    });
    const data = await response.json();
    if (data.error) throw new Error(`OpenAI Error: ${data.error.message}`);
    return data.data[0].embedding; // 1536 dims
}

async function vectorize() {
    logger.info('[Vectorizer] Iniciando vectorización del vault...');

    let openaiKey = null;

    try {
        openaiKey = await loadOpenAIKey();
    } catch(e) {
        logger.warn('[Vectorizer] No se pudo leer key de DB:', e.message);
    }

    // Fallback: leer de config local
    if (!openaiKey) {
        const config = await loadConfig();
        openaiKey = config.apiKeys?.openai;
    }

    let engine = null;
    if (openaiKey) {
        engine = 'openai';
        logger.info('[Vectorizer] Motor: OpenAI text-embedding-3-small (1536 dims)');
    } else {
        logger.error('[Vectorizer] ❌ No hay API key de OpenAI disponible. Abortando.');
        process.exit(1);
    }

    // Asegurar 1536 dims para OpenAI
    if (engine === 'openai') {
        try {
            await pool.query(`
                ALTER TABLE fichas 
                ALTER COLUMN embedding TYPE vector(1536) 
                USING embedding::vector(1536)
            `);
            logger.info('[Vectorizer] Schema ajustado: vector(1536) para OpenAI embeddings');
        } catch (e) {
            if (e.message.includes('already') || e.message.includes('syntax')) {
                logger.info('[Vectorizer] Schema ya está en vector(1536)');
            } else {
                logger.warn('[Vectorizer] No se pudo ajustar schema (puede que ya sea correcto):', e.message);
            }
        }
    }

    // Obtener fichas sin embedding
    const result = await pool.query(
        'SELECT id, title, transcripcion, metadata FROM fichas WHERE embedding IS NULL ORDER BY created_at DESC'
    );
    const pending = result.rows;
    logger.info(`[Vectorizer] ${pending.length} fichas pendientes de vectorización`);

    if (pending.length === 0) {
        logger.info('[Vectorizer] ✅ Vault ya vectorizado completamente.');
        await pool.end();
        process.exit(0);
    }

    let ok = 0;
    let fail = 0;

    for (const f of pending) {
        try {
            const textToEmbed = [
                `Título: ${f.title}`,
                `Transcripción: ${(f.transcripcion || '').substring(0, 6000)}`,
                `Metadata: ${JSON.stringify(f.metadata || {}).substring(0, 1000)}`
            ].join('\n');

            let vector;
            if (engine === 'gemini') {
                vector = await generateEmbeddingGemini(textToEmbed, geminiKey);
            } else {
                vector = await generateEmbeddingOpenAI(textToEmbed, openaiKey);
            }

            const vectorStr = `[${vector.join(',')}]`;
            await pool.query(
                'UPDATE fichas SET embedding = $1 WHERE id = $2',
                [vectorStr, f.id]
            );

            ok++;
            logger.info(`[Vectorizer] ✅ (${ok}/${pending.length}) ${f.title.substring(0, 50)}`);

            // Rate limiter: 1 seg entre requests para no saturar la API
            await new Promise(r => setTimeout(r, 1000));
        } catch (err) {
            fail++;
            logger.error(`[Vectorizer] ❌ Error en ${f.id}: ${err.message}`);
        }
    }

    logger.info(`[Vectorizer] Completado — ${ok} vectorizadas, ${fail} errores.`);
    await pool.end();
    process.exit(0);
}

vectorize().catch(e => {
    logger.error('[Vectorizer] Error fatal:', e.message);
    process.exit(1);
});
