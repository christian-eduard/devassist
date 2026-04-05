const { pgTable, text, timestamp, jsonb, integer, serial } = require('drizzle-orm/pg-core');
const { customType } = require('drizzle-orm/pg-core');

// Definición de tipo Vector para pgvector
const vector = customType({
  dataType() { return 'vector(1536)'; } // OpenAI/Gemini Embeddings Standard
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
});

// Proyectos (Matching Inteligente)
const projects = pgTable('projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  path: text('path'),
  description: text('description'),
  stack: jsonb('stack').default([]),
  projectEmbedding: vector('project_embedding'),
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

module.exports = { fichas, projects, settings, notifications, notes, agents, agentMemory };
