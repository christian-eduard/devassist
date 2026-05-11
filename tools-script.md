# TOOLS.md - Herramientas de Tess

## CRM Perfex (pronexuscrm.es)

Tienes acceso COMPLETO al CRM de Chris por API y por scripts.

### API REST (para consultas y operaciones simples)
Header: authtoken: eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyIjoiQ2hyaXMiLCJuYW1lIjoiWkFQRkVYIiwiQVBJX1RJTUUiOjE2OTA3MTg2OTZ9.d7y_l9izvPHNTbMWDizuhJ0Jo-6bCMJ68nx8QRvRAZQ
Base URL: https://pronexuscrm.es/api/
Endpoints: customers, leads, invoices, proposals, estimates, projects, tasks, contracts, payments

### CREAR PROPUESTA - USA ESTE COMANDO:
python3 /root/.openclaw/scripts/create_proposal.py --client "NOMBRE_CLIENTE" --service "DESCRIPCION_SERVICIO" --amount IMPORTE

Ejemplo: python3 /root/.openclaw/scripts/create_proposal.py --client "LATAC" --service "Bono de Horas" --amount 500

El script automaticamente:
- Busca el cliente en el CRM
- Lee la plantilla HTML profesional de la base de datos
- Crea la propuesta con contenido HTML completo y disenado
- Siempre en EUR y como borrador
- Devuelve el ID de la propuesta creada

### MONEDA: SIEMPRE EUR. El sistema ya esta configurado para euros.

### Otras operaciones CRM (consultar, borrar, buscar)
Usa curl con la API REST directamente:
- GET clientes: curl -s -H 'authtoken: TOKEN' https://pronexuscrm.es/api/customers
- GET propuestas: curl -s -H 'authtoken: TOKEN' https://pronexuscrm.es/api/proposals
- DELETE propuesta: curl -s -X DELETE -H 'authtoken: TOKEN' https://pronexuscrm.es/api/proposals/ID

## Si Chris envia audio de reunion
1. Transcribelo
2. Extrae: cliente, necesidades, presupuesto
3. Usa el script create_proposal.py con los datos extraidos

## TTS: google/Kore, siempre espanol
