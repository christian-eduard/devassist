const logger = require("./logger");
const fs = require('fs');
const path = require('path');
const db = require('../db');
const scanner = require('../services/project_scanner');
const ai = require('../services/ai_rotator');

/**
 * IPC Handlers para el módulo de Proyectos (Fase 33 Refactor)
 * 
 * Responsabilidades:
 *   - Registrar/eliminar/actualizar proyectos en la BD
 *   - Disparar escaneos profundos (scanner)
 *   - Generar embeddings semánticos (IA)
 *   - Comunicar progreso al frontend vía IPC events
 * 
 * NO hace:
 *   - No gestiona estado de UI
 *   - No accede al filesystem directamente (delega al scanner)
 */

/**
 * Genera un vector embedding para búsqueda semántica del proyecto.
 */
async function generateProjectEmbedding(project) {
    try {
        const stats = project.codeStats || {};
        const stackList = project.stack ? project.stack.join(', ') : 'Desconocido';
        const contextText = `
            Proyecto: ${project.name}
            Ruta: ${project.path}
            Tecnologías: ${stackList}
            Líneas de Código: ${stats.totalLines || 0}
            Archivos: ${stats.totalFiles || 0}
            Descripción: ${project.description || ''}
        `.trim();

        const vector = await ai.generateEmbedding(contextText);
        return vector;
    } catch (err) {
        logger.error(`[Projects:Embedding] Error: ${err.message}`);
        return null;
    }
}

/**
 * Obtiene metadata rápida de un directorio de proyecto (sin escaneo profundo).
 * Solo lee el directorio raíz para obtener stack y fileCount superficiales.
 */
function getQuickMetadata(projectPath) {
    const meta = { stack: [], fileCount: 0, hasGit: false };
    try {
        if (!projectPath || !fs.existsSync(projectPath)) return meta;
        const files = fs.readdirSync(projectPath);
        meta.fileCount = files.length;
        meta.hasGit = files.includes('.git');

        if (files.includes('package.json')) {
            meta.stack.push('Node.js');
            try {
                const pkg = JSON.parse(fs.readFileSync(path.join(projectPath, 'package.json'), 'utf-8'));
                if (pkg.dependencies?.react) meta.stack.push('React');
                if (pkg.dependencies?.next) meta.stack.push('Next.js');
                if (pkg.dependencies?.electron) meta.stack.push('Electron');
                if (pkg.devDependencies?.typescript) meta.stack.push('TypeScript');
                if (pkg.dependencies?.vue) meta.stack.push('Vue');
                if (pkg.dependencies?.angular) meta.stack.push('Angular');
            } catch { }
        }
        if (files.includes('requirements.txt') || files.includes('setup.py')) meta.stack.push('Python');
        if (files.includes('go.mod')) meta.stack.push('Go');
        if (files.includes('Cargo.toml')) meta.stack.push('Rust');
        if (files.includes('pom.xml') || files.includes('build.gradle')) meta.stack.push('Java');

        meta.stack = meta.stack.slice(0, 4);
    } catch (err) {
        logger.warn(`[Projects:Metadata] Error leyendo ${projectPath}: ${err.message}`);
    }
    return meta;
}

async function loadProjects() {
    return await db.getProjects();
}

async function saveProject(project) {
    await db.saveProject(project);
}

