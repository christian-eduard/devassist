// src/services/nanoBanana.js — Image analysis (Gemini Flash) + generation (Nano Banana Pro)
const config = require('../config');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const VISION_MODEL = 'gemini-2.5-flash';           // For image analysis
const IMAGE_GEN_MODEL = 'nano-banana-pro-preview';  // For image generation

/**
 * Analyze an image using Gemini Vision
 */
async function analyzeImage(imageBuffer, mimeType = 'image/jpeg', context = '') {
    const base64 = imageBuffer.toString('base64');

    const prompt = `Clasifica y analiza esta imagen. ${context ? `Contexto: ${context}` : ''}
    
INSTRUCCIONES:
Si es un boceto, esquema, idea a mano, pizarra o concepto abstracto, la clase es "idea".
Si es un producto real, comercial, componente, herramienta, o material de compra, la clase es "product".

Responde ÚNICAMENTE con un JSON válido usando este esquema exacto:
{
  "classification": "idea" | "product",
  "name": "Nombre corto descriptivo (ej: Motor Brushless 2207 o Concepto de Dron)",
  "analysis": "Descripción detallada (qué es, utilidad, etc)",
  "brand": "Marca si es visible (sólo si classification=product, sino null)",
  "estimatedPrice": "Precio estimado numérico o null",
  "currency": "EUR o USD",
  "specs": "Lista corta de specs"
}`;

    const body = {
        contents: [{
            parts: [
                { text: prompt },
                { inline_data: { mime_type: mimeType, data: base64 } },
            ]
        }],
        generationConfig: { temperature: 0.1, responseMimeType: "application/json" },
    };

    const url = `${API_BASE}/${VISION_MODEL}:generateContent?key=${config.gemini.apiKey}`;
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const err = await res.text();
        logger.error({ status: res.status, err: err.slice(0, 300) }, 'Gemini vision error');
        throw new Error(`Gemini vision failed: ${res.status}`);
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    try {
        return JSON.parse(text);
    } catch (e) {
        logger.error({ err: e.message, text }, 'Failed to parse Gemini JSON response');
        return { classification: 'idea', name: 'Imagen Analizada', analysis: text || 'Sin análisis' };
    }
}

/**
 * Generate images using Nano Banana Pro (Google image generation model)
 */
async function generateImages(prompt, referenceImage = null, mimeType = 'image/jpeg', count = 2) {
    const results = [];
    const uploadsDir = path.join(__dirname, '../../uploads/ideas');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    const prompts = [
        `Genera una imagen profesional, fotorrealista, de alta calidad basada en este concepto: ${prompt}. Estilo: render 3D profesional, iluminación cinematográfica.`,
        `Genera una ilustración técnica detallada y profesional de: ${prompt}. Estilo: diagrama de ingeniería moderno, vista isométrica, colores limpios.`,
    ];

    for (let i = 0; i < Math.min(count, prompts.length); i++) {
        try {
            const parts = [{ text: prompts[i] }];
            if (referenceImage) {
                parts.push({ inline_data: { mime_type: mimeType, data: referenceImage.toString('base64') } });
            }

            const body = {
                contents: [{ parts }],
                generationConfig: {
                    responseModalities: ['TEXT', 'IMAGE'],
                },
            };

            const url = `${API_BASE}/${IMAGE_GEN_MODEL}:generateContent?key=${config.gemini.apiKey}`;
            logger.info({ model: IMAGE_GEN_MODEL, promptIdx: i }, 'Nano Banana generation starting');

            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                const err = await res.text();
                logger.warn({ status: res.status, err: err.slice(0, 300) }, `Nano Banana gen ${i + 1} failed`);
                continue;
            }

            const data = await res.json();
            const responseParts = data.candidates?.[0]?.content?.parts || [];

            for (const part of responseParts) {
                // Nano Banana uses camelCase: inlineData
                const inlineData = part.inline_data || part.inlineData;
                if (inlineData?.data) {
                    const imgId = uuidv4().slice(0, 8);
                    const imgMime = inlineData.mimeType || inlineData.mime_type || 'image/jpeg';
                    const ext = imgMime.includes('png') ? 'png' : 'jpg';
                    const filename = `gen-${imgId}.${ext}`;
                    fs.writeFileSync(
                        path.join(uploadsDir, filename),
                        Buffer.from(inlineData.data, 'base64')
                    );
                    results.push({
                        url: `/uploads/ideas/${filename}`,
                        prompt: prompts[i].slice(0, 100),
                        type: i === 0 ? 'render_3d' : 'technical',
                    });
                    logger.info({ filename, size: inlineData.data.length }, `Nano Banana image ${i + 1} generated`);
                }
            }
        } catch (err) {
            logger.error({ err: err.message, index: i }, 'Nano Banana generation error');
        }
    }

    return results;
}

/**
 * Full pipeline: analyze original + generate variations
 */
async function processIdeaImage(imageBuffer, mimeType, projectContext = '') {
    logger.info('Starting Nano Banana pipeline: analyze + generate');

    // Step 1: Analyze original with Gemini Vision (returns JSON now)
    const analysisData = await analyzeImage(imageBuffer, mimeType, projectContext);
    logger.info({ classification: analysisData.classification }, 'Image classification complete');

    // Step 2: Generate variations ONLY if it is an idea/sketch
    let generatedImages = [];
    if (analysisData.classification === 'idea') {
        logger.info('Image classified as IDEA, running Nano Banana generation...');
        generatedImages = await generateImages(analysisData.analysis, imageBuffer, mimeType, 2);
        logger.info({ count: generatedImages.length }, 'Nano Banana generation complete');
    } else {
        logger.info('Image classified as PRODUCT, skipping Nano Banana.');
    }

    return { 
        analysis: analysisData.analysis, 
        generatedImages,
        title: analysisData.name,
        metadata: analysisData
    };
}

module.exports = { analyzeImage, generateImages, processIdeaImage };
