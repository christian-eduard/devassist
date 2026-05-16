const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../db/connection');
const logger = require('../utils/logger');
const { processIdeaImage } = require('../services/nanoBanana');
const fs = require('fs');
const nodePath = require('path');

// GET /api/projects — List all projects with idea/ficha counts
router.get('/', async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT p.id, p.name, p.path, p.stack, p.description, p.status, p.priority,
                   p.tags, p.cover_emoji, p.created_at, p.updated_at,
                   COALESCE(ic.idea_count, 0)::int AS idea_count,
                   COALESCE(fc.ficha_count, 0)::int AS ficha_count
            FROM projects p
            LEFT JOIN (SELECT project_id, COUNT(*) AS idea_count FROM project_ideas GROUP BY project_id) ic ON ic.project_id = p.id
            LEFT JOIN (SELECT project_id, COUNT(*) AS ficha_count FROM project_fichas GROUP BY project_id) fc ON fc.project_id = p.id
            ORDER BY p.priority ASC, p.created_at DESC
        `);
        res.json({ ok: true, projects: rows });
    } catch (err) {
        logger.error({ err }, 'Error fetching projects');
        res.status(500).json({ ok: false, error: 'Error interno' });
    }
});

// ── TESS WEBHOOK (must be before /:id) ──

// POST /api/projects/tess-action — Tess calls this from WhatsApp
router.post('/tess-action', async (req, res) => {
    logger.info({ bodyKeys: Object.keys(req.body), hasImageUrl: !!req.body.imageUrl, hasImage_url: !!req.body.image_url, hasBase64: !!req.body.image_base64 }, 'Tess action payload received');
    try {
        const { action, name, projectName, description, tags, content, author, fichaTitle } = req.body;


        if (action === 'create') {
            if (!name) return res.status(400).json({ ok: false, error: 'name required' });
            const id = uuidv4();
            await pool.query(
                `INSERT INTO projects (id, name, path, description, status, tags)
                 VALUES ($1, $2, '', $3, 'idea', $4)`,
                [id, name, description || '', JSON.stringify(tags || [])]
            );
            return res.json({ ok: true, message: `Proyecto "${name}" creado`, projectId: id });
        }

        if (action === 'add-idea') {
            const pName = projectName || name;
            if (!content) return res.status(400).json({ ok: false, error: 'content required' });

            let targetProjectId = null;
            let targetProjectName = "Notas Sueltas";

            if (pName && pName.trim().length > 0) {
                const { rows: pRows } = await pool.query(
                    'SELECT id, name FROM projects WHERE LOWER(name) LIKE LOWER($1) LIMIT 1',
                    [`%${pName.trim()}%`]
                );
                if (pRows.length) {
                    targetProjectId = pRows[0].id;
                    targetProjectName = pRows[0].name;
                }
                logger.info({ pName, targetProjectId, targetProjectName }, 'Project name matching');
            }

            let ideaTitle = req.body.title || null;
            let imageAnalysis = req.body.imageAnalysis || null;

            // Handle image: if URL provided, fetch it. If base64 provided, use it directly.
            let imageUrl = req.body.imageUrl || req.body.image_url || null;
            let finalAnalysis = imageAnalysis;
            let generatedImages = [];
            let metadata = {};
            let imageBufferToProcess = null;
            let imageMimeToProcess = req.body.image_mime || 'image/jpeg';
            let extToSave = 'jpg';

            // GATE: If Tess sends an image as URL (localhost) without base64, reject silently.
            // Only media-watcher (which sends base64) is allowed to create image entries.
            if (!req.body.image_base64 && imageUrl && (imageUrl.includes('127.0.0.1') || imageUrl.includes('localhost') || imageUrl.includes('openclaw'))) {
                logger.info({ imageUrl }, 'Blocked Tess image request — media-watcher handles images');
                return res.json({ ok: true, message: 'Procesando automáticamente...', handled: 'media-watcher' });
            }

            if (req.body.image_base64) {
                imageBufferToProcess = Buffer.from(req.body.image_base64, 'base64');
                extToSave = imageMimeToProcess.includes('png') ? 'png' : 'jpg';
            } else if (imageUrl && imageUrl.startsWith('http')) {
                try {
                    const response = await fetch(imageUrl);
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    imageBufferToProcess = Buffer.from(await response.arrayBuffer());
                    extToSave = imageUrl.split('.').pop().toLowerCase() === 'png' ? 'png' : 'jpg';
                    imageMimeToProcess = `image/${extToSave === 'png' ? 'png' : 'jpeg'}`;
                } catch (fetchErr) {
                    logger.error({ err: fetchErr.message }, 'Failed to fetch image');
                }
            }

            if (imageBufferToProcess) {
                const imgId = uuidv4().slice(0, 8);
                const filename = `idea-${imgId}.${extToSave}`;
                const uploadsDir = nodePath.join(__dirname, '../../uploads/ideas');
                if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
                fs.writeFileSync(nodePath.join(uploadsDir, filename), imageBufferToProcess);
                imageUrl = `/uploads/ideas/${filename}`;
                logger.info({ filename, size: imageBufferToProcess.length }, 'Image saved');

                // Step 1: ALWAYS run analysis (cheap — Gemini Vision text only)
                try {
                    const { analyzeImage } = require('../services/nanoBanana');
                    let context = '';
                    if (targetProjectId) {
                        const { rows: ctxRows } = await pool.query('SELECT name, description FROM projects WHERE id = $1', [targetProjectId]);
                        context = ctxRows[0] ? `${ctxRows[0].name}: ${ctxRows[0].description || ''}` : '';
                    }
                    const analysisData = await analyzeImage(imageBufferToProcess, imageMimeToProcess, context);
                    finalAnalysis = analysisData.analysis;
                    metadata = analysisData;
                    if (analysisData.name && !ideaTitle) ideaTitle = analysisData.name;
                    logger.info({ classification: analysisData.classification }, 'Image analysis complete');

                    // Step 2: Generate Nano Banana variations ONLY for project-assigned ideas (expensive)
                    if (targetProjectId && analysisData.classification === 'idea') {
                        try {
                            const { generateImages } = require('../services/nanoBanana');
                            generatedImages = await generateImages(analysisData.analysis, imageBufferToProcess, imageMimeToProcess, 2);
                            logger.info({ count: generatedImages.length }, 'Nano Banana generation complete');
                        } catch (genErr) {
                            logger.warn({ err: genErr.message }, 'Nano Banana generation failed');
                        }
                    } else if (!targetProjectId) {
                        logger.info('Notas Sueltas — analysis done, skipping Nano Banana generation');
                    }
                } catch (analysisErr) {
                    logger.warn({ err: analysisErr.message }, 'Image analysis failed');
                    finalAnalysis = null;
                }
            }

            const { rows } = await pool.query(
                `INSERT INTO project_ideas (project_id, content, source, author, title, image_url, image_analysis, generated_images, metadata)
                 VALUES ($1, $2, 'whatsapp', $3, $4, $5, $6, $7, $8) RETURNING id`,
                [targetProjectId, content, author || 'tess', ideaTitle, imageUrl, finalAnalysis, JSON.stringify(generatedImages), JSON.stringify(metadata)]
            );
            return res.json({ ok: true, message: `Añadido a "${targetProjectName}"`, ideaId: rows[0].id, generatedCount: generatedImages.length, classification: metadata.classification });
        }

        if (action === 'link-ficha') {
            const pName = projectName || name;
            if (!pName || !fichaTitle) return res.status(400).json({ ok: false, error: 'projectName and fichaTitle required' });

            const { rows: pRows } = await pool.query(
                'SELECT id FROM projects WHERE LOWER(name) LIKE LOWER($1) LIMIT 1', [`%${pName}%`]
            );
            if (!pRows.length) return res.status(404).json({ ok: false, error: `Proyecto "${pName}" no encontrado` });

            const { rows: fRows } = await pool.query(
                'SELECT id FROM fichas WHERE LOWER(title) LIKE LOWER($1) LIMIT 1', [`%${fichaTitle}%`]
            );
            if (!fRows.length) return res.status(404).json({ ok: false, error: `Ficha "${fichaTitle}" no encontrada` });

            await pool.query(
                'INSERT INTO project_fichas (project_id, ficha_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                [pRows[0].id, fRows[0].id]
            );
            return res.json({ ok: true, message: `Ficha vinculada al proyecto "${pName}"` });
        }

        res.status(400).json({ ok: false, error: `Acción "${action}" no reconocida. Usa: create, add-idea, link-ficha` });
    } catch (err) {
        logger.error({ err }, 'Error in tess-action');
        res.status(500).json({ ok: false, error: 'Error interno' });
    }
});

// GET /api/projects/ideas/unassigned — Fetch unassigned loose notes
router.get('/ideas/unassigned', async (req, res) => {
    try {
        const { rows: ideas } = await pool.query(
            'SELECT id, title, content, source, author, image_url, image_analysis, generated_images, metadata, created_at FROM project_ideas WHERE project_id IS NULL ORDER BY created_at DESC'
        );
        res.json({ ok: true, ideas });
    } catch (err) {
        logger.error({ err }, 'Error fetching unassigned ideas');
        res.status(500).json({ ok: false, error: 'Error interno' });
    }
});

// DELETE /api/projects/ideas/unassigned/:ideaId — must be BEFORE /:id routes
router.delete('/ideas/unassigned/:ideaId', async (req, res) => {
    try {
        const { rowCount } = await pool.query(
            'DELETE FROM project_ideas WHERE id = $1 AND project_id IS NULL',
            [req.params.ideaId]
        );
        if (rowCount === 0) return res.status(404).json({ ok: false, error: 'Nota suelta no encontrada' });
        logger.info({ ideaId: req.params.ideaId }, 'Deleted unassigned idea');
        res.json({ ok: true });
    } catch (err) {
        logger.error({ err }, 'Error deleting unassigned idea');
        res.status(500).json({ ok: false, error: 'Error interno' });
    }
});

// POST /api/projects/ideas/assign — Move an unassigned idea to a project (+ run Nano Banana)
router.post('/ideas/assign', async (req, res) => {
    try {
        const { projectName, ideaId } = req.body;
        if (!projectName) return res.status(400).json({ ok: false, error: 'projectName required' });

        // Find project
        const { rows: pRows } = await pool.query(
            'SELECT id, name, description FROM projects WHERE LOWER(name) LIKE LOWER($1) LIMIT 1',
            [`%${projectName.trim()}%`]
        );
        if (!pRows.length) return res.status(404).json({ ok: false, error: `Proyecto "${projectName}" no encontrado` });

        const project = pRows[0];

        // Find the idea (latest unassigned if no ideaId given)
        let idea;
        if (ideaId) {
            const { rows } = await pool.query('SELECT * FROM project_ideas WHERE id = $1', [ideaId]);
            idea = rows[0];
        } else {
            const { rows } = await pool.query('SELECT * FROM project_ideas WHERE project_id IS NULL ORDER BY created_at DESC LIMIT 1');
            idea = rows[0];
        }
        if (!idea) return res.status(404).json({ ok: false, error: 'No hay ideas sin asignar' });

        // Assign to project
        await pool.query('UPDATE project_ideas SET project_id = $1 WHERE id = $2', [project.id, idea.id]);
        logger.info({ ideaId: idea.id, projectId: project.id, projectName: project.name }, 'Idea assigned to project');

        // Run analysis + Nano Banana if image exists
        let generatedCount = 0;
        let existingGen = [];
        try { existingGen = typeof idea.generated_images === 'string' ? JSON.parse(idea.generated_images || '[]') : (idea.generated_images || []); } catch(e) { existingGen = []; }
        
        if (idea.image_url) {
            try {
                const imagePath = nodePath.join(__dirname, '../../', idea.image_url);
                if (fs.existsSync(imagePath)) {
                    const imageBuffer = fs.readFileSync(imagePath);
                    const mimeType = idea.image_url.endsWith('.png') ? 'image/png' : 'image/jpeg';
                    const context = `${project.name}: ${project.description || ''}`;
                    
                    // Always run full pipeline (analysis + generation) with project context
                    const result = await processIdeaImage(imageBuffer, mimeType, context);
                    
                    await pool.query(
                        'UPDATE project_ideas SET image_analysis = $1, generated_images = $2, metadata = $3, title = COALESCE($4, title) WHERE id = $5',
                        [result.analysis, JSON.stringify(result.generatedImages), JSON.stringify(result.metadata || {}), result.title, idea.id]
                    );
                    generatedCount = result.generatedImages.length;
                    logger.info({ count: generatedCount, analysis: !!result.analysis }, 'Full pipeline run on assigned idea');
                }
            } catch (nbErr) {
                logger.warn({ err: nbErr.message }, 'Pipeline on assign failed');
                // If pipeline failed but we had existing analysis, preserve it
                if (idea.image_analysis) {
                    logger.info('Preserving existing analysis from Notas Sueltas');
                }
            }
        }

        res.json({ ok: true, message: `Idea movida a "${project.name}"`, ideaId: idea.id, projectId: project.id, generatedCount });
    } catch (err) {
        logger.error({ err }, 'Error assigning idea');
        res.status(500).json({ ok: false, error: 'Error interno' });
    }
});

// GET /api/projects/:id — Full project detail with ideas and linked fichas
router.get('/:id', async (req, res) => {
    try {
        const { rows: pRows } = await pool.query('SELECT * FROM projects WHERE id = $1', [req.params.id]);
        if (!pRows.length) return res.status(404).json({ ok: false, error: 'Proyecto no encontrado' });

        const { rows: ideas } = await pool.query(
            'SELECT id, title, content, source, author, image_url, image_analysis, generated_images, metadata, created_at FROM project_ideas WHERE project_id = $1 ORDER BY created_at DESC',
            [req.params.id]
        );

        const { rows: fichas } = await pool.query(`
            SELECT f.id, f.title, f.tl_dr, f.content_type, f.channel, f.author, f.created_at, pf.linked_at
            FROM project_fichas pf
            JOIN fichas f ON f.id = pf.ficha_id
            WHERE pf.project_id = $1
            ORDER BY pf.linked_at DESC
        `, [req.params.id]);

        res.json({ ok: true, project: { ...pRows[0], ideas, fichas } });
    } catch (err) {
        logger.error({ err }, 'Error fetching project detail');
        res.status(500).json({ ok: false, error: 'Error interno' });
    }
});

// POST /api/projects — Create a project
router.post('/', async (req, res) => {
    try {
        const { name, path, stack, description, status, priority, tags, cover_emoji } = req.body;
        if (!name) return res.status(400).json({ ok: false, error: 'Nombre es obligatorio' });

        const id = uuidv4();
        await pool.query(
            `INSERT INTO projects (id, name, path, stack, description, status, priority, tags, cover_emoji)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [id, name, path || '', stack || '', description || '', status || 'idea', priority || 3,
             JSON.stringify(tags || []), cover_emoji || '🚀']
        );
        res.json({ ok: true, project: { id, name, description, status, priority, tags, cover_emoji } });
    } catch (err) {
        logger.error({ err }, 'Error creating project');
        res.status(500).json({ ok: false, error: 'Error interno' });
    }
});