function registerProjectHandlers(ipcMain, dataDir, dialog, shell, exec) {

    // ── Listar todos los proyectos ──
    ipcMain.handle('projects:load', async () => {
        const rows = await loadProjects();
        return rows.map(p => {
            // Enriquecer con metadata rápida SOLO si no tiene codeStats del escaneo profundo
            const quickMeta = getQuickMetadata(p.path);
            return {
                ...p,
                // El frontend usa codeStats directamente: NO lo sobrescribimos
                // Solo proporcionamos metadata como fallback para la lista
                metadata: quickMeta,
                // Garantizar que stack siempre tenga valor
                stack: (p.stack && p.stack.length > 0) ? p.stack : quickMeta.stack,
            };
        });
    });

    // ── Seleccionar carpeta ──
    ipcMain.handle('projects:select-folder', async () => {
        const result = await dialog.showOpenDialog({
            properties: ['openDirectory', 'createDirectory']
        });
        if (result.canceled || result.filePaths.length === 0) return null;
        return result.filePaths[0];
    });

    // ── Añadir nuevo proyecto ──
    ipcMain.handle('projects:add', async (_event, projectPath) => {
        if (!projectPath || typeof projectPath !== 'string') {
            logger.error('[Projects:Add] Path inválido');
            return null;
        }

        const name = path.basename(projectPath);
        const quickMeta = getQuickMetadata(projectPath);
        
        const project = {
            id: Date.now().toString(),
            name,
            path: projectPath,
            description: `Proyecto con ${quickMeta.fileCount} archivos raíz detectados.`,
            stack: quickMeta.stack,
            lastOpened: new Date(),
            monitoring: 0,
        };

        // Guardar registro rápido para visibilidad inmediata en UI
        await db.saveProject(project);
        logger.info(`[Projects:Add] Proyecto '${name}' registrado. Iniciando escaneo profundo...`);

        // Notificación de inicio al frontend
        if (_event.sender && !_event.sender.isDestroyed()) {
            _event.sender.send('scanner:progress', { step: 'Iniciando análisis...', percent: 5 });
        }

        // Escaneo profundo asíncrono (no bloquea la respuesta)
        setTimeout(async () => {
            try {
                const reportProgress = (data) => {
                    if (_event.sender && !_event.sender.isDestroyed()) {
                        _event.sender.send('scanner:progress', data);
                    }
                };

                const result = await scanner.scan(projectPath, reportProgress);
                if (result.success) {
                    const deepProject = {
                        id: project.id,
                        name: project.name,
                        path: project.path,
                        description: project.description,
                        stack: quickMeta.stack.length > 0 
                            ? quickMeta.stack 
                            : Object.keys(result.stats.languages).slice(0, 4),
                        fullContext: { ...result.stats, flowData: result.flowData },
                        fileTree: result.fileTree,
                        codeStats: result.stats,
                        mermaidStructure: 'REACT_FLOW_GRAPH',
                    };
                    
                    // Vector semántico
                    const embedding = await generateProjectEmbedding(deepProject);
                    deepProject.projectEmbedding = embedding;

                    await db.saveProject(deepProject);
                    logger.info(`[Projects:Add] Escaneo completo para '${name}': ${result.stats.totalFiles} archivos, ${result.stats.totalLines} LOC`);
                    
                    if (_event.sender && !_event.sender.isDestroyed()) {
                        _event.sender.send('projects:refresh');
                    }
                } else {
                    logger.error(`[Projects:Add] Escaneo fallido para '${name}': ${result.error}`);
                }
            } catch (e) {
                logger.error(`[Projects:AutoScan] Error para ${name}: ${e.message}`);
            }
        }, 200);

        return project;
    });

    // ── Obtener proyecto por ID ──
    ipcMain.handle('projects:get-by-id', async (_event, id) => {
        if (!id) {
            logger.warn('[Projects:GetById] ID nulo recibido');
            return null;
        }
        
        const p = await db.getProjectById(id);
        if (!p) {
            logger.error(`[Projects:GetById] No encontrado: ${id}`);
            return null;
        }
        
        // Asegurar que flowData esté accesible en el top-level
        if (!p.flowData && p.fullContext?.flowData) {
            p.flowData = p.fullContext.flowData;
        }
        
        return p;
    });

    // ── Escaneo profundo manual ──
    ipcMain.handle('projects:deep-scan', async (_event, id) => {
        logger.info(`[Projects:DeepScan] Iniciando para ID: ${id}`);
        try {
            const project = await db.getProjectById(id);
            if (!project) return { success: false, error: 'Proyecto no encontrado' };

            const reportProgress = (data) => {
                if (_event.sender && !_event.sender.isDestroyed()) {
                    _event.sender.send('scanner:progress', data);
                }
            };

            const result = await scanner.scan(project.path, reportProgress);
            if (!result.success) {
                return { success: false, error: result.error };
            }

            const updated = {
                id: project.id,
                name: project.name,
                path: project.path,
                description: project.description,
                stack: (project.stack && project.stack.length > 0) 
                    ? project.stack 
                    : Object.keys(result.stats.languages).slice(0, 4),
                fullContext: { ...result.stats, flowData: result.flowData },
                fileTree: result.fileTree,
                codeStats: result.stats,
                mermaidStructure: 'REACT_FLOW_GRAPH',
            };

            // Vector semántico
            reportProgress({ step: 'Generando vector semántico...', percent: 95 });
            const embedding = await generateProjectEmbedding(updated);
            updated.projectEmbedding = embedding;

            await db.saveProject(updated);

            // Añadir flowData al top-level para el frontend
            updated.flowData = result.flowData;

            logger.info(`[Projects:DeepScan] Completo: ${result.stats.totalFiles} archivos, ${result.stats.totalLines} LOC`);
            return { success: true, project: updated };

        } catch (err) {
            logger.error(`[Projects:DeepScan] Error: ${err.message}`);
            return { success: false, error: err.message };
        }
    });

    // ── Eliminar proyecto ──
    ipcMain.handle('projects:remove', async (_event, id) => {
        await db.deleteProject(id);
        return { ok: true };
    });

    // ── Actualizar proyecto ──
    ipcMain.handle('projects:update', async (_event, id, updates) => {
        const projects = await loadProjects();
        const p = projects.find(p => p.id === id);
        if (!p) return { error: 'Project not found' };
        
        const updated = { ...p, ...updates };
        await db.saveProject(updated);

        // Reactividad de Monitorización
        try {
            const projectWatcher = require('../services/project_watcher');
            projectWatcher.updateMonitoring(updated, updated.monitoring === 1);
        } catch (err) {
            logger.warn(`[Projects:Update] Watcher no disponible: ${err.message}`);
        }

        return updated;
    });

    // ── Abrir en Antigravity ──
    ipcMain.handle('projects:open-antigravity', async (_event, projectPath) => {
        if (!projectPath) {
            return { ok: false, error: 'Path missing' };
        }
        const projects = await loadProjects();
        const p = projects.find(p => p.path === projectPath);
        if (p) {
            p.lastOpened = Date.now();
            await db.saveProject(p);
        }
        return new Promise((resolve) => {
            exec(`open -a "Antigravity" "${projectPath}"`, (error) => {
                if (error) {
                    shell.showItemInFolder(projectPath);
                    resolve({ ok: true, fallback: true });
                } else {
                    resolve({ ok: true, fallback: false });
                }
            });
        });
    });

    // ── Abrir en Finder ──
    ipcMain.handle('projects:open-finder', async (_event, projectPath) => {
        if (!projectPath) return { ok: false, error: 'Path missing' };
        shell.showItemInFolder(projectPath);
        return { ok: true };
    });
}

module.exports = registerProjectHandlers;
module.exports.loadProjects = loadProjects;
module.exports.saveProject = saveProject;
