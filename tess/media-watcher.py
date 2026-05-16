#!/usr/bin/env python3
"""
Media Watcher: Watches /root/.openclaw/media/inbound for new images
and automatically sends them to DevAssist for Nano Banana processing.
Then notifies the WhatsApp group via OpenClaw CLI.
"""
import os, time, json, base64, urllib.request, subprocess

WATCH_DIR = "/root/.openclaw/media/inbound"
API_URL = "https://api.noahpro.studio/api/projects/tess-action"
API_KEY = "devassist_prod_api_key_8Hj3kL9mQr5"
GROUP_JID = "120363426580246661@g.us"
DEFAULT_PROJECT = "Iván 2.0"
SEEN_FILE = "/root/.openclaw/scripts/.media-seen.json"
CHECK_INTERVAL = 10  # seconds

def load_seen():
    try:
        with open(SEEN_FILE) as f:
            return json.load(f)
    except:
        return {}

def save_seen(seen):
    with open(SEEN_FILE, "w") as f:
        json.dump(seen, f)

def notify_whatsapp(message):
    """Send a notification to the WhatsApp group via OpenClaw CLI."""
    try:
        result = subprocess.run(
            [
                "node", "/opt/openclaw/dist/index.js",
                "agent",
                "--channel", "whatsapp",
                "--to", GROUP_JID,
                "--message", message,
                "--deliver"
            ],
            capture_output=True, text=True, timeout=30,
            env={**os.environ, "HOME": "/root"}
        )
        if result.returncode == 0:
            print(f"[media-watcher] WhatsApp notification sent")
        else:
            print(f"[media-watcher] WhatsApp notify warn: {result.stderr[:100]}")
    except Exception as e:
        print(f"[media-watcher] WhatsApp notify failed ({e}), skipping")

def send_to_devassist(filepath, filename):
    print(f"[media-watcher] New image detected: {filename}")
    with open(filepath, "rb") as f:
        img_b64 = base64.b64encode(f.read()).decode()

    body = {
        "action": "add-idea",
        "projectName": DEFAULT_PROJECT,
        "title": f"Imagen de WhatsApp ({filename[:8]})",
        "content": "Imagen recibida por WhatsApp y procesada automáticamente",
        "author": "ivan",
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
        gen = result.get("generatedCount", 0)
        print(f"[media-watcher] OK: {result.get('message', '?')} — {gen} Nano Banana variations")
        notify_whatsapp(
            f"✅ Nota guardada en \"{DEFAULT_PROJECT}\" con análisis + {gen} variaciones Nano Banana 🍌\n\n"
            f"📊 Dashboard → Proyectos → {DEFAULT_PROJECT}"
        )
        return True
    except Exception as e:
        print(f"[media-watcher] ERROR sending to DevAssist: {e}")
        return False

def main():
    print(f"[media-watcher] Watching {WATCH_DIR} every {CHECK_INTERVAL}s")
    seen = load_seen()

    # Mark all existing files as seen on first run
    if not seen:
        for f in os.listdir(WATCH_DIR):
            if f.endswith((".jpg", ".jpeg", ".png")):
                seen[f] = time.time()
        save_seen(seen)
        print(f"[media-watcher] Indexed {len(seen)} existing files")

    while True:
        try:
            for f in os.listdir(WATCH_DIR):
                if not f.endswith((".jpg", ".jpeg", ".png")):
                    continue
                if f in seen:
                    continue

                filepath = os.path.join(WATCH_DIR, f)
                # Wait to ensure file is fully written
                time.sleep(2)

                if os.path.getsize(filepath) > 1000:
                    success = send_to_devassist(filepath, f)
                    seen[f] = time.time()
                    save_seen(seen)
        except Exception as e:
            print(f"[media-watcher] Error in main loop: {e}")

        time.sleep(CHECK_INTERVAL)

if __name__ == "__main__":
    main()
