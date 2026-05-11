# DevAssist Desktop Legacy - Inventario funcional

Documento de referencia para migrar a web las funciones que existian en la app Electron antigua.

Ruta del legado:

```text
legacy/desktop-electron/app
```

## Resumen

La app de escritorio combinaba una UI React/Vite con una capa Electron que exponia capacidades locales mediante IPC. La version web deberia sustituir esa capa IPC por endpoints HTTP, workers backend, colas y almacenamiento centralizado.

Modulos principales de UI:

- `ProjectsModule`: inventario, escaneo y visualizacion de proyectos.
- `FichasModule`: knowledge vault de videos, transcripciones, analisis e investigacion.
- `AgentsModule`: gestion de agentes y chat TESS.
- `NotesModule`: notas simples.
- `AIHubModule`: configuracion de proveedores/modelos de IA.
- `TechRadarModule`: radar tecnologico.
- `SkillsModule`: sugerencias y gestion de skills.
- `LogsModule`: visor de logs del sistema.
- `SettingsModule`: configuracion general.
- `NotificationCenter` y `NotificationModal`: notificaciones internas.
- `TessChatWidget`: chat flotante con TESS.

## 1. Proyectos

Archivos legacy:

- `src/components/ProjectsModule/`
- `electron/ipc/projects.js`
- `electron/services/project_scanner.js`
- `electron/services/project_watcher.js`

Funciones existentes:

- Registrar proyectos por ruta local.
- Leer metadata rapida del proyecto: nombre, stack detectado, numero de archivos raiz y presencia de Git.
- Escaneo profundo con exclusiones (`node_modules`, `.git`, `dist`, `build`, caches, datos de BD).
- Conteo de archivos, lineas de codigo y lenguajes por extension.
- Generacion de arbol compatible con `react-arborist`.
- Generacion de grafo visual compatible con React Flow.
- Persistencia de proyectos en PostgreSQL/Nexus.
- Embeddings semanticos de proyectos para busqueda RAG.
- Monitorizacion de cambios en proyectos.
- Apertura del proyecto en Antigravity o Finder desde escritorio.

Equivalente web recomendado:

- API `GET/POST/PATCH/DELETE /api/projects`.
- Worker backend para escaneo.
- Subida/registro de repos por URL Git o ruta de servidor, no rutas arbitrarias del cliente.
- WebSocket/SSE para progreso de escaneo.
- Tabla `projects` con `file_tree`, `code_stats`, `flow_data`, `embedding`.

## 2. Fichas / Knowledge Vault

Archivos legacy:

- `src/components/FichasModule/`
- `electron/ipc/fichas.js`
- `electron/db_nexus.js`
- `server/src/routes/fichas.js`
- `server/src/workers/videoProcessor.js`
- `server/src/services/downloader.js`
- `server/src/services/transcriber.js`
- `server/src/services/analyzer.js`
- `server/src/services/embedder.js`

Funciones existentes:

- Crear, listar, guardar y eliminar fichas.
- Seleccionar/copiar videos locales en cache.
- Procesar URLs de TikTok/YouTube/Instagram con `yt-dlp`.
- Descargar video, extraer audio con `ffmpeg`, transcribir con Gemini y generar ficha estructurada.
- Detectar duplicados por URL.
- Generar resumen, key points, categoria, urgencia, obsolescencia, confianza, herramientas, tech stack y manual de uso.
- Enriquecer herramientas con busqueda web.
- Hacer matching entre contenido del video y proyectos existentes.
- Generar investigacion profunda.
- Crear embeddings para busqueda semantica.
- Registrar apertura de fichas.
- Watcher de carpeta para detectar nuevos videos.

Equivalente web recomendado:

- Mantener el pipeline en `server/`.
- Convertir procesos largos a jobs con cola real (`BullMQ` ya esta en dependencias del server).
- Endpoints:
  - `POST /api/fichas` para crear job desde URL.
  - `GET /api/fichas/jobs/:jobId` para progreso.
  - `GET /api/fichas` y `GET /api/fichas/:id`.
  - `DELETE /api/fichas/:id`.
  - `POST /api/fichas/:id/research`.
- Sustituir seleccion local de archivos por upload web seguro.

