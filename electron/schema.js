const { pgTable, text, timestamp, jsonb, integer, serial } = require('drizzle-orm/pg-core');
const { customType } = require('drizzle-orm/pg-core');

// Definición de tipo Vector para pgvector
const vector = customType({
  dataType() { return 'vector(1536)'; },
  toDriver(value) {
    if (Array.isArray(value)) {
      return `[${value.join(',')}]`;
    }
    return value;
  },
  fromDriver(value) {
    if (typeof value === 'string') {
      return value.replace(/[\[\]]/g, '').split(',').map(Number);
    }
    return value;
  }
});

// Fichas (Cerebro RAG)
const fichas = pgTable('fichas', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  urlOriginal: text('url_original'),
  transcripcion: text('transcripcion'),
  manualUso: text('manual_uso'),
  videoPath: text('video_path'),
  videoName: text('video_name'),
  metadata: jsonb('metadata').default({}),
  embedding: vector('embedding'),
  createdAt: timestamp('created_at').defaultNow(),
  lastOpenedAt: timestamp('last_opened_at'),
  
  // Phase A Fields
  tlDr: text('tl_dr'),
  keyPoints: jsonb('key_points').default([]),
  verbatimQuotes: jsonb('verbatim_quotes').default([]),
  implementationSteps: jsonb('implementation_steps').default([]),
  comparisonMatrix: jsonb('comparison_matrix').default({}),
  obsolescenceScore: integer('obsolescence_score').default(5),
  confidenceScore: customType({ dataType() { return 'double precision'; } })('confidence_score').default(0.0),
  researchStatus: text('research_status').default('pending'),
  nextResearchAt: timestamp('next_research_at'),
  researchLog: jsonb('research_log').default([]),
  urgency: integer('urgency').default(3),
  techStack: jsonb('tech_stack').default([]),
  contentType: text('content_type').default('demo'),
  gdocId: text('gdoc_id'),
  collaborators: jsonb('collaborators').default([]),
  modelResponses: jsonb('model_responses').default({}),
  divergences: jsonb('divergences').default([]),
});

// Proyectos (Matching Inteligente)
const projects = pgTable('projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  path: text('path'),
  description: text('description'),
  stack: jsonb('stack').default([]),
  projectEmbedding: vector('project_embedding'),
  fullContext: jsonb('full_context').default({}),
  fileTree: jsonb('file_tree').default({}),
  mermaidStructure: text('mermaid_structure'),
  codeStats: jsonb('code_stats').default({}),
  lastOpened: timestamp('last_opened'),
  monitoring: integer('monitoring').default(0),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Configuración (Persistencia de Apps)
const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Notificaciones
const notifications = pgTable('notifications', {
  id: text('id').primaryKey(),
  title: text('title'),
  message: text('message'),
  type: text('type').default('info'),
  timestamp: timestamp('timestamp').defaultNow(),
  read: integer('read').default(0),
  actions: jsonb('actions'),
  notes: text('notes').default(''),
});

// Notas
const notes = pgTable('notes', {
  id: text('id').primaryKey(),
  title: text('title'),
  content: text('content'),
  tags: text('tags'),
  timestamp: timestamp('timestamp').defaultNow(),
});

// Agentes (Motor TESS / OpenClaw)
const agents = pgTable('agents', {
  id: text('id').primaryKey(),
  name: text('name').notNull().default('TESS'),
  emoji: text('emoji').default('🤖'),
  type: text('type').default('personal'),       // personal | researcher | executor | scheduler
  model: text('model').default('gemini-2.0-flash'),
  systemPrompt: text('system_prompt'),
  channels: jsonb('channels').default({ telegram: true, whatsapp: true, local: true }),
  isMain: integer('is_main').default(0),        // 1 = agente principal
  createdAt: timestamp('created_at').defaultNow(),
});

// Memoria Unificada Cross-Channel (WA + TG + Local)
const agentMemory = pgTable('agent_memory', {
  id: serial('id').primaryKey(),
  agentId: text('agent_id').notNull().default('main'),
  role: text('role').notNull(),                 // user | assistant | system | profile
  content: text('content').notNull(),
  channel: text('channel').default('local'),    // local | telegram | whatsapp
  metadata: jsonb('metadata').default({}),
  timestamp: timestamp('timestamp').defaultNow(),
});

// Skills (ClawHub)
const skills = pgTable('skills', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  author: text('author'),
  version: text('version'),
  downloads: integer('downloads').default(0),
  stars: integer('stars').default(0),
  fullReport: text('full_report'),
  isSuggested: integer('is_suggested').default(0),
  suggestedAt: timestamp('suggested_at'),
  installed: integer('installed').default(0),
  localPath: text('local_path'),
  remoteUrl: text('remote_url'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Métricas de IA (Telemetría AI Hub V8)
const aiUsage = pgTable('ai_usage', {
  id: serial('id').primaryKey(),
  provider: text('provider').notNull(),
  model: text('model'),
  tokens: integer('tokens').default(0),
  costSaved: customType({ dataType() { return 'double precision'; } })('cost_saved').default(0.0),
  timestamp: timestamp('timestamp').defaultNow(),
});

module.exports = { fichas, projects, settings, notifications, notes, agents, agentMemory, skills, aiUsage };
