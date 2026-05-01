const logger = require('./logger');

const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models';
const CACHE_DURATION = 1000 * 60 * 60 * 6; // 6 hours

let modelCache = {
    models: [],
    timestamp: 0
};

const TRUSTED_PROVIDERS = [
    "google", "meta-llama", "mistralai", "deepseek",
    "nvidia", "qwen", "microsoft", "allenai", "arcee-ai"
];

const RANKING_WEIGHTS = {
    context_length: 0.4,
    capabilities: 0.3,
    recency: 0.2,
    provider_trust: 0.1
};

function calculateModelScore(model) {
    let score = 0.0;

    // Context length score (normalized to 1M)
    const context_length = model.context_length || 0;
    const context_score = Math.min(context_length / 1000000, 1.0);
    score += context_score * RANKING_WEIGHTS.context_length;

    // Capabilities score
    const capabilities = model.supported_parameters || [];
    const capability_score = Math.min(capabilities.length / 10, 1.0);
    score += capability_score * RANKING_WEIGHTS.capabilities;

    // Recency score (assuming 'created' is unix timestamp)
    if (model.created) {
        const days_old = (Date.now() / 1000 - model.created) / 86400;
        const recency_score = Math.max(0, 1 - (days_old / 365));
        score += recency_score * RANKING_WEIGHTS.recency;
    }

    // Provider trust score
    const provider = model.id.split('/')[0] || "";
    const trustIndex = TRUSTED_PROVIDERS.indexOf(provider);
    if (trustIndex !== -1) {
        const trust_score = 1 - (trustIndex / TRUSTED_PROVIDERS.length);
        score += trust_score * RANKING_WEIGHTS.provider_trust;
    }

    return score;
}

async function fetchFreeModels(apiKey) {
    // Check cache
    if (Date.now() - modelCache.timestamp < CACHE_DURATION && modelCache.models.length > 0) {
        return modelCache.models;
    }

    try {
        logger.info('[AI:Pool] Refreshing free models list from OpenRouter...');
        const response = await fetch(OPENROUTER_MODELS_URL, {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const data = await response.json();
        const allModels = data.data || [];

        // Filtramos por modelos gratuitos (pricing prompt == 0 o sufijo :free)
        const freeModels = allModels.filter(m => {
            const isPricingFree = m.pricing && parseFloat(m.pricing.prompt) === 0;
            const hasFreeSuffix = m.id.endsWith(':free');
            return isPricingFree || hasFreeSuffix;
        });

        // Rankeamos
        const ranked = freeModels.map(m => ({
            ...m,
            _score: calculateModelScore(m)
        })).sort((a, b) => b._score - a._score);

        modelCache = {
            models: ranked,
            timestamp: Date.now()
        };

        logger.info(`[AI:Pool] Found and ranked ${ranked.length} free models.`);
        return ranked;
    } catch (err) {
        logger.error('[AI:Pool] Error fetching models:', err.message);
        return modelCache.models; // Return old cache if exists
    }
}

/**
 * Retorna el mejor modelo gratuito excluyendo los fallidos.
 */
async function getBestFreeModel(apiKey, excludedModels = []) {
    const models = await fetchFreeModels(apiKey);
    const available = models.filter(m => !excludedModels.includes(m.id));
    return available.length > 0 ? available[0].id : null;
}

module.exports = {
    getBestFreeModel
};