## 3. TESS / Agentes

Archivos legacy:

- `src/components/AgentsModule/`
- `src/components/TessChatWidget/`
- `electron/ipc/agents.js`
- `electron/db_nexus.js`

Funciones existentes:

- CRUD de agentes.
- Chat con agente principal TESS.
- Prompt base de personalidad y reglas de respuesta.
- Memoria de conversaciones por canal.
- Comandos especiales:
  - `/estado`
  - `/fichas`
  - `/buscar [termino]`
  - `/proyecto [nombre]`
  - `/recuerda [dato]`
  - `/olvida [tema]`
  - `/sincroniza`
  - `/ayuda`
- RAG sobre proyectos y fichas usando embeddings.
- Extraccion periodica del perfil del usuario desde memoria.
- Persistencia de memoria en `agent_memory`.

Equivalente web recomendado:

- API `POST /api/agents/chat`.
- API `GET/POST/PATCH/DELETE /api/agents`.
- API `GET/DELETE /api/agents/:id/memory`.
- Streaming de respuesta con SSE.
- Mantener memoria y RAG en backend, nunca en frontend.

## 4. AI Hub

Archivos legacy:

- `src/components/AIHubModule/`
- `electron/ipc/ai.js`
- `electron/services/gemini.js`
- `electron/ipc/config.js`

Funciones existentes:

- Cargar y guardar configuracion de Gemini.
- Probar Gemini, Groq, OpenRouter, OpenAI y HuggingFace.
- Obtener modelos de OpenRouter.
- Guardar proveedor activo.
- Asignar proveedores/modelos por funcion.
- Analisis de vision con imagen base64.
- Estadisticas de uso IA.
- Rotador/servicio central de Gemini para `complete` y embeddings.

Equivalente web recomendado:

- Mover configuracion sensible a backend.
- Guardar secretos cifrados o mediante proveedor de secrets.
- Endpoints administrativos protegidos:
  - `GET /api/ai/config`
  - `PATCH /api/ai/config`
  - `POST /api/ai/test`
  - `GET /api/ai/usage`

## 5. Notas

Archivos legacy:

- `src/components/NotesModule/`
- `electron/ipc/notes.js`

Funciones existentes:

- Listar notas.
- Crear/guardar nota.
- Eliminar nota.

Equivalente web recomendado:

- CRUD simple `GET/POST/PATCH/DELETE /api/notes`.

## 6. Notificaciones

Archivos legacy:

- `src/components/NotificationCenter.jsx`
- `src/components/NotificationModal.jsx`
- `electron/ipc/notifications.js`
- `electron/ipc/system.js`

Funciones existentes:

- Cargar y guardar notificaciones.
- Actualizar notas asociadas a una notificacion.
- Recibir eventos `system:notify`.
- Mostrar centro de notificaciones con leido/no leido.
- Modal para ampliar y anotar.

Equivalente web recomendado:

- Tabla `notifications`.
- API CRUD.
- WebSocket/SSE para eventos vivos.

## 7. Settings / Configuracion

Archivos legacy:

- `src/components/SettingsModule/`
- `electron/ipc/config.js`
- `electron/environment.js`

Funciones existentes:

- Cargar/guardar configuracion global.
- Configurar Gemini, credenciales, carpeta watch, dias de recordatorio y nombre de app externa.
- Comprobar instalacion de `yt-dlp`.
- Seleccionar archivo de credenciales Google.
- Ver y limpiar cache de videos.
- Cargar/guardar configuracion de OpenClaw.
- Abrir URLs externas.

Equivalente web recomendado:

- Separar configuracion publica y secreta.
- No exponer API keys al dashboard.
- Para credenciales, usar upload seguro o variables de entorno gestionadas.

## 8. Logs / Estado del sistema

Archivos legacy:

- `src/components/LogsModule/`
- `electron/ipc/logger.js`
- `electron/ipc/system.js`

Funciones existentes:

- Consultar logs.
- Estado periodico del sistema.
- Puente de logs desde Electron main al renderer.

Equivalente web recomendado:

- Endpoint `GET /api/system/status`.
- Endpoint `GET /api/logs` solo para administradores.
- Logs estructurados con `pino` en backend.

