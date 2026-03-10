import { useState, useEffect, useRef, useCallback } from "react";
import './OfficeModule.css';

// ── Color palette ─────────────────────────────────────────────────────────────
const C = {
    floor1: '#1c1a2e', floor2: '#1a1828', floorDark: '#151320',
    wood1: '#2d1f0e', wood2: '#3a2810', woodLight: '#4a3318',
    wall: '#0e0d1a', wallBorder: '#1e1c30',
    desk: '#2c1f10', deskTop: '#3d2b15', deskEdge: '#1e1408',
    monitor: '#080810', screen: '#0a0a1e', screenOn: '#0d1a2e',
    chair: '#1a1a2a', chairBack: '#222235',
    plant: '#1a3a10', plantLeaf: '#2a5a18', plantPot: '#4a2010',
    lamp: '#2a2010', lampGlow: '#fffacc',
    server: '#1a1a2a', serverLed: '#00ff88',
    rug1: '#1a0a0a', rug2: '#220e0e',
    neon_purple: '#b84bff', neon_blue: '#4af7ff', neon_green: '#00ff99', neon_gold: '#ffb700', neon_pink: '#ff4fa3',
};

// ── Tile renderer (pixel-perfect) ─────────────────────────────────────────────
const T = 16; // tile size px (rendered at 2x = 32px)

// ── DEPARTMENTS config ─────────────────────────────────────────────────────────
const ROOMS = {
    voice: { name: 'Voice Lab', icon: '🎙', color: C.neon_blue, x: 0, y: 0, w: 14, h: 9, label: 'ElevenLabs · JARVIS-V' },
    vault: { name: 'Knowledge Vault', icon: '🗄', color: C.neon_purple, x: 22, y: 0, w: 14, h: 9, label: 'Fichas TikTok · RAG' },
    core: { name: 'Core HQ', icon: '⚡', color: C.neon_gold, x: 9, y: 9, w: 18, h: 7, label: 'Gateway :18789 · Coordinación' },
    pipeline: { name: 'Pipeline', icon: '🎵', color: C.neon_green, x: 0, y: 16, w: 14, h: 9, label: 'yt-dlp · Gemini Audio' },
    research: { name: 'Research', icon: '🔍', color: C.neon_pink, x: 22, y: 16, w: 14, h: 9, label: 'DuckDuckGo · Web Search' },
};

// Grid is 36 tiles wide × 25 tall → canvas 36×2×16 = 1152 × 800 (scaled down)
const GRID_W = 36, GRID_H = 25, SCALE = 2;
const CW = GRID_W * T * SCALE, CH = GRID_H * T * SCALE;

// ── Agent config ──────────────────────────────────────────────────────────────
const AGENTS_DEF = {
    VECTRON: { color: C.neon_purple, shirt: '#3d0077', pants: '#1a0044', skin: '#e8c49a', hair: '#1a0033', icon: '🦞', spawnRoom: 'core' },
    JARVIS: { color: C.neon_blue, shirt: '#003366', pants: '#001a33', skin: '#f0d0b0', hair: '#001122', icon: '🤖', spawnRoom: 'voice' },
    GEMO: { color: C.neon_gold, shirt: '#3d2200', pants: '#221100', skin: '#f0c890', hair: '#1a0800', icon: '🧠', spawnRoom: 'pipeline' },
    CLAW: { color: C.neon_green, shirt: '#003322', pants: '#001a11', skin: '#c8f0d0', hair: '#001a0a', icon: '🦀', spawnRoom: 'research' },
};

// ── Tasks ─────────────────────────────────────────────────────────────────────
const TASK_LIB = [
    { agent: 'VECTRON', room: 'core', msg: 'Coordinando sistema...', dur: 4500 },
    { agent: 'VECTRON', room: 'vault', msg: 'Revisando fichas...', dur: 5000 },
    { agent: 'VECTRON', room: 'pipeline', msg: 'Supervisando pipeline', dur: 3800 },
    { agent: 'JARVIS', room: 'voice', msg: 'Síntesis vocal activa', dur: 6000 },
    { agent: 'JARVIS', room: 'core', msg: 'Enviando a Telegram', dur: 3200 },
    { agent: 'JARVIS', room: 'research', msg: 'Buscando documentación', dur: 4800 },
    { agent: 'GEMO', room: 'pipeline', msg: 'Transcribiendo audio...', dur: 7000 },
    { agent: 'GEMO', room: 'research', msg: 'Analizando contenido', dur: 5200 },
    { agent: 'GEMO', room: 'vault', msg: 'Generando ficha', dur: 4200 },
    { agent: 'CLAW', room: 'core', msg: 'Monitorizando :18789', dur: 3000 },
    { agent: 'CLAW', room: 'voice', msg: 'Enrutando WhatsApp', dur: 4000 },
    { agent: 'CLAW', room: 'pipeline', msg: 'Enviando URL al webhook', dur: 3500 },
];

const ROOM_CENTERS = {
    voice: { tx: 7, ty: 4 },
    vault: { tx: 29, ty: 4 },
    core: { tx: 18, ty: 12 },
    pipeline: { tx: 7, ty: 20 },
    research: { tx: 29, ty: 20 },
};