// PUT /api/projects/:id — Update project
router.put('/:id', async (req, res) => {
    try {
        const { name, description, status, priority, tags, cover_emoji, path, stack } = req.body;
        const sets = [];
        const vals = [];
        let i = 1;

        const fields = { name, description, status, priority, path, stack, cover_emoji };
        for (const [key, val] of Object.entries(fields)) {
            if (val !== undefined) { sets.push(`${key} = $${i}`); vals.push(val); i++; }
        }
        if (tags !== undefined) { sets.push(`tags = $${i}`); vals.push(JSON.stringify(tags)); i++; }
        if (sets.length === 0) return res.status(400).json({ ok: false, error: 'Nada que actualizar' });

        sets.push('updated_at = NOW()');
        vals.push(req.params.id);

        const { rowCount } = await pool.query(`UPDATE projects SET ${sets.join(', ')} WHERE id = $${i}`, vals);
        if (rowCount === 0) return res.status(404).json({ ok: false, error: 'Proyecto no encontrado' });
        res.json({ ok: true });
    } catch (err) {
        logger.error({ err }, 'Error updating project');
        res.status(500).json({ ok: false, error: 'Error interno' });
    }
});

// DELETE /api/projects/:id
router.delete('/:id', async (req, res) => {
    try {
        const { rowCount } = await pool.query('DELETE FROM projects WHERE id = $1', [req.params.id]);
        if (rowCount === 0) return res.status(404).json({ ok: false, error: 'Proyecto no encontrado' });
        res.json({ ok: true });
    } catch (err) {
        logger.error({ err }, 'Error deleting project');
        res.status(500).json({ ok: false, error: 'Error interno' });
    }
});

