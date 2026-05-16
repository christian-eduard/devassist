// src/routes/github.js — GitHub integration API
const { Router } = require('express');
const { pool } = require('../db/connection');
const logger = require('../utils/logger');

const router = Router();

// GitHub token from settings or env
let cachedToken = null;
async function getGitHubToken() {
    if (cachedToken) return cachedToken;
    try {
        const { rows } = await pool.query("SELECT value FROM settings WHERE key = 'github_token'");
        if (rows.length) {
            const val = rows[0].value;
            logger.info({ valType: typeof val, valPreview: String(val).substring(0, 10) }, 'GitHub token from DB');
            // JSONB string → pg returns it as a JS string already
            cachedToken = String(val);
            return cachedToken;
        }
    } catch (e) { logger.error({ err: e.message }, 'Failed to read github_token'); }
    return process.env.GITHUB_TOKEN || null;
}

/**
 * GET /api/github/repos — List all repos for the authenticated user
 */
router.get('/repos', async (req, res) => {
    try {
        const token = await getGitHubToken();
        if (!token) return res.status(400).json({ ok: false, error: 'GitHub token not configured' });

        const ghRes = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated&type=all', {
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'DevAssist-NoahPro',
            },
        });
        if (!ghRes.ok) throw new Error(`GitHub API error: ${ghRes.status}`);
        const ghRepos = await ghRes.json();

        // Get existing project links
        const { rows: projects } = await pool.query(
            "SELECT id, name, path, stack, cover_emoji FROM projects WHERE path IS NOT NULL AND path != ''"
        );
        const linkedMap = {};
        for (const p of projects) {
            if (p.path && p.path.includes('github.com')) {
                linkedMap[p.path] = { id: p.id, name: p.name, emoji: p.cover_emoji };
            }
        }

        const repos = ghRepos.map(r => ({
            name: r.name,
            full_name: r.full_name,
            html_url: r.html_url,
            clone_url: r.clone_url,
            description: r.description,
            language: r.language,
            private: r.private,
            updated_at: r.updated_at,
            pushed_at: r.pushed_at,
            stargazers_count: r.stargazers_count,
            default_branch: r.default_branch,
            linked_project: linkedMap[r.html_url] || null,
        }));

        res.json({ ok: true, repos, total: repos.length });
    } catch (err) {
        logger.error({ err: err.message }, 'GitHub repos fetch failed');
        res.status(500).json({ ok: false, error: err.message });
    }
});

/**
 * POST /api/github/link — Link a repo to a project
 * Body: { project_id, repo_url, repo_name, language }
 */
router.post('/link', async (req, res) => {
    try {
        const { project_id, repo_url, repo_name, language } = req.body;
        if (!project_id || !repo_url) {
            return res.status(400).json({ ok: false, error: 'project_id and repo_url required' });
        }

        await pool.query(
            'UPDATE projects SET path = $1, stack = $2 WHERE id = $3',
            [repo_url, language || null, project_id]
        );

        logger.info({ project_id, repo_url }, 'Repo linked to project');
        res.json({ ok: true, message: `Repo "${repo_name}" vinculado` });
    } catch (err) {
        logger.error({ err: err.message }, 'Link repo failed');
        res.status(500).json({ ok: false, error: err.message });
    }
});

/**
 * POST /api/github/unlink — Unlink a repo from a project
 * Body: { project_id }
 */
router.post('/unlink', async (req, res) => {
    try {
        const { project_id } = req.body;
        if (!project_id) return res.status(400).json({ ok: false, error: 'project_id required' });

        await pool.query(
            "UPDATE projects SET path = '', stack = NULL WHERE id = $1",
            [project_id]
        );

        res.json({ ok: true, message: 'Repo desvinculado' });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/**
 * GET /api/github/projects — List all projects (for linking dropdown)
 */
router.get('/projects', async (req, res) => {
    try {
        const { rows } = await pool.query(
            "SELECT id, name, cover_emoji, pinned FROM projects ORDER BY pinned DESC NULLS LAST, name"
        );
        res.json({ ok: true, projects: rows });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

module.exports = router;