const LOG_EVENTS = [
    '🎵 TikTok link recibido → WhatsApp',
    '🦞 VECTRON: "Procesando, Señor."',
    '🎙 Síntesis ElevenLabs completada',
    '📦 Ficha guardada en Vault',
    '🔍 4 resultados web encontrados',
    '⚡ Gateway :18789 → STATUS OK',
    '🤖 Respuesta enviada a Telegram',
    '🧠 Transcripción: "...la herramienta..."',
    '🦀 Webhook :4242 → HTTP 200',
    '📊 3 proyectos relevantes',
    '💾 fichas.json → 5 entradas',
    '🎵 yt-dlp: descarga 2.3MB OK',
    '🔑 Groq fallback activado',
    '🌐 OpenRouter → modelo gratuito',
];

// ── Canvas draw utilities ─────────────────────────────────────────────────────
function drawPixel(ctx, tx, ty, color, alpha = 1) {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fillRect(tx * T * SCALE, ty * T * SCALE, T * SCALE, T * SCALE);
    ctx.globalAlpha = 1;
}

function drawRect(ctx, tx, ty, tw, th, color, alpha = 1) {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fillRect(tx * T * SCALE, ty * T * SCALE, tw * T * SCALE, th * T * SCALE);
    ctx.globalAlpha = 1;
}

function drawNeonBorder(ctx, tx, ty, tw, th, color, glow = 12) {
    const x = tx * T * SCALE, y = ty * T * SCALE, w = tw * T * SCALE, h = th * T * SCALE;
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = glow;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    ctx.restore();
}

function drawGlowRect(ctx, tx, ty, tw, th, color, intensity = 0.15) {
    const x = tx * T * SCALE, y = ty * T * SCALE, w = tw * T * SCALE, h = th * T * SCALE;
    const gradient = ctx.createRadialGradient(x + w / 2, y + h / 2, 0, x + w / 2, y + h / 2, Math.max(w, h) * 0.8);
    gradient.addColorStop(0, color + Math.round(intensity * 255).toString(16).padStart(2, '0'));
    gradient.addColorStop(1, color + '00');
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, w, h);
}

function drawMonitor(ctx, tx, ty, color, onText = '') {
    const x = tx * T * SCALE, y = ty * T * SCALE;
    const s = SCALE;
    // Base/stand
    ctx.fillStyle = '#1a1a28'; ctx.fillRect(x + 14 * s, y + 28 * s, 4 * s, 6 * s);
    ctx.fillStyle = '#141420'; ctx.fillRect(x + 10 * s, y + 34 * s, 12 * s, 2 * s);
    // Monitor body
    ctx.fillStyle = '#0c0c18'; ctx.fillRect(x + 2 * s, y + 2 * s, 28 * s, 26 * s);
    ctx.strokeStyle = '#2a2a40'; ctx.lineWidth = s; ctx.strokeRect(x + 2 * s, y + 2 * s, 28 * s, 26 * s);
    // Screen
    ctx.fillStyle = '#060614'; ctx.fillRect(x + 4 * s, y + 4 * s, 24 * s, 22 * s);
    // Screen content glow
    ctx.save();
    ctx.shadowColor = color; ctx.shadowBlur = 8 * s;
    ctx.fillStyle = color + '22'; ctx.fillRect(x + 4 * s, y + 4 * s, 24 * s, 22 * s);
    ctx.restore();
    // Scan lines
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    for (let i = 0; i < 11; i++) ctx.fillRect(x + 4 * s, y + (4 + i * 2) * s, 24 * s, s);
    // Code lines on screen
    const lineColors = [color + 'cc', color + '88', color + '55'];
    lineColors.forEach((lc, i) => {
        ctx.fillStyle = lc;
        ctx.fillRect(x + 6 * s, y + (6 + i * 5) * s, (8 + Math.random() * 10 | 0) * s, s);
        if (i < 2) ctx.fillRect(x + 6 * s, y + (8 + i * 5) * s, (4 + Math.random() * 6 | 0) * s, s);
    });
    // Power LED
    ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 4 * s;
    ctx.fillRect(x + 28 * s, y + 26 * s, 2 * s, 2 * s);
    ctx.shadowBlur = 0;
}

function drawDesk(ctx, tx, ty, facingRight = true) {
    const x = tx * T * SCALE, y = ty * T * SCALE;
    const s = SCALE;
    // Desk shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(x + 2 * s, y + 38 * s, 60 * s, 4 * s);
    // Desk body
    ctx.fillStyle = C.deskTop; ctx.fillRect(x, y + 4 * s, 60 * s, 36 * s);
    ctx.fillStyle = C.desk; ctx.fillRect(x, y + 40 * s, 60 * s, 4 * s);
    ctx.fillStyle = C.deskEdge; ctx.fillRect(x + 2 * s, y + 6 * s, 56 * s, 2 * s);
    // Desk legs
    ctx.fillStyle = C.deskEdge;
    ctx.fillRect(x + 2 * s, y + 42 * s, 6 * s, 18 * s);
    ctx.fillRect(x + 52 * s, y + 42 * s, 6 * s, 18 * s);
    // Wood grain lines
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    for (let i = 0; i < 3; i++) ctx.fillRect(x + 4 * s, y + (10 + i * 10) * s, 52 * s, s);
    // Cable slot
    ctx.fillStyle = C.deskEdge; ctx.fillRect(x + 24 * s, y + 5 * s, 12 * s, 3 * s);
}

