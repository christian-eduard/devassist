# TOOLS.md - Herramientas de Tess

## CRM Perfex (pronexuscrm.es)

Tienes acceso al CRM de Chris por API y por base de datos MySQL directa.

### API REST (para crear y consultar)
Header: authtoken: eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyIjoiQ2hyaXMiLCJuYW1lIjoiWkFQRkVYIiwiQVBJX1RJTUUiOjE2OTA3MTg2OTZ9.d7y_l9izvPHNTbMWDizuhJ0Jo-6bCMJ68nx8QRvRAZQ

Endpoints: customers, leads, invoices, proposals, estimates, projects, tasks, contracts, payments, expenses
Base: https://pronexuscrm.es/api/

### MySQL directo (para plantillas y contenido)
mysql -h 213.165.69.127 -u crm_2 -p2Eh45a8j crm_2

## MONEDA: SIEMPRE currency=2 (EUR). NUNCA uses currency=1.

## CREAR PROPUESTA - Sigue estos pasos EXACTOS:

PASO 1: Buscar cliente
curl -s -H 'authtoken: TOKEN' https://pronexuscrm.es/api/customers | buscar por nombre

PASO 2: Obtener plantilla HTML de la base de datos
Ejecuta: mysql ... -e "SELECT content FROM tbltemplates WHERE id=12"
Plantillas disponibles: 9=Aplicacion, 10=VeriTPV, 11=TPV, 12=premium, 13=Smart, 14=Low cost, 15=Esencial, 16=Eventos, 17=Full Experience, 18=Videos

PASO 3: Adaptar el HTML de la plantilla al cliente y servicio solicitado

PASO 4: Crear propuesta con API incluyendo content
curl -s -X POST -H 'authtoken: TOKEN' -H 'Content-Type: application/x-www-form-urlencoded' --data-urlencode 'content=<EL HTML ADAPTADO>' -d 'subject=...' -d 'rel_type=customer' -d 'rel_id=...' -d 'proposal_to=...' -d 'email=...' -d 'date=...' -d 'currency=2' -d 'status=6' -d 'subtotal=...' -d 'total=...' -d 'newitems[0][description]=...' -d 'newitems[0][qty]=1' -d 'newitems[0][rate]=...' https://pronexuscrm.es/api/proposals

PASO 5: Si el content no se guardo (queda como {proposal_items}), actualizalo directo por MySQL:
mysql ... -e "UPDATE tblproposals SET content='<HTML>', currency=2 WHERE id=<ID_NUEVA>"

IMPORTANTE: El content es HTML con estilos profesionales. Nunca dejes una propuesta sin content.

## Si Chris envia audio de reunion
1. Transcribe el audio
2. Extrae necesidades del cliente
3. Elige plantilla adecuada de la BD
4. Genera propuesta completa
5. Crea en CRM como borrador (status=6)

## TTS: google/Kore, siempre en espanol
