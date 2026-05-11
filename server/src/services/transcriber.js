// src/services/transcriber.js — Audio → text via Gemini native audio
const fs = require('fs');
const gemini = require('./gemini');
const logger = require('../utils/logger');

/**
 * Transcribe an audio file using Gemini's native audio processing.
 * @param {string} audioPath - Path to the audio file
 * @returns {string} Transcription text
 */
async function transcribe(audioPath) {
    const audioBuffer = fs.readFileSync(audioPath);
    const base64Audio = audioBuffer.toString('base64');

    logger.info({ audioSize: audioBuffer.length }, 'Sending audio to Gemini for transcription');

    const transcription = await gemini.complete(
        'Transcribe el siguiente audio de forma completa y precisa. Devuelve SOLO el texto transcrito, sin comentarios ni formateo adicional.',
        { audio: base64Audio }
    );

    if (!transcription || transcription.trim().length < 10) {
        throw new Error('Transcription returned empty or too short');
    }

    logger.info({ transcriptionLength: transcription.length }, 'Transcription complete');
    return transcription;
}

module.exports = { transcribe };
