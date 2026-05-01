const { drizzle } = require('drizzle-orm/node-postgres');
const { Pool } = require('pg');
const schema = require('../electron/schema');
const { settings } = schema;
const logger = require('../electron/ipc/logger');

// Configuración del entorno (V22: Forcening Golden State)
const environment = require('../electron/environment');
const pool = new Pool(environment.getDbConfig());
const db = drizzle(pool, { schema });

const GOLDEN_CONFIG = {
    gemini: {
        apiKey: '',
        credentialsPath: '',
        project: '',
        location: 'us-central1',
        model: 'gemini-2.5-flash',
    },
    apiKeys: {
        openrouter: '',
        groq: '',
        openai: '',
        huggingface: '',
        anthropic: '',
    },
    aiAssignments: {
        'vault-transcribe': { provider: 'groq', model: 'whisper-large-v3' },
        'vault-analyze': { provider: 'gemini', model: 'gemini-1.5-pro' }, // Prioridad Pago
        'vault-research': { provider: 'gemini', model: 'gemini-1.5-pro' }, // Prioridad Pago
        'vault-matcher': { provider: 'openai', model: 'gpt-4o-mini' },
        'vault-explore': { provider: 'groq', model: 'llama-3.3-70b-versatile' },
    },
    providers: [],
    watchFolder: '',
    reminderDays: 7,
    antigravityAppName: 'Antigravity',
};

async function forceGoldenReset() {
    try {
        logger.info('[V22] Iniciando Reseteo Forzoso al "Estado Dorado" (6 de Abril)...');
        
        // 1. Obtener config actual para no perder las API Keys de Chris
        const rows = await db.select().from(settings);
        const current = rows.find(r => r.key === 'app_config')?.value || {};
        
        // 2. Fusionar: Mantener keys de Chris pero FORZAR assignments del backup
        const finalConfig = {
            ...GOLDEN_CONFIG,
            gemini: { ...GOLDEN_CONFIG.gemini, apiKey: current.gemini?.apiKey || '' },
            apiKeys: { ...GOLDEN_CONFIG.apiKeys, ...current.apiKeys },
            // FORZAR LOS MÉTODOS QUE SÍ FUNCIONABAN
            aiAssignments: GOLDEN_CONFIG.aiAssignments 
        };

        await db.insert(settings).values({ 
            key: 'app_config', 
            value: finalConfig, 
            updatedAt: new Date() 
        }).onConflictDoUpdate({ 
            target: settings.key, 
            set: { value: finalConfig, updatedAt: new Date() } 
        });

        logger.info('[V22] ✅ Éxito: La base de datos ahora tiene los assignments del backup.');
        process.exit(0);
    } catch (err) {
        logger.error('[V22] ❌ Error en el reseteo:', err.message);
        process.exit(1);
    }
}

forceGoldenReset();
