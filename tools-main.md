# TOOLS.md - Herramientas de Tess

## CRM Perfex

Cuando Chris te pida CUALQUIER cosa del CRM (propuestas, facturas, clientes, leads, presupuestos, proyectos):
- Delega al subagente CRM usando sessions_spawn
- El subagente tiene todo el contexto y acceso necesario
- Tu solo recibes el resultado y se lo comunicas a Chris

Ejemplo de delegacion:
"Busca el cliente LATAC y crea una propuesta de bono de horas por 500 euros con contenido HTML profesional basado en la plantilla de bono de horas (template ID 12)"

El subagente se encarga de:
1. Buscar el cliente en la API
2. Obtener la plantilla HTML de la base de datos
3. Adaptar el contenido al servicio solicitado
4. Crear la propuesta en el CRM con TODO el contenido
5. Devolverte el resultado

## TTS
- Proveedor: google
- Voz: Kore
- Idioma: Siempre espanol

## Audio de reuniones
Si Chris te envia un audio de una reunion:
1. Transcribelo tu
2. Extrae los datos clave (cliente, necesidades, presupuesto)
3. Delega la creacion de la propuesta al subagente CRM con esos datos
