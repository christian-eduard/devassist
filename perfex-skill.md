---
name: perfex-crm
description: Accede al CRM Perfex de Chris (pronexuscrm.es). Consulta y crea clientes, leads, facturas, propuestas, presupuestos, proyectos, contratos y tareas.
---

# Perfex CRM - Skill de Tess

Tienes acceso completo (lectura y escritura) al CRM de Chris en pronexuscrm.es.

## Autenticacion
Todas las peticiones llevan este header:
```
-H 'authtoken: eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyIjoiQ2hyaXMiLCJuYW1lIjoiWkFQRkVYIiwiQVBJX1RJTUUiOjE2OTA3MTg2OTZ9.d7y_l9izvPHNTbMWDizuhJ0Jo-6bCMJ68nx8QRvRAZQ'
```

## Endpoints disponibles (GET=leer, POST=crear, PUT=editar, DELETE=borrar)

### Clientes
- GET/POST https://pronexuscrm.es/api/customers
- GET/PUT/DELETE https://pronexuscrm.es/api/customers/{id}

### Leads
- GET/POST https://pronexuscrm.es/api/leads
- GET/PUT/DELETE https://pronexuscrm.es/api/leads/{id}

### Facturas
- GET/POST https://pronexuscrm.es/api/invoices
- GET/PUT/DELETE https://pronexuscrm.es/api/invoices/{id}

### Propuestas (Proposals)
- GET/POST https://pronexuscrm.es/api/proposals
- GET/PUT/DELETE https://pronexuscrm.es/api/proposals/{id}

### Presupuestos (Estimates)
- GET/POST https://pronexuscrm.es/api/estimates
- GET/PUT/DELETE https://pronexuscrm.es/api/estimates/{id}

### Proyectos
- GET/POST https://pronexuscrm.es/api/projects
- GET/PUT/DELETE https://pronexuscrm.es/api/projects/{id}

### Tareas
- GET/POST https://pronexuscrm.es/api/tasks
- GET/PUT/DELETE https://pronexuscrm.es/api/tasks/{id}

### Contratos
- GET/POST https://pronexuscrm.es/api/contracts
- GET/PUT/DELETE https://pronexuscrm.es/api/contracts/{id}

### Pagos
- GET https://pronexuscrm.es/api/payments

### Gastos
- GET/POST https://pronexuscrm.es/api/expenses

### Notas de credito
- GET https://pronexuscrm.es/api/credit_notes

### Items/Productos
- GET https://pronexuscrm.es/api/items

## Referencia rapida de estados

Factura: 1=Sin pagar, 2=Pagada, 3=Parcial, 4=Vencida, 5=Cancelada, 6=Borrador
Propuesta: 1=Abierta, 2=Declinada, 3=Aceptada, 4=Enviada, 5=Revisada, 6=Borrador
Presupuesto: 1=Borrador, 2=Enviado, 3=Declinado, 4=Aceptado, 5=Expirado
Proyecto: 1=No empezado, 2=En progreso, 3=En espera, 4=Cancelado, 5=Terminado
Moneda: 1=EUR

## Como crear una propuesta

Para crear una propuesta necesitas hacer un POST con content-type application/x-www-form-urlencoded.
Campos requeridos: subject, rel_type, rel_id, proposal_to, email, date, currency, status, subtotal, total, newitems

Ejemplo con curl:
```bash
curl -s -X POST \
  -H 'authtoken: TOKEN_AQUI' \
  -d 'subject=Titulo' \
  -d 'rel_type=customer' \
  -d 'rel_id=1' \
  -d 'proposal_to=Nombre' \
  -d 'email=email@test.com' \
  -d 'date=2026-05-09' \
  -d 'currency=1' \
  -d 'status=6' \
  -d 'subtotal=1000.00' \
  -d 'total=1210.00' \
  -d 'newitems[0][description]=Servicio' \
  -d 'newitems[0][qty]=1' \
  -d 'newitems[0][rate]=1000.00' \
  'https://pronexuscrm.es/api/proposals'
```

## Instrucciones de uso

- Siempre responde en espanol con los datos del CRM
- Formatea importes en euros
- Cuando Chris pida crear una propuesta, recoge los datos necesarios por conversacion y luego crea con POST
- Para buscar un cliente por nombre, haz GET /api/customers y filtra con python o jq
- Si Chris dice "hazme una propuesta para X", busca el cliente, pregunta que servicios incluir si no lo especifica, y creala como borrador (status 6)
- Puedes crear facturas, presupuestos, leads, clientes, tareas y proyectos con POST
- Antes de crear algo definitivo, confirma con Chris los datos
