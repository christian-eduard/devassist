/**
 * tests/db.test.js
 * Tests unitarios del módulo de base de datos SQLite (db.js)
 * Ejecutar con: npx jest tests/db.test.js
 */

const path = require('path');
const fs = require('fs');
const os = require('os');

// ── Setup: usar una DB temporal por cada test suite ──────────────
let db;
let tmpDir;

beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'devassist-test-'));
    db = require('../electron/db');
    db.initDB(tmpDir);
});

afterAll(() => {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (e) {}
    jest.resetModules();
});

// ─────────────────────────────────────────────────────────────────
// BLOQUE 1: SETTINGS
// ─────────────────────────────────────────────────────────────────
describe('Settings — CRUD', () => {
    test('saveSetting + getSetting: valor string', () => {
        db.saveSetting('test_key', 'hello');
        const settings = db.getSettings();
        expect(settings['test_key']).toBe('hello');
    });

    test('saveSetting + getSettings: valor objeto JSON', () => {
        db.saveSetting('config_obj', { apiKey: '123', model: 'gemini' });
        const settings = db.getSettings();
        expect(settings['config_obj']).toEqual({ apiKey: '123', model: 'gemini' });
    });

    test('saveSetting actualiza valor existente (upsert)', () => {
        db.saveSetting('upsert_key', 'v1');
        db.saveSetting('upsert_key', 'v2');
        const settings = db.getSettings();
        expect(settings['upsert_key']).toBe('v2');
    });

    test('getSettings retorna objeto vacío si no hay settings', () => {
        // Settings pueden tener datos de tests anteriores, pero la función siempre retorna objeto
        const settings = db.getSettings();
        expect(typeof settings).toBe('object');
    });
});

// ─────────────────────────────────────────────────────────────────
// BLOQUE 2: FICHAS — Base de Conocimiento
// ─────────────────────────────────────────────────────────────────
describe('Fichas — CRUD y persistencia', () => {
    const fichaPlana = {
        id: 'ficha-test-001',
        titulo: 'Test de Gemini 2.0',
        concepto: 'Concepto de prueba del sistema de IA',
        tags: ['IA', 'Gemini', 'LLM'],
        transcripcion: 'Transcripción de prueba',
        investigacion_profunda: '',
        herramientas: [{ nombre: 'Gemini', tipo: 'LLM', descripcion: 'Modelo de Google' }],
        puntos_exploracion: [{ tema: 'Arquitectura', pregunta: '¿Cómo funciona?' }],
        nivel: 'avanzado',
        createdAt: Date.now(),
    };

    test('saveFicha: guarda ficha plana (legacy format)', () => {
        db.saveFicha(fichaPlana);
        const fichas = db.getFichas();
        const saved = fichas.find(f => f.id === 'ficha-test-001');
        expect(saved).toBeDefined();
        expect(saved.titulo).toBe('Test de Gemini 2.0');
    });

    test('getFichas: retorna todos los campos de la ficha guardada', () => {
        const fichas = db.getFichas();
        const saved = fichas.find(f => f.id === 'ficha-test-001');
        expect(saved.concepto).toBe('Concepto de prueba del sistema de IA');
        expect(Array.isArray(saved.tags)).toBe(true);
        expect(saved.tags).toContain('IA');
    });

    test('getFichas: campo herramientas se preserva correctamente', () => {
        const fichas = db.getFichas();
        const saved = fichas.find(f => f.id === 'ficha-test-001');
        expect(Array.isArray(saved.herramientas)).toBe(true);
        expect(saved.herramientas[0].nombre).toBe('Gemini');
    });

    test('getFichas: campo puntos_exploracion se preserva correctamente', () => {
        const fichas = db.getFichas();
        const saved = fichas.find(f => f.id === 'ficha-test-001');
        expect(Array.isArray(saved.puntos_exploracion)).toBe(true);
        expect(saved.puntos_exploracion[0].tema).toBe('Arquitectura');
    });

    test('saveFicha: actualiza investigacion_profunda (upsert)', () => {
        const updated = { ...fichaPlana, investigacion_profunda: '## Análisis profundo\n- Punto 1\n- Punto 2' };
        db.saveFicha(updated);
        const fichas = db.getFichas();
        const saved = fichas.find(f => f.id === 'ficha-test-001');
        expect(saved.investigacion_profunda).toBe('## Análisis profundo\n- Punto 1\n- Punto 2');
    });

    test('saveFicha: genera ID automático si no se provee', () => {
        const fichasSinId = { titulo: 'Sin ID', concepto: 'Test auto-id' };
        db.saveFicha(fichasSinId);
        const fichas = db.getFichas();
        const found = fichas.find(f => f.titulo === 'Sin ID');
        expect(found).toBeDefined();
        expect(found.id).toBeTruthy();
        expect(found.id.startsWith('f_')).toBe(true);
    });

    test('saveFicha: formato con .data anidado (nuevo formato)', () => {
        const fichaConData = {
            id: 'ficha-test-002',
            title: 'Ficha con .data',
            data: {
                concepto: 'Concepto anidado',
                tags: ['React', 'SQLite'],
                transcripcion: 'Texto anidado'
            },
            timestamp: Date.now()
        };
        db.saveFicha(fichaConData);
        const fichas = db.getFichas();
        const saved = fichas.find(f => f.id === 'ficha-test-002');
        expect(saved).toBeDefined();
        expect(saved.concepto).toBe('Concepto anidado');
    });

    test('deleteFicha: elimina ficha correctamente', () => {
        db.saveFicha({ id: 'ficha-to-delete', titulo: 'Para borrar' });
        db.deleteFicha('ficha-to-delete');
        const fichas = db.getFichas();
        const found = fichas.find(f => f.id === 'ficha-to-delete');
        expect(found).toBeUndefined();
    });

    test('getFichas: no crashea con datos corruptos en DB (data malformado)', () => {
        // Insertar directamente una fila con JSON inválido usando SQLite
        const Database = require('better-sqlite3');
        const sqldb = new Database(path.join(tmpDir, 'database.sqlite'));
        sqldb.prepare("INSERT OR REPLACE INTO fichas (id, title, data, timestamp) VALUES ('corrupt-001', 'Corrupta', 'INVALID_JSON', 123456)").run();
        sqldb.close();

        // getFichas no debe lanzar error
        expect(() => db.getFichas()).not.toThrow();
        const fichas = db.getFichas();
        const corrupt = fichas.find(f => f.id === 'corrupt-001');
        expect(corrupt).toBeDefined(); // aún retorna la fila
        expect(corrupt.tags).toEqual([]); // tags con fallback []
    });
});

