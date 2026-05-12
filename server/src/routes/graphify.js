// src/routes/graphify.js — Graphify knowledge graph API
const { Router } = require('express');
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

const execAsync = promisify(exec);
const router = Router();

const GRAPHIFY_BIN = '/home/chris/graphify-env/bin/graphify';
const REPORTS_DIR = path.join(__dirname, '../../uploads/graphify');
const REPOS_DIR = '/home/chris/.graphify/repos';

// Ensure dirs exist
if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });

/**
 * POST /api/graphify — Analyze a repo
 * Body: { url: "https://github.com/user/repo", branch?: "main" }
 */
router.post('/', async (req, res) => {
    const { url, branch } = req.body;
    if (!url) return res.status(400).json({ error: 'url is required' });

    const analysisId = uuidv4().slice(0, 8);
    const outputDir = path.join(REPORTS_DIR, analysisId);
    fs.mkdirSync(outputDir, { recursive: true });

    // Return immediately, process in background
    res.json({ analysisId, status: 'processing', message: 'Analysis started' });

    try {
        // 1. Clone repo
        logger.info({ url, analysisId }, 'Graphify: cloning repo');
        const { stdout: clonePath } = await execAsync(
            `${GRAPHIFY_BIN} clone "${url}"${branch ? ` --branch "${branch}"` : ''}`,
            { timeout: 60000 }
        );
        const repoPath = clonePath.trim().split('\n').pop().trim();

        // 2. AST extraction (no LLM, instant)
        logger.info({ repoPath, analysisId }, 'Graphify: running AST update');
        const { stdout: updateOut } = await execAsync(
            `${GRAPHIFY_BIN} update "${repoPath}"`,
            { timeout: 120000 }
        );

        // Parse stats from output
        const statsMatch = updateOut.match(/(\d+) nodes?, (\d+) edges?, (\d+) communit/);
        const stats = statsMatch ? {
            nodes: parseInt(statsMatch[1]),
            edges: parseInt(statsMatch[2]),
            communities: parseInt(statsMatch[3])
        } : { nodes: 0, edges: 0, communities: 0 };

        // 3. Generate callflow + tree
        const graphifyOut = path.join(repoPath, 'graphify-out');
        try {
            await execAsync(`cd "${repoPath}" && ${GRAPHIFY_BIN} export callflow-html`, { timeout: 30000 });
        } catch (e) { logger.warn('Callflow export failed:', e.message); }

        try {
            await execAsync(`cd "${repoPath}" && ${GRAPHIFY_BIN} tree --graph "${graphifyOut}/graph.json"`, { timeout: 30000 });
        } catch (e) { logger.warn('Tree export failed:', e.message); }

        // 4. Copy outputs to public dir
        const files = ['graph.html', 'graph.json', 'GRAPH_REPORT.md', 'GRAPH_TREE.html'];
        for (const file of files) {
            const src = path.join(graphifyOut, file);
            if (fs.existsSync(src)) {
                fs.copyFileSync(src, path.join(outputDir, file));
            }
        }
        // Copy callflow (name varies)
        const callflows = fs.readdirSync(graphifyOut).filter(f => f.endsWith('-callflow.html'));
        if (callflows.length > 0) {
            fs.copyFileSync(
                path.join(graphifyOut, callflows[0]),
                path.join(outputDir, 'callflow.html')
            );
        }

        // 5. Read report for summary
        const reportPath = path.join(outputDir, 'GRAPH_REPORT.md');
        const report = fs.existsSync(reportPath) ? fs.readFileSync(reportPath, 'utf-8') : '';

        // Extract god nodes from report
        const godNodes = [];
        const godSection = report.split('## God Nodes')[1];
        if (godSection) {
            const lines = godSection.split('\n').filter(l => l.match(/^\d+\./));
            for (const line of lines.slice(0, 5)) {
                const m = line.match(/`(.+?)`\s*-\s*(\d+)\s*edges?/);
                if (m) godNodes.push({ name: m[1], edges: parseInt(m[2]) });
            }
        }

        // Save metadata
        const metadata = {
            analysisId,
            url,
            status: 'completed',
            stats,
            godNodes,
            files: fs.readdirSync(outputDir),
            createdAt: new Date().toISOString(),
            repoPath,
        };
        fs.writeFileSync(path.join(outputDir, 'metadata.json'), JSON.stringify(metadata, null, 2));

        logger.info({ analysisId, stats, godNodes: godNodes.length }, 'Graphify: analysis completed');

    } catch (err) {
        logger.error({ err: err.message, analysisId }, 'Graphify: analysis failed');
        const metadata = {
            analysisId,
            url,
            status: 'failed',
            error: err.message,
            createdAt: new Date().toISOString(),
        };
        fs.writeFileSync(path.join(outputDir, 'metadata.json'), JSON.stringify(metadata, null, 2));
    }
});

/**
 * GET /api/graphify — List all analyses
 */
router.get('/', (req, res) => {
    try {
        if (!fs.existsSync(REPORTS_DIR)) return res.json({ analyses: [] });
        const dirs = fs.readdirSync(REPORTS_DIR).filter(d =>
            fs.statSync(path.join(REPORTS_DIR, d)).isDirectory()
        );
        const analyses = dirs.map(id => {
            const metaPath = path.join(REPORTS_DIR, id, 'metadata.json');
            if (fs.existsSync(metaPath)) {
                return JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
            }
            return { analysisId: id, status: 'unknown' };
        }).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        res.json({ analyses });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/graphify/:id — Get analysis results
 */
router.get('/:id', (req, res) => {
    const dir = path.join(REPORTS_DIR, req.params.id);
    const metaPath = path.join(dir, 'metadata.json');
    if (!fs.existsSync(metaPath)) return res.status(404).json({ error: 'Analysis not found' });

    const metadata = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));

    // Include report content
    const reportPath = path.join(dir, 'GRAPH_REPORT.md');
    if (fs.existsSync(reportPath)) {
        metadata.report = fs.readFileSync(reportPath, 'utf-8');
    }

    res.json(metadata);
});

/**
 * GET /api/graphify/:id/query?q=question — Query the graph
 */
router.get('/:id/query', async (req, res) => {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: 'q parameter required' });

    const graphPath = path.join(REPORTS_DIR, req.params.id, 'graph.json');
    if (!fs.existsSync(graphPath)) return res.status(404).json({ error: 'Graph not found' });

    try {
        const { stdout } = await execAsync(
            `${GRAPHIFY_BIN} query "${q.replace(/"/g, '\\"')}" --graph "${graphPath}" --budget 3000`,
            { timeout: 10000 }
        );
        res.json({ question: q, result: stdout });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/graphify/:id/explain?node=name — Explain a node
 */
router.get('/:id/explain', async (req, res) => {
    const { node } = req.query;
    if (!node) return res.status(400).json({ error: 'node parameter required' });

    const graphPath = path.join(REPORTS_DIR, req.params.id, 'graph.json');
    if (!fs.existsSync(graphPath)) return res.status(404).json({ error: 'Graph not found' });

    try {
        const { stdout } = await execAsync(
            `${GRAPHIFY_BIN} explain "${node.replace(/"/g, '\\"')}" --graph "${graphPath}"`,
            { timeout: 10000 }
        );
        res.json({ node, result: stdout });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