function drawChair(ctx, tx, ty) {
    const x = tx * T * SCALE, y = ty * T * SCALE;
    const s = SCALE;
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x + 3 * s, y + 30 * s, 26 * s, 5 * s);
    // Seat
    ctx.fillStyle = C.chair; ctx.fillRect(x + 2 * s, y + 16 * s, 28 * s, 14 * s);
    ctx.fillStyle = '#252535'; ctx.fillRect(x + 4 * s, y + 18 * s, 24 * s, 10 * s);
    // Back
    ctx.fillStyle = C.chairBack; ctx.fillRect(x + 4 * s, y, 24 * s, 18 * s);
    ctx.fillStyle = '#2e2e42'; ctx.fillRect(x + 6 * s, y + 2 * s, 20 * s, 14 * s);
    // Arm rests
    ctx.fillStyle = C.chair;
    ctx.fillRect(x, y + 12 * s, 4 * s, 16 * s);
    ctx.fillRect(x + 28 * s, y + 12 * s, 4 * s, 16 * s);
    // Base + wheels
    ctx.fillStyle = '#151520'; ctx.fillRect(x + 12 * s, y + 28 * s, 8 * s, 8 * s);
    ctx.fillStyle = '#0a0a14';
    [-8, 0, 8].forEach(ox => ctx.fillRect(x + 12 * s + ox * s, y + 34 * s, 4 * s, 4 * s));
}

function drawServerRack(ctx, tx, ty, color) {
    const x = tx * T * SCALE, y = ty * T * SCALE;
    const s = SCALE;
    // Rack body
    ctx.fillStyle = '#0e0e1c'; ctx.fillRect(x, y, 32 * s, 48 * s);
    ctx.strokeStyle = '#1e1e30'; ctx.lineWidth = s; ctx.strokeRect(x, y, 32 * s, 48 * s);
    // Units
    for (let i = 0; i < 6; i++) {
        const uy = y + 2 * s + i * 7 * s;
        ctx.fillStyle = '#141420'; ctx.fillRect(x + 2 * s, uy, 28 * s, 6 * s);
        ctx.strokeStyle = '#252535'; ctx.strokeRect(x + 2 * s, uy, 28 * s, 6 * s);
        // LEDs
        const ledColor = i % 3 === 0 ? color : i % 3 === 1 ? C.neon_green : '#ffffff44';
        ctx.fillStyle = ledColor; ctx.shadowColor = ledColor; ctx.shadowBlur = 4 * s;
        ctx.fillRect(x + 4 * s, uy + 2 * s, 3 * s, 2 * s);
        ctx.fillRect(x + 9 * s, uy + 2 * s, 3 * s, 2 * s);
        ctx.shadowBlur = 0;
        // Drive bays
        ctx.fillStyle = '#0a0a18'; ctx.fillRect(x + 14 * s, uy + s, 14 * s, 4 * s);
    }
}

function drawPlant(ctx, tx, ty) {
    const x = tx * T * SCALE, y = ty * T * SCALE;
    const s = SCALE;
    // Pot
    ctx.fillStyle = C.plantPot; ctx.fillRect(x + 4 * s, y + 20 * s, 16 * s, 12 * s);
    ctx.fillStyle = '#3a1808'; ctx.fillRect(x + 2 * s, y + 18 * s, 20 * s, 4 * s);
    // Soil
    ctx.fillStyle = '#1a0e04'; ctx.fillRect(x + 5 * s, y + 20 * s, 14 * s, 4 * s);
    // Leaves - multiple
    const leafPts = [[4, 16], [10, 8], [16, 14], [8, 6], [12, 4], [6, 10]];
    leafPts.forEach(([lx, ly], i) => {
        ctx.fillStyle = i % 2 === 0 ? C.plant : C.plantLeaf;
        ctx.fillRect(x + lx * s, y + ly * s, 6 * s, 8 * s);
    });
}

function drawLamp(ctx, tx, ty, color) {
    const x = tx * T * SCALE, y = ty * T * SCALE;
    const s = SCALE;
    // Base
    ctx.fillStyle = '#2a2a3a'; ctx.fillRect(x + 8 * s, y + 20 * s, 8 * s, 4 * s);
    // Pole
    ctx.fillStyle = '#333344'; ctx.fillRect(x + 11 * s, y + 4 * s, 2 * s, 18 * s);
    // Shade
    ctx.fillStyle = '#1a1a28'; ctx.fillRect(x + 4 * s, y, 16 * s, 6 * s);
    // Glow
    ctx.save();
    ctx.shadowColor = color; ctx.shadowBlur = 20 * s;
    ctx.fillStyle = color + 'dd';
    ctx.fillRect(x + 6 * s, y + 2 * s, 12 * s, 3 * s);
    ctx.restore();
    // Cone of light on floor
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x + 4 * s, y + 6 * s);
    ctx.lineTo(x + 16 * s, y + 6 * s);
    ctx.lineTo(x + 24 * s, y + 40 * s);
    ctx.lineTo(x - 4 * s, y + 40 * s);
    ctx.fill();
    ctx.globalAlpha = 1;
}

function drawRug(ctx, tx, ty, tw, th, color) {
    const x = tx * T * SCALE, y = ty * T * SCALE;
    const w = tw * T * SCALE, h = th * T * SCALE;
    ctx.fillStyle = color + '30'; ctx.fillRect(x + 4, y + 4, w - 8, h - 8);
    ctx.strokeStyle = color + '60'; ctx.lineWidth = 3; ctx.strokeRect(x + 6, y + 6, w - 12, h - 12);
    ctx.strokeStyle = color + '30'; ctx.lineWidth = 1; ctx.strokeRect(x + 10, y + 10, w - 20, h - 20);
}

