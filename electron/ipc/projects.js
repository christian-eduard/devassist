const logger = require("./logger");
const fs = require('fs');
const path = require('path');
const db = require('../db');

function getProjectMetadata(projectPath) {
    const meta = { stack: [], fileCount: 0, hasGit: false, size: 0 };
    try {
        if (!fs.existsSync(projectPath)) return meta;
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
            } catch (e) { }
        }
        if (files.includes('index.html')) meta.stack.push('HTML5');
        if (files.some(f => f.endsWith('.py'))) meta.stack.push('Python');
        if (files.some(f => f.endsWith('.go'))) meta.stack.push('Go');
        if (meta.stack.length > 3) meta.stack = meta.stack.slice(0, 3);
    } catch (err) { }
    return meta;
}

async function loadProjects() {
    return await db.getProjects();
}

async function saveProject(project) {
    await db.saveProject(project);
}

function registerProjectHandlers(ipcMain, dataDir, dialog, shell, exec) {
    ipcMain.handle('projects:load', async () => {
        const projects = await loadProjects();
        return projects.map(p => ({
            ...p,
            metadata: getProjectMetadata(p.path)
        }));
    });

    ipcMain.handle('projects:add', async (_event, projectPath) => {
        const name = path.basename(projectPath);
        const project = {
            id: Date.now().toString(),
            name,
            path: projectPath,
            type: 'local',
            lastAccessed: Date.now(),
            description: JSON.stringify(getProjectMetadata(projectPath))
        };
        await db.saveProject(project);
        return project;
    });

    ipcMain.handle('projects:remove', async (_event, id) => {
        await db.deleteProject(id);
        return { ok: true };
    });

    ipcMain.handle('projects:update', async (_event, id, updates) => {
        const projects = await loadProjects();
        const p = projects.find(p => p.id === id);
        if (!p) return { error: 'Project not found' };
        const updated = { ...p, ...updates };
        await db.saveProject(updated);
        return updated;
    });

    ipcMain.handle('projects:open-antigravity', async (_event, projectPath) => {
        if (!projectPath) {
            logger.error('[projects:open-antigravity] Error: projectPath is undefined');
            return { ok: false, error: 'Path missing' };
        }
        const projects = await loadProjects();
        const p = projects.find(p => p.path === projectPath);
        if (p) {
            p.lastAccessed = Date.now();
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

    ipcMain.handle('projects:open-finder', async (_event, projectPath) => {
        if (!projectPath) {
            logger.error('[projects:open-finder] Error: projectPath is undefined');
            return { ok: false, error: 'Path missing' };
        }
        shell.showItemInFolder(projectPath);
        return { ok: true };
    });
};

module.exports = registerProjectHandlers;
module.exports.loadProjects = loadProjects;
module.exports.saveProject = saveProject;
