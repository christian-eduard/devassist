// src/services/downloader.js — Isolated video download + audio extraction
// On the server, yt-dlp and ffmpeg are installed via apt and available in PATH.
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const os = require('os');
const logger = require('../utils/logger');

const execAsync = promisify(exec);

/**
 * Extract a video ID from a URL (for deduplication and file naming).
 * @param {string} url
 * @returns {string} Numeric ID
 */
function extractVideoId(url) {
    const tiktokMatch = url.match(/video\/(\d+)/);
    if (tiktokMatch) return tiktokMatch[1];

    const ytMatch = url.match(/(?:v=|shorts\/)([a-zA-Z0-9_-]+)/);
    if (ytMatch) return ytMatch[1];

    return String(Date.now());
}

/**
 * Download a video and extract its audio track.
 * @param {string} url - Video URL
 * @returns {{ videoPath: string, audioPath: string, title: string, author: string, videoId: string, tmpDir: string }}
 */
async function downloadAndExtract(url) {
    let videoId = extractVideoId(url);
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'devassist-'));

    const safeUrl = url.replace(/"/g, '\\"');

    // Step 1: Get metadata + resolve short URLs (vm.tiktok.com, youtu.be)
    let title = 'Video';
    let author = 'unknown';
    try {
        const { stdout } = await execAsync(
            `yt-dlp --no-cache-dir --no-check-certificates --no-playlist --print "%(title)s|||%(uploader)s|||%(webpage_url)s" "${safeUrl}"`,
            { timeout: 40000 }
        );
        const parts = stdout.trim().split('|||');
        if (parts[0]) title = parts[0];
        if (parts[1]) author = parts[1];
        // Re-extract videoId from the resolved real URL (fixes vm.tiktok.com etc.)
        if (parts[2]) {
            const resolvedId = extractVideoId(parts[2]);
            if (resolvedId !== videoId) {
                logger.info({ oldId: videoId, newId: resolvedId, resolvedUrl: parts[2] }, 'Resolved short URL to real video ID');
                videoId = resolvedId;
            }
        }
        logger.info({ title, author, videoId }, 'Video metadata extracted');
    } catch (err) {
        logger.warn({ err: err.message }, 'Metadata extraction failed, using defaults');
    }

    const videoPath = path.join(tmpDir, `${videoId}.mp4`);
    const audioPath = path.join(tmpDir, `${videoId}.mp3`);

    // Step 2: Download video — FORCE H.264 codec
    // TikTok serves bytevc1 (H.265 proprietary) by default which ffmpeg 5.x can't always decode
    logger.info({ videoPath }, 'Downloading video');
    try {
        await execAsync(
            `yt-dlp --no-cache-dir --no-check-certificates -f "bv[vcodec^=h264]+ba/b[vcodec^=h264]/b" -o "${videoPath}" --no-playlist --max-filesize 500m "${safeUrl}"`,
            { timeout: 150000 }
        );
    } catch (err) {
        logger.warn({ err: err.message }, 'H.264 download failed, trying best format');
        await execAsync(
            `yt-dlp --no-cache-dir -f "b" -o "${videoPath}" --no-playlist "${safeUrl}"`,
            { timeout: 150000 }
        );
    }

    if (!fs.existsSync(videoPath)) {
        throw new Error(`Video download failed — file not found: ${videoPath}`);
    }

    // Step 3: Extract audio with ffmpeg
    logger.info({ audioPath }, 'Extracting audio');
    try {
        await execAsync(
            `ffmpeg -i "${videoPath}" -vn -ar 16000 -ac 1 -ab 64k "${audioPath}" -y`,
            { timeout: 60000 }
        );
    } catch (err) {
        logger.warn({ err: err.message }, 'FFmpeg extraction failed, trying yt-dlp -x');
        await execAsync(
            `yt-dlp -x --audio-format mp3 -o "${audioPath}" "${safeUrl}"`,
            { timeout: 60000 }
        );
    }

    if (!fs.existsSync(audioPath)) {
        throw new Error('Audio extraction failed — no audio file produced');
    }

    const audioSize = fs.statSync(audioPath).size;
    logger.info({ audioSize }, 'Audio ready for transcription');

    return { videoPath, audioPath, title, author, videoId, tmpDir };
}

/**
 * Clean up temporary directory.
 * @param {string} tmpDir
 */
function cleanup(tmpDir) {
    try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
        // Swallow — it's just temp files
    }
}

module.exports = { downloadAndExtract, cleanup, extractVideoId };