// ── IDEAS ──

// POST /api/projects/:id/ideas/with-image — Create idea + process image in one shot (MUST be before /:id/ideas)
router.post('/:id/ideas/with-image', async (req, res) => {
    try {
        const { content, source, author, title, image_base64, image_mime } = req.body;
        if (!content || !image_base64) return res.status(400).json({ ok: false, error: 'content and image_base64 required' });

        // Save original image
        const imgId = uuidv4().slice(0, 8);
        const ext = (image_mime || '').includes('png') ? 'png' : 'jpg';
        const filename = `idea-${imgId}.${ext}`;
        const uploadsDir = nodePath.join(__dirname, '../../uploads/ideas');
        if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
        const imageBuffer = Buffer.from(image_base64, 'base64');
        fs.writeFileSync(nodePath.join(uploadsDir, filename), imageBuffer);
        const imageUrl = `/uploads/ideas/${filename}`;
        logger.info({ filename, size: imageBuffer.length }, 'Original image saved');

        // Get project context
        const { rows: pRows } = await pool.query('SELECT name, description FROM projects WHERE id = $1', [req.params.id]);
        const context = pRows[0] ? `${pRows[0].name}: ${pRows[0].description || ''}` : '';

        // Run Nano Banana pipeline (analyze + generate)
        let analysis = '', generatedImages = [];
        try {
            const result = await processIdeaImage(imageBuffer, image_mime || 'image/jpeg', context);
            analysis = result.analysis;
            generatedImages = result.generatedImages;
        } catch (nbErr) {
            logger.warn({ err: nbErr.message }, 'Nano Banana pipeline failed, saving with analysis only');
            analysis = 'Error al procesar con Nano Banana. La imagen original se ha guardado correctamente.';
        }

        // Insert idea with all data
        const { rows } = await pool.query(
            `INSERT INTO project_ideas (project_id, content, source, author, title, image_url, image_analysis, generated_images)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING id, title, content, source, author, image_url, image_analysis, generated_images, created_at`,
            [req.params.id, content, source || 'whatsapp', author || 'chris', title || null,
             imageUrl, analysis, JSON.stringify(generatedImages)]
        );

        res.json({ ok: true, idea: rows[0], message: `Nota con imagen: análisis + ${generatedImages.length} variaciones Nano Banana` });
    } catch (err) {
        logger.error({ err: err.message, stack: err.stack }, 'Error creating idea with image');
        res.status(500).json({ ok: false, error: 'Error procesando imagen: ' + err.message });
    }
});