// ─────────────────────────────────────────────────────────────────
// BLOQUE 3: PROJECTS
// ─────────────────────────────────────────────────────────────────
describe('Projects — CRUD', () => {
    const project = {
        id: 'proj-test-001',
        name: 'DevAssist',
        path: '/Users/chris/Desktop/DevAssist',
        type: 'electron',
        lastAccessed: Date.now(),
        description: 'App de asistencia para devs'
    };

    test('saveProject: guarda proyecto correctamente', () => {
        db.saveProject(project);
        const projects = db.getProjects();
        const saved = projects.find(p => p.id === 'proj-test-001');
        expect(saved).toBeDefined();
        expect(saved.name).toBe('DevAssist');
    });

    test('getProjects: retorna array', () => {
        const projects = db.getProjects();
        expect(Array.isArray(projects)).toBe(true);
    });

    test('saveProject: genera ID automático si no se provee', () => {
        db.saveProject({ name: 'AutoID Project', path: '/tmp/test' });
        const projects = db.getProjects();
        const found = projects.find(p => p.name === 'AutoID Project');
        expect(found).toBeDefined();
        expect(found.id).toBeTruthy();
        expect(found.id.startsWith('p_')).toBe(true);
    });

    test('saveProject: type tiene fallback a "local"', () => {
        db.saveProject({ id: 'proj-notype', name: 'Sin tipo', path: '/tmp/notype' });
        const projects = db.getProjects();
        const found = projects.find(p => p.id === 'proj-notype');
        expect(found.type).toBe('local');
    });

    test('deleteProject: elimina proyecto correctamente', () => {
        db.saveProject({ id: 'proj-to-delete', name: 'Borrar', path: '/tmp/delete' });
        db.deleteProject('proj-to-delete');
        const projects = db.getProjects();
        const found = projects.find(p => p.id === 'proj-to-delete');
        expect(found).toBeUndefined();
    });
});

