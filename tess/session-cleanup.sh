#!/bin/bash
# session-cleanup.sh — Limpia sesiones que excedan el límite de tokens
# Se ejecuta via cron cada 6 horas
# Uso: ./session-cleanup.sh [max_size_mb]

MAX_SIZE_MB=${1:-50}
SESSION_DIR="/root/.openclaw/agents/main/sessions"
ARCHIVE_DIR="/root/.openclaw/agents/main/sessions-archive"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

mkdir -p "$ARCHIVE_DIR"

# Check total session directory size
SIZE_KB=$(du -s "$SESSION_DIR" 2>/dev/null | cut -f1)
SIZE_MB=$((SIZE_KB / 1024))

echo "[$(date)] Session cleanup check: ${SIZE_MB}MB / ${MAX_SIZE_MB}MB limit"

if [ "$SIZE_MB" -gt "$MAX_SIZE_MB" ]; then
    echo "[$(date)] Sessions exceed limit. Archiving..."
    
    # Archive all session files
    tar czf "$ARCHIVE_DIR/sessions-${TIMESTAMP}.tar.gz" -C "$SESSION_DIR" . 2>/dev/null
    
    # Remove only the main session (keep group session)
    for f in "$SESSION_DIR"/*.jsonl; do
        # Check if it's the main session (not group)
        if ! grep -q "whatsapp:group" "$f" 2>/dev/null; then
            echo "[$(date)] Removing: $(basename $f)"
            rm -f "$f"
        fi
    done
    
    echo "[$(date)] Cleanup complete. Archived to sessions-${TIMESTAMP}.tar.gz"
    
    # Keep only last 5 archives
    ls -t "$ARCHIVE_DIR"/sessions-*.tar.gz 2>/dev/null | tail -n +6 | xargs rm -f 2>/dev/null
else
    echo "[$(date)] Sessions within limit. No action needed."
fi
