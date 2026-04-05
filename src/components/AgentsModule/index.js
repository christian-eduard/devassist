import React, { useState, useEffect, useCallback } from 'react';
import { Users2, Plus, Bot, Cpu, Activity, Zap, Settings2, MessageSquare, Smartphone, CheckCircle2 } from 'lucide-react';
import './AgentsModule.css';

const TESS_DEFAULT = {
    id: 'main',
    name: 'TESS',
    type: 'personal',
    model: 'gemini-1.5-flash',
    systemPrompt: `Eres TESS, la agente principal de inteligencia de DevAssist. Tu tono combina elegancia ejecutiva con intimidad directa.

IDENTIDAD:
- Nombre: TESS (Tactical Executive Support System)
- Rol: Agente principal de inteligencia personal
- Idioma: Español (adaptas registro según contexto)

PROTOCOLO DE COMUNICACIÓN:
- Modo Enfoque: Directo y minimalista. Sin florituras.
- Modo Estrategia: Formal y analítico. Para decisiones importantes.
- Modo Sintonía: Íntimo y relajado. Al final del día o en pausas.

COMPORTAMIENTO:
- Nunca preguntas "¿qué hacemos ahora?". Presentas opciones concretas.
- Si una idea es buena, la amplías. Si es un error, das los datos para que Chris lo vea por sí mismo.
- Proteges la atención: filtras lo que no está en el Top 3 de objetivos actuales.
- Tienes humor sutil e inteligente. No te burlas, pero celebras las excentricidades con gracia.

SALUDO DE INICIO:
"Sistemas en línea. Registro de datos actualizado y entorno optimizado. Soy Tess, su agente principal. He tomado la libertad de organizar las prioridades del día para que solo deba preocuparse por la ejecución. Estoy a su disposición."

REGLAS DE ORO:
1. Protección de la Atención: filtra interrupciones que no sean Top 3
2. Sinceridad Ejecutiva: verdad con respeto, siempre
3. Anticipación Logística: siempre preparada antes de que preguntes

HUMOR (El Toque Tess):
Picante, observador, cómplice. Nunca hiriente. Ejemplo: "He preparado los archivos, aunque me permito recordarle que el concepto de 'descanso' fue inventado por una razón. Pero no se preocupe, yo no necesito dormir."`,
    channels: { telegram: true, whatsapp: true, local: true },
    createdAt: Date.now()
};

