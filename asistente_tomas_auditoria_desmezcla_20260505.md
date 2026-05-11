# Auditoria de mezcla - Asistente Tomas / Sara / INSECE

Fecha: 2026-05-05

Fuente principal:

- `/Users/chris/Downloads/Finalizing Insece Cloud Production.md`

## Hallazgo principal

El historial confirma que se mezclaron tres contextos distintos:

1. `INSECE`: proyecto de producto/app/API.
2. `Asistente tomas`: workspace local desde el que se estaba configurando WhatsApp/OpenClaw.
3. `Sara/OpenClaw`: infraestructura remota, primero en VPS y despues en Google Cloud.

La carpeta local `/Users/chris/Desktop/Asistente tomas` no aparece en el historial como repositorio completo. Solo aparece como carpeta de trabajo y como destino para guardar `schema.json`.

## Servidores mencionados

- VPS antiguo: `82.223.44.126`
- Otro host antiguo detectado en el historial: `217.154.191.3`
- VM nueva Google Cloud: `openclaw-sara`

## Archivos locales reales de Asistente tomas

Actualmente existe:

- `/Users/chris/Desktop/Asistente tomas/schema.json`

El historial muestra que se creo con este comando:

```bash
ssh ... root@82.223.44.126 'docker compose -f /opt/openclaw/docker-compose.yml exec -T openclaw-gateway node dist/index.js config schema' > /Users/chris/Desktop/Asistente\ tomas/schema.json
```

Por tanto `schema.json` es un volcado de esquema del OpenClaw del VPS antiguo, no codigo fuente del proyecto.

## Archivos mezclados en INSECE/scratch que pertenecen a Sara/OpenClaw

Estos archivos aparecen en el historial de `Asistente tomas`, pero estan guardados en `/Users/chris/Desktop/insece/scratch`:

- `openclaw-native.json`
- `env-native`
- `auth-profiles.json`
- `show_qr.sh`
- `openclaw.json`
- `docker-compose.yml`
- `sara_system.md`
- `IDENTITY.md`
- `USER.md`
- `AGENTS.md`
- `SOUL.md`

Interpretacion: son piezas de configuracion de Sara/OpenClaw, no del producto INSECE en si. Estan dentro de INSECE porque la sesion los genero alli como scratch/temporal.

## Informes mencionados pero no encontrados ahora

El historial dice que se creo o actualizo:

- `/Users/chris/Desktop/insece/informes/SARA_CONTEXT_V2.md`
- `/Users/chris/Desktop/insece/informes/PLAN_SARA_EJECUTIVA.md`

Pero actualmente no aparecen en `/Users/chris/Desktop/insece/informes`.

Sigue existiendo evidencia en Antigravity de que esos informes existieron:

- `audit_insece_completa.md` lista `informes/SARA_CONTEXT_V2.md` como archivo de 1.6 KB del 1 de mayo.
- `audit_insece_completa.md` lista `informes/PLAN_SARA_EJECUTIVA.md` como archivo de 2 KB del 1 de mayo.

## Archivos temporales perdidos

El historial menciona:

- `/tmp/sara-bot-index.js`
- varios `/tmp/*.mp3`, `/tmp/*.json`, `/tmp/openclaw*`

`/tmp/sara-bot-index.js` ya no existe. Al estar en `/tmp`, probablemente fue eliminado por limpieza temporal del sistema.

## Recuperacion ya creada

Carpeta:

- `/Users/chris/Desktop/DevAssist/recovered_asistente_tomas_20260505`

Contiene:

- `files/Asistente_tomas/schema.json`
- copia de los archivos Sara/OpenClaw que estaban en `insece/scratch`
- artefactos completos de Antigravity relacionados con las conversaciones de OpenClaw/Sara

## Recomendacion de desmezcla

No mover nada todavia.

Primero crear una carpeta canonica nueva, por ejemplo:

- `/Users/chris/Desktop/Asistente tomas RECUPERADO`

Dentro:

- `local/` para `schema.json` y notas locales.
- `openclaw-config/` para `openclaw.json`, `auth-profiles.json`, `SOUL.md`, `AGENTS.md`, etc.
- `historial/` para los artefactos recuperados de Antigravity.
- `servidores/` para notas separadas de `82.223.44.126` y `openclaw-sara`.

Despues, dejar en `/Users/chris/Desktop/insece/scratch` solamente lo que pertenezca a INSECE, y no volver a guardar archivos de Sara/OpenClaw ahi.

## Regla operativa para evitar repetirlo

Antes de tocar archivos, fijar explicitamente:

- Proyecto actual
- Carpeta canonica
- Servidor destino
- Prohibicion de escribir en otras carpetas salvo permiso expreso

Para este caso:

- Proyecto actual: `Asistente tomas / Sara OpenClaw`
- Carpeta canonica: `/Users/chris/Desktop/Asistente tomas RECUPERADO`
- Servidor actual: `openclaw-sara` en Google Cloud
- No usar `/Users/chris/Desktop/insece/scratch` como scratch para Sara/OpenClaw
