#!/usr/bin/env python3
"""
upload-image.py — Helper script for Tess to upload images to DevAssist.
Usage: python3 upload-image.py <image_path> <project_name> <title> <author>

If project_name is empty (""), the image goes to Notas Sueltas.
"""
import sys, json, base64, urllib.request

if len(sys.argv) < 5:
    print("Usage: upload-image.py <image_path> <project_name> <title> <author>")
    sys.exit(1)

image_path = sys.argv[1]
project_name = sys.argv[2]
title = sys.argv[3]
author = sys.argv[4]

API_URL = "https://api.noahpro.studio/api/projects/tess-action"
API_KEY = "devassist_prod_api_key_8Hj3kL9mQr5"

with open(image_path, "rb") as f:
    img_b64 = base64.b64encode(f.read()).decode()

body = {
    "action": "add-idea",
    "projectName": project_name,
    "title": title,
    "content": f"Imagen enviada por {author} via WhatsApp",
    "author": author,
    "image_base64": img_b64,
    "image_mime": "image/jpeg"
}

req = urllib.request.Request(
    API_URL,
    data=json.dumps(body).encode(),
    headers={
        "Content-Type": "application/json",
        "x-api-key": API_KEY
    }
)

try:
    resp = urllib.request.urlopen(req, timeout=120)
    result = json.loads(resp.read())
    proj = project_name if project_name else "Notas Sueltas"
    gen = result.get("generatedCount", 0)
    print(f"OK: Imagen subida a \"{proj}\" — {gen} variaciones Nano Banana")
except Exception as e:
    print(f"ERROR: {e}")
    sys.exit(1)