// POST /api/projects/:id/ideas/:ideaId/process-image — Process existing idea image with Nano Banana
router.post('/:id/ideas/:ideaId/process-image', async (req, res) => {
    try {
        const { rows } = await pool.query(
            'SELECT id, image_url, content FROM project_ideas WHERE id = $1 AND project_id = $2',
            [req.params.ideaId, req.params.id]
        );
        if (!rows.length) return res.status(404).json({ ok: false, error: 'Idea no encontrada' });

        const idea = rows[0];
        let imageBuffer, mimeType = 'image/jpeg';

        if (req.body.image_base64) {
            imageBuffer = Buffer.from(req.body.image_base64, 'base64');
            mimeType = req.body.image_mime || 'image/jpeg';
        } else if (idea.image_url) {
            const imgPath = nodePath.join(__dirname, '../../', idea.image_url);
            if (fs.existsSync(imgPath)) {
                imageBuffer = fs.readFileSync(imgPath);
            }
        }

        if (!imageBuffer) return res.status(400).json({ ok: false, error: 'No image to process' });

        const { rows: pRows } = await pool.query('SELECT name, description FROM projects WHERE id = $1', [req.params.id]);
        const context = pRows[0] ? `${pRows[0].name}: ${pRows[0].description || ''}` : '';

        const { analysis, generatedImages } = await processIdeaImage(imageBuffer, mimeType, context);

        await pool.query(
            'UPDATE project_ideas SET image_analysis = $1, generated_images = $2 WHERE id = $3',
            [analysis, JSON.stringify(generatedImages), req.params.ideaId]
        );

        res.json({ ok: true, analysis, generatedImages, message: `Imagen procesada: análisis + ${generatedImages.length} variaciones` });
    } catch (err) {
        logger.error({ err: err.message }, 'Error processing image with Nano Banana');
        res.status(500).json({ ok: false, error: 'Error procesando imagen' });
    }
});

