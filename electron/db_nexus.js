const { drizzle } = require('drizzle-orm/node-postgres');
const { Pool } = require('pg');
const { eq, desc, and } = require('drizzle-orm');
const schema = require('./schema');
const logger = require('./ipc/logger');
const environment = require('./environment');
const { fichas, projects, settings, notifications, notes, agents, agentMemory, skills, aiUsage } = schema;

const pool = new Pool(environment.getDbConfig());

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

      -- Skills table
      CREATE TABLE IF NOT EXISTS skills (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        author TEXT,
        version TEXT,
        downloads INTEGER DEFAULT 0,
        stars INTEGER DEFAULT 0,
        full_report TEXT,
        is_suggested INTEGER DEFAULT 0,
        suggested_at TIMESTAMPTZ,
        installed INTEGER DEFAULT 0,
        local_path TEXT,
        remote_url TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- AI Usage table (V8)
      CREATE TABLE IF NOT EXISTS ai_usage (
        id SERIAL PRIMARY KEY,
        provider TEXT NOT NULL,
        model TEXT,
        tokens INTEGER DEFAULT 0,
        cost_saved DOUBLE PRECISION DEFAULT 0.0,
        timestamp TIMESTAMPTZ DEFAULT NOW()
      );

      -- Aplicar migraciones a la tabla projects si es necesario
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS full_context JSONB DEFAULT '{}';
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS file_tree JSONB DEFAULT '{}';
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS mermaid_structure TEXT;
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS code_stats JSONB DEFAULT '{}';
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS last_opened TIMESTAMPTZ;
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS monitoring INTEGER DEFAULT 0;
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_embedding vector(1536);
    `);

    // Seed TESS si no hay ningún agente creado
    const existing = await client.query('SELECT id FROM agents WHERE id = $1', ['main']);
    if (existing.rows.length === 0) {
      await client.query(`
        INSERT INTO agents (id, name, type, model, system_prompt, is_main)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        'main', 'TESS', 'personal', 'gemini-1.5-flash',
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

async function getFichaById(id) {
  const rows = await db.select().from(fichas).where(eq(fichas.id, id));
  if (rows.length === 0) return null;
  const r = rows[0];
  const meta = r.metadata || {};
  const f = {
    ...meta, ...r,
    id: r.id, title: r.title, titulo: r.title,
    transcripcion: r.transcripcion || meta.transcripcion || '',
    url_original: r.urlOriginal,
    data: JSON.stringify({...meta, ...r})
  };
  return f;
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
    createdAt: f.createdAt ? new Date(f.createdAt) : new Date(),
    // Phase A columns
    tlDr: f.tlDr || metadata.tl_dr || metadata.resumen,
    keyPoints: f.keyPoints || metadata.key_points || metadata.conceptos_clave || [],
    verbatimQuotes: f.verbatimQuotes || metadata.verbatim_quotes || [],
    implementationSteps: f.implementationSteps || metadata.implementation_steps || [],
    comparisonMatrix: f.comparisonMatrix || metadata.comparison_matrix || {},
    obsolescenceScore: f.obsolescenceScore !== undefined ? f.obsolescenceScore : (metadata.obsolescence_score || 5),
    confidenceScore: f.confidenceScore !== undefined ? f.confidenceScore : (metadata.confidence_score || 0.0),
    researchStatus: f.researchStatus || metadata.research_status || 'pending',
    nextResearchAt: f.nextResearchAt ? new Date(f.nextResearchAt) : null,
    researchLog: f.researchLog || metadata.research_log || [],
    urgency: f.urgency !== undefined ? f.urgency : (metadata.urgency || metadata.prioridad || 3),
    techStack: f.techStack || metadata.tech_stack || (metadata.herramientas ? metadata.herramientas.map(h => h.nombre) : []),
    contentType: f.contentType || metadata.content_type || metadata.categoria || 'concept',
    gdocId: f.gdocId || metadata.gdoc_id || null,
    collaborators: f.collaborators || metadata.collaborators || [],
    modelResponses: f.modelResponses || metadata.model_responses || {},
    divergences: f.divergences || metadata.divergences || [],
    sourceChannel: f.sourceChannel || metadata.source_channel || null,
    processedAt: f.processedAt ? new Date(f.processedAt) : (metadata.processed_at ? new Date(metadata.processed_at) : null)
  }).onConflictDoUpdate({
    target: fichas.id,
    set: { 
        title: f.title || f.titulo || 'Sin título',
        transcripcion: f.transcripcion,
        videoPath: f.videoPath || f.video_path || metadata.videoPath || metadata.video_path,
        videoName: f.videoName || f.video_name || metadata.videoName || metadata.video_name,
        metadata: metadata,
        // Phase A columns to update
        tlDr: f.tlDr || metadata.tl_dr || metadata.resumen,
        keyPoints: f.keyPoints || metadata.key_points || metadata.conceptos_clave || [],
        verbatimQuotes: f.verbatimQuotes || metadata.verbatim_quotes || [],
        implementationSteps: f.implementationSteps || metadata.implementation_steps || [],
        comparisonMatrix: f.comparisonMatrix || metadata.comparison_matrix || {},
        obsolescenceScore: f.obsolescenceScore !== undefined ? f.obsolescenceScore : (metadata.obsolescence_score || 5),
        confidenceScore: f.confidenceScore !== undefined ? f.confidenceScore : (metadata.confidence_score || 0.0),
        researchStatus: f.researchStatus || metadata.research_status || 'pending',
        nextResearchAt: f.nextResearchAt ? new Date(f.nextResearchAt) : null,
        researchLog: f.researchLog || metadata.research_log || [],
        urgency: f.urgency !== undefined ? f.urgency : (metadata.urgency || metadata.prioridad || 3),
        techStack: f.techStack || metadata.tech_stack || (metadata.herramientas ? metadata.herramientas.map(h => h.nombre) : []),
        contentType: f.contentType || metadata.content_type || metadata.categoria || 'concept',
        gdocId: f.gdocId || metadata.gdoc_id || null,
        collaborators: f.collaborators || metadata.collaborators || [],
        modelResponses: f.modelResponses || metadata.model_responses || {},
        divergences: f.divergences || metadata.divergences || [],
        sourceChannel: f.sourceChannel || metadata.source_channel || null,
        processedAt: f.processedAt ? new Date(f.processedAt) : (metadata.processed_at ? new Date(metadata.processed_at) : null)
    }
  });
}

