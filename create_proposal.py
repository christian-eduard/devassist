#!/usr/bin/env python3
"""CRM Proposal Creator - One-command script for Tess"""
import sys, json, argparse, urllib.request, urllib.parse, re
from datetime import datetime
import pymysql

DB = {"host":"213.165.69.127","user":"crm_2","password":"2Eh45a$8j","database":"crm_2","charset":"utf8mb4"}
TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyIjoiQ2hyaXMiLCJuYW1lIjoiWkFQRkVYIiwiQVBJX1RJTUUiOjE2OTA3MTg2OTZ9.d7y_l9izvPHNTbMWDizuhJ0Jo-6bCMJ68nx8QRvRAZQ"
API = "https://pronexuscrm.es/api"

def db_query(sql, params=None, commit=False):
    conn = pymysql.connect(**DB)
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            if commit:
                conn.commit()
                return cur.lastrowid
            return cur.fetchall()
    finally:
        conn.close()

def api_get(endpoint):
    req = urllib.request.Request(f"{API}/{endpoint}")
    req.add_header("authtoken", TOKEN)
    return json.loads(urllib.request.urlopen(req).read())

def find_client(name):
    for c in api_get("customers"):
        if name.lower() in (c.get("company") or "").lower():
            return c
    return None

def find_similar_proposals(service_desc):
    """Find accepted proposals with similar subject - returns list of matches"""
    keywords = service_desc.lower().split()
    results = []
    for kw in keywords:
        if len(kw) < 3: continue
        rows = db_query(
            "SELECT id, subject, content, total FROM tblproposals WHERE status IN (3,4) AND subject LIKE %s AND LENGTH(content) > 100 ORDER BY datecreated DESC LIMIT 3",
            (f"%{kw}%",))
        for r in rows:
            if r[0] not in [x[0] for x in results]:
                results.append(r)
    return results

def adapt_html(html, old_client_info, new_client, new_amount):
    """Adapt HTML from a similar proposal to new client - change names and prices"""
    # Replace old client name references with new client
    if old_client_info:
        html = html.replace(old_client_info, new_client)
    # Replace {proposal_proposal_to} placeholder
    html = html.replace("{proposal_proposal_to}", new_client)
    return html

def get_best_html(service_desc, client_name, amount, contact_name=None):
    """Smart HTML selection: similar proposals first, then fallback to generated"""
    
    # PRIORITY 1: Find accepted proposals with matching subject
    similar = find_similar_proposals(service_desc)
    if similar:
        # Pick the one with most content
        best = max(similar, key=lambda x: len(x[2] or ""))
        html = best[2]
        # Get the old client name from that proposal
        old_client = db_query("SELECT proposal_to FROM tblproposals WHERE id=%s", (best[0],))
        old_name = old_client[0][0] if old_client else None
        html = adapt_html(html, old_name, client_name, amount)
        return html, f"Propuesta similar #{best[0]} '{best[1]}' ({len(html)} chars)"
    
    # PRIORITY 2: Build from scratch with correct content for the service
    g = contact_name or client_name
    html = f'''<p>Hola {g}</p>
<p>En Pronexus, entendemos que tu tiempo es valioso y que a veces necesitas un apoyo adicional para llevar a cabo tus tareas y proyectos de manera eficiente. Es por eso que hemos dise&#241;ado nuestros paquetes de horas flexibles, para brindarte la asistencia que necesitas, cuando la necesitas.</p>
<p><span style="font-size:12pt;"><strong>&#191;C&#243;mo funciona?</strong></span></p>
<p>{service_desc}: un paquete flexible de horas para soporte, desarrollo y consultor&#237;a adaptado a tus necesidades.</p>
<hr>
<p><span style="font-size:12pt;"><strong>Beneficios:</strong></span></p>
<ul>
<li><strong>Flexibilidad total:</strong> Utiliza tus horas conforme las necesites. Sin fechas de caducidad.</li>
<li><strong>Asistencia personalizada:</strong> Nuestro equipo de expertos disponible para ayudarte en tareas t&#233;cnicas y de desarrollo.</li>
<li><strong>Ahorro de costos:</strong> Tarifas preferenciales en comparaci&#243;n con la contrataci&#243;n por horas individuales.</li>
<li><strong>Prioridad:</strong> Acceso preferente a nuestro equipo t&#233;cnico.</li>
</ul>
<hr>
<p><span style="font-size:12pt;"><strong>&#191;Por qu&#233; elegirnos?</strong></span></p>
<ul>
<li><strong>Experiencia y profesionalismo:</strong> Equipo altamente calificado y comprometido.</li>
<li><strong>Atenci&#243;n personalizada:</strong> Soluciones a medida para alcanzar tus objetivos.</li>
<li><strong>Transparencia:</strong> Control total sobre el uso de tus horas en todo momento.</li>
</ul>
<hr>
<p><strong>Forma de pago:</strong> 100% a la aceptaci&#243;n de la propuesta</p>
<p><span style="font-size:12pt;"><strong>&#191;Interesado?</strong></span></p>
<p>No dudes en ponerte en contacto con nosotros para m&#225;s informaci&#243;n.</p>'''
    return html, f"HTML generado para '{service_desc}' ({len(html)} chars)"

