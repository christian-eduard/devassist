#!/bin/bash
# deploy.sh — Deploy DevAssist server to production (devassist-cloud)
# Usage: ./deploy.sh
# Only deploys from the 'main' branch

set -e

REMOTE="devassist-cloud"
ZONE="europe-west1-b"
REMOTE_DIR="/home/chris/devassist-server"

# Safety: only deploy from main
BRANCH=$(git branch --show-current)
if [ "$BRANCH" != "main" ]; then
    echo "❌ Solo se puede desplegar desde 'main'. Estás en '$BRANCH'."
    echo "   Haz: git checkout main && git merge develop"
    exit 1
fi

echo "📦 Desplegando DevAssist a producción..."
echo "   Branch: $BRANCH"
echo "   Commit: $(git log --oneline -1)"
echo ""

# Sync server files (excluding node_modules, uploads, .git)
echo "🔄 Sincronizando archivos del servidor..."
gcloud compute scp --recurse \
    --exclude="node_modules|uploads|.git|dashboard" \
    ./server/* "$REMOTE:$REMOTE_DIR/" \
    --zone="$ZONE"

# Restart the server
echo "🔁 Reiniciando servidor..."
gcloud compute ssh "$REMOTE" --zone="$ZONE" --command="
    cd $REMOTE_DIR && \
    npm install --production 2>/dev/null && \
    pm2 restart devassist-cloud && \
    sleep 3 && \
    pm2 logs devassist-cloud --lines 3 --nostream 2>&1 | tail -5
"

echo ""
echo "✅ Deploy completo. Producción actualizada."