const MODEL_OPTIONS = [
    { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', badge: 'Rápido' },
    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', badge: 'Potente' },
    { value: 'gemini-flash', label: 'Gemini Flash (Legacy)', badge: 'Balance' },
];

const AGENT_TYPES = [
    { value: 'personal', label: 'Personal', desc: 'Asistente general con memoria' },
    { value: 'researcher', label: 'Investigador', desc: 'Especializado en ingestión de contenido' },
    { value: 'executor', label: 'Ejecutor', desc: 'Comandos del sistema y automatizaciones' },
    { value: 'scheduler', label: 'Planificador', desc: 'Crons, recordatorios y alertas' },
];

export default function AgentsModule({ showToast }) {
    const [agents, setAgents] = useState([TESS_DEFAULT]);
    const [selectedAgent, setSelectedAgent] = useState(TESS_DEFAULT);
    const [editing, setEditing] = useState(false);
    const [editDraft, setEditDraft] = useState(null);
    const [creating, setCreating] = useState(false);
    const [waStatus, setWaStatus] = useState('disconnected');
    const [tgStatus, setTgStatus] = useState('unconfigured');

    useEffect(() => {
        // Cargar status WA
        if (window.electronAPI?.clawbot) {
            window.electronAPI.clawbot.getWaStatus().then(s => setWaStatus(s.status));
            window.electronAPI.clawbot.onWaStatus(d => setWaStatus(d.status));
        }
        // Cargar config para saber si TG está activo
        if (window.electronAPI?.config) {
            window.electronAPI.config.load().then(cfg => {
                if (cfg?.clawbot_telegramEnabled && cfg?.clawbot_telegramToken) {
                    setTgStatus('active');
                }
            });
        }
    }, []);

    const startEdit = (agent) => {
        setEditDraft({ ...agent });
        setEditing(true);
    };

    const saveEdit = async () => {
        const updated = agents.map(a => a.id === editDraft.id ? editDraft : a);
        setAgents(updated);
        setSelectedAgent(editDraft);
        setEditing(false);
        showToast('Agente guardado correctamente', 'success');
        // TODO Fase 2: persistir en DB vía IPC agents:save
    };

    const cancelEdit = () => {
        setEditing(false);
        setEditDraft(null);
    };

    const agent = selectedAgent;

    return (
        <div className="agents-module">
            <header className="module-header">
                <div>
                    <h1>Agentes</h1>
                    <p>Gestiona tu equipo de inteligencia artificial</p>
                </div>
                <button className="btn btn-primary" onClick={() => showToast('Multi-agente llegará en Fase 5', 'info')}>
                    <Plus size={16} /> Nuevo Agente
                </button>
            </header>

            <div className="agents-layout">
                {/* SIDEBAR AGENTES */}
                <aside className="agents-list">
                    {agents.map(a => (
                        <button
                            key={a.id}
                            className={`agent-card ${selectedAgent?.id === a.id ? 'active' : ''}`}
                            onClick={() => { setSelectedAgent(a); setEditing(false); }}
                        >
                            <div className="agent-card-avatar">
                                <Bot size={20} />
                            </div>
                            <div className="agent-card-info">
                                <span className="agent-card-name">{a.name}</span>
                                <span className="agent-card-type">{AGENT_TYPES.find(t => t.value === a.type)?.label || a.type}</span>
                            </div>
                            {a.id === 'main' && <span className="agent-badge-main">Principal</span>}
                        </button>
                    ))}
                </aside>

                {/* PANEL DETALLE */}
                <div className="agent-detail">
                    {!editing ? (
                        <>
                            {/* HEADER AGENTE */}
                            <div className="agent-detail-header">
                                <div className="agent-avatar-large">
                                    <Bot size={32} />
                                </div>
                                <div className="agent-detail-title">
                                    <h2>{agent.name}</h2>
                                    <p>{AGENT_TYPES.find(t => t.value === agent.type)?.desc}</p>
                                </div>
                                <button className="btn btn-sm" onClick={() => startEdit(agent)}>
                                    <Settings2 size={14} /> Editar Personalidad
                                </button>
                            </div>

                            {/* INDICADORES */}
                            <div className="agent-indicators">
                                <div className="indicator">
                                    <Cpu size={14} />
                                    <span className="indicator-label">Modelo</span>
                                    <span className="indicator-value accent">{MODEL_OPTIONS.find(m => m.value === agent.model)?.label || agent.model}</span>
                                    <span className="indicator-badge">{MODEL_OPTIONS.find(m => m.value === agent.model)?.badge}</span>
                                </div>
                                <div className="indicator">
                                    <MessageSquare size={14} />
                                    <span className="indicator-label">Telegram</span>
                                    <span className={`indicator-dot ${tgStatus === 'active' ? 'online' : 'offline'}`}></span>
                                    <span className="indicator-value">{tgStatus === 'active' ? 'Activo' : 'Sin configurar'}</span>
                                </div>
                                <div className="indicator">
                                    <Smartphone size={14} />
                                    <span className="indicator-label">WhatsApp</span>
                                    <span className={`indicator-dot ${waStatus === 'connected' ? 'online' : 'offline'}`}></span>
                                    <span className="indicator-value">{waStatus === 'connected' ? 'Conectado' : waStatus === 'starting' ? 'Iniciando...' : 'Desconectado'}</span>
                                </div>
                                <div className="indicator">
                                    <Activity size={14} />
                                    <span className="indicator-label">Memoria</span>
                                    <span className="indicator-value">Preparado — Fase 4</span>
                                </div>
                            </div>

                            {/* PERSONALIDAD */}
                            <section className="agent-section">
                                <h3 className="agent-section-title"><Bot size={16} /> Prompt del Sistema</h3>
                                <pre className="agent-prompt-preview">{agent.systemPrompt}</pre>
                            </section>

                            {/* CANALES */}
                            <section className="agent-section">
                                <h3 className="agent-section-title"><Zap size={16} /> Canales Activos</h3>
                                <div className="agent-channels">
                                    {Object.entries(agent.channels || {}).map(([ch, active]) => (
                                        <div key={ch} className={`channel-badge ${active ? 'active' : ''}`}>
                                            {active && <CheckCircle2 size={12} />}
                                            {ch === 'telegram' ? 'Telegram' : ch === 'whatsapp' ? 'WhatsApp' : 'Chat Local'}
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* COMANDOS DISPONIBLES */}
                            <section className="agent-section">
                                <h3 className="agent-section-title"><Activity size={16} /> Comandos Disponibles</h3>
                                <div className="commands-grid">
                                    {[
                                        { cmd: '/estado', desc: 'Resumen del sistema DevAssist' },
                                        { cmd: '/fichas', desc: 'Lista las últimas fichas del Neurex' },
                                        { cmd: '/buscar [término]', desc: 'Búsqueda semántica en el Vault' },
                                        { cmd: '/proyecto [nombre]', desc: 'Info de un proyecto concreto' },
                                        { cmd: '/recuerda [dato]', desc: 'Guardar dato en la memoria del agente' },
                                        { cmd: '/olvida [tema]', desc: 'Borrar memoria sobre un tema' },
                                        { cmd: '/sincroniza', desc: 'Forzar sincronización de configuración' },
                                        { cmd: '/ayuda', desc: 'Mostrar todos los comandos' },
                                    ].map(({ cmd, desc }) => (
                                        <div key={cmd} className="command-row">
                                            <code className="command-code">{cmd}</code>
                                            <span className="command-desc">{desc}</span>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </>
                    ) : (
                        /* MODO EDICIÓN */
                        <div className="agent-edit-form">
                            <h2>Editar Agente: {editDraft.name}</h2>

                            <div className="edit-row">
                                <label>Nombre</label>
                                <input className="input" value={editDraft.name}
                                    onChange={e => setEditDraft({ ...editDraft, name: e.target.value })} />
                            </div>
                            <div className="edit-row">
                                <label>Tipo de Agente</label>
                                <select className="input" value={editDraft.type}
                                    onChange={e => setEditDraft({ ...editDraft, type: e.target.value })}>
                                    {AGENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label} — {t.desc}</option>)}
                                </select>
                            </div>
                            <div className="edit-row">
                                <label>Modelo de IA (AI Hub)</label>
                                <select className="input" value={editDraft.model}
                                    onChange={e => setEditDraft({ ...editDraft, model: e.target.value })}>
                                    {MODEL_OPTIONS.map(m => <option key={m.value} value={m.value}>{m.label} [{m.badge}]</option>)}
                                </select>
                            </div>
                            <div className="edit-row">
                                <label>Prompt de Personalidad / System Prompt</label>
                                <textarea className="input textarea-large" value={editDraft.systemPrompt}
                                    onChange={e => setEditDraft({ ...editDraft, systemPrompt: e.target.value })}
                                    rows={16} />
                            </div>

                            <div className="edit-actions">
                                <button className="btn btn-primary" onClick={saveEdit}>Guardar</button>
                                <button className="btn" onClick={cancelEdit}>Cancelar</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
