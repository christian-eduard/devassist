// src/workers/videoProcessor.js — Synchronous pipeline (Phase 1: no Redis/BullMQ yet)
// In Phase 1 we process inline. When Redis is available on the server, we'll switch to BullMQ.
const fs = require('fs');
const path = require('path');
const { downloadAndExtract, cleanup } = require('../services/downloader');
const { transcribe } = require('../services/transcriber');
const { analyze } = require('../services/analyzer');
const { generateFichaEmbedding } = require('../services/embedder');
const db = require('../db/queries');
const logger = require('../utils/logger');

const VIDEOS_DIR = path.join(__dirname, '../../uploads/videos');

/**
 * Process a video URL through the full pipeline:
 *   1. Download video + extract audio
 *   2. Transcribe audio with Gemini
 *   3. Analyze transcription → structured ficha
 *   4. Generate embedding for RAG
 *   5. Save to PostgreSQL
 *
 * @param {string} jobId - Job ID for progress tracking
 * @param {string} url - Video URL
 * @param {string} channel - Source channel (app, api, telegram, etc.)
 * @returns {Object} The saved ficha
 */
async function processVideo(jobId, url, channel = 'api') {
    let tmpDir = null;

    try {
        // Check for duplicates
        const existing = await db.findFichaByUrl(url);
        if (existing) {
            await db.updateJob(jobId, { status: 'duplicate', ficha_id: existing.id, progress: `Duplicado: "${existing.title}"` });
            return { duplicate: true, existingId: existing.id, existingTitle: existing.title };
        }

        // Stage 1: Download
        await db.updateJob(jobId, { status: 'processing', progress: 'Etapa 1/4: Descargando medios...' });
        const media = await downloadAndExtract(url);
        tmpDir = media.tmpDir;

        await db.updateJob(jobId, { progress: `Etapa 1/4: Video descargado — "${media.title}"` });

        // Stage 2: Transcribe
        await db.updateJob(jobId, { progress: 'Etapa 2/4: Transcribiendo contenido...' });
        const transcription = await transcribe(media.audioPath);

        // Stage 3: Analyze
        await db.updateJob(jobId, { progress: 'Etapa 3/4: Generando ficha de conocimiento...' });
        const analysis = await analyze(transcription);

        // Stage 4: Embed + Save
        await db.updateJob(jobId, { progress: 'Etapa 4/4: Vectorizando para búsqueda semántica...' });

        // Persist video file to permanent storage
        const fichaId = `f_${media.videoId}`;
        const videoFilename = `${media.videoId}.mp4`;
        let savedVideoPath = null;
        try {
            if (!fs.existsSync(VIDEOS_DIR)) fs.mkdirSync(VIDEOS_DIR, { recursive: true });
            const destPath = path.join(VIDEOS_DIR, videoFilename);
            fs.copyFileSync(media.videoPath, destPath);
            savedVideoPath = `/uploads/videos/${videoFilename}`;
            logger.info({ destPath }, 'Video saved to permanent storage');
        } catch (err) {
            logger.warn({ err: err.message }, 'Failed to save video to permanent storage');
        }

        const fichaData = {
            id: fichaId,
            title: analysis.titulo || media.title,
            url_original: url,
            transcripcion: transcription,
            manual_uso: analysis.manual_uso || '',
            video_path: savedVideoPath,
            video_name: videoFilename,
            metadata: {
                herramientas: analysis.herramientas || [],
                puntos_exploracion: analysis.puntos_exploracion || [],
                categoria: analysis.categoria || 'general',
                author: media.author,
                processed_at: new Date().toISOString(),
            },
            tl_dr: analysis.tl_dr || '',
            key_points: analysis.key_points || [],
            tech_stack: analysis.tech_stack || [],
            urgency: analysis.urgency || 3,
            obsolescence_score: analysis.obsolescence_score || 5,
            confidence_score: analysis.confidence_score || 0,
            content_type: 'video',
            channel,
            author: media.author,
        };

        // Generate embedding
        const embedding = await generateFichaEmbedding({
            title: fichaData.title,
            tl_dr: fichaData.tl_dr,
            key_points: fichaData.key_points,
            tech_stack: fichaData.tech_stack,
            manual_uso: fichaData.manual_uso,
        });
        if (embedding) {
            fichaData.embedding = embedding;
        }

        // Persist
        await db.saveFicha(fichaData);
        await db.updateJob(jobId, { status: 'completed', ficha_id: fichaId, progress: 'Ficha generada con éxito' });

        logger.info({ fichaId, title: fichaData.title }, 'Pipeline completed successfully');
        return fichaData;

    } catch (err) {
        logger.error({ err: err.message, jobId }, 'Pipeline failed');
        await db.updateJob(jobId, { status: 'failed', error: err.message, progress: `Error: ${err.message}` });
        throw err;
    } finally {
        if (tmpDir) cleanup(tmpDir);
    }
}

module.exports = { processVideo };
