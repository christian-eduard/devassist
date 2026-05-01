const db = require('../electron/db_nexus');
const logger = require('../electron/ipc/logger');

async function debugData() {
    console.log('--- DEBUG DE DATOS RAW ---');
    const projects = await db.getProjects();
    if (projects.length === 0) {
        console.log('No hay proyectos en la DB.');
        return;
    }

    const p = projects[0];
    console.log(`Proyecto: ${p.name} (${p.id})`);
    console.log(`- Type of codeStats: ${typeof p.codeStats}`);
    console.log(`- Value of codeStats:`, JSON.stringify(p.codeStats).substring(0, 500));
    console.log(`- Type of fileTree: ${typeof p.fileTree}`);
    console.log(`- Value of fileTree:`, p.fileTree ? "EXISTE" : "NULL");
    
    if (p.fileTree) {
        console.log(`- Root children count: ${p.fileTree.children ? p.fileTree.children.length : 'N/A'}`);
    }
}

debugData();