## 9. Vision

Archivos legacy:

- `electron/ipc/vision.js`

Funciones existentes:

- Captura de pantalla/escritorio desde Electron.
- Envio posterior a analisis visual de IA.

Equivalente web recomendado:

- Usar Web APIs (`getDisplayMedia`) con permiso explicito del navegador.
- Endpoint backend para analizar imagen capturada.

## 10. Google Workspace

Archivos legacy:

- `electron/ipc/google.js`

Funciones existentes:

- Arrancar autenticacion Google via MCP externo.
- Exportar ficha.
- Buscar huecos de calendario.
- Programar aprendizaje.
- Sincronizar calendario.

Equivalente web recomendado:

- OAuth web real.
- Backend con refresh tokens seguros.
- Endpoints por recurso: Docs, Calendar y Drive.

## 11. Tech Radar

Archivos legacy:

- `src/components/TechRadarModule/`
- `electron/ipc/radar.js`

Funciones existentes:

- Listar tecnologias detectadas.
- Actualizar estado de tecnologia.
- Lanzar escaneo manual.

Equivalente web recomendado:

- Tabla `tech_radar`.
- API `GET /api/radar`, `PATCH /api/radar/:id`, `POST /api/radar/scan`.

## 12. Skills

Archivos legacy:

- `src/components/SkillsModule/`
- `electron/ipc/skills.js`
- `electron/services/skill_intelligence.js`
- `legacy/desktop-electron/mejoras/`

Funciones existentes:

- Cargar skills.
- Obtener sugerencias.
- Lanzar escaneo de skills.
- Eliminar skill.
- Abrir carpeta local de skill.
- Generar sugerencia diaria.

Equivalente web recomendado:

- Sustituir apertura de carpetas por descargas o vista web.
- Guardar metadata en backend.
- Worker programado para sugerencias.

## 13. Browsing / OpenClaw / Ingestion Server

Archivos legacy:

- `electron/ipc/browsing.js`
- `electron/ipc/clawbot.js`
- `electron/ipc/server.js`
- `electron/daemon.js`

Funciones existentes:

- Comprobar estado de OpenClaw gateway.
- Reiniciar gateway.
- Servidor local `127.0.0.1:4242` para ingesta desde Clawbot.
- Procesar links entrantes desde canales externos.
- Consultar vault desde chat externo.
- Enviar progreso a Telegram/OpenClaw.

Equivalente web recomendado:

- Integraciones externas como webhooks autenticados en `server/`.
- Token obligatorio por entorno, sin defaults.
- Jobs de ingesta con progreso persistido.

## 14. Sistema de datos

Archivos legacy:

- `electron/db.js`
- `electron/db_nexus.js`
- `electron/schema.js`
- `migrations/fase_a.sql`
- `docker-compose.yml`

Funciones existentes:

- PostgreSQL/Nexus con tablas para fichas, proyectos, settings, notifications, notes, agents, memory, skills y usage.
- Extension `vector` para embeddings.
- Migraciones in-place desde Electron.
- Docker local para PostgreSQL.

Equivalente web recomendado:

- Mover schema/migraciones a `server/`.
- Usar migraciones versionadas.
- Evitar crear/alterar tablas desde runtime normal.

## Riesgos heredados a corregir antes de migrar

- Secretos hardcodeados en scripts y frontend antiguo.
- IPC con lectura/escritura arbitraria de archivos.
- Comandos shell con `exec` e interpolacion de inputs.
- Tokens por defecto.
- Passwords de base de datos por defecto.
- Tests rotos en la app antigua.
- Dependencias vulnerables en la app Electron.

## Roadmap de paridad web

1. Base segura: auth real, secrets fuera del frontend, variables de entorno obligatorias.
2. Fichas web: completar UI del dashboard contra `server/`.
3. Jobs: mover pipeline de video a cola y mostrar progreso.
4. Proyectos: API + escaneo backend + vista de arbol/grafo.
5. TESS: chat web con memoria y RAG.
6. AI Hub: configuracion protegida de proveedores.
7. Notas, notificaciones, logs y radar.
8. Integraciones externas: Google, OpenClaw/webhooks y skills.
