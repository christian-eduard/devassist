#!/usr/bin/env node
/**
 * tests/run-db-tests.js
 * Test runner para db.js — ejecutar con el binario de Electron:
 *   ./node_modules/.bin/electron tests/run-db-tests.js
 * 
 * Electron DEBE usarse aquí porque better-sqlite3 fue compilado para Electron
 * (NODE_MODULE_VERSION 119) y es incompatible con Node.js puro.
 */

process.env.ELECTRON_RUN_AS_NODE = '1';

const path = require('path');
const fs = require('fs');
const os = require('os');

// ── Mini test runner (sin dependencias externas) ──────────────
let passed = 0;
let failed = 0;
const results = [];

function test(name, fn) {
    try {
        fn();
        results.push({ name, status: 'PASS' });
        passed++;
    } catch (e) {
        results.push({ name, status: 'FAIL', error: e.message });
        failed++;
    }
}

function expect(value) {
    return {
        toBe(expected) {
            if (value !== expected) throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(value)}`);
        },
        toEqual(expected) {
            if (JSON.stringify(value) !== JSON.stringify(expected))
                throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(value)}`);
        },
        toBeDefined() {
            if (value === undefined || value === null) throw new Error(`Expected defined, got ${value}`);
        },
        toBeUndefined() {
            if (value !== undefined) throw new Error(`Expected undefined, got ${JSON.stringify(value)}`);
        },
        toBeTruthy() {
            if (!value) throw new Error(`Expected truthy, got ${JSON.stringify(value)}`);
        },
        toContain(item) {
            if (!Array.isArray(value) ? !value.includes(item) : !value.includes(item))
                throw new Error(`Expected ${JSON.stringify(value)} to contain ${JSON.stringify(item)}`);
        },
        toEqual(expected) {
            if (JSON.stringify(value) !== JSON.stringify(expected))
                throw new Error(`toEqual failed:\n  Expected: ${JSON.stringify(expected)}\n  Got: ${JSON.stringify(value)}`);
        },
        toStartWith(prefix) {
            if (typeof value !== 'string' || !value.startsWith(prefix))
                throw new Error(`Expected "${value}" to start with "${prefix}"`);
        },
        not: {
            toThrow() { /* handled separately */ },
            toBeNull() {
                if (value === null) throw new Error(`Expected not null, but got null`);
            }
        },
        toBeNull() {
            if (value !== null) throw new Error(`Expected null, got ${JSON.stringify(value)}`);
        }
    };
}

function notThrows(fn) {
    try { fn(); return true; } catch (e) { throw new Error(`Expected no throw but got: ${e.message}`); }
}

// ── Setup ─────────────────────────────────────────────────────
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'devassist-test-'));
const db = require('../electron/db');
db.initDB(tmpDir);

console.log('\n🧪 DevAssist — Test Suite SQLite (Electron Runtime)\n' + '─'.repeat(60));

// ═══════════════════════════════════════════════════════════════
// SUITE: Settings
// ═══════════════════════════════════════════════════════════════
console.log('\n📦 Settings — CRUD');

test('saveSetting + getSettings: valor string', () => {
    db.saveSetting('test_key', 'hello');
    const s = db.getSettings();
    expect(s['test_key']).toBe('hello');
});

test('saveSetting + getSettings: valor objeto JSON', () => {
    db.saveSetting('config_obj', { apiKey: '123', model: 'gemini' });
    const s = db.getSettings();
    expect(JSON.stringify(s['config_obj'])).toBe(JSON.stringify({ apiKey: '123', model: 'gemini' }));
});

test('saveSetting: upsert actualiza valor existente', () => {
    db.saveSetting('upsert_key', 'v1');
    db.saveSetting('upsert_key', 'v2');
    const s = db.getSettings();
    expect(s['upsert_key']).toBe('v2');
});

test('getSettings retorna objeto', () => {
    const s = db.getSettings();
    if (typeof s !== 'object') throw new Error('Expected object');
});

// ═══════════════════════════════════════════════════════════════
// SUITE: Fichas
// ═══════════════════════════════════════════════════════════════
console.log('\n📚 Fichas — CRUD y persistencia');

