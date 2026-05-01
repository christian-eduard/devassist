const chokidar = require('chokidar');
const path = require('path');
const logger = require('../ipc/logger');
const db = require('../db_nexus');
const projectScanner = require('./project_scanner');

/**
 * ProjectWatcher (Fase 32)
 * Servicio encargado de la "Monitorización IA" de proyectos activos.
 * Lee la bandera 'monitoring' de la DB y activa/desactiva centinelas.
 */
class ProjectWatcher {
    constructor() {
        this.watchers = new Map(); // projectId -> chokidar instance
    }

    async init() {
        logger.info('[Watcher] Cargando configuración de monitorización activa...');
        const allProjects = await db.getProjects();
        const activeProjects = allProjects.filter(p => p.monitoring === 1);
        
        for (const p of activeProjects) {
            this.startWatching(p);
        }
    }

    async startWatching(project) {
        if (this.watchers.has(project.id)) {
            logger.info(`[Watcher] Ya se está vigilando el proyecto: ${project.name}`);
            return;
        }

        logger.info(`[Watcher] Activando Centinela IA para: ${project.name} (${project.path})`);
        
        const watcher = chokidar.watch(project.path, {
            ignored: [...projectScanner.excludeDirs].map(p => `**/${p}/**`),
            persistent: true,
            ignoreInitial: true,
            awaitWriteFinish: {
                stabilityThreshold: 1000,
                pollInterval: 100
            }
        });

        watcher
            .on('add', (filePath) => this.handleFileChange(project.id, filePath, 'added'))
            .on('change', (filePath) => this.handleFileChange(project.id, filePath, 'changed'))
            .on('unlink', (filePath) => this.handleFileChange(project.id, filePath, 'removed'));

        this.watchers.set(project.id, watcher);
    }

    stopWatching(projectId) {
        const watcher = this.watchers.get(projectId);
        if (watcher) {
            watcher.close();
            this.watchers.delete(projectId);
            logger.info(`[Watcher] Centinela IA desactivado para el proyecto: ${projectId}`);
        }
    }

    async handleFileChange(projectId, filePath, action) {
        const ext = path.extname(filePath).toLowerCase();
        if (!projectScanner.codeExtensions.includes(ext)) return;

        logger.info(`[Watcher:IA] Cambio detectado (${action}): ${path.basename(filePath)}`);
        
        // Aquí se dispararía el motor de re-indexación RAG en el futuro
        // Por ahora, actualizamos el estado de sincronización visual (opcional)
        // Y notificamos a TESS que hay nuevo contexto.
        
        // Nota: No lanzamos un scan completo (deepScan) para no saturar, 
        // solo el archivo individual debería ser procesado.
    }

    updateMonitoring(project, isEnabled) {
        if (isEnabled) {
            this.startWatching(project);
        } else {
            this.stopWatching(project.id);
        }
    }
}

module.exports = new ProjectWatcher();
