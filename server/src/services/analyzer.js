// src/services/analyzer.js — Transcription → structured knowledge card (ficha)
const gemini = require('./gemini');
const logger = require('../utils/logger');

/**
 * Extract a JSON object from a raw AI response.
 * Handles markdown code blocks and partial JSON.
 * @param {string} raw
 * @returns {Object|null}
 */
function extractJSON(raw) {
    if (!raw) return null;
    try {
        // Try direct parse first
        return JSON.parse(raw);
    } catch {
        // Try extracting from markdown code block
        const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (match) {
            try { return JSON.parse(match[1].trim()); } catch { /* fall through */ }
        }
        // Try finding first { ... } block
        const braceMatch = raw.match(/\{[\s\S]*\}/);
        if (braceMatch) {
            try { return JSON.parse(braceMatch[0]); } catch { /* fall through */ }
        }
    }
    return null;
}

/**
 * Analyze a transcription and produce a structured knowledge card.
 * @param {string} transcription - Full text transcription
 * @returns {Object} Structured ficha data
 */
async function analyze(transcription) {
    logger.info({ transcriptionLength: transcription.length }, 'Analyzing transcription');

    const raw = await gemini.complete(`Eres un motor de extracción técnica ENTERPRISE. Necesito la ficha de conocimiento para esta transcripción.

TRANSCRIPCIÓN REAL: ${transcription}

REQUISITOS:
1. Devuelve ÚNICAMENTE un objeto JSON válido.
2. No incluyas explicaciones, saludos ni comentarios.
3. Formato:
{
    "titulo": "...",
    "tl_dr": "...",
    "key_points": ["punto 1", "punto 2", ...],
    "categoria": "...",
    "urgency": 1-5,
    "obsolescence_score": 1-10,
    "confidence_score": 0.0-1.0,
    "herramientas": [{"nombre": "...", "descripcion": "..."}],
    "tech_stack": ["tech1", "tech2"],
    "manual_uso": "Guía paso a paso con instrucciones concretas...",
    "puntos_exploracion": [{"tema": "...", "pregunta": "..."}]
}`);

    const analysis = extractJSON(raw);
    if (!analysis) {
        throw new Error('Failed to extract structured JSON from Gemini analysis');
    }

    logger.info({ titulo: analysis.titulo }, 'Analysis complete');
    return analysis;
}

module.exports = { analyze, extractJSON };
