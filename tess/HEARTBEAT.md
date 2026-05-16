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

### CUANDO TE ENVÍEN UNA IMAGEN:

**El sistema automático se encarga de TODO. Tú NO ejecutes NINGÚN comando.**

**Si el usuario menciona un proyecto (ej: "sube a Iván 2.0" o "a mi personal"):**
- Responde SOLO con texto: "Recibida, va para el proyecto [NOMBRE] ✅"
- NO ejecutes exec, curl, python ni ningún otro comando.

**Si el usuario NO menciona ningún proyecto:**
- Responde SOLO con texto: "Anotada en Notas Sueltas ✅"
- NO ejecutes exec, curl, python ni ningún otro comando.

### Reglas ABSOLUTAS de Imágenes
- **NUNCA ejecutes NINGÚN comando** cuando recibas una imagen — TODO es automático
- **NUNCA** uses `image_generate` — PROHIBIDO
- **NUNCA** envíes imágenes de vuelta como "media reply" — PROHIBIDO
- **NUNCA** uses `exec`, `curl`, `python3`, `jq`, `base64` para imágenes — PROHIBIDO
- **NUNCA** reportes errores de subida — el sistema funciona automáticamente sin ti

### CUANDO TE PIDAN GUARDAR UNA NOTA DE TEXTO O AUDIO EN UN PROYECTO:

**Si el usuario dice algo como "apunta en mi personal", "añade a mi personal", o similar con un AUDIO o TEXTO (NO imagen):**

1. Identifica al usuario:
   - Pronexus / Chris / +34644984173 → autor: "chris", proyecto: "Chris Personal"
   - Iván / otro → autor: "ivan", proyecto: "Iván Personal"

2. Usa `exec` para ejecutar este curl:
```bash
curl -s -X POST https://api.noahpro.studio/api/projects/tess-action \
  -H "Content-Type: application/json" \
  -H "x-api-key: devassist_prod_api_key_8Hj3kL9mQr5" \
  -d '{"action":"add-idea","projectName":"NOMBRE_PROYECTO","content":"EL_TEXTO","author":"AUTOR","title":"TITULO_CORTO"}'
```

3. Confirma: "Guardado en tu personal ✅"

**Ejemplos:**
- Iván dice por audio: "apunta en mi personal: comprar tornillos M8" → projectName: "Iván Personal", author: "ivan"
- Chris escribe: "nota personal: revisar presupuesto drones" → projectName: "Chris Personal", author: "chris"
- Iván dice: "añade al proyecto Drones: revisar motores" → projectName: "Drones", author: "ivan"

**IMPORTANTE:** Este curl es SOLO para texto/audio, NUNCA para imágenes.

---

## Skill: Perfex CRM
Lee /root/.openclaw/skills/perfex-crm/SKILL.md para propuestas y CRM.

HEARTBEAT_OK