// POST /api/projects/:id/ideas — Add idea to project (text only or with pre-analyzed image)
router.post('/:id/ideas', async (req, res) => {
    try {
        const { content, source, author, title, image_url, image_analysis } = req.body;
        if (!content) return res.status(400).json({ ok: false, error: 'Contenido es obligatorio' });

        let finalImageUrl = image_url || null;
        if (req.body.image_base64) {
            const imgId = uuidv4().slice(0, 8);
            const ext = req.body.image_mime?.includes('png') ? 'png' : 'jpg';
            const filename = `idea-${imgId}.${ext}`;
            const uploadsDir = nodePath.join(__dirname, '../../uploads/ideas');
            if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
            fs.writeFileSync(nodePath.join(uploadsDir, filename), Buffer.from(req.body.image_base64, 'base64'));
            finalImageUrl = `/uploads/ideas/${filename}`;
        }

        const { rows } = await pool.query(
            `INSERT INTO project_ideas (project_id, content, source, author, title, image_url, image_analysis)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, title, content, source, author, image_url, image_analysis, created_at`,
            [req.params.id, content, source || 'manual', author || 'chris', title || null, finalImageUrl, image_analysis || null]
        );
        res.json({ ok: true, idea: rows[0] });
    } catch (err) {
        logger.error({ err }, 'Error adding idea');
        res.status(500).json({ ok: false, error: 'Error interno' });
    }
});