// ── FULL SCENE DRAW ───────────────────────────────────────────────────────────
function drawScene(ctx) {
    // Background floor — full grid
    for (let ty = 0; ty < GRID_H; ty++) {
        for (let tx = 0; tx < GRID_W; tx++) {
            const isEven = (tx + ty) % 2 === 0;
            ctx.fillStyle = isEven ? C.floor1 : C.floor2;
            ctx.fillRect(tx * T * SCALE, ty * T * SCALE, T * SCALE, T * SCALE);
            // Subtle tile border
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.fillRect(tx * T * SCALE, ty * T * SCALE, T * SCALE, 1);
            ctx.fillRect(tx * T * SCALE, ty * T * SCALE, 1, T * SCALE);
        }
    }

    // ── Draw corridors (hallways between rooms) ───────────────────────────────
    drawRect(ctx, 14, 0, 8, 9, '#12101e');
    drawRect(ctx, 14, 16, 8, 9, '#12101e');
    drawRect(ctx, 0, 9, 36, 7, '#0f0e1a');

    for (let ty = 9; ty < 16; ty++) {
        for (let tx = 0; tx < 36; tx++) {
            ctx.fillStyle = (tx + ty) % 4 === 0 ? '#181628' : '#141220';
            ctx.fillRect(tx * T * SCALE, ty * T * SCALE, T * SCALE, T * SCALE);
        }
    }

    const roomDefs = [
        { id: 'voice', tx: 0, ty: 0, tw: 14, th: 9 },
        { id: 'vault', tx: 22, ty: 0, tw: 14, th: 9 },
        { id: 'core', tx: 9, ty: 9, tw: 18, th: 7 },
        { id: 'pipeline', tx: 0, ty: 16, tw: 14, th: 9 },
        { id: 'research', tx: 22, ty: 16, tw: 14, th: 9 },
    ];

    roomDefs.forEach(({ id, tx, ty, tw, th }) => {
        const room = ROOMS[id];
        for (let ry = ty; ry < ty + th; ry++) {
            for (let rx = tx; rx < tx + tw; rx++) {
                const isEven = (rx + ry) % 2 === 0;
                ctx.fillStyle = isEven ? '#1e1c30' : '#1c1a2c';
                ctx.fillRect(rx * T * SCALE, ry * T * SCALE, T * SCALE, T * SCALE);
            }
        }
        drawRug(ctx, tx + 2, ty + 2, tw - 4, th - 4, room.color);
        drawRect(ctx, tx, ty, tw, 1, C.wall);
        drawRect(ctx, tx, ty, 1, th, C.wall);
        drawRect(ctx, tx + tw - 1, ty, 1, th, C.wall);
        drawRect(ctx, tx, ty + th - 1, tw, 1, C.wall);
        for (let wx = tx; wx < tx + tw; wx++) {
            ctx.fillStyle = room.color + '33';
            ctx.fillRect(wx * T * SCALE, ty * T * SCALE, T * SCALE, 4);
        }
        drawNeonBorder(ctx, tx, ty, tw, th, room.color, 16);
        const corners = [[tx, ty], [tx + tw - 2, ty], [tx, ty + th - 2], [tx + tw - 2, ty + th - 2]];
        corners.forEach(([cx, cy]) => {
            ctx.fillStyle = room.color;
            ctx.fillRect(cx * T * SCALE, cy * T * SCALE, 4, 4);
            ctx.fillRect((cx + 1) * T * SCALE - 4, cy * T * SCALE, 4, 4);
            ctx.fillRect(cx * T * SCALE, (cy + 1) * T * SCALE - 4, 4, 4);
        });
        drawGlowRect(ctx, tx, ty, tw, th, room.color, 0.08);
        const midX = tx + Math.floor(tw / 2);
        const midY = ty + Math.floor(th / 2);
        if (ty === 0) {
            drawRect(ctx, midX - 1, ty + th - 1, 3, 1, (midX + midY) % 2 === 0 ? '#1e1c30' : '#1c1a2c');
        } else if (ty === 16) {
            drawRect(ctx, midX - 1, ty, 3, 1, (midX + midY) % 2 === 0 ? '#1e1c30' : '#1c1a2c');
        }
    });

    drawDesk(ctx, 1, 1); drawChair(ctx, 1, 3);
    drawMonitor(ctx, 2, 1, C.neon_blue); drawMonitor(ctx, 5, 1, C.neon_blue);
    drawDesk(ctx, 8, 1); drawChair(ctx, 8, 3);
    drawMonitor(ctx, 9, 1, C.neon_blue); drawLamp(ctx, 12, 2, C.neon_blue);
    drawPlant(ctx, 12, 6);

    drawServerRack(ctx, 23, 1, C.neon_purple); drawServerRack(ctx, 27, 1, C.neon_purple);
    drawDesk(ctx, 23, 5); drawChair(ctx, 23, 6);
    drawMonitor(ctx, 24, 5, C.neon_purple); drawMonitor(ctx, 27, 5, C.neon_purple);
    drawLamp(ctx, 34, 1, C.neon_purple); drawPlant(ctx, 34, 6);

    drawRect(ctx, 12, 10, 12, 4, C.wood2);
    drawRect(ctx, 12, 10, 12, 1, C.deskTop);
    drawNeonBorder(ctx, 12, 10, 12, 4, C.neon_gold, 8);
    drawMonitor(ctx, 13, 10, C.neon_gold); drawMonitor(ctx, 16, 10, C.neon_gold); drawMonitor(ctx, 19, 10, C.neon_gold);
    drawChair(ctx, 13, 13); drawChair(ctx, 16, 13); drawChair(ctx, 19, 13);
    drawRect(ctx, 11, 9, 14, 2, '#050510');
    drawNeonBorder(ctx, 11, 9, 14, 2, C.neon_gold, 20);

    drawServerRack(ctx, 9, 10, C.neon_gold); drawServerRack(ctx, 26, 10, C.neon_gold);
    drawPlant(ctx, 10, 13); drawPlant(ctx, 25, 13);

    drawDesk(ctx, 1, 17); drawChair(ctx, 1, 19);
    drawMonitor(ctx, 2, 17, C.neon_green); drawMonitor(ctx, 5, 17, C.neon_green);
    drawDesk(ctx, 8, 17); drawChair(ctx, 8, 19);
    drawMonitor(ctx, 9, 17, C.neon_green); drawLamp(ctx, 1, 23, C.neon_green);
    drawPlant(ctx, 12, 23);

    drawDesk(ctx, 23, 17); drawChair(ctx, 23, 19);
    drawMonitor(ctx, 24, 17, C.neon_pink); drawMonitor(ctx, 27, 17, C.neon_pink);
    drawDesk(ctx, 30, 17); drawChair(ctx, 30, 19);
    drawMonitor(ctx, 31, 17, C.neon_pink); drawLamp(ctx, 34, 17, C.neon_pink);
    drawPlant(ctx, 34, 23);

    for (let tx = 1; tx < 35; tx += 4) {
        drawRect(ctx, tx + 6 / T, 12, 4 / T, 4 / T, 'rgba(120,100,220,0.1)');
    }
}