const fichaPlana = {
    id: 'ficha-test-001',
    titulo: 'Test de Gemini 2.0',
    concepto: 'Concepto de prueba del sistema de IA',
    tags: ['IA', 'Gemini', 'LLM'],
    transcripcion: 'Transcripción de prueba completa',
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

test('getFichas: concepto disponible en raíz', () => {
    const fichas = db.getFichas();
    const s = fichas.find(f => f.id === 'ficha-test-001');
    expect(s.concepto).toBe('Concepto de prueba del sistema de IA');
});

test('getFichas: tags se preservan como array', () => {
    const fichas = db.getFichas();
    const s = fichas.find(f => f.id === 'ficha-test-001');
    if (!Array.isArray(s.tags)) throw new Error('tags must be array');
    if (!s.tags.includes('IA')) throw new Error('tags must include IA');
});

test('getFichas: herramientas disponibles en raíz', () => {
    const fichas = db.getFichas();
    const s = fichas.find(f => f.id === 'ficha-test-001');
    if (!Array.isArray(s.herramientas)) throw new Error('herramientas must be array');
    expect(s.herramientas[0].nombre).toBe('Gemini');
});

test('getFichas: puntos_exploracion disponibles en raíz', () => {
    const fichas = db.getFichas();
    const s = fichas.find(f => f.id === 'ficha-test-001');
    if (!Array.isArray(s.puntos_exploracion)) throw new Error('puntos_exploracion must be array');
    expect(s.puntos_exploracion[0].tema).toBe('Arquitectura');
});

test('saveFicha: actualiza investigacion_profunda (upsert)', () => {
    const updated = { ...fichaPlana, investigacion_profunda: '## Análisis\n- Punto 1' };
    db.saveFicha(updated);
    const fichas = db.getFichas();
    const s = fichas.find(f => f.id === 'ficha-test-001');
    expect(s.investigacion_profunda).toBe('## Análisis\n- Punto 1');
});

test('saveFicha: genera ID automático si falta id', () => {
    db.saveFicha({ titulo: 'Sin ID', concepto: 'Test auto-id' });
    const fichas = db.getFichas();
    const found = fichas.find(f => f.titulo === 'Sin ID');
    if (!found) throw new Error('No se encontró ficha sin ID');
    if (!found.id.startsWith('f_')) throw new Error(`ID debe empezar con f_, got: ${found.id}`);
});

test('saveFicha: formato con .data anidado (nuevo)', () => {
    db.saveFicha({ id: 'ficha-test-002', title: 'Anidada', data: { concepto: 'Anidado', tags: ['React'] }, timestamp: Date.now() });
    const fichas = db.getFichas();
    const s = fichas.find(f => f.id === 'ficha-test-002');
    if (!s) throw new Error('ficha-test-002 no encontrada');
    expect(s.concepto).toBe('Anidado');
});

test('deleteFicha: elimina ficha correctamente', () => {
    db.saveFicha({ id: 'ficha-del', titulo: 'Borrar' });
    db.deleteFicha('ficha-del');
    const fichas = db.getFichas();
    const found = fichas.find(f => f.id === 'ficha-del');
    if (found) throw new Error('Ficha no fue eliminada');
});

test('getFichas: no crashea con JSON corrupto en columna data', () => {
    const Database = require('better-sqlite3');
    const sqldb = new Database(path.join(tmpDir, 'database.sqlite'));
    sqldb.prepare("INSERT OR REPLACE INTO fichas (id, title, data, timestamp) VALUES ('corrupt-001', 'Corrupta', 'NO_JSON', 123)").run();
    sqldb.close();
    notThrows(() => db.getFichas());
    const fichas = db.getFichas();
    const c = fichas.find(f => f.id === 'corrupt-001');
    if (!c) throw new Error('corrupt-001 should exist');
    if (!Array.isArray(c.tags)) throw new Error('tags should fallback to []');
});

// ═══════════════════════════════════════════════════════════════
// SUITE: Projects
// ═══════════════════════════════════════════════════════════════
console.log('\n📁 Projects — CRUD');

test('saveProject: guarda y recupera proyecto', () => {
    db.saveProject({ id: 'proj-001', name: 'DevAssist', path: '/tmp/da', type: 'electron', lastAccessed: Date.now() });
    const projects = db.getProjects();
    const s = projects.find(p => p.id === 'proj-001');
    if (!s) throw new Error('proj-001 no encontrado');
    expect(s.name).toBe('DevAssist');
});

test('getProjects: retorna array', () => {
    const projects = db.getProjects();
    if (!Array.isArray(projects)) throw new Error('getProjects debe retornar array');
});

test('saveProject: genera ID automático', () => {
    db.saveProject({ name: 'AutoID', path: '/tmp/auto' });
    const projects = db.getProjects();
    const found = projects.find(p => p.name === 'AutoID');
    if (!found) throw new Error('No encontrado');
    if (!found.id.startsWith('p_')) throw new Error(`ID debe empezar con p_, got: ${found.id}`);
});

test('saveProject: type tiene fallback a "local"', () => {
    db.saveProject({ id: 'proj-notype', name: 'Sin tipo', path: '/tmp/nt' });
    const projects = db.getProjects();
    const found = projects.find(p => p.id === 'proj-notype');
    expect(found.type).toBe('local');
});

test('deleteProject: elimina proyecto correctamente', () => {
    db.saveProject({ id: 'proj-del', name: 'Borrar', path: '/tmp/del' });
    db.deleteProject('proj-del');
    const projects = db.getProjects();
    if (projects.find(p => p.id === 'proj-del')) throw new Error('Proyecto no fue eliminado');
});

// ═══════════════════════════════════════════════════════════════
// SUITE: Notes
// ═══════════════════════════════════════════════════════════════
console.log('\n📝 Notes — CRUD');

test('saveNote: guarda nota correctamente', () => {
    db.saveNote({ id: 'note-001', title: 'Mi nota', content: 'Contenido de prueba' });
    const notes = db.getNotes();
    const s = notes.find(n => n.id === 'note-001');
    if (!s) throw new Error('note-001 no encontrada');
    expect(s.title).toBe('Mi nota');
});

test('saveNote: genera ID automático', () => {
    db.saveNote({ title: 'Sin ID', content: 'Texto' });
    const notes = db.getNotes();
    const found = notes.find(n => n.title === 'Sin ID');
    if (!found) throw new Error('No encontrada');
    if (!found.id.startsWith('n_')) throw new Error(`ID debe empezar con n_, got: ${found.id}`);
});

test('deleteNote: elimina nota correctamente', () => {
    db.saveNote({ id: 'note-del', title: 'Borrar', content: 'x' });
    db.deleteNote('note-del');
    const notes = db.getNotes();
    if (notes.find(n => n.id === 'note-del')) throw new Error('Nota no fue eliminada');
});

// ═══════════════════════════════════════════════════════════════
// SUITE: Notifications
// ═══════════════════════════════════════════════════════════════
console.log('\n🔔 Notifications — CRUD');

const notif = {
    id: 'notif-001', title: 'Test', message: 'Msg',
    type: 'info', timestamp: Date.now(), read: false,
    actions: [{ label: 'Ver', primary: true }], notes: ''
};

test('saveNotification: guarda y recupera', () => {
    db.saveNotification(notif);
    const ns = db.getNotifications();
    const s = ns.find(n => n.id === 'notif-001');
    if (!s) throw new Error('notif-001 no encontrada');
    expect(s.title).toBe('Test');
});

test('getNotifications: read es booleano', () => {
    const ns = db.getNotifications();
    const s = ns.find(n => n.id === 'notif-001');
    if (typeof s.read !== 'boolean') throw new Error(`read debe ser boolean, got: ${typeof s.read}`);
});

test('getNotifications: actions es array', () => {
    const ns = db.getNotifications();
    const s = ns.find(n => n.id === 'notif-001');
    if (!Array.isArray(s.actions)) throw new Error('actions debe ser array');
    expect(s.actions[0].label).toBe('Ver');
});

test('updateNotificationNotes: actualiza notas', () => {
    db.updateNotificationNotes('notif-001', 'Nota personal del usuario');
    const ns = db.getNotifications();
    const s = ns.find(n => n.id === 'notif-001');
    expect(s.notes).toBe('Nota personal del usuario');
});

test('deleteNotification: elimina notificación', () => {
    db.saveNotification({ id: 'notif-del', title: 'Del', message: 'x', type: 'info' });
    db.deleteNotification('notif-del');
    const ns = db.getNotifications();
    if (ns.find(n => n.id === 'notif-del')) throw new Error('Notificación no fue eliminada');
});

test('clearNotifications: elimina todas', () => {
    db.saveNotification({ id: 'nc-1', title: 'A', message: 'x', type: 'info' });
    db.saveNotification({ id: 'nc-2', title: 'B', message: 'x', type: 'info' });
    db.clearNotifications();
    const ns = db.getNotifications();
    if (ns.length !== 0) throw new Error(`Expected 0 notifications, got ${ns.length}`);
});

// ─────────────────────────────────────────────────────────────────
// Cleanup y Resultados
// ─────────────────────────────────────────────────────────────────
try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (e) {}

console.log('\n' + '═'.repeat(60));
console.log(`\n📊 RESULTADOS:\n`);
results.forEach(r => {
    const icon = r.status === 'PASS' ? '✅' : '❌';
    console.log(`  ${icon} ${r.name}`);
    if (r.error) console.log(`     ↳ ERROR: ${r.error}`);
});

console.log(`\n${'─'.repeat(60)}`);
console.log(`  Total: ${passed + failed} | ✅ Passed: ${passed} | ❌ Failed: ${failed}`);
console.log('─'.repeat(60) + '\n');

process.exit(failed > 0 ? 1 : 0);