async function updateFicha(id, data) {
    await db.update(fichas).set(data).where(eq(fichas.id, id));
}

async function deleteFicha(id) {
    await db.delete(fichas).where(eq(fichas.id, id));
}

// --- PROJECTS ---
async function getProjects() {
    return await db.select().from(projects).orderBy(desc(projects.updatedAt));
}

async function saveProject(p) {
    const id = (p.id || `p_${Date.now()}`).toString();
    
    // Obtención de datos previos para fusión segura (Fase 32)
    let existing = null;
    try {
        const rows = await db.select().from(projects).where(eq(projects.id, id));
        if (rows.length > 0) existing = rows[0];
    } catch (e) {
        logger.warn(`[DB:SaveProject] Verificación previa fallida para ${id}`);
    }

    const projectName = p.name || (existing ? existing.name : 'Sin nombre');
    const projectPath = p.path || (existing ? existing.path : '');

    const projectData = {
        id: id,
        name: projectName,
        path: projectPath,
        description: p.description || (existing ? existing.description : ''),
        stack: p.stack || (existing ? existing.stack : []),
        lastOpened: p.lastOpened ? new Date(p.lastOpened) : (existing ? existing.lastOpened : null),
        monitoring: p.monitoring !== undefined ? (p.monitoring ? 1 : 0) : (existing ? existing.monitoring : 0),
        fullContext: p.fullContext || p.full_context || (existing ? existing.fullContext : {}),
        fileTree: p.fileTree || p.file_tree || (existing ? existing.fileTree : {}),
        mermaidStructure: p.mermaidStructure || p.mermaid_structure || (existing ? existing.mermaidStructure : null),
        codeStats: p.codeStats || p.code_stats || (existing ? existing.codeStats : {}),
        projectEmbedding: p.projectEmbedding || (existing ? existing.projectEmbedding : null),
        updatedAt: new Date()
    };

    await db.insert(projects).values(projectData).onConflictDoUpdate({
        target: projects.id,
        set: {
            name: projectData.name,
            path: projectData.path,
            description: projectData.description,
            stack: projectData.stack,
            lastOpened: projectData.lastOpened,
            monitoring: projectData.monitoring,
            fullContext: projectData.fullContext,
            fileTree: projectData.fileTree,
            mermaidStructure: projectData.mermaidStructure,
            codeStats: projectData.codeStats,
            projectEmbedding: projectData.projectEmbedding,
            updatedAt: projectData.updatedAt
        }
    });
    logger.info(`[NEXUS] Proyecto '${projectName}' persistido exitosamente (ID: ${id})`);
}

async function searchProjects(queryEmbedding, limit = 5) {
    if (!queryEmbedding || !Array.isArray(queryEmbedding)) return [];
    
    const { sql } = require('drizzle-orm');
    const formattedVector = `[${queryEmbedding.join(',')}]`;
    
    const rows = await db.select()
        .from(projects)
        .orderBy(sql`${projects.projectEmbedding} <=> ${formattedVector}::vector`)
        .limit(limit);
    
    return rows;
}

