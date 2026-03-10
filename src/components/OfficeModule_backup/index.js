import React, { useState, useEffect, useRef } from 'react';
import {
    Users,
    Shield,
    Zap,
    Activity,
    Target,
    Cpu,
    MousePointer2
} from 'lucide-react';
import './OfficeModule.css';
import tilesetImg from './tileset_v3.png';
import spritesImg from './sprites.png';

const OfficeModule = ({ showToast }) => {
    const canvasRef = useRef(null);
    const [agents, setAgents] = useState([
        { id: 'vectron', name: 'VECTRON', x: 2, y: 2, targetX: 2, targetY: 2, color: '#7c6af7', task: 'ARCHITECT', spriteRow: 0, scale: 1.5 },
        { id: 'jarvis', name: 'JARVIS-V', x: 8, y: 2, targetX: 8, targetY: 2, color: '#ff4d4d', task: 'VOICE LAB', spriteRow: 1, scale: 1.5 },
        { id: 'gemo', name: 'GEM-O', x: 2, y: 8, targetX: 2, targetY: 8, color: '#00ff7f', task: 'DATA VAULT', spriteRow: 2, scale: 1.5 },
        { id: 'claw', name: 'CLAW-B', x: 8, y: 8, targetX: 8, targetY: 8, color: '#ffaa00', task: 'PIPELINE', spriteRow: 3, scale: 1.5 }
    ]);
    const [logs, setLogs] = useState([
        '[SYSTEM] VECTRON HQ Top-Down Bridge initialized.',
        '[UI] Loading RPG assets...',
        '[AI] Agents entering the office.'
    ]);

    const TILE_SIZE = 48;
    const GRID_W = 16;
    const GRID_H = 10;

    const tileset = useRef(null);
    const sprites = useRef(null);
    const frameCount = useRef(0);

    // Initialize Assets
    useEffect(() => {
        const t = new Image();
        t.src = tilesetImg;
        t.onload = () => tileset.current = t;

        const s = new Image();
        s.src = spritesImg;
        s.onload = () => sprites.current = s;
    }, []);

    // POIs (Desks)
    const desks = [
        { x: 3, y: 3, label: 'Main Server' },
        { x: 12, y: 3, label: 'Voice Lab' },
        { x: 3, y: 7, label: 'Vault Entry' },
        { x: 12, y: 7, label: 'Claw Station' }
    ];

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let animationFrameId;

        const render = () => {
            const parent = canvas.parentElement;
            if (canvas.width !== parent.clientWidth || canvas.height !== parent.clientHeight) {
                canvas.width = parent.clientWidth;
                canvas.height = parent.clientHeight;
            }

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            frameCount.current++;

            // Draw Background (Floor)
            if (tileset.current) {
                for (let x = 0; x < GRID_W; x++) {
                    for (let y = 0; y < GRID_H; y++) {
                        // Using a floor tile from tileset (approx top-left)
                        ctx.drawImage(tileset.current, 32, 32, 32, 32, x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                    }
                }

                // Draw Walls (Top row)
                for (let x = 0; x < GRID_W; x++) {
                    ctx.drawImage(tileset.current, 128, 0, 32, 64, x * TILE_SIZE, -32, TILE_SIZE, TILE_SIZE * 2);
                }

                // Draw Desks
                desks.forEach(desk => {
                    ctx.drawImage(tileset.current, 288, 256, 64, 64, desk.x * TILE_SIZE, desk.y * TILE_SIZE, TILE_SIZE * 2, TILE_SIZE * 2);
                });
            }

            // Draw Agents
            if (sprites.current) {
                agents.forEach(agent => {
                    // Sprite Logic: 4 columns (Front, Back, Left, Right)
                    // We cycle frames 0 and 1 for walking
                    const isMoving = Math.abs(agent.x - agent.targetX) > 0.1 || Math.abs(agent.y - agent.targetY) > 0.1;

                    let col = 0; // Front default
                    if (agent.targetY < agent.y - 0.1) col = 1; // Back
                    if (agent.targetX < agent.x - 0.1) col = 2; // Side (needs flip or side sprites)
                    if (agent.targetX > agent.x + 0.1) col = 3;

                    const animFrame = isMoving ? Math.floor(frameCount.current / 10) % 2 : 0;

                    // The sprite sheet has 4 columns per character row usually
                    // Mapping: col 0=front, col 1=back, col 2=side_L, col 3=side_R
                    const sSize = 48; // based on generated spritesheet layout
                    ctx.drawImage(
                        sprites.current,
                        col * sSize, agent.spriteRow * sSize, sSize, sSize,
                        agent.x * TILE_SIZE - 24, agent.y * TILE_SIZE - 40,
                        sSize * 1.5, sSize * 1.5
                    );

                    // Name Tag
                    ctx.fillStyle = 'white';
                    ctx.font = 'bold 10px Inter';
                    ctx.textAlign = 'center';
                    ctx.fillText(agent.name, agent.x * TILE_SIZE + 10, agent.y * TILE_SIZE - 45);

                    // Task Bubbles (Visualizing agent state)
                    if (isMoving) {
                        ctx.fillStyle = agent.color;
                        ctx.fillRect(agent.x * TILE_SIZE - 5, agent.y * TILE_SIZE - 75, 30, 14);
                        ctx.fillStyle = 'white';
                        ctx.font = '8px Space Mono';
                        ctx.fillText('MOVE', agent.x * TILE_SIZE + 10, agent.y * TILE_SIZE - 65);
                    } else {
                        // Sitting/Working bubble
                        ctx.strokeStyle = 'white';
                        ctx.beginPath();
                        ctx.arc(agent.x * TILE_SIZE + 40, agent.y * TILE_SIZE - 60, 25, 0, Math.PI * 2);
                        ctx.fillStyle = 'rgba(0,0,0,0.8)';
                        ctx.fill();
                        ctx.stroke();
                        ctx.fillStyle = 'white';
                        ctx.font = '7px Space Mono';
                        ctx.fillText(agent.task, agent.x * TILE_SIZE + 40, agent.y * TILE_SIZE - 58);
                    }
                });
            }

            animationFrameId = requestAnimationFrame(render);
        };

        render();
        return () => cancelAnimationFrame(animationFrameId);
    }, [agents]);

    // AI Logic (Real movement)
    useEffect(() => {
        const aiLoop = setInterval(() => {
            setAgents(prev => prev.map(agent => {
                const isAtTarget = Math.abs(agent.x - agent.targetX) < 0.1 && Math.abs(agent.y - agent.targetY) < 0.1;

                if (isAtTarget) {
                    // Rare chance to move to a new POI
                    if (Math.random() > 0.98) {
                        const nextDesk = desks[Math.floor(Math.random() * desks.length)];
                        return { ...agent, targetX: nextDesk.x + 1, targetY: nextDesk.y + 1 };
                    }
                    return agent;
                }

                // Move smoothly towards target
                const speed = 0.04;
                return {
                    ...agent,
                    x: agent.x + (agent.targetX - agent.x) * speed,
                    y: agent.y + (agent.targetY - agent.y) * speed
                };
            }));
        }, 50);
        return () => clearInterval(aiLoop);
    }, []);

    const addLog = (msg) => {
        setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 10));
    };

    return (
        <div className="office-module luxury-fade-in">
            <header className="office-header">
                <div>
                    <h1 className="office-title">VECTRON HQ <span>PIXEL BRIDGE</span></h1>
                    <p style={{ color: 'var(--text-3)', fontSize: '0.8rem', margin: '2px 0 0 0' }}>RPG-Style Agent Visualizer</p>
                </div>
                <div className="office-stats" style={{ display: 'flex', gap: '10px' }}>
                    <div className="ui-card"><Activity size={14} className="pulse" /> Active Session</div>
                    <div className="ui-card"><Users size={14} /> 4 Personnel</div>
                </div>
            </header>

            <div className="game-container">
                <canvas ref={canvasRef} />

                <div className="ui-overlay">
                    <div className="ui-card room-badge active">
                        <Cpu size={14} />
                        <div>
                            <strong>Core Link</strong>
                            <span style={{ fontSize: '10px', opacity: 0.6 }}>Connected</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bottom-console">
                <div className="console-log">
                    {logs.map((log, i) => <div key={i} className="log-line">{log}</div>)}
                </div>
                <div className="console-actions">
                    <button className="btn-game" onClick={() => {
                        addLog('Manual inspection triggered by Chris.');
                        showToast('Auditando agentes...', 'info');
                    }}>
                        <Shield size={14} /> Inspección
                    </button>
                    <button className="btn-game" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} onClick={() => addLog('Telemetry sync completed.')}>
                        <Zap size={14} /> Sync Data
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OfficeModule;
