# TOOLS.md - Subagente CRM Perfex

## API REST
Header: authtoken: eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyIjoiQ2hyaXMiLCJuYW1lIjoiWkFQRkVYIiwiQVBJX1RJTUUiOjE2OTA3MTg2OTZ9.d7y_l9izvPHNTbMWDizuhJ0Jo-6bCMJ68nx8QRvRAZQ
Base: https://pronexuscrm.es/api/
Endpoints: customers, leads, invoices, proposals, estimates, projects, tasks, contracts, payments, expenses

## MySQL directo
mysql -h 213.165.69.127 -u crm_2 -p2Eh45a8j crm_2

## MONEDA: SIEMPRE currency=2 (EUR). NUNCA uses currency=1 (USD).

## Tablas clave
- tbltemplates: Plantillas de propuestas con HTML profesional
- tblproposals: Propuestas (campo content = HTML del cuerpo)
- tblcurrencies: Monedas (1=USD, 2=EUR)
- tblclients: Clientes

## Plantillas de propuestas (tabla tbltemplates, type=proposals)
ID 9: Platilla Prototipo Aplicacion (15661 chars)
ID 10: VeriTPV (13421 chars)
ID 11: TPV Propuesta (13943 chars)
ID 12: premium (6788 chars)
ID 13: Smart (5331 chars)
ID 14: Low cost (5464 chars)
ID 15: El Esencial - Mantenimiento (5238 chars)
ID 16: El Eventos - Recomendado (5291 chars)
ID 17: Full Experience - Premium (5261 chars)
ID 18: Videos (5831 chars)

## FLUJO para crear propuestas

PASO 1 - Buscar cliente:
curl -s -H 'authtoken: TOKEN' https://pronexuscrm.es/api/customers

PASO 2 - Obtener plantilla HTML de la BD:
mysql -h 213.165.69.127 -u crm_2 -p2Eh45a8j crm_2 -e "SELECT content FROM tbltemplates WHERE id=X"

PASO 3 - Si no hay plantilla adecuada, buscar propuesta similar aceptada:
mysql -h 213.165.69.127 -u crm_2 -p2Eh45a8j crm_2 -e "SELECT content FROM tblproposals WHERE status=3 AND subject LIKE '%palabra%' LIMIT 1"

PASO 4 - Adaptar el HTML: cambiar nombre cliente, servicio, precios, detalles

PASO 5 - Crear propuesta con API incluyendo content HTML:
curl -s -X POST -H 'authtoken: TOKEN' -H 'Content-Type: application/x-www-form-urlencoded' --data-urlencode 'content=HTML_AQUI' -d 'subject=...' -d 'rel_type=customer' -d 'rel_id=...' -d 'proposal_to=...' -d 'email=...' -d 'date=2026-05-09' -d 'currency=2' -d 'status=6' -d 'subtotal=...' -d 'total=...' -d 'newitems[0][description]=...' -d 'newitems[0][qty]=1' -d 'newitems[0][rate]=...' https://pronexuscrm.es/api/proposals

PASO 6 - Verificar que el content se guardo. Si no, actualizar por MySQL:
mysql -h 213.165.69.127 -u crm_2 -p2Eh45a8j crm_2 -e "UPDATE tblproposals SET content='HTML', currency=2 WHERE id=ID"

## REGLAS
- SIEMPRE currency=2 (EUR)
- SIEMPRE status=6 (borrador)
- SIEMPRE incluir content HTML profesional con el diseno de la plantilla
- NUNCA dejar una propuesta sin contenido en el campo content
- El HTML debe tener estilos inline: colores (#1976D2), tablas, padding, tipografia sans-serif
