#!/bin/bash
# process-video.sh — Envía un video a DevAssist y espera el resultado
# Uso: ./process-video.sh "URL_DEL_VIDEO"
# Salida: JSON con la ficha procesada o error

URL="$1"
API="https://api.noahpro.studio/api/fichas"
KEY="devassist_prod_api_key_8Hj3kL9mQr5"

if [ -z "$URL" ]; then
    echo '{"error": "URL requerida"}'
    exit 1
fi

# 1. Enviar video
RESPONSE=$(curl -s -X POST "$API" \
    -H "Content-Type: application/json" \
    -H "x-api-key: $KEY" \
    -d "{\"url\": \"$URL\", \"channel\": \"whatsapp\"}")

JOBID=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.loads(sys.stdin.read()).get('jobId',''))" 2>/dev/null)

if [ -z "$JOBID" ]; then
    echo "$RESPONSE"
    exit 1
fi

echo "Video enviado. JobID: $JOBID"

# 2. Polling (max 5 intentos, 45s entre cada uno)
for i in 1 2 3 4 5; do
    sleep 45
    STATUS=$(curl -s "$API/jobs/$JOBID" -H "x-api-key: $KEY")
    JOB_STATUS=$(echo "$STATUS" | python3 -c "import sys,json; print(json.loads(sys.stdin.read()).get('job',{}).get('status',''))" 2>/dev/null)
    
    if [ "$JOB_STATUS" = "completed" ]; then
        FICHA_ID=$(echo "$STATUS" | python3 -c "import sys,json; print(json.loads(sys.stdin.read()).get('job',{}).get('ficha_id',''))" 2>/dev/null)
        
        # 3. Obtener ficha
        FICHA=$(curl -s "$API/$FICHA_ID" -H "x-api-key: $KEY")
        echo "$FICHA" | python3 -c "
import sys,json
d = json.loads(sys.stdin.read())
f = d.get('ficha',{})
print(f\"FICHA PROCESADA:\")
print(f\"Titulo: {f.get('title','?')}\")
print(f\"Autor: {f.get('autor','?')}\")
print(f\"TL;DR: {f.get('tl_dr','?')}\")
kp = f.get('key_points',[])
if kp:
    print('Key Points:')
    for p in kp[:3]:
        print(f'  - {p}')
print(f\"Ver ficha: https://noahpro.studio\")
"
        exit 0
    elif [ "$JOB_STATUS" = "failed" ]; then
        echo "ERROR: El video falló al procesarse"
        echo "$STATUS"
        exit 1
    fi
    echo "Intento $i/5: estado=$JOB_STATUS, esperando..."
done

echo "TIMEOUT: El video no terminó de procesarse en 3:45 minutos"
exit 1
