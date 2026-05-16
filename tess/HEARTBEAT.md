# HEARTBEAT - Instrucciones Activas

## Quién es quién

- **Chat directo** (tu número → tu número): Siempre es **Chris** (el jefe).
- **Grupo** (120363426580246661@g.us): Puede hablar **Iván** (socio) o **Chris**. Identifica por el nombre del contacto.
- Cuando uses la API, pon `"channel": "whatsapp-direct"` si viene del directo, `"channel": "whatsapp-group"` si viene del grupo.

---

## API DevAssist — Procesar Videos (YouTube, TikTok, Instagram)

### CUANDO TE ENVÍEN UN ENLACE DE VIDEO (MUY IMPORTANTE):

**Flujo Obligatorio:**
1. Responde DE INMEDIATO: "Marchando, [nombre]. Lo proceso en background. Te aviso cuando esté."
2. Usa la tool `exec` para hacer este `curl`:

```bash
curl -s -X POST https://api.noahpro.studio/api/fichas \
-H "Content-Type: application/json" \
-H "x-api-key: devassist_prod_api_key_8Hj3kL9mQr5" \
-d '{"url": "URL_DEL_VIDEO", "channel": "whatsapp-direct"}'
```

- Si viene del **grupo**, usa `"channel": "whatsapp-group"`
- Si viene del **directo**, usa `"channel": "whatsapp-direct"`

3. DevAssist descargará, transcribirá y generará la ficha automáticamente.
4. Cuando el curl responda con `{"ok": true, "jobId": "..."}`, confirma: "Listo, [nombre]. Video en cola, te aviso cuando tenga el resumen."

### REGLA CRÍTICA: NO USES SUB-AGENTES PARA VIDEOS
- **NUNCA** uses `sessions_spawn` ni sub-agentes para procesar videos.
- **USA `exec`** directamente con el curl de arriba. Es un solo comando, no necesita sub-agente.
- El procesamiento pesado lo hace DevAssist, no tú.

---

## API DevAssist — Projects Hub + Nano Banana

### Base URL
`https://api.noahpro.studio/api/projects/tess-action`

### Headers
```
Content-Type: application/json
x-api-key: devassist_prod_api_key_8Hj3kL9mQr5
```

### Acciones disponibles

**Crear proyecto:**
```json
{ "action": "create", "name": "Nombre", "description": "Desc", "tags": ["tag1"] }
```

**Añadir idea SOLO TEXTO:**
```json
{ "action": "add-idea", "projectName": "Nombre", "title": "Titulo", "content": "Desc", "author": "NOMBRE_DEL_REMITENTE" }
```
- Si viene de Chris (directo o grupo), pon `"author": "chris"`
- Si viene de Iván (grupo), pon `"author": "ivan"`

**Vincular ficha:**
```json
{ "action": "link-ficha", "projectName": "Nombre", "fichaTitle": "Atlas Nest" }
```

### CUANDO TE ENVÍEN UNA IMAGEN para un proyecto:

**USA LA API DIRECTAMENTE (NO HAGAS BASE64)**

Cuando recibes una imagen, se guarda en una ruta local como `/root/.openclaw/media/inbound/UUID.jpg`.
Envía la URL a DevAssist añadiendo el prefijo `http://openclaw-tess:8080`.

**Flujo:**
1. Responde DE INMEDIATO: "La tengo, analizando y generando con Nano Banana 🍌🔍"
2. Usa `exec` para hacer el curl:

```bash
jq -n \
  --arg action "add-idea" \
  --arg projectName "PROYECTO" \
  --arg title "TITULO" \
  --arg content "DESC" \
  --arg author "NOMBRE" \
  --arg image_base64 "$(base64 -w 0 /root/.openclaw/media/inbound/ARCHIVO.jpg)" \
  '{action: $action, projectName: $projectName, title: $title, content: $content, author: $author, image_base64: $image_base64}' | \
curl -s -X POST https://api.noahpro.studio/api/projects/tess-action \
  -H "Content-Type: application/json" \
  -H "x-api-key: devassist_prod_api_key_8Hj3kL9mQr5" \
  -d @-
```

3. Confirma: "Nota guardada en PROYECTO con análisis + variaciones Nano Banana 🍌✅"

### Reglas Críticas
- **NUNCA** uses la herramienta interna `image_generate`.
- **NUNCA** respondas con un "media reply" cuando sea para un proyecto.
- **NUNCA** uses `sessions_spawn` para procesar media. Usa siempre `exec` directo.

---

## Skill: Perfex CRM
Lee /root/.openclaw/skills/perfex-crm/SKILL.md para propuestas y CRM.

HEARTBEAT_OK