// ─────────────────────────────────────────────────────────────────
// BLOQUE 4: NOTES
// ─────────────────────────────────────────────────────────────────
describe('Notes — CRUD', () => {
    test('saveNote: guarda nota correctamente', () => {
        db.saveNote({ id: 'note-001', title: 'Mi nota', content: 'Contenido de prueba', tags: 'tag1,tag2' });
        const notes = db.getNotes();
        const saved = notes.find(n => n.id === 'note-001');
        expect(saved).toBeDefined();
        expect(saved.title).toBe('Mi nota');
    });

    test('saveNote: genera ID automático si no se provee', () => {
        db.saveNote({ title: 'Sin ID', content: 'Texto' });
        const notes = db.getNotes();
        const found = notes.find(n => n.title === 'Sin ID');
        expect(found).toBeDefined();
        expect(found.id.startsWith('n_')).toBe(true);
    });

    test('deleteNote: elimina nota correctamente', () => {
        db.saveNote({ id: 'note-to-delete', title: 'Borrar', content: 'x' });
        db.deleteNote('note-to-delete');
        const notes = db.getNotes();
        expect(notes.find(n => n.id === 'note-to-delete')).toBeUndefined();
    });
});

// ─────────────────────────────────────────────────────────────────
// BLOQUE 5: NOTIFICATIONS
// ─────────────────────────────────────────────────────────────────
describe('Notifications — CRUD', () => {
    const notif = {
        id: 'notif-001',
        title: 'Test Notification',
        message: 'Mensaje de prueba',
        type: 'info',
        timestamp: Date.now(),
        read: false,
        actions: [{ label: 'Ver', primary: true }],
        notes: ''
    };

    test('saveNotification: guarda y recupera notificación', () => {
        db.saveNotification(notif);
        const notifications = db.getNotifications();
        const saved = notifications.find(n => n.id === 'notif-001');
        expect(saved).toBeDefined();
        expect(saved.title).toBe('Test Notification');
    });

    test('getNotifications: campo read es booleano (no 0/1)', () => {
        const notifications = db.getNotifications();
        const saved = notifications.find(n => n.id === 'notif-001');
        expect(typeof saved.read).toBe('boolean');
        expect(saved.read).toBe(false);
    });

    test('getNotifications: actions se deserializa como array', () => {
        const notifications = db.getNotifications();
        const saved = notifications.find(n => n.id === 'notif-001');
        expect(Array.isArray(saved.actions)).toBe(true);
        expect(saved.actions[0].label).toBe('Ver');
    });

    test('updateNotificationNotes: actualiza las notas de una notificación', () => {
        db.updateNotificationNotes('notif-001', 'Esta es mi nota personal');
        const notifications = db.getNotifications();
        const updated = notifications.find(n => n.id === 'notif-001');
        expect(updated.notes).toBe('Esta es mi nota personal');
    });

    test('deleteNotification: elimina notificación correctamente', () => {
        db.saveNotification({ id: 'notif-to-delete', title: 'Borrar', message: 'x', type: 'info' });
        db.deleteNotification('notif-to-delete');
        const notifications = db.getNotifications();
        expect(notifications.find(n => n.id === 'notif-to-delete')).toBeUndefined();
    });

    test('clearNotifications: elimina todas las notificaciones', () => {
        db.saveNotification({ id: 'notif-clear-1', title: 'A', message: 'x', type: 'info' });
        db.saveNotification({ id: 'notif-clear-2', title: 'B', message: 'x', type: 'info' });
        db.clearNotifications();
        const notifications = db.getNotifications();
        expect(notifications.length).toBe(0);
    });
});

// ─────────────────────────────────────────────────────────────────
// BLOQUE 6: INTEGRIDAD DE MIGRACIÓN LEGACY
// ─────────────────────────────────────────────────────────────────
describe('Migración legacy — detecta y no re-migra archivos .legacy', () => {
    test('NO migra archivos .legacy (ya procesados)', () => {
        // Crea un archivo fichas.json.legacy en tmpDir (simulando post-migración)
        const legacyPath = path.join(tmpDir, 'fichas.json.legacy');
        fs.writeFileSync(legacyPath, JSON.stringify([{ id: 'legacy-test', titulo: 'Legacy' }]));

        // Cuenta fichas antes
        const beforeCount = db.getFichas().length;

        // Re-init DB (no debería migrar archivos .legacy)
        jest.resetModules();
        const db2 = require('../electron/db');
        db2.initDB(tmpDir);

        const afterCount = db2.getFichas().length;
        // El count no debe cambiar (no se re-migra un .legacy)
        expect(afterCount).toBe(beforeCount);

        // Limpieza
        fs.unlinkSync(legacyPath);
    });
});
