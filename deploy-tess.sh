#!/bin/bash
# deploy-tess.sh — Deploy Tess scripts to openclaw-tess
# Usage: ./deploy-tess.sh

set -e

REMOTE="openclaw-tess"
ZONE="europe-west1-b"

echo "📦 Desplegando scripts de Tess..."

# Upload media-watcher
echo "🔄 Actualizando media-watcher..."
gcloud compute scp ./tess/media-watcher.py "$REMOTE:/tmp/media-watcher.py" --zone="$ZONE"
gcloud compute ssh "$REMOTE" --zone="$ZONE" --command="
    sudo cp /tmp/media-watcher.py /root/.openclaw/scripts/media-watcher.py && \
    sudo pm2 restart media-watcher && \
    echo '✅ media-watcher actualizado'
"

# Upload HEARTBEAT
echo "🔄 Actualizando HEARTBEAT..."
gcloud compute scp ./tess/HEARTBEAT.md "$REMOTE:/tmp/HEARTBEAT.md" --zone="$ZONE"
gcloud compute ssh "$REMOTE" --zone="$ZONE" --command="
    sudo cp /tmp/HEARTBEAT.md /root/.openclaw/workspace/HEARTBEAT.md && \
    echo '✅ HEARTBEAT actualizado'
"

echo ""
echo "✅ Deploy de Tess completo."
echo "⚠️  Si cambiaste el SOUL.md, reinicia manualmente: gcloud compute ssh $REMOTE --zone=$ZONE --command='sudo pm2 restart openclaw-agent'"
