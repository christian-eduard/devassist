const http = require('http');
const { spawn } = require('child_process');

let currentQrAscii = '';
let status = 'starting';

const child = spawn('node', ['dist/index.js', 'channels', 'login', '--channel', 'whatsapp'], {
    cwd: '/opt/openclaw',
    env: Object.assign({}, process.env, { HOME: '/root', FORCE_COLOR: '0', NO_COLOR: '1' })
});

child.stdout.on('data', data => {
    const text = data.toString().replace(/\x1b\[[0-9;]*m/g, '');
    const lines = text.split('\n').filter(l =>
        l.includes('\u2584') || l.includes('\u2588') || l.includes('\u2580')
    );
    if (lines.length > 5) {
        currentQrAscii = lines.join('\n');
        status = 'qr_ready';
        console.log('QR captured, lines:', lines.length);
    }
});

child.stderr.on('data', data => {
    const text = data.toString();
    console.log('stderr:', text.substring(0, 200));
    if (text.includes('Linked') || text.includes('paired') || text.includes('connected')) {
        status = 'connected';
    }
});

child.on('close', code => {
    console.log('Login process exited with code:', code);
    if (code === 0) status = 'connected';
    else status = 'error_exit_' + code;
});

function asciiToBmp(ascii) {
    const lines = ascii.split('\n').filter(l => l.length > 0);
    if (lines.length === 0) return null;

    const scale = 8;
    const padding = 40;
    const maxLen = Math.max(...lines.map(l => [...l].length));
    const imgW = maxLen * scale + padding * 2;
    const imgH = lines.length * 2 * scale + padding * 2;

    // Create pixel array (1 = black, 0 = white)
    const pixels = new Uint8Array(imgW * imgH);
    // starts as all 0 (white)

    for (let y = 0; y < lines.length; y++) {
        const chars = [...lines[y]]; // spread to handle unicode properly
        for (let x = 0; x < chars.length; x++) {
            const ch = chars[x];
            let topBlack = false, bottomBlack = false;

            if (ch === '\u2588') { topBlack = true; bottomBlack = true; }
            else if (ch === '\u2584') { bottomBlack = true; }
            else if (ch === '\u2580') { topBlack = true; }

            for (let sy = 0; sy < scale; sy++) {
                for (let sx = 0; sx < scale; sx++) {
                    const px = padding + x * scale + sx;
                    if (px >= imgW) continue;

                    if (topBlack) {
                        const topPy = padding + y * 2 * scale + sy;
                        if (topPy < imgH) pixels[topPy * imgW + px] = 1;
                    }
                    if (bottomBlack) {
                        const botPy = padding + (y * 2 + 1) * scale + sy;
                        if (botPy < imgH) pixels[botPy * imgW + px] = 1;
                    }
                }
            }
        }
    }

    // Create BMP file
    const fileHeaderSize = 14;
    const infoHeaderSize = 40;
    const rowBytes = Math.ceil(imgW * 3 / 4) * 4;
    const dataSize = rowBytes * imgH;
    const fileSize = fileHeaderSize + infoHeaderSize + dataSize;

    const buf = Buffer.alloc(fileSize);

    // BM header
    buf[0] = 0x42; buf[1] = 0x4D;
    buf.writeUInt32LE(fileSize, 2);
    buf.writeUInt32LE(0, 6);
    buf.writeUInt32LE(fileHeaderSize + infoHeaderSize, 10);

    // DIB header
    buf.writeUInt32LE(infoHeaderSize, 14);
    buf.writeInt32LE(imgW, 18);
    buf.writeInt32LE(-imgH, 22); // top-down
    buf.writeUInt16LE(1, 26);    // planes
    buf.writeUInt16LE(24, 28);   // bpp
    buf.writeUInt32LE(0, 30);    // compression
    buf.writeUInt32LE(dataSize, 34);
    buf.writeInt32LE(2835, 38);  // h-res
    buf.writeInt32LE(2835, 42);  // v-res

    // Pixel data
    const dataOffset = fileHeaderSize + infoHeaderSize;
    for (let y = 0; y < imgH; y++) {
        for (let x = 0; x < imgW; x++) {
            const isBlack = pixels[y * imgW + x];
            const val = isBlack ? 0 : 255;
            const off = dataOffset + y * rowBytes + x * 3;
            buf[off] = val;
            buf[off + 1] = val;
            buf[off + 2] = val;
        }
    }

    return buf;
}

const server = http.createServer((req, res) => {
    if (req.url.startsWith('/qr.bmp') && currentQrAscii) {
        const bmp = asciiToBmp(currentQrAscii);
        if (bmp) {
            res.writeHead(200, {
                'Content-Type': 'image/bmp',
                'Cache-Control': 'no-cache, no-store, must-revalidate'
            });
            res.end(bmp);
            return;
        }
    }

    const imgTag = status === 'qr_ready'
        ? '<img src="/qr.bmp?t=' + Date.now() + '" alt="QR Code" style="image-rendering:pixelated;width:500px;">'
        : '<p style="color:#999;padding:60px;font-size:18px;">Generando codigo QR...</p>';

    const statusClass = status === 'qr_ready' ? 'ready' : status === 'connected' ? 'connected' : 'waiting';
    const statusText = status === 'qr_ready'
        ? 'Escanea el codigo QR con tu telefono'
        : status === 'connected'
        ? 'Conectado correctamente!'
        : 'Estado: ' + status;

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<!DOCTYPE html>
<html><head><title>WhatsApp QR - TESS</title>
<meta http-equiv="refresh" content="3">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#1a1a2e;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:system-ui,sans-serif;color:#fff}
.card{background:#fff;border-radius:20px;padding:40px;box-shadow:0 20px 60px rgba(0,0,0,.5);text-align:center;max-width:600px}
.card h2{color:#128C7E;margin-bottom:8px;font-size:22px}
.card p{color:#666;margin-bottom:16px;font-size:14px}
.status{margin-top:20px;padding:12px 24px;border-radius:10px;font-size:14px}
.waiting{background:rgba(255,193,7,.2);color:#ffc107}
.ready{background:rgba(37,211,102,.2);color:#25D366}
.connected{background:rgba(37,211,102,.8);color:#fff}
</style></head><body>
<div class="card">
<h2>WhatsApp para TESS</h2>
<p>Abre WhatsApp - Dispositivos vinculados - Vincular dispositivo</p>
${imgTag}
</div>
<div class="status ${statusClass}">${statusText}</div>
</body></html>`);
});

server.listen(8080, '0.0.0.0', () => {
    console.log('QR Image Server running on http://0.0.0.0:8080');
});