async function deleteProject(id) {
    // 1. Eliminar fichas asociadas en el Vault (f_proj_ID)
    const { sql } = require('drizzle-orm');
    await db.delete(fichas).where(sql`id LIKE ${'f_proj_' + id + '%'}`);
    
    // 2. Eliminar el proyecto
    await db.delete(projects).where(eq(projects.id, id));
}

async function getProjectById(id) {
    if (!id) return null;
    const stringId = id.toString();
    try {
        // Intento 1: Drizzle ORM (Tipo Seguro)
        const rows = await db.select().from(projects).where(eq(projects.id, stringId));
        if (rows.length > 0) return rows[0];

        // Intento 2: SQL Nativo Fallback (Si Drizzleeq falla por casting)
        logger.info(`[DB:GetProjectById] Reintentando búsqueda con SQL nativo para: ${stringId}`);
        const { sql } = require('drizzle-orm');
        const rawRows = await db.execute(sql`SELECT * FROM projects WHERE id = ${stringId}`);
        if (rawRows.rows && rawRows.rows.length > 0) {
            const r = rawRows.rows[0];
            return {
                id: r.id,
                name: r.name,
                path: r.path,
                description: r.description,
                stack: r.stack,
                fullContext: r.full_context,
                fileTree: r.file_tree,
                mermaidStructure: r.mermaid_structure,
                codeStats: r.code_stats,
                updatedAt: r.updated_at
            };
        }

        // Proyecto no encontrado por ningún método
        logger.warn(`[DB:GetProjectById] ID ${stringId} no encontrado en la base de datos.`);
        return null;
    } catch (err) {
        logger.error(`[DB:GetProjectById] Error crítico consultando ID ${id}: ${err.message}`);
        throw err;
    }
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

async function searchVault(queryEmbedding, limit = 3) {
    if (!queryEmbedding || !Array.isArray(queryEmbedding) || queryEmbedding.length === 0) {
        throw new Error('Vector embedding inválido provisto a searchVault');
    }
    const { sql } = require('drizzle-orm');
    const formattedVector = `[${queryEmbedding.join(',')}]`;
    const rows = await db.select()
        .from(fichas)
        .orderBy(sql`${fichas.embedding} <=> ${formattedVector}::vector`)
        .limit(limit);
    
    return rows.map(r => {
        const meta = r.metadata || {};
        return {
            id: r.id,
            filename: r.filename,
            path: r.path,
            transcripcion: r.transcripcion || '',
            investigacion_profunda: r.investigacion_profunda || '',
            ...meta
        };
    });
}

// --- SKILLS CRUD ---
async function getSkills() {
  return await db.select().from(skills).orderBy(desc(skills.createdAt));
}

async function getSuggestedSkills() {
  return await db.select().from(skills).where(eq(skills.isSuggested, 1)).orderBy(desc(skills.suggestedAt));
}

async function saveSkill(s) {
  const id = s.id; // slug or unique id
  await db.insert(skills).values({
    ...s,
    updatedAt: new Date()
  }).onConflictDoUpdate({
    target: skills.id,
    set: {
      ...s,
      updatedAt: new Date()
    }
  });
  return id;
}

async function deleteSkill(id) {
  await db.delete(skills).where(eq(skills.id, id));
}

// --- AI USAGE (V8) ---
async function saveAIUsage(data) {
  await db.insert(aiUsage).values({
    provider: data.provider,
    model: data.model,
    tokens: data.tokens || 0,
    costSaved: data.costSaved || 0.0,
    timestamp: new Date()
  });
}

async function getAIUsageStats() {
  const { sql } = require('drizzle-orm');
  const rows = await db.select({
    total_tokens: sql`SUM(tokens)`,
    total_savings: sql`SUM(cost_saved)`
  }).from(aiUsage);
  
  return {
    tokens: rows[0]?.total_tokens || 0,
    savings: rows[0]?.total_savings || 0
  };
}

module.exports = { 
  initNexus, pool, db,
  getSettings, saveSetting,
  getFichas, saveFicha, updateFicha, deleteFicha, getFichaById,
  getProjects, getProjectById, saveProject, deleteProject,
  getNotifications, saveNotification,
  getNotes, saveNote,
  getAgents, getAgent, saveAgent, deleteAgent,
  getAgentMemory, saveAgentMemory, clearAgentMemory,
  getSkills, getSuggestedSkills, saveSkill, deleteSkill,
  searchVault, searchProjects,
  saveAIUsage, getAIUsageStats
};
