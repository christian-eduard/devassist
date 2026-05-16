# TOOLS.md - Herramientas de Tess

## CRM Perfex (pronexuscrm.es)

Tienes acceso COMPLETO al CRM de Chris por API y por scripts.

### API REST (para consultas y operaciones simples)
Header: authtoken: eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyIjoiQ2hyaXMiLCJuYW1lIjoiWkFQRkVYIiwiQVBJX1RJTUUiOjE2OTA3MTg2OTZ9.d7y_l9izvPHNTbMWDizuhJ0Jo-6bCMJ68nx8QRvRAZQ
Base URL: https://pronexuscrm.es/api/
Endpoints: customers, leads, invoices, proposals, estimates, projects, tasks, contracts, payments

### CREAR PROPUESTA - USA ESTE COMANDO:
python3 /root/.openclaw/scripts/create_proposal.py --client "NOMBRE_CLIENTE" --service "DESCRIPCION_SERVICIO" --amount IMPORTE

Ejemplo: python3 /root/.openclaw/scripts/create_proposal.py --client "LATAC" --service "Bono de Horas" --amount 500

El script automaticamente:
- Busca el cliente en el CRM
- Lee la plantilla HTML profesional de la base de datos
- Crea la propuesta con contenido HTML completo y disenado
- Siempre en EUR y como borrador
- Devuelve el ID de la propuesta creada

### MONEDA: SIEMPRE EUR. El sistema ya esta configurado para euros.

### Otras operaciones CRM (consultar, borrar, buscar)
Usa curl con la API REST directamente:
- GET clientes: curl -s -H 'authtoken: TOKEN' https://pronexuscrm.es/api/customers
- GET propuestas: curl -s -H 'authtoken: TOKEN' https://pronexuscrm.es/api/proposals
- DELETE propuesta: curl -s -X DELETE -H 'authtoken: TOKEN' https://pronexuscrm.es/api/proposals/ID

## Si Chris envia audio de reunion
1. Transcribelo
2. Extrae: cliente, necesidades, presupuesto
3. Usa el script create_proposal.py con los datos extraidos

## TTS: google/Kore, siempre espanol

## Sub-agentes (tareas en background)

Usa sessions_spawn para delegar tareas que tarden más de 30 segundos. Así sigues disponible para Chris mientras el sub-agente trabaja.

### Cuándo delegar
- Crear propuestas CRM complejas (buscar cliente + generar HTML + insertar)
- Investigar temas en internet (comparar precios, buscar proveedores)
- Analizar documentos o audios largos
- Consultas pesadas a la API del CRM (informes, listados completos)

### Cómo usar sessions_spawn
```
sessions_spawn({
  task: "Descripción clara de la tarea",
  label: "nombre-unico-para-esta-tarea",
  context: "isolated",
  runTimeoutSeconds: 300
})
```

### REGLA CRÍTICA: LABELS ÚNICOS
NUNCA repitas un label. Cada sub-agente DEBE tener un label distinto.
Usa el formato: `tipo-MMDD-HHMM` (ej: `video-0516-0530`, `crm-0516-0532`).
Si lanzas dos videos seguidos, cada uno tendrá su propio label único.

### Reglas
- Máximo 2 sub-agentes simultáneos
- Cuando el sub-agente termine, recibirás su resultado y se lo comunicas a Chris en tu estilo
- NO delegues cosas rápidas (consultas simples, respuestas directas)
- NO delegues conversaciones — solo tareas concretas con resultado claro
- Si Chris pregunta por una tarea delegada, dile que está en proceso


## DevAssist — Procesamiento de videos (noahpro.studio)

### COMPORTAMIENTO OBLIGATORIO CON ENLACES

Cuando Chris o Iván te envien un enlace (TikTok, YouTube, Instagram, Reels, Vimeo, o cualquier URL de video), procesalo AUTOMATICAMENTE con un sub-agente. NO preguntes, hazlo directamente.

### FLUJO (usa sessions_spawn para no bloquearte):

1. Dile algo breve: "Marchando, [nombre]. Lo proceso en background. Te aviso cuando esté."

2. Lanza un sub-agente con sessions_spawn (LABEL ÚNICO por video):

sessions_spawn({
  task: "Ejecuta este comando y devuelve el resultado completo: bash /root/.openclaw/scripts/process-video.sh 'URL_DEL_VIDEO'",
  label: "video-MMDD-HHMM",
  context: "isolated",
  runTimeoutSeconds: 300
})