// ── Character Sprite (PIXEL-PERFECT V3) ─────────────────────────────────
function CharSprite({ name, def, x, y, busy, moving, walkFrame, task, canvasRect, isSelected, onSelect }) {
    const idleBob = !moving && !busy ? Math.sin(Date.now() * 0.003) * 1.2 : 0;
    const workingAnim = busy && !moving ? Math.sin(Date.now() * 0.012) * 2.5 : 0;

    const bounce = moving ? Math.sin(walkFrame * Math.PI * 0.8) * 3.5 : (idleBob + workingAnim);
    const legL = moving ? Math.sin(walkFrame * Math.PI * 0.8) * 14 : 0;
    const legR = -legL;

    const realX = canvasRect.offsetX + (x / CW) * canvasRect.width;
    const realY = canvasRect.offsetY + (y / CH) * canvasRect.height;

    const isAboveHalf = realY < canvasRect.height / 2;

    return (
        <div
            onClick={(e) => { e.stopPropagation(); onSelect(name); }}
            style={{
                position: 'absolute',
                left: `${realX}px`, top: `${realY}px`,
                transform: `translate(-50%, -100%) translateY(${bounce}px)`,
                zIndex: 200 + Math.floor(y),
                cursor: 'pointer',
                transition: moving ? 'none' : 'left 0.4s cubic-bezier(0.4, 0, 0.2, 1), top 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                filter: busy ? `drop-shadow(0 0 12px ${def.color})` : (isSelected ? `drop-shadow(0 0 15px #fff)` : 'none'),
                scale: isSelected ? '1.1' : '1',
            }}
        >
            {/* Speech bubble */}
            {(busy || isSelected) && (
                <div style={{
                    position: 'absolute',
                    bottom: isAboveHalf ? 'auto' : '100%',
                    top: isAboveHalf ? '110%' : 'auto',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    marginBottom: isAboveHalf ? 0 : 8,
                    marginTop: isAboveHalf ? 8 : 0,
                    background: '#0c0c1c',
                    border: `1px solid ${isSelected ? '#fff' : def.color}`,
                    borderRadius: 4,
                    padding: '4px 10px',
                    fontSize: 10,
                    color: '#fff',
                    whiteSpace: 'nowrap',
                    boxShadow: `0 0 15px ${def.color}44`,
                    fontFamily: 'monospace',
                    animation: 'blink-in 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                    zIndex: 1000,
                }}>
                    <div style={{ fontSize: 7, opacity: 0.6, marginBottom: 2 }}>{name.toUpperCase()}</div>
                    {task ? task.toUpperCase() : (isSelected ? 'ESPERANDO ÓRDENES' : '')}
                    <div style={{
                        position: 'absolute',
                        bottom: isAboveHalf ? 'auto' : -5,
                        top: isAboveHalf ? -5 : 'auto',
                        left: '50%', transform: 'translateX(-50%)',
                        borderLeft: '5px solid transparent', borderRight: '5px solid transparent',
                        [isAboveHalf ? 'borderBottom' : 'borderTop']: `5px solid ${isSelected ? '#fff' : def.color}`,
                    }} />
                </div>
            )}

            <div style={{ position: 'relative', width: 32, height: 48, imageRendering: 'pixelated' }}>
                {isSelected && (
                    <div style={{
                        position: 'absolute', bottom: -10, left: '50%', transform: 'translateX(-50%)',
                        width: 40, height: 10, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.5)',
                        animation: 'pulse 1s infinite',
                    }} />
                )}
                <div style={{
                    position: 'absolute', bottom: -4, left: '50%', transform: 'translateX(-50%)',
                    width: 24, height: 6, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', filter: 'blur(2px)',
                }} />
                <div style={{ position: 'absolute', top: 0, left: 6, width: 20, height: 6, background: def.hair, borderRadius: '3px 3px 0 0' }} />
                <div style={{ position: 'absolute', top: 4, left: 6, width: 20, height: 18, background: def.skin, border: `1px solid ${def.hair}` }}>
                    <div style={{ position: 'absolute', top: 5, left: 3, width: 4, height: 4, background: def.hair }} />
                    <div style={{ position: 'absolute', top: 5, right: 3, width: 4, height: 4, background: def.hair }} />
                    <div style={{ position: 'absolute', top: 5, left: 4, width: 1, height: 1, background: '#fff' }} />
                    <div style={{ position: 'absolute', top: 5, right: 4, width: 1, height: 1, background: '#fff' }} />
                    <div style={{ position: 'absolute', bottom: 3, left: 5, width: 10, height: 2, background: def.hair, borderRadius: 1 }} />
                </div>
                <div style={{ position: 'absolute', top: 20, left: 12, width: 8, height: 4, background: def.skin }} />
                <div style={{ position: 'absolute', top: 24, left: 4, width: 24, height: 16, background: def.shirt, border: `1px solid ${def.hair}` }}>
                    <div style={{ position: 'absolute', top: 5, left: '50%', transform: 'translateX(-50%)', width: 12, height: 9, background: def.color + '33', border: `1px solid ${def.color}`, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8 }}>{def.icon}</div>
                </div>
                <div style={{ position: 'absolute', top: 24, left: 0, width: 5, height: 14, background: def.shirt, border: `1px solid ${def.hair}`, borderRadius: 2, transform: `translateY(${workingAnim}px)` }} />
                <div style={{ position: 'absolute', top: 24, right: 0, width: 5, height: 14, background: def.shirt, border: `1px solid ${def.hair}`, borderRadius: 2, transform: `translateY(${workingAnim}px)` }} />
                <div style={{ position: 'absolute', top: 40, left: 5, width: 9, height: 12, background: def.pants, transform: `rotate(${legL}deg)`, transformOrigin: 'top center' }} />
                <div style={{ position: 'absolute', top: 40, right: 5, width: 9, height: 12, background: def.pants, transform: `rotate(${legR}deg)`, transformOrigin: 'top center' }} />
                <div style={{ position: 'absolute', top: 52, left: '50%', transform: 'translateX(-50%)', fontSize: 7, color: isSelected ? '#fff' : def.color, whiteSpace: 'nowrap', letterSpacing: 1.5, fontWeight: 700, fontFamily: 'monospace', textShadow: isSelected ? '0 0 10px #fff' : `0 0 8px ${def.color}` }}>{name}</div>
            </div>
        </div>
    );
}