def create_proposal(client_name, service_desc, amount, template_id=None):
    print(f"[1] Buscando cliente '{client_name}'...")
    client = find_client(client_name)
    if not client:
        print(f"ERROR: Cliente '{client_name}' no encontrado"); sys.exit(1)
    cid = client["userid"]; company = client.get("company", client_name)
    email = client.get("email","") or "info@example.com"
    contact = None
    if client.get("contacts") and isinstance(client["contacts"], list) and len(client["contacts"]) > 0:
        contact = client["contacts"][0].get("firstname")
    print(f"    -> {company} (ID:{cid})")

    print(f"[2] Buscando propuestas similares para contenido...")
    html, source = get_best_html(service_desc, company, amount, contact)
    print(f"    -> {source}")

    print(f"[3] Creando propuesta en BD...")
    today = datetime.now().strftime("%Y-%m-%d")
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    import hashlib, random
    hash_val = hashlib.md5(f"{now}{random.random()}".encode()).hexdigest()
    
    pid = db_query(
        """INSERT INTO tblproposals 
        (subject, content, addedfrom, datecreated, total, subtotal, 
         currency, date, rel_id, rel_type, proposal_to, email, 
         status, allow_comments, show_quantity_as, pipeline_order, hash)
        VALUES (%s,%s,1,%s,%s,%s,2,%s,%s,'customer',%s,%s,6,1,1,1,%s)""",
        (service_desc, html, now, amount, amount, today, cid, company, email, hash_val),
        commit=True
    )
    print(f"    -> Propuesta #{pid} creada")

    print(f"[4] Creando item...")
    db_query(
        """INSERT INTO tblitemable 
        (rel_id, rel_type, description, long_description, qty, rate, unit, item_order)
        VALUES (%s,'proposal',%s,%s,1,%s,'',1)""",
        (pid, service_desc, f"Servicio profesional de {service_desc.lower()} para {company}", amount),
        commit=True
    )

    # Verify
    rows = db_query("SELECT LENGTH(content), currency, total FROM tblproposals WHERE id=%s", (pid,))
    if rows:
        print(f"\n=== RESULTADO ===")
        print(f"Propuesta: PRO-{str(pid).zfill(6)}")
        print(f"Cliente: {company}")
        print(f"Servicio: {service_desc}")
        print(f"Total: {rows[0][2]} EUR")
        print(f"Content: {rows[0][0]} chars HTML")
        print(f"Moneda: EUR (currency={rows[0][1]})")
        print(f"Estado: Borrador")

if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--client", required=True)
    p.add_argument("--service", required=True)
    p.add_argument("--amount", required=True, type=float)
    p.add_argument("--template", type=int)
    a = p.parse_args()
    create_proposal(a.client, a.service, a.amount, a.template)
