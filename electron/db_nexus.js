const { drizzle } = require('drizzle-orm/node-postgres');
const { Pool } = require('pg');
const { eq, desc, and } = require('drizzle-orm');
const schema = require('./schema');
const logger = require('./ipc/logger');
const { fichas, projects, settings, notifications, notes, agents, agentMemory } = schema;

const pool = new Pool({
  host: 'localhost',
  port: 54325,
  user: 'devassist_admin',
  password: 'devassist_secure_pass',
  database: 'devassist_vault',
  max: 15,
  idleTimeoutMillis: 30000,
});

const db = drizzle(pool, { schema });

async function initNexus() {
  try {
    const client = await pool.connect();
    logger.info('[NEXUS] Motor PostgreSQL 15.0 inicializado con éxito.');
    await client.query('CREATE EXTENSION IF NOT EXISTS vector;');

    // Crear tablas de agentes si no existen (migration in-place)
    await client.query(`
      CREATE TABLE IF NOT EXISTS agents (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL DEFAULT 'TESS',
        type TEXT DEFAULT 'personal',
        model TEXT DEFAULT 'gemini-1.5-flash',
        system_prompt TEXT,
        channels JSONB DEFAULT '{"telegram":true,"whatsapp":true,"local":true}',
        is_main INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS agent_memory (
        id SERIAL PRIMARY KEY,
        agent_id TEXT NOT NULL DEFAULT 'main',
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        channel TEXT DEFAULT 'local',
        metadata JSONB DEFAULT '{}',
        timestamp TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_agent_memory_agent_id ON agent_memory(agent_id);
      CREATE INDEX IF NOT EXISTS idx_agent_memory_timestamp ON agent_memory(timestamp DESC);
    `);

    // Seed TESS si no hay ningún agente creado
    const existing = await client.query('SELECT id FROM agents WHERE id = $1', ['main']);
    if (existing.rows.length === 0) {
      await client.query(`
        INSERT INTO agents (id, name, type, model, system_prompt, is_main)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        'main', 'TESS', 'personal', 'gemini-2.5-flash',
        `Eres TESS (Tactical Executive Support System), la agente principal de DevAssist. Tu tono combina elegancia ejecutiva con intimidad directa. Hablas en español, eres directa, sofisticada y tienes un humor sutil e inteligente. Nunca preguntas "¿qué hacemos ahora?". Presentas opciones concretas. Proteges la atención del usuario filtrando lo que no es Top 3 de prioridades.`,
        1
      ]);
      logger.info('[NEXUS] Agente TESS inicializado por defecto.');
    }

    client.release();
    return true;
  } catch (err) {
    logger.error('[NEXUS] Fallo crítico de conexión:', err.message);
    return false;
  }
}

// --- SETTINGS (Async) ---
async function getSettings() {
  const rows = await db.select().from(settings);
  const result = {};
  rows.forEach(r => { result[r.key] = r.value; });
  return result;
}

async function saveSetting(key, value) {
  await db.insert(settings).values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } });
}

// --- FICHAS (Async + Semantic Ready) ---
async function getFichas() {
  const rows = await db.select().from(fichas).orderBy(desc(fichas.createdAt));
  return rows.map(r => {
    const meta = r.metadata || {};
    const flatData = {
      ...meta,
      ...r,
      id: r.id,
      title: r.title,
      titulo: r.title, // Alias legacy
      transcripcion: r.transcripcion || meta.transcripcion || '',
      url_original: r.urlOriginal, // Aliases
      concepto: meta.resumen || meta.concepto || '',
      aplicaciones_proyectos: meta.aplicaciones_proyectos || meta.sugerenciasProyectos || [],
      investigacion_profunda: meta.investigacion_profunda || meta.investigacionProfunda || '',
      urlOriginal: r.urlOriginal,
      video_path: r.videoPath || meta.videoPath || meta.video_path,
      videoPath: r.videoPath || meta.videoPath || meta.video_path,
      video_name: r.videoName || meta.videoName || meta.video_name,
      videoName: r.videoName || meta.videoName || meta.video_name,
      timestamp: r.createdAt ? r.createdAt.getTime() : Date.now(),
      created_at: r.createdAt,
      tags: meta.tags || r.tags || [],
    };
    
    return {
      ...flatData,
      details: JSON.stringify(flatData),
      data: JSON.stringify(flatData), // Para que el frontend pueda hacer JSON.parse(ficha.data)
    };
  });
}

async function saveFicha(f) {
  const id = f.id || `f_${Date.now()}`;
  const metadata = f.data || f.details || f;
  await db.insert(fichas).values({
    id,
    title: f.title || f.titulo || 'Sin título',
    urlOriginal: f.urlOriginal || f.url_original,
    transcripcion: f.transcripcion,
    manualUso: f.manualUso || f.manual_uso,
    videoPath: f.videoPath || f.video_path || metadata.videoPath || metadata.video_path,
    videoName: f.videoName || f.video_name || metadata.videoName || metadata.video_name,
    metadata: metadata,
    embedding: f.embedding || null,
    createdAt: f.createdAt ? new Date(f.createdAt) : new Date()
  }).onConflictDoUpdate({
    target: fichas.id,
    set: { 
        title: f.title || f.titulo || 'Sin título',
        transcripcion: f.transcripcion,
        videoPath: f.videoPath || f.video_path || metadata.videoPath || metadata.video_path,
        videoName: f.videoName || f.video_name || metadata.videoName || metadata.video_name,
        metadata: metadata
    }
  });
}

async function deleteFicha(id) {
    await db.delete(fichas).where(eq(fichas.id, id));
}

// --- PROJECTS ---
async function getProjects() {
    return await db.select().from(projects).orderBy(desc(projects.updatedAt));
}

async function saveProject(p) {
    const id = p.id || `p_${Date.now()}`;
    await db.insert(projects).values({
        id: id,
        name: p.name,
        description: p.description,
        stack: p.stack || [],
        updatedAt: new Date()
    }).onConflictDoUpdate({
        target: projects.id,
        set: { name: p.name, description: p.description, stack: p.stack || [], updatedAt: new Date() }
    });
}

// --- NOTIFICATIONS & NOTES ---
async function getNotifications() {
    return await db.select().from(notifications).orderBy(desc(notifications.timestamp));
}

async function saveNotification(n) {
    await db.insert(notifications).values({
        id: n.id,
        title: n.title,
        message: n.message,
        type: n.type || 'info',
        timestamp: new Date(),
        read: n.read ? 1 : 0,
        actions: n.actions || [],
        notes: n.notes || ''
    }).onConflictDoUpdate({ target: notifications.id, set: { read: n.read ? 1 : 0 } });
}

async function getNotes() {
    return await db.select().from(notes).orderBy(desc(notes.timestamp));
}

async function saveNote(n) {
    const id = n.id || `n_${Date.now()}`;
    await db.insert(notes).values({
        id,
        title: n.title,
        content: n.content,
        tags: n.tags || '',
        timestamp: new Date()
    }).onConflictDoUpdate({ target: notes.id, set: { content: n.content, timestamp: new Date() } });
}

// --- AGENTS ---
async function getAgents() {
  return await db.select().from(agents).orderBy(agents.createdAt);
}

async function getAgent(id = 'main') {
  const rows = await db.select().from(agents).where(eq(agents.id, id));
  return rows[0] || null;
}

async function saveAgent(a) {
  const id = a.id || `agent_${Date.now()}`;
  await db.insert(agents).values({
    id,
    name: a.name || 'TESS',
    emoji: a.emoji || '\u{1F916}',
    type: a.type || 'personal',
    model: a.model || 'gemini-2.0-flash',
    systemPrompt: a.systemPrompt || a.system_prompt,
    channels: a.channels || { telegram: true, whatsapp: true, local: true },
    isMain: a.isMain || a.is_main || 0,
    createdAt: new Date()
  }).onConflictDoUpdate({
    target: agents.id,
    set: {
      name: a.name,
      emoji: a.emoji,
      type: a.type,
      model: a.model,
      systemPrompt: a.systemPrompt || a.system_prompt,
      channels: a.channels,
      isMain: a.isMain || a.is_main || 0,
    }
  });
  return id;
}

async function deleteAgent(id) {
  if (id === 'main') throw new Error('No se puede eliminar el agente principal.');
  await db.delete(agents).where(eq(agents.id, id));
}

// --- AGENT MEMORY ---
async function getAgentMemory(agentId = 'main', limit = 50) {
  return await db.select()
    .from(agentMemory)
    .where(eq(agentMemory.agentId, agentId))
    .orderBy(desc(agentMemory.timestamp))
    .limit(limit)
    .then(rows => rows.reverse()); // Cronológico para el prompt
}

async function saveAgentMemory({ agentId = 'main', role, content, channel = 'local', metadata = {} }) {
  await db.insert(agentMemory).values({
    agentId,
    role,
    content,
    channel,
    metadata,
    timestamp: new Date()
  });
}

async function clearAgentMemory(agentId = 'main') {
  await db.delete(agentMemory).where(eq(agentMemory.agentId, agentId));
}

module.exports = { 
  initNexus, pool, db,
  getSettings, saveSetting,
  getFichas, saveFicha, deleteFicha,
  getProjects, saveProject,
  getNotifications, saveNotification,
  getNotes, saveNote,
  getAgents, getAgent, saveAgent, deleteAgent,
  getAgentMemory, saveAgentMemory, clearAgentMemory
};