export default function OfficeModule() {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const [canvasRect, setCanvasRect] = useState({ width: CW, height: CH, offsetX: 0, offsetY: 0 });
    const [selectedAgent, setSelectedAgent] = useState(null);

    const [agents, setAgents] = useState(() => {
        const init = {};
        Object.entries(AGENTS_DEF).forEach(([name, def]) => {
            const rc = ROOM_CENTERS[def.spawnRoom];
            const wx = (rc.tx * T * SCALE + 8) + (Math.random() - 0.5) * 40;
            const wy = (rc.ty * T * SCALE + 8) + (Math.random() - 0.5) * 40;
            init[name] = { x: wx, y: wy, tx: wx, ty: wy, room: def.spawnRoom, task: null, busy: false, walkF: 0 };
        });
        return init;
    });

    const [logs, setLogs] = useState([{ id: Date.now(), txt: '🏛 PIXEL HQ V3 Operativo. Orquestación Neural activada.', sys: true }]);
    const [stats, setStats] = useState({ fichas: 0, uptime: 0, apiOk: false });
    const [time, setTime] = useState(new Date());
    const animRef = useRef(null);

    const addLog = (txt, sys = false) => {
        setLogs(prev => [{ id: Date.now(), txt, sys }, ...prev].slice(0, 15));
        // Disparar notificación global para el Centro de Notificaciones
        window.dispatchEvent(new CustomEvent('vectron:notify', {
            detail: {
                title: sys ? 'HQ SYSTEM' : 'HQ ACTIVITY',
                message: txt,
                type: sys ? 'success' : 'info'
            }
        }));
    };

    // MEJORA: Link con VECTRON Neural
    useEffect(() => {
        if (!window.electronAPI) return;

        const handleAgentAction = (data) => {
            // Buscamos comandos tipo [ACTION:AGENT_MOVE|NAME|ROOM]
            const msg = data.text || '';
            const moveMatch = msg.match(/\[ACTION:AGENT_MOVE\|(.*?)\|(.*?)\]/);
            if (moveMatch) {
                const agentName = moveMatch[1].toUpperCase();
                const targetRoom = moveMatch[2].toLowerCase();

                if (agents[agentName] && ROOM_CENTERS[targetRoom]) {
                    const rc = ROOM_CENTERS[targetRoom];
                    const targetX = (rc.tx * T * SCALE + 8);
                    const targetY = (rc.ty * T * SCALE + 8);

                    setAgents(prev => ({
                        ...prev,
                        [agentName]: {
                            ...prev[agentName],
                            tx: targetX,
                            ty: targetY,
                            room: targetRoom,
                            busy: true,
                            task: `DIRIGIÉNDOSE A ${targetRoom.toUpperCase()}`
                        }
                    }));
                    addLog(`🦞 Orden de movimiento reciba: ${agentName} → ${targetRoom}`, true);
                }
            }
        };

        const unSub = window.electronAPI.clawbot.onMessageSent((data) => {
            handleAgentAction(data);
        });

        return () => unSub();
    }, [agents]);

    useEffect(() => {
        const updateRect = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const rect = canvas.getBoundingClientRect();
            setCanvasRect({ width: rect.width, height: rect.height, offsetX: rect.left, offsetY: rect.top });
        };
        updateRect();
        window.addEventListener('resize', updateRect);
        return () => window.removeEventListener('resize', updateRect);
    }, []);

    useEffect(() => {
        const poll = async () => {
            try {
                if (!window.electronAPI) return;
                const res = await fetch('http://localhost:4242/status').then(r => r.json());
                if (res.ok) setStats(prev => ({ ...prev, fichas: res.fichas, apiOk: true }));
            } catch {
                setStats(prev => ({ ...prev, apiOk: false }));
            }
        };
        poll();
        const intv = setInterval(poll, 10000);
        return () => clearInterval(intv);
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas) drawScene(canvas.getContext('2d'));
    }, []);

    useEffect(() => {
        let lastTime = 0;
        const loop = (t) => {
            const dt = t - lastTime;
            if (dt > 16) {
                lastTime = t;
                setAgents(prev => {
                    const next = { ...prev };
                    let changed = false;
                    for (const name of Object.keys(next)) {
                        const a = { ...next[name] };
                        const dx = a.tx - a.x, dy = a.ty - a.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist > 2) {
                            const speed = 2.5;
                            a.x += (dx / dist) * speed;
                            a.y += (dy / dist) * speed;
                            a.walkF = (a.walkF + 0.15) % 2;
                            changed = true;
                        } else if (a.busy && dist <= 2) {
                            a.x = a.tx; a.y = a.ty; a.walkF = 0;
                            // Al llegar, se queda un tiempo "trabajando"
                            if (a.task && a.task.startsWith('DIRIGIÉNDOSE')) {
                                a.task = 'EJECUTANDO OPERACIÓN...';
                                setTimeout(() => {
                                    setAgents(cur => ({
                                        ...cur,
                                        [name]: { ...cur[name], busy: false, task: null }
                                    }));
                                }, 3000);
                            }
                            changed = true;
                        }
                        next[name] = a;
                    }
                    return changed ? next : prev;
                });
                setTime(new Date());
            }
            animRef.current = requestAnimationFrame(loop);
        };
        animRef.current = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(animRef.current);
    }, []);

    const sortedAgents = Object.entries(agents).sort(([, a], [, b]) => a.y - b.y);

    return (
        <div
            ref={containerRef}
            className="office-module"
            style={{ background: '#07070f', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
            onClick={() => setSelectedAgent(null)}
        >
            <style>{`
                @keyframes pulse { 0%,100%{opacity:0.4; transform: translateX(-50%) scale(1)} 50%{opacity:1; transform: translateX(-50%) scale(1.15)} }
                @keyframes blink-in { from{opacity:0;transform:translateX(-50%) scale(0.6)} to{opacity:1;transform:translateX(-50%) scale(1)} }
                .office-module ::-webkit-scrollbar{width:3px}
                .office-module ::-webkit-scrollbar-thumb{background:#2a2a4b}
            `}</style>

            <header style={{ background: '#0a0a1c', borderBottom: '1px solid rgba(184,75,255,.3)', padding: '8px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zindex: 100 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg,#b84bff,#4af7ff)', filter: 'drop-shadow(0 0 15px rgba(184,75,255,0.4))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🏛</div>
                    <div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: '#b84bff', letterSpacing: 2 }}>PIXEL HQ V3 — VECTRON CONTROL</div>
                        <div style={{ fontSize: 9, color: '#4a4a6e', letterSpacing: 1 }}>{time.toLocaleTimeString()} · SISTEMA OPERATIVO</div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 25 }}>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 14, fontWeight: 900, color: '#00f3ff' }}>{stats.fichas}</div>
                        <div style={{ fontSize: 7, color: '#4a4a6e' }}>FICHAS VAULT</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 14, fontWeight: 900, color: stats.apiOk ? '#00ff99' : '#ff4f4f' }}>{stats.apiOk ? 'OK' : 'KO'}</div>
                        <div style={{ fontSize: 7, color: '#4a4a6e' }}>WEBHOOK :4242</div>
                    </div>
                </div>
            </header>

            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                    <canvas ref={canvasRef} width={CW} height={CH} style={{ width: '100%', height: '100%', objectFit: 'contain', imageRendering: 'pixelated' }} />

                    {sortedAgents.map(([name, a]) => (
                        <CharSprite
                            key={name}
                            name={name}
                            def={AGENTS_DEF[name]}
                            x={a.x} y={a.y}
                            busy={a.busy}
                            moving={Math.abs(a.x - a.tx) > 2 || Math.abs(a.y - a.ty) > 2}
                            walkFrame={a.walkF}
                            task={a.task}
                            canvasRect={canvasRect}
                            isSelected={selectedAgent === name}
                            onSelect={setSelectedAgent}
                        />
                    ))}

                    {/* Department labels - clickable to move selected agent */}
                    {Object.entries(ROOMS).map(([id, room]) => (
                        <div
                            key={id}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (selectedAgent) {
                                    const rc = ROOM_CENTERS[id];
                                    setAgents(prev => ({
                                        ...prev,
                                        [selectedAgent]: {
                                            ...prev[selectedAgent],
                                            tx: (rc.tx * T * SCALE + 8),
                                            ty: (rc.ty * T * SCALE + 8),
                                            room: id,
                                            busy: true,
                                            task: `MOVIENDO A ${room.name.toUpperCase()}`
                                        }
                                    }));
                                    addLog(`Ejecutando desplazamiento manual: ${selectedAgent} → ${room.name}`);
                                }
                            }}
                            style={{
                                position: 'absolute',
                                left: `${canvasRect.offsetX + (ROOM_CENTERS[id].tx * T * SCALE / CW * canvasRect.width)}px`,
                                top: `${canvasRect.offsetY + ((ROOM_CENTERS[id].ty - 5) * T * SCALE / CH * canvasRect.height)}px`,
                                transform: 'translateX(-50%)',
                                background: 'rgba(0,0,0,0.8)',
                                border: `1px solid ${selectedAgent ? '#fff' : room.color + '44'}`,
                                padding: '4px 10px', borderRadius: 4, fontSize: 8, color: room.color,
                                boxShadow: `0 0 10px ${room.color}22`,
                                cursor: selectedAgent ? 'crosshair' : 'default',
                                transition: 'all 0.3s'
                            }}
                        >
                            {room.icon} {room.name.toUpperCase()}
                        </div>
                    ))}
                </div>

                <div style={{ width: 280, background: '#090916', borderLeft: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: 20, borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <span style={{ fontSize: 9, color: '#3a3a60', letterSpacing: 2, fontWeight: 700 }}>NEURAL ASSETS</span>
                        <div style={{ marginTop: 15, display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {Object.entries(agents).map(([n, a]) => (
                                <div
                                    key={n}
                                    onClick={(e) => { e.stopPropagation(); setSelectedAgent(n); }}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px',
                                        background: selectedAgent === n ? 'rgba(255,255,255,0.05)' : 'transparent',
                                        borderRadius: 8, cursor: 'pointer', border: `1px solid ${selectedAgent === n ? AGENTS_DEF[n].color + '44' : 'transparent'}`
                                    }}
                                >
                                    <div style={{ width: 32, height: 32, borderRadius: 8, background: `${AGENTS_DEF[n].color}15`, border: `1px solid ${AGENTS_DEF[n].color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{AGENTS_DEF[n].icon}</div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>{n}</div>
                                        <div style={{ fontSize: 8, color: a.busy ? AGENTS_DEF[n].color : '#5a5a7e' }}>{a.busy ? 'PROCESANDO...' : 'SISTEMA IDLE'}</div>
                                    </div>
                                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: a.busy ? AGENTS_DEF[n].color : '#1a1a2a', boxShadow: a.busy ? `0 0 10px ${AGENTS_DEF[n].color}` : 'none' }} />
                                </div>
                            ))}
                        </div>
                    </div>

                    {selectedAgent && (
                        <div style={{ padding: 20, background: 'linear-gradient(to bottom, rgba(184,75,255,0.05), transparent)', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                            <span style={{ fontSize: 8, color: AGENTS_DEF[selectedAgent].color, letterSpacing: 2 }}>CONTROL MANUAL: {selectedAgent}</span>
                            <div style={{ marginTop: 15, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                {Object.entries(ROOMS).map(([rid, r]) => (
                                    <button
                                        key={rid}
                                        onClick={() => {
                                            const rc = ROOM_CENTERS[rid];
                                            setAgents(prev => ({
                                                ...prev,
                                                [selectedAgent]: {
                                                    ...prev[selectedAgent],
                                                    tx: (rc.tx * T * SCALE + 8),
                                                    ty: (rc.ty * T * SCALE + 8),
                                                    room: rid,
                                                    busy: true,
                                                    task: 'TRANSFIRIENDO...'
                                                }
                                            }));
                                        }}
                                        style={{ background: '#0c0c1c', border: `1px solid ${r.color}33`, color: r.color, fontSize: 8, padding: '6px', borderRadius: 4, cursor: 'pointer' }}
                                    >
                                        IR A {r.name.split(' ')[0]}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div style={{ flex: 1, padding: 20, overflow: 'auto' }}>
                        <span style={{ fontSize: 9, color: '#3a3a60', letterSpacing: 2, fontWeight: 700 }}>TELEMETRÍA HQ</span>
                        <div style={{ marginTop: 12 }}>
                            {logs.map(log => (
                                <div key={log.id} style={{ fontSize: 10, color: log.sys ? '#00ff99' : '#888', marginBottom: 10, borderLeft: `2px solid ${log.sys ? '#00ff99' : '#222'}`, paddingLeft: 10, lineHeight: 1.4 }}>
                                    <span style={{ fontSize: 7, opacity: 0.5, display: 'block' }}>{new Date(log.id).toLocaleTimeString()}</span>
                                    {log.txt}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
