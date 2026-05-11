// src/db/queries.js — All database operations, centralized
const { pool } = require('./connection');
const logger = require('../utils/logger');

const queries = {
    // ── FICHAS ──

    async saveFicha(ficha) {
        const { id, title, url_original, transcripcion, manual_uso, video_path, video_name,
                metadata, embedding, tl_dr, key_points, tech_stack, urgency,
                obsolescence_score, confidence_score, content_type, channel, author } = ficha;

        const embeddingStr = embedding ? `[${embedding.join(',')}]` : null;

        await pool.query(`
            INSERT INTO fichas (id, title, url_original, transcripcion, manual_uso, video_path,
                video_name, metadata, embedding, tl_dr, key_points, tech_stack, urgency,
                obsolescence_score, confidence_score, content_type, channel, author)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
            ON CONFLICT (id) DO UPDATE SET
                title = EXCLUDED.title,
                transcripcion = EXCLUDED.transcripcion,
                manual_uso = EXCLUDED.manual_uso,
                metadata = EXCLUDED.metadata,
                embedding = EXCLUDED.embedding,
                tl_dr = EXCLUDED.tl_dr,
                key_points = EXCLUDED.key_points,
                tech_stack = EXCLUDED.tech_stack,
                urgency = EXCLUDED.urgency,
                updated_at = NOW()
        `, [id, title, url_original, transcripcion, manual_uso, video_path,
            video_name, JSON.stringify(metadata || {}), embeddingStr, tl_dr,
            JSON.stringify(key_points || []), JSON.stringify(tech_stack || []),
            urgency || 3, obsolescence_score || 5, confidence_score || 0,
            content_type || 'video', channel || 'api', author]);

        logger.info({ fichaId: id }, 'Ficha saved');
    },

    async getFichaById(id) {
        const { rows } = await pool.query('SELECT * FROM fichas WHERE id = $1', [id]);
        return rows[0] || null;
    },

    async getAllFichas(limit = 50, offset = 0) {
        const { rows } = await pool.query(
            'SELECT id, title, tl_dr, channel, author, urgency, content_type, created_at FROM fichas ORDER BY created_at DESC LIMIT $1 OFFSET $2',
            [limit, offset]
        );
        return rows;
    },

    async deleteFicha(id) {
        const { rowCount } = await pool.query('DELETE FROM fichas WHERE id = $1', [id]);
        return rowCount > 0;
    },

    async findFichaByUrl(url) {
        const { rows } = await pool.query('SELECT id, title, channel FROM fichas WHERE url_original = $1', [url]);
        return rows[0] || null;
    },

    async searchByEmbedding(embedding, limit = 5) {
        const embeddingStr = `[${embedding.join(',')}]`;
        const { rows } = await pool.query(`
            SELECT id, title, tl_dr, key_points, tech_stack, manual_uso, channel, author,
                   1 - (embedding <=> $1::vector) AS similarity
            FROM fichas
            WHERE embedding IS NOT NULL
            ORDER BY embedding <=> $1::vector
            LIMIT $2
        `, [embeddingStr, limit]);
        return rows;
    },

    // ── JOBS ──

    async createJob(job) {
        await pool.query(
            'INSERT INTO jobs (id, url, channel, status, progress) VALUES ($1, $2, $3, $4, $5)',
            [job.id, job.url, job.channel || 'api', 'pending', 'Encolado...']
        );
    },

    async updateJob(id, updates) {
        const sets = [];
        const vals = [];
        let i = 1;

        for (const [key, val] of Object.entries(updates)) {
            sets.push(`${key} = $${i}`);
            vals.push(val);
            i++;
        }
        sets.push(`updated_at = NOW()`);
        vals.push(id);

        await pool.query(`UPDATE jobs SET ${sets.join(', ')} WHERE id = $${i}`, vals);
    },

    async getJobById(id) {
        const { rows } = await pool.query('SELECT * FROM jobs WHERE id = $1', [id]);
        return rows[0] || null;
    },

    // ── SETTINGS ──

    async getSetting(key) {
        const { rows } = await pool.query('SELECT value FROM settings WHERE key = $1', [key]);
        return rows[0] ? rows[0].value : null;
    },

    async setSetting(key, value) {
        await pool.query(`
            INSERT INTO settings (key, value)
            VALUES ($1, $2)
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
        `, [key, JSON.stringify(value)]);
    },

    // ── AI USAGE ──

    async saveAIUsage(usage) {
        await pool.query(
            'INSERT INTO ai_usage (provider, model, tokens, cost_saved) VALUES ($1, $2, $3, $4)',
            [usage.provider, usage.model, usage.tokens || 0, usage.costSaved || 0]
        );
    },

    async getAIUsageStats() {
        const { rows } = await pool.query(`
            SELECT COALESCE(SUM(tokens), 0) AS tokens,
                   COALESCE(SUM(cost_saved), 0) AS savings,
                   COUNT(*) AS calls
            FROM ai_usage
        `);
        return rows[0];
    },
};

module.exports = queries;
