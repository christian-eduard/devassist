// src/db/connection.js — PostgreSQL connection pool + pgvector setup
const { Pool } = require('pg');
const config = require('../config');
const logger = require('../utils/logger');

const pool = new Pool({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
    logger.error({ err }, 'Unexpected PostgreSQL pool error');
});

/**
 * Initialize the database: create tables and install pgvector extension.
 * Safe to call multiple times (IF NOT EXISTS).
 */
async function initDatabase() {
    const client = await pool.connect();
    try {
        // Install pgvector extension
        await client.query('CREATE EXTENSION IF NOT EXISTS vector');

        await client.query(`
            CREATE TABLE IF NOT EXISTS fichas (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                url_original TEXT,
                transcripcion TEXT,
                manual_uso TEXT,
                video_path TEXT,
                video_name TEXT,
                metadata JSONB DEFAULT '{}',
                embedding vector(768),
                tl_dr TEXT,
                key_points JSONB DEFAULT '[]',
                tech_stack JSONB DEFAULT '[]',
                urgency INTEGER DEFAULT 3,
                obsolescence_score INTEGER DEFAULT 5,
                confidence_score DOUBLE PRECISION DEFAULT 0.0,
                content_type TEXT DEFAULT 'video',
                channel TEXT DEFAULT 'api',
                author TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS jobs (
                id TEXT PRIMARY KEY,
                url TEXT NOT NULL,
                channel TEXT DEFAULT 'api',
                status TEXT DEFAULT 'pending',
                progress TEXT DEFAULT 'Encolado...',
                ficha_id TEXT,
                error TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value JSONB NOT NULL,
                updated_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS ai_usage (
                id SERIAL PRIMARY KEY,
                provider TEXT NOT NULL,
                model TEXT,
                tokens INTEGER DEFAULT 0,
                cost_saved DOUBLE PRECISION DEFAULT 0.0,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                path TEXT NOT NULL,
                stack TEXT,
                file_tree JSONB DEFAULT '{}',
                code_stats JSONB DEFAULT '{}',
                flow_data JSONB DEFAULT '{}',
                embedding vector(768),
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS agents (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                role TEXT NOT NULL,
                system_prompt TEXT NOT NULL,
                model TEXT DEFAULT 'gemini-1.5-pro',
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS agent_memory (
                id SERIAL PRIMARY KEY,
                agent_id TEXT REFERENCES agents(id) ON DELETE CASCADE,
                channel TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        // ── Projects Hub migrations ──
        await client.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS description TEXT`);
        await client.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'idea'`);
        await client.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 3`);
        await client.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'`);
        await client.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS cover_emoji VARCHAR(10) DEFAULT '🚀'`);

        await client.query(`
            CREATE TABLE IF NOT EXISTS project_ideas (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                content TEXT NOT NULL,
                source VARCHAR(50) DEFAULT 'manual',
                author VARCHAR(100),
                title VARCHAR(200),
                image_url TEXT,
                image_analysis TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);
        await client.query(`ALTER TABLE project_ideas ADD COLUMN IF NOT EXISTS image_url TEXT`);
        await client.query(`ALTER TABLE project_ideas ADD COLUMN IF NOT EXISTS image_analysis TEXT`);
        await client.query(`ALTER TABLE project_ideas ADD COLUMN IF NOT EXISTS title VARCHAR(200)`);
        await client.query(`ALTER TABLE project_ideas ADD COLUMN IF NOT EXISTS generated_images JSONB DEFAULT '[]'`);

        await client.query(`
            CREATE TABLE IF NOT EXISTS project_fichas (
                project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                ficha_id TEXT NOT NULL REFERENCES fichas(id) ON DELETE CASCADE,
                linked_at TIMESTAMPTZ DEFAULT NOW(),
                PRIMARY KEY (project_id, ficha_id)
            )
        `);

        logger.info('Database initialized successfully');
    } catch (err) {
        logger.error({ err }, 'Failed to initialize database');
        throw err;
    } finally {
        client.release();
    }
}

module.exports = { pool, initDatabase };
