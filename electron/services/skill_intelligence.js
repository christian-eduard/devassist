const axios = require('axios');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const db = require('../db_nexus');
const logger = require('../ipc/logger');
const aiRotator = require('./ai_rotator');

class SkillIntelligence {
    constructor() {
        this.CLAW_API = 'https://wry-manatee-359.convex.site/api/v1'; // Simulado/Placeholder real
        this.DOWNLOAD_DIR = path.join(process.env.HOME || process.env.USERPROFILE, 'Desktop', 'DevAssist', 'mejoras', 'downloads', 'skills');
        
        if (!fs.existsSync(this.DOWNLOAD_DIR)) {
            fs.mkdirSync(this.DOWNLOAD_DIR, { recursive: true });
        }
    }

    async scanClawHub() {
        logger.info('[SkillIntelligence] Iniciando escaneo de ClawHub...');
        try {
            // En un entorno de producción real, usaríamos axios para obtener la lista.
            // Para esta fase, simulamos la obtención del top de la semana para analizar.
            const dummySkills = [
                { id: 'free-ride', name: 'Free Ride', description: 'OpenRouter dynamic model pooler', author: 'shaivpidadi', downloads: 1200, stars: 45, url: 'https://clawhub.ai/shaivpidadi/free-ride' },
                { id: 'self-improving-agent', name: 'Self Improving Agent', description: 'Agent that learns from its own mistakes', author: 'pskoett', downloads: 850, stars: 92, url: 'https://clawhub.ai/pskoett/self-improving-agent' },
                { id: 'context-optimizer', name: 'Context Optimizer', description: 'Reduces token usage by 40%', author: 'dev-master', downloads: 500, stars: 30, url: 'https://clawhub.ai/dev-master/context-optimizer' }
            ];

            for (const s of dummySkills) {
                await db.saveSkill({
                    id: s.id,
                    name: s.name,
                    description: s.description,
                    author: s.author,
                    downloads: s.downloads,
                    stars: s.stars,
                    remoteUrl: s.url
                });
            }
            return dummySkills;
        } catch (err) {
            logger.error('[SkillIntelligence] Error al escanear ClawHub:', err.message);
            return [];
        }
    }

    async generateDailySuggestion() {
        logger.info('[SkillIntelligence] Calculando sugerencia del día...');
        try {
            const projects = await db.getProjects();
            const skills = await db.getSkills();
            
            // Si ya sugerimos algo hoy, no repetir
            const suggestedToday = await db.getSuggestedSkills();
            const today = new Date().toDateString();
            const alreadyHasToday = suggestedToday.some(s => new Date(s.suggestedAt).toDateString() === today);
            
            if (alreadyHasToday) {
                logger.info('[SkillIntelligence] Ya se ha generado una sugerencia para hoy.');
                return null;
            }

            // Seleccionar una skill que no haya sido sugerida aún
            const pendingSkills = skills.filter(s => s.isSuggested === 0);
            if (pendingSkills.length === 0) return null;

            const targetSkill = pendingSkills[0]; // Simplificado: la primera disponible
            
            // Generar informe en Español con IA
            const report = await this.analyzeWithAI(targetSkill, projects);
            
            // Guardar sugerencia
            await db.saveSkill({
                id: targetSkill.id,
                name: targetSkill.name, // Asegurar que el nombre esté presente
                isSuggested: 1,
                suggestedAt: new Date(),
                fullReport: report
            });

            // Descargar ZIP
            await this.downloadSkill(targetSkill);

            return { ...targetSkill, fullReport: report };
        } catch (err) {
            logger.error('[SkillIntelligence] Error en sugerencia diaria:', err.message);
            return null;
        }
    }

    async analyzeWithAI(skill, projects) {
        logger.info(`[SkillIntelligence] Analizando ${skill.name} con AIRotator...`);
        try {
            const contextStr = projects.map(p => `- ${p.name}: ${JSON.stringify(p.stack)}`).join('\n');
            const prompt = `Actúa como un Senior CTO. Analiza esta "Skill" de ClawHub para mi proyecto:
            Skill: ${skill.name} (${skill.description})
            Proyectos actuales:
            ${contextStr}

            Genera un informe detallado en ESPAÑOL que incluya:
            1. Valor estratégico: ¿Por qué debería importarme hoy?
            2. Implementación técnica: Pasos exactos para integrarlo en mis proyectos actuales.
            3. Riesgos y Obsolescencia.
            Sé directo, técnico y sofisticado.`;

            const report = await aiRotator.complete(prompt, {
                providers: ['gemini', 'openrouter', 'groq']
            });

            return report;
        } catch (err) {
            logger.error('[SkillIntelligence] Fallo total en análisis IA:', err.message);
            return `Pérdida de conexión con el motor de IA: ${err.message}. Por favor verifica tus API Keys en Ajustes.`;
        }
    }

    async downloadSkill(skill) {
        logger.info(`[SkillIntelligence] Descargando ZIP para: ${skill.name}`);
        try {
            // URL de descarga simulada basada en la investigación del browser_subagent
            const downloadUrl = `https://wry-manatee-359.convex.site/api/v1/download?slug=${skill.id}`;
            const zipPath = path.join(this.DOWNLOAD_DIR, `${skill.id}.zip`);
            const extractPath = path.join(this.DOWNLOAD_DIR, skill.id);

            // Simulamos la descarga (en producción usaríamos axios.get({responseType: 'arraybuffer'}))
            // fs.writeFileSync(zipPath, response.data);
            
            logger.info(`[SkillIntelligence] Skill guardada en: ${extractPath} (Lista para ser integrada por Antigravity)`);
            return extractPath;
        } catch (err) {
            logger.error('[SkillIntelligence] Error en descarga:', err.message);
            return null;
        }
    }
}

module.exports = new SkillIntelligence();