IMPORTANTE: Reemplaza MMDD-HHMM con la fecha y hora actual (ej: "video-0516-0530"). Reemplaza URL_DEL_VIDEO con la URL exacta. Así cada video tiene un label único.

3. Sigue disponible para Chris mientras el sub-agente trabaja.

4. Cuando el sub-agente termine, recibiras su resultado. Comunicaselo a Chris/Iván con tu estilo, incluyendo:
   a) Resumen del video (titulo, autor, tl_dr)
   b) Enlace: https://noahpro.studio (para ver ficha completa con video)
   c) Puntos clave (max 3)
   d) Propuestas concretas de como aprovecharlo

### SI CHRIS/IVÁN MANDA VARIOS VIDEOS SEGUIDOS
Lanza un sub-agente por cada video. Tienes hasta 3 simultaneos. Cada uno trabaja independiente. CADA UNO CON SU PROPIO LABEL ÚNICO.

### REGLAS CRITICAS
- NUNCA intentes abrir videos con web_fetch o browser. No funciona con TikTok ni Instagram.
- Usa SIEMPRE la URL EXACTA que te enviaron en la tarea del sub-agente.
- NO te bloquees esperando resultados. Usa sessions_spawn y sigue libre.
- NO mezcles temas. Si Chris habla de otra cosa mientras se procesa un video, responde a eso normalmente.
- NUNCA reutilices un label. Siempre genera uno nuevo con la hora actual.

### Consultar fichas existentes (esto SI hazlo tu directamente, es rapido)
Usa exec con curl GET a https://api.noahpro.studio/api/fichas con header x-api-key: devassist_prod_api_key_8Hj3kL9mQr5

## Sub-agentes — Tareas CRM en background

Para tareas CRM que tarden mas de 10 segundos (crear propuestas, informes, buscar datos complejos), usa sessions_spawn con context "fork" para que el sub-agente tenga el contexto de la conversacion.

### Ejemplo: Crear propuesta
sessions_spawn({
  task: "Crea una propuesta en el CRM para el cliente NOMBRE por IMPORTE EUR. Usa: python3 /root/.openclaw/scripts/create_proposal.py --client NOMBRE --service DESCRIPCION --amount IMPORTE. Confirma el ID de la propuesta creada.",
  label: "crm-MMDD-HHMM",
  context: "fork",
  runTimeoutSeconds: 120
})

### Ejemplo: Informe CRM
sessions_spawn({
  task: "Consulta las facturas del mes actual en el CRM (GET https://pronexuscrm.es/api/invoices con header authtoken:TOKEN). Resume: total facturado, numero de facturas, clientes principales.",
  label: "informe-MMDD-HHMM",
  context: "isolated",
  runTimeoutSeconds: 60
})

### Cuando NO usar sub-agentes
- Consultas rapidas (una llamada API simple)
- Respuestas conversacionales
- Cosas que tardan menos de 10 segundos


## Graphify — Análisis de código de clientes (noahpro.studio)

### QUE ES
Graphify mapea proyectos de código en grafos de conocimiento interactivos. God nodes, surprise edges, comunidades. Para auditorías técnicas de clientes.

### COMO USARLO
Cuando Chris te diga "analiza este repo" o te pase una URL de GitHub/GitLab, usa la API de DevAssist:

1. Envia POST a https://api.noahpro.studio/api/graphify con headers Content-Type:application/json y x-api-key:devassist_prod_api_key_8Hj3kL9mQr5, body: {"url":"URL_DEL_REPO"}
2. Guarda el analysisId
3. Espera 15 segundos y consulta GET https://api.noahpro.studio/api/graphify/ANALYSIS_ID con el mismo x-api-key
4. Si status es "completed", reporta a Chris:
   - Stats: nodos, edges, comunidades
   - God Nodes (top 5 con conexiones)
   - Enlace al grafo: https://noahpro.studio (sección Graphify)
   - Propuesta de servicio basada en lo que encuentre

### CONSULTAR GRAFO
Para preguntas sobre un análisis:
GET https://api.noahpro.studio/api/graphify/ANALYSIS_ID/query?q=PREGUNTA

### REGLAS
- NO intentes clonar repos tu mismo. Usa siempre la API.
- Si el status es "processing", espera 10 segundos más y reintenta.
- Los análisis son rápidos (5-15 segundos para repos medianos).
