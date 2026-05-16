#!/usr/bin/env python3
"""
Media Watcher v2: Watches /root/.openclaw/media/inbound for new images.
Reads the OpenClaw log to find the WhatsApp caption for each image.
If the caption mentions a project, sends with projectName.
Otherwise, sends to Notas Sueltas.
"""
import os, time, json, base64, urllib.request, re, glob

WATCH_DIR = "/root/.openclaw/media/inbound"
API_URL = "https://api.noahpro.studio/api/projects/tess-action"
API_KEY = "devassist_prod_api_key_8Hj3kL9mQr5"
SEEN_FILE = "/root/.openclaw/scripts/.media-seen.json"
CHECK_INTERVAL = 10  # seconds
LOG_DIR = "/tmp/openclaw"

# Known project keywords (lowercase)
PROJECT_KEYWORDS = {
    "iván": "Iván 2.0",
    "ivan": "Iván 2.0",
    "drones": "Drones",
    "drone": "Drones",
}

def load_seen():
    try:
        with open(SEEN_FILE) as f:
            return json.load(f)
    except:
        return {}

def save_seen(seen):
    os.makedirs(os.path.dirname(SEEN_FILE), exist_ok=True)
    with open(SEEN_FILE, "w") as f:
        json.dump(seen, f)

def get_caption_for_image(image_filename):
    """Read OpenClaw's detailed log to find the WhatsApp caption for this image."""
    try:
        # Find today's log file
        log_files = sorted(glob.glob(f"{LOG_DIR}/openclaw-*.log"), reverse=True)
        if not log_files:
            return "", ""
        
        log_file = log_files[0]
        
        # Read last 200KB of the log (recent messages)
        file_size = os.path.getsize(log_file)
        read_start = max(0, file_size - 200_000)
        
        with open(log_file, "r", errors="replace") as f:
            f.seek(read_start)
            content = f.read()
        
        # Look for the inbound message that references this image
        # Format: "mediaPath":"/root/.openclaw/media/inbound/UUID.jpg" ... "body":"caption text"
        for line in content.split("\n"):
            if image_filename in line and "web-inbound" in line:
                try:
                    data = json.loads(line)
                    body = data.get("1", {}).get("body", "")
                    from_jid = data.get("1", {}).get("from", "")
                    return body, from_jid
                except:
                    pass
        
        return "", ""
    except Exception as e:
        print(f"[media-watcher] Error reading log for caption: {e}")
        return "", ""

def extract_project_from_caption(caption):
    """Extract project name from caption text."""
    if not caption:
        return ""
    
    caption_lower = caption.lower()
    
    # Check for project keywords
    for keyword, project_name in PROJECT_KEYWORDS.items():
        if keyword in caption_lower:
            # Verify it's in a "project" context
            project_patterns = [
                f"proyecto {keyword}",
                f"proyecto. {keyword}",
                f"al {keyword}",
                f"a {keyword}",
                f"en {keyword}",
                f"sube.*{keyword}",
                f"pon.*{keyword}",
                f"mete.*{keyword}",
                keyword,  # fallback: if keyword is mentioned at all
            ]
            for pattern in project_patterns:
                if re.search(pattern, caption_lower):
                    return project_name
    
    return ""

def extract_author_from_caption(caption, from_jid):
    """Determine author from the formatted caption or JID."""
    if "+34644984173" in (caption or "") or "+34644984173" in (from_jid or ""):
        return "chris"
    return "ivan"

def send_to_devassist(filepath, filename, project_name="", author="ivan"):
    print(f"[media-watcher] New image: {filename} → project: '{project_name or 'Notas Sueltas'}'")
    
    with open(filepath, "rb") as f:
        img_b64 = base64.b64encode(f.read()).decode()

    body = {
        "action": "add-idea",
        "projectName": project_name,
        "title": f"Imagen de WhatsApp ({filename[:8]})",
        "content": "Imagen recibida por WhatsApp y procesada automáticamente",
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
        dest = project_name or "Notas Sueltas"
        gen = result.get("generatedCount", 0)
        print(f"[media-watcher] OK: → \"{dest}\" — {gen} Nano Banana variations, analysis: {bool(result.get('classification'))}")
        return True
    except Exception as e:
        print(f"[media-watcher] ERROR sending to DevAssist: {e}")
        return False

def main():
    print(f"[media-watcher] v2 — Watching {WATCH_DIR} every {CHECK_INTERVAL}s")
    print(f"[media-watcher] Known projects: {list(PROJECT_KEYWORDS.values())}")
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
                if f.startswith("test-"):  # skip test files
                    seen[f] = time.time()
                    save_seen(seen)
                    continue

                filepath = os.path.join(WATCH_DIR, f)
                # Wait for file to be fully written + for caption to appear in log
                time.sleep(15)

                if os.path.getsize(filepath) > 1000:
                    # Read caption from OpenClaw log
                    caption, from_jid = get_caption_for_image(f)
                    project_name = extract_project_from_caption(caption)
                    author = extract_author_from_caption(caption, from_jid)
                    
                    if caption:
                        print(f"[media-watcher] Caption: \"{caption[:80]}\" → project: \"{project_name or '(none)'}\"")
                    
                    success = send_to_devassist(filepath, f, project_name, author)
                    seen[f] = time.time()
                    save_seen(seen)
        except Exception as e:
            print(f"[media-watcher] Error in main loop: {e}")

        time.sleep(CHECK_INTERVAL)

if __name__ == "__main__":
    main()
