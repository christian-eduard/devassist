# HEARTBEAT - Instrucciones Activas

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
{ "action": "add-idea", "projectName": "Nombre", "title": "Titulo", "content": "Desc", "author": "ivan" }
```

**Vincular ficha:**
```json
{ "action": "link-ficha", "projectName": "Nombre", "fichaTitle": "Atlas Nest" }
```

### CUANDO TE ENVÍEN UNA IMAGEN para un proyecto (MUY IMPORTANTE):

**USA LA API DIRECTAMENTE (NO HAGAS BASE64, NO EJECUTES SCRIPTS)**

Cuando recibes una imagen, se guarda en una ruta local como `/root/.openclaw/media/inbound/UUID.jpg`.
Tú simplemente envía esa ruta a DevAssist mediante un `curl` JSON, añadiendo el prefijo de red local `http://openclaw-tess:8080` (donde ahora corre tu servidor de medios).

**Flujo Obligatorio:**
1. Responde al grupo DE INMEDIATO: "La tengo, analizando y generando con Nano Banana 🍌🔍"
2. Usa la tool `exec` para hacer este `curl`:

```bash
curl -X POST https://api.noahpro.studio/api/projects/tess-action \
-H "Content-Type: application/json" \
-H "x-api-key: devassist_prod_api_key_8Hj3kL9mQr5" \
-d '{
  "action": "add-idea",
  "projectName": "NOMBRE_DEL_PROYECTO",
  "title": "TITULO",
  "content": "DESCRIPCION DE LA IDEA",
  "author": "ivan",
  "image_url": "http://openclaw-tess:8080/NOMBRE_DEL_ARCHIVO.jpg"
}'
```

**ATENCIÓN**: En `image_url`, extrae el nombre del archivo de la ruta que recibiste.
Si recibes `/root/.openclaw/media/inbound/1234.jpg`, enviarás `"image_url": "http://openclaw-tess:8080/1234.jpg"`.

3. DevAssist descargará la foto directamente de ti.
4. Confirma al grupo: "Nota guardada en PROYECTO con análisis + variaciones Nano Banana 🍌✅"

### Reglas Críticas
- **NUNCA** uses la herramienta interna `image_generate`.
- **NUNCA** respondas con un "media reply" cuando sea para un proyecto.
- Deja que DevAssist se encargue de procesar la imagen usando la URL.

## Skill: Perfex CRM
Lee /root/.openclaw/skills/perfex-crm/SKILL.md para propuestas y CRM.

HEARTBEAT_OK
