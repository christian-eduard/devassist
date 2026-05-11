import json, urllib.request

token = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyIjoiQ2hyaXMiLCJuYW1lIjoiWkFQRkVYIiwiQVBJX1RJTUUiOjE2OTA3MTg2OTZ9.d7y_l9izvPHNTbMWDizuhJ0Jo-6bCMJ68nx8QRvRAZQ"

# Fetch reference proposals
refs = {}
for pid in [197, 136, 145]:
    req = urllib.request.Request(f"https://pronexuscrm.es/api/proposals/{pid}")
    req.add_header("authtoken", token)
    data = json.loads(urllib.request.urlopen(req).read())
    if isinstance(data, list): data = data[0]
    refs[pid] = data.get("content", "")

bono = refs[197].replace("`", "&#96;")
app = refs[136].replace("`", "&#96;")[:4000]
mkt = refs[145].replace("`", "&#96;")[:4000]

ctx = f"""# CRM_CONTEXT.md - Contexto Comercial de Tess

## Empresa
Pronexus / DevAssist | Web: noahpro.studio | Propietario: Chris

## Instrucciones OBLIGATORIAS para crear propuestas

1. ANTES de crear una propuesta, haz GET /api/proposals y busca propuestas similares aceptadas (status=3)
2. Haz GET /api/proposals/ID de esa propuesta para obtener su campo content (HTML)
3. Adapta ese HTML al nuevo cliente: cambia nombre, servicio, detalles, precios
4. SIEMPRE incluye el campo content con HTML profesional en el POST
5. Las propuestas son documentos COMERCIALES con texto persuasivo, NO simples presupuestos
6. Crea SIEMPRE como borrador (status=6)
7. Si Chris te pasa un audio de una reunion, transcribelo, extrae las necesidades del cliente, y genera la propuesta completa

## IDs de referencia por tipo de servicio
- Bono de horas: Propuesta #197 (aceptada, 780e)
- App/Desarrollo: Propuesta #136 (aceptada, 3625e)
- Marketing: Propuesta #145 (aceptada, 6600e)
- CRM/Sistema: Propuesta #200 (aceptada, 1815e)
- Web/Drones: Propuesta #226 (aceptada, 6897e)
- Asesoria: Propuesta #126 (enviada, 11761e)

## Formato del content HTML
El content es HTML con estilos inline. Estructura:
- Saludo personalizado al cliente (Hola NombreCliente)
- Introduccion de la propuesta y contexto
- Descripcion detallada del servicio/solucion
- Beneficios clave para el cliente (lista con viñetas)
- Condiciones del servicio
- Cierre profesional

## Plantilla BONO DE HORAS (de propuesta #197)
<TEMPLATE_BONO>
{bono}
</TEMPLATE_BONO>

## Plantilla APP/DESARROLLO (de propuesta #136, parcial)
<TEMPLATE_APP>
{app}
</TEMPLATE_APP>

## Plantilla MARKETING (de propuesta #145, parcial)
<TEMPLATE_MARKETING>
{mkt}
</TEMPLATE_MARKETING>
"""

with open("/tmp/crm_context.md", "w") as f:
    f.write(ctx)
print(f"CRM_CONTEXT.md generated: {len(ctx)} chars")
