const { Client } = require('pg');
require('dotenv').config();

async function updateKeys() {
    const client = new Client({
        user: process.env.DB_USER || 'chris',
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'devassist',
        password: String(process.env.DB_PASSWORD || ''), // Forzado a string V35
        port: parseInt(process.env.DB_PORT || '5432'),
    });

    try {
        await client.connect();
        console.log('📦 Conectado a Postgres para actualización de claves...');

        const newKey = 'AIzaSyCBE0uEEgZB2jOOSzsqR-EgY6LFnoLyQ6M';

        // 1. Obtener config actual
        const res = await client.query("SELECT key, value FROM settings WHERE key = 'app_config'");
        if (res.rows.length > 0) {
            let config = res.rows[0].value;
            
            // Actualizar Gemini Key en la config persistente
            if (!config.gemini) config.gemini = {};
            config.gemini.apiKey = newKey;
            
            if (!config.apiKeys) config.apiKeys = {};
            config.apiKeys.gemini = newKey;

            await client.query("UPDATE settings SET value = $1 WHERE key = 'app_config'", [config]);
            console.log('✅ Clave de Gemini actualizada en la tabla settings de Postgres.');
        } else {
            console.log('⚠️ No se encontró el registro app_config en Postgres.');
        }

    } catch (err) {
        console.error('❌ Error actualizando DB:', err.message);
    } finally {
        await client.end();
    }
}

updateKeys();
