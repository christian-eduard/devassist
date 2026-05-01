/**
 * Script de Restauración de Fichas de Proyecto (Fase 20)
 * Ejecuta este script para recuperar los análisis profundos a partir de archivos
 * de reporte y escaneos de código actuales.
 */
const nexus = require('../electron/db_nexus');
const scanner = require('../electron/services/project_scanner');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../electron/ipc/logger');

async function runRestoration() {
    console.log('--- Iniciando Restauración de Fichas de Proyecto ---');
    
    // 1. Inicializar DB
    await nexus.initNexus();
    
    // 2. Obtener proyectos actuales
    const projects = await nexus.getProjects();
    console.log(`Encontrados ${projects.length} proyectos.`);

    for (const project of projects) {
        console.log(`\nProcesando: ${project.name} (${project.id})...`);
        
        let analysisData = {};
        let mermaidStr = '';
        let fileTree = {};

        // Caso Especial: DevAssist (Restauración desde Reporte Global)
        if (project.name === 'DevAssist') {
            try {
                const reportPath = '/Users/chris/Desktop/DevAssist/mejoras/deep-research-report.md';
                const content = await fs.readFile(reportPath, 'utf8');
                analysisData = { 
                    manual_summary: content.substring(0, 5000), // Primeros 5k chars como resumen
                    report_link: reportPath
                };
                console.log(' - Cargado reporte deep-research-report.md');
            } catch (err) {
                console.warn(' - No se pudo cargar deep-research-report.md');
            }
        }

        // Análisis de Código Automatizado (Generación de Mermaid y stats)
        if (project.path) {
            try {
                const scanResult = await scanner.scan(project.path);
                if (scanResult.success) {
                    analysisData = { ...analysisData, ...scanResult.stats };
                    mermaidStr = scanResult.mermaidStructure;
                    fileTree = scanResult.fileTree;
                    console.log(' - Escaneo de código completado.');
                }
            } catch (err) {
                console.error(` - Fallo en escaneo para ${project.name}:`, err.message);
            }
        }

        // 3. Guardar en Nexus (Postgres)
        try {
            await nexus.saveProject({
                id: project.id,
                name: project.name,
                path: project.path,
                description: JSON.stringify(analysisData.languages || {}),
                fullContext: analysisData,
                mermaidStructure: mermaidStr,
                fileTree: fileTree,
                codeStats: analysisData
            });
            console.log(` - ✅ Datos guardados en Nexus para ${project.name}`);
            
            // 4. Crear "Ficha" espejo en el Vault para búsqueda semántica
            await nexus.saveFicha({
                id: `f_proj_${project.id}`,
                title: `[PROYECTO] ${project.name}`,
                titulo: `Análisis de Arquitectura: ${project.name}`,
                transcripcion: JSON.stringify(analysisData),
                metadata: {
                    type: 'project_card',
                    projectId: project.id,
                    projectName: project.name,
                    tags: ['proyecto', 'arquitectura', 'analisis'],
                    resumen: `Documentación técnica generada automáticamente para ${project.name}.`
                },
                contentType: 'project_ficha',
                createdAt: new Date()
            });
            console.log(` - 📦 Ficha espejo creada en el Vault.`);

        } catch (err) {
            console.error(` - ❌ Error al persistir datos:`, err.message);
        }
    }

    console.log('\n--- Restauración Completada ---');
    process.exit(0);
}

runRestoration().catch(err => {
    console.error('Fallo crítico en restauración:', err);
    process.exit(1);
});
