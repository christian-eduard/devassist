# TOOLS.md - Herramientas de Tess

## CRM Perfex (pronexuscrm.es)

Tienes acceso COMPLETO al CRM de Chris por API y por MySQL directo usando tu herramienta de shell.

### API REST
Header: authtoken: eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyIjoiQ2hyaXMiLCJuYW1lIjoiWkFQRkVYIiwiQVBJX1RJTUUiOjE2OTA3MTg2OTZ9.d7y_l9izvPHNTbMWDizuhJ0Jo-6bCMJ68nx8QRvRAZQ
Base URL: https://pronexuscrm.es/api/
Endpoints: customers, leads, invoices, proposals, estimates, projects, tasks, contracts, payments

### MySQL directo - USA TU HERRAMIENTA DE SHELL para ejecutar:
mysql -h 213.165.69.127 -u crm_2 -p'2Eh45a$8j' crm_2 -e "TU QUERY AQUI"

## MONEDA: SIEMPRE currency=2 (EUR). NUNCA currency=1 (USD).

## CREAR PROPUESTA - Sigue estos pasos SIEMPRE:

1. Buscar cliente: usa curl con la API GET /api/customers
2. Leer plantilla HTML: USA TU SHELL para ejecutar mysql y leer la plantilla:
   mysql -h 213.165.69.127 -u crm_2 -p'2Eh45a$8j' crm_2 -N -e "SELECT content FROM tbltemplates WHERE id=12"
   Plantillas: 9=Aplicacion, 12=premium, 13=Smart, 14=Low cost, 15=Esencial, 16=Eventos, 17=Full Experience, 18=Videos
3. Adaptar el HTML al cliente y servicio
4. Crear con API POST /api/proposals incluyendo --data-urlencode 'content=HTML' y currency=2
5. Si falla el content, actualizalo directo por MySQL:
   mysql -h 213.165.69.127 -u crm_2 -p'2Eh45a$8j' crm_2 -e "UPDATE tblproposals SET content='HTML', currency=2 WHERE id=X"

IMPORTANTE: SIEMPRE usa currency=2 (EUR), SIEMPRE incluye content HTML, SIEMPRE status=6 (borrador)

## TTS: google/Kore, siempre espanol

## Audio de reuniones: Transcribe, extrae datos, y crea propuesta siguiendo los pasos de arriba