// (DELETE /ideas/unassigned/:ideaId moved above /:id routes for correct Express matching)

// DELETE /api/projects/:id/ideas/:ideaId
router.delete('/:id/ideas/:ideaId', async (req, res) => {
    try {
        const { rowCount } = await pool.query(
            'DELETE FROM project_ideas WHERE id = $1 AND project_id = $2',
            [req.params.ideaId, req.params.id]
        );
        if (rowCount === 0) return res.status(404).json({ ok: false, error: 'Idea no encontrada' });
        res.json({ ok: true });
    } catch (err) {
        logger.error({ err }, 'Error deleting idea');
        res.status(500).json({ ok: false, error: 'Error interno' });
    }
});

// ── FICHAS ──

// POST /api/projects/:id/fichas — Link ficha to project
router.post('/:id/fichas', async (req, res) => {
    try {
        const { ficha_id } = req.body;
        if (!ficha_id) return res.status(400).json({ ok: false, error: 'ficha_id es obligatorio' });

        await pool.query(
            `INSERT INTO project_fichas (project_id, ficha_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [req.params.id, ficha_id]
        );
        res.json({ ok: true });
    } catch (err) {
        logger.error({ err }, 'Error linking ficha');
        res.status(500).json({ ok: false, error: 'Error interno' });
    }
});

// DELETE /api/projects/:id/fichas/:fichaId — Unlink ficha
router.delete('/:id/fichas/:fichaId', async (req, res) => {
    try {
        await pool.query(
            'DELETE FROM project_fichas WHERE project_id = $1 AND ficha_id = $2',
            [req.params.id, req.params.fichaId]
        );
        res.json({ ok: true });
    } catch (err) {
        logger.error({ err }, 'Error unlinking ficha');
        res.status(500).json({ ok: false, error: 'Error interno' });
    }
});

module.exports = router;
