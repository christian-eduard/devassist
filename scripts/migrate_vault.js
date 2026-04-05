const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');
const { db: pg, initNexus } = require('../electron/db_nexus');
const { fichas, projects, settings, notes, notifications } = require('../electron/schema');
const logger = require('../electron/ipc/logger');

async function migrate() {
    const dataDir = path.join(os.homedir(), '.devassist');
    const dbPath = path.join(dataDir, 'database.sqlite');
    logger.info(`📂 Leyendo base de datos persistente: ${dbPath}`);
    const sqlite = new Database(dbPath); // Instancia pura y directa
    
    const connected = await initNexus();
    if (!connected) {
        logger.error('❌ No se pudo conectar a Postgres. Abortando migración.');
        process.exit(1);
    }

    try {
        // 1. Migrar Configuración (Settings)
        logger.info('📦 Migrando Settings...');
        const sqliteSettings = sqlite.prepare('SELECT * FROM settings').all();
        for (const s of sqliteSettings) {
            try {
                await pg.insert(settings).values({
                    key: s.key,
                    value: JSON.parse(s.value),
                    updatedAt: new Date(s.updated_at || Date.now())
                }).onConflictDoUpdate({
                    target: settings.key,
                    set: { value: JSON.parse(s.value), updatedAt: new Date() }
                });
            } catch (e) { logger.warn(`Error en setting ${s.key}:`, e.message); }
        }

        // 2. Migrar Proyectos
        logger.info('📂 Migrando Proyectos...');
        const sqliteProjects = sqlite.prepare('SELECT * FROM projects').all();
        for (const p of sqliteProjects) {
            try {
                await pg.insert(projects).values({
                    id: String(p.id),
                    name: p.name,
                    path: p.path,
                    description: p.description,
                    stack: p.stack ? JSON.parse(p.stack) : [],
                    updatedAt: new Date(p.lastAccessed || Date.now())
                }).onConflictDoUpdate({
                    target: projects.id,
                    set: { name: p.name, description: p.description }
                });
            } catch (e) { logger.warn(`Error en proyecto ${p.id}:`, e.message); }
        }

        // 3. Migrar Fichas (Master Vault)
        logger.info('📄 Migrando Fichas (Master Vault)...');
        const sqliteFichas = sqlite.prepare('SELECT * FROM fichas').all();
        for (const f of sqliteFichas) {
            try {
                const metadata = f.data ? JSON.parse(f.data) : (f.details ? JSON.parse(f.details) : {});
                
                // Extraer campos anidados del JSON legacy
                const urlOrig = f.urlOriginal || f.url_original || metadata.urlOriginal || metadata.url_video || metadata.tiktokUrl || '';
                const transc = f.transcripcion || metadata.transcripcion || metadata.resumen || '';
                const vPath = f.videoPath || metadata.videoPath || (metadata.videoName ? path.join(dataDir, 'videos', metadata.videoName) : '');
                const vName = f.videoName || metadata.videoName || (vPath ? path.basename(vPath) : '');

                await pg.insert(fichas).values({
                    id: String(f.id),
                    title: f.title || f.titulo || metadata.titulo || metadata.title || 'Sin título',
                    urlOriginal: urlOrig,
                    transcripcion: transc,
                    videoPath: vPath,
                    videoName: vName,
                    metadata: metadata,
                    createdAt: new Date(f.timestamp || f.createdAt || metadata.createdAt || Date.now())
                }).onConflictDoUpdate({
                    target: fichas.id,
                    set: { 
                        title: f.title || f.titulo || metadata.titulo || 'Sin título', 
                        metadata: metadata, 
                        videoPath: vPath,
                        videoName: vName, // FALTABA AQUI
                        transcripcion: transc,
                        urlOriginal: urlOrig
                    }
                });
            } catch (e) { logger.warn(`Error en ficha ${f.id}:`, e.message); }
        }

        // 4. Migrar Notas
        logger.info('📝 Migrando Notas...');
        const sqliteNotes = sqlite.prepare('SELECT * FROM notes').all();
        for (const n of sqliteNotes) {
            try {
                await pg.insert(notes).values({
                    id: n.id,
                    title: n.title,
                    content: n.content,
                    tags: n.tags,
                    timestamp: new Date(n.timestamp || Date.now())
                }).onConflictDoUpdate({
                    target: notes.id,
                    set: { content: n.content, timestamp: new Date() }
                });
            } catch (e) { logger.warn(`Error en nota ${n.id}:`, e.message); }
        }

        // 5. Migrar Notificaciones
        logger.info('🔔 Migrando Notificaciones...');
        const sqliteNotifs = sqlite.prepare('SELECT * FROM notifications').all();
        for (const n of sqliteNotifs) {
            try {
                await pg.insert(notifications).values({
                    id: n.id,
                    title: n.title,
                    message: n.message,
                    type: n.type,
                    timestamp: new Date(n.timestamp || Date.now()),
                    read: n.read || 0,
                    actions: n.actions ? JSON.parse(n.actions) : [],
                    notes: n.notes || ''
                }).onConflictDoUpdate({
                    target: notifications.id,
                    set: { read: n.read || 0 }
                });
            } catch (e) { logger.warn(`Error en notif ${n.id}:`, e.message); }
        }

        logger.info('✅ Migración Completada con éxito.');
        process.exit(0);
    } catch (err) {
        logger.error('❌ Error crítico en la migración:', err.message);
        process.exit(1);
    }
}

migrate();
