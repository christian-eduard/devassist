const logger = require("./logger");
const fs = require('fs');
const path = require('path');

const PROJECTS_FILE = 'projects.json';

const ACCENT_COLORS = [
    '6366f1', '7c6af7', '06d6a0', 'f72585', 'ff6b35',
    '4cc9f0', 'f77f00', '7209b7', '2ec4b6', 'e63946',
];

function getProjectMetadata(projectPath) {
    const meta = {
        stack: [],
        fileCount: 0,
        hasGit: false,
        size: 0
    };

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

        // Limit stack to 3 items
        if (meta.stack.length > 3) meta.stack = meta.stack.slice(0, 3);

    } catch (err) {
        logger.warn(`[projects:metadata] Error scanning ${projectPath}: ${err.message}`);
    }
    return meta;
}

function loadProjects(dataDir) {
    const filePath = path.join(dataDir, PROJECTS_FILE);
    try {
        if (fs.existsSync(filePath)) {
            return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        }
    } catch (err) {
        logger.error('[projects:load] Error:', err.message);
    }
    return [];
}

function saveProjects(dataDir, projects) {
    const filePath = path.join(dataDir, PROJECTS_FILE);
    fs.writeFileSync(filePath, JSON.stringify(projects, null, 2), 'utf-8');
}

function registerProjectHandlers(ipcMain, dataDir, dialog, shell, exec) {
    ipcMain.handle('projects:load', async () => {
        const projects = loadProjects(dataDir);
        // Enrich with live metadata on load
        return projects.map(p => ({
            ...p,
            metadata: getProjectMetadata(p.path)
        }));
    });

    ipcMain.handle('projects:add', async (_event, projectPath) => {
        const projects = loadProjects(dataDir);
        const name = path.basename(projectPath);
        const colorIndex = projects.length % ACCENT_COLORS.length;
        const project = {
            id: Date.now().toString(),
            name,
            path: projectPath,
            color: ACCENT_COLORS[colorIndex],
            notes: '',
            addedAt: new Date().toISOString(),
            lastOpened: null,
            metadata: getProjectMetadata(projectPath)
        };
        projects.push(project);
        saveProjects(dataDir, projects);
        return project;
    });

    ipcMain.handle('projects:remove', async (_event, id) => {
        let projects = loadProjects(dataDir);
        projects = projects.filter((p) => p.id !== id);
        saveProjects(dataDir, projects);
        return { ok: true };
    });

    ipcMain.handle('projects:update', async (_event, id, updates) => {
        const projects = loadProjects(dataDir);
        const idx = projects.findIndex((p) => p.id === id);
        if (idx === -1) return { error: 'Project not found' };
        projects[idx] = { ...projects[idx], ...updates };
        saveProjects(dataDir, projects);
        return projects[idx];
    });

    ipcMain.handle('projects:select-folder', async () => {
        const result = await dialog.showOpenDialog({
            properties: ['openDirectory'],
            title: 'Seleccionar carpeta del proyecto',
        });
        if (result.canceled || result.filePaths.length === 0) return null;
        return result.filePaths[0];
    });

    ipcMain.handle('projects:open-antigravity', async (_event, projectPath) => {
        // Update lastOpened locally
        const projects = loadProjects(dataDir);
        const idx = projects.findIndex(p => p.path === projectPath);
        if (idx !== -1) {
            projects[idx].lastOpened = new Date().toISOString();
            saveProjects(dataDir, projects);
        }

        return new Promise((resolve) => {
            exec(`open -a "Antigravity" "${projectPath}"`, (error) => {
                if (error) {
                    logger.warn('[projects:open-antigravity] Antigravity not found, fallback to Finder');
                    shell.showItemInFolder(projectPath);
                    resolve({
                        ok: true,
                        fallback: true,
                        message: 'Antigravity no encontrado. Se abrió en Finder.',
                    });
                } else {
                    resolve({ ok: true, fallback: false });
                }
            });
        });
    });

    ipcMain.handle('projects:open-finder', async (_event, projectPath) => {
        const projects = loadProjects(dataDir);
        const idx = projects.findIndex(p => p.path === projectPath);
        if (idx !== -1) {
            projects[idx].lastOpened = new Date().toISOString();
            saveProjects(dataDir, projects);
        }
        shell.showItemInFolder(projectPath);
        return { ok: true };
    });
};

module.exports = registerProjectHandlers;
module.exports.loadProjects = loadProjects;
module.exports.saveProjects = saveProjects;
