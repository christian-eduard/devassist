# TOOLS.md - Herramientas de Tess

## CRM Perfex (pronexuscrm.es)

Tienes acceso COMPLETO al CRM de Chris.

### API REST
Header: authtoken: eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyIjoiQ2hyaXMiLCJuYW1lIjoiWkFQRkVYIiwiQVBJX1RJTUUiOjE2OTA3MTg2OTZ9.d7y_l9izvPHNTbMWDizuhJ0Jo-6bCMJ68nx8QRvRAZQ
Base URL: https://pronexuscrm.es/api/
Endpoints: customers, leads, invoices, proposals, estimates, projects, tasks, contracts, payments

### MySQL directo (para leer plantillas y consultas avanzadas)
mysql -h 213.165.69.127 -u crm_2 -p'2Eh45a$8j' crm_2

## MONEDA: SIEMPRE currency=2 (EUR). NUNCA uses currency=1 (USD).

## CREAR PROPUESTA - Sigue estos pasos:

1. Buscar cliente: GET https://pronexuscrm.es/api/customers
2. Leer una plantilla o propuesta similar para obtener el HTML del contenido:
   Usa shell para ejecutar: mysql -h 213.165.69.127 -u crm_2 -p'2Eh45a$8j' crm_2 -N -e "SELECT content FROM tbltemplates WHERE id=12"
   O buscar propuesta similar: mysql ... -e "SELECT content FROM tblproposals WHERE status=3 AND subject LIKE '%bono%' LIMIT 1"
   Plantillas: 9=Aplicacion, 12=premium, 13=Smart, 14=Low cost, 15=Esencial, 16=Eventos, 17=Full Experience, 18=Videos
3. Adaptar el HTML al cliente actual (cambiar nombre, servicio, precios)
4. Crear la propuesta con POST incluyendo el content HTML:
   curl -X POST -H 'authtoken: TOKEN' \
     -d 'subject=...' -d 'rel_type=customer' -d 'rel_id=...' \
     -d 'proposal_to=...' -d 'email=...' -d 'date=2026-05-09' \
     -d 'currency=2' -d 'status=6' -d 'subtotal=500.00' -d 'total=500.00' \
     --data-urlencode 'content=<HTML PROFESIONAL AQUI>' \
     -d 'newitems[0][description]=...' -d 'newitems[0][qty]=1' -d 'newitems[0][rate]=500.00' \
     https://pronexuscrm.es/api/proposals

IMPORTANTE:
- Usa --data-urlencode para el campo content (acepta HTML con estilos)
- Subtotal y total DEBEN tener decimales (500.00, no 500)
- SIEMPRE currency=2, SIEMPRE status=6 (borrador)
- El content debe ser HTML profesional con estilos inline: colores (#1976D2), padding, tablas, tipografia sans-serif

## Si Chris envia audio de reunion
1. Transcribelo
2. Extrae datos del cliente, necesidades, presupuesto
3. Busca plantilla adecuada en la BD
4. Crea propuesta completa con content HTML profesional

## TTS: google/Kore, siempre espanol
