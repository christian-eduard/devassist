import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Bot,
    Send,
    MessageSquare,
    Zap,
    Settings,
    History,
    RefreshCw,
    Terminal,
    Trash2,
    Check,
    X,
    QrCode,
    Cpu,
    Plus,
    FileText,
    ExternalLink
} from 'lucide-react';
import './ClawbotModule.css';

const ClawbotModule = ({ showToast, clawbotActive, setClawbotActive }) => {
    const [activeTab, setActiveTab] = useState('estado'); // 'estado', 'config', 'skills', 'historial'
    const [stats, setStats] = useState({ total: 0, telegram: 0, whatsapp: 0, errors: 0 });
    const [history, setHistory] = useState([]);
    const [skills, setSkills] = useState([]);
    const [config, setConfig] = useState(null);
    const [tgTestResult, setTgTestResult] = useState(null);
    const [waStatus, setWaStatus] = useState({ status: 'loading', message: 'Consultando...' });
    const [waGroups, setWaGroups] = useState([]);
    const [newSkill, setNewSkill] = useState({ name: '', content: '' });
    const [isEditingSkill, setIsEditingSkill] = useState(null);

    const loadData = useCallback(async () => {
        if (!window.electronAPI) return;
        const conf = await window.electronAPI.config.load();
        setConfig(conf);

        const s = await window.electronAPI.clawbot.getStats();
        setStats(s);

        const h = await window.electronAPI.clawbot.getHistory();
        setHistory(h);

        const sk = await window.electronAPI.clawbot.getSkills();
        setSkills(sk);

        const wa = await window.electronAPI.clawbot.getWAStatus();
        setWaStatus(wa);
    }, []);

    useEffect(() => {
        loadData();

        const unSubs = [
            window.electronAPI.clawbot.onMessageReceived(() => loadData()),
            window.electronAPI.clawbot.onMessageSent(() => loadData())
        ];

        const interval = setInterval(async () => {
            if (window.electronAPI) {
                const result = await window.electronAPI.clawbot.getWAStatus();
                setWaStatus(result);
            }
        }, 15000);

        return () => {
            unSubs.forEach(fn => fn());
            clearInterval(interval);
        };
    }, [loadData]);

    const handleSaveConfig = async (updates) => {
        const newConf = { ...config, ...updates };
        setConfig(newConf);
        await window.electronAPI.config.save(newConf);
        showToast('Configuración guardada', 'success');
    };

    const handleStartTelegram = async () => {
        if (!config.clawbot?.telegram?.botToken) {
            showToast('Introduce el token del bot', 'error');
            return;
        }
        const res = await window.electronAPI.clawbot.telegramStart(config.clawbot.telegram.botToken);
        if (res.ok) {
            handleSaveConfig({ clawbot: { ...config.clawbot, telegram: { ...config.clawbot.telegram, enabled: true } } });
            showToast('Bot de Telegram iniciado', 'success');
        }
    };

    const handleStopTelegram = async () => {
        await window.electronAPI.clawbot.telegramStop();
        handleSaveConfig({ clawbot: { ...config.clawbot, telegram: { ...config.clawbot.telegram, enabled: false } } });
        showToast('Bot de Telegram detenido', 'success');
    };

    const handleStartWhatsApp = async () => {
        showToast('Consulta terminal para login: openclaw channels login', 'info');
    };

    const handleStopWhatsApp = async () => {
        showToast('Detén el canal en OpenClaw si es necesario', 'info');
    };

    const handleSaveSkill = async (skill) => {
        await window.electronAPI.clawbot.saveSkill(skill);
        setIsEditingSkill(null);
        setNewSkill({ name: '', content: '' });
        loadData();
        showToast(`Skill ${skill.name} guardada`, 'success');
    };

    const handleDeleteSkill = async (name) => {
        if (window.confirm(`¿Eliminar skill ${name}?`)) {
            await window.electronAPI.clawbot.deleteSkill(name);
            loadData();
            showToast('Skill eliminada', 'success');
        }
    };

    if (!config) return <div className="spinner"></div>;

    return (
        <div className="clawbot-module">
            <header className="module-header">
                <h1>Centro de Control Clawbot</h1>
                <nav className="module-tabs">
                    <button className={activeTab === 'estado' ? 'active' : ''} onClick={() => setActiveTab('estado')}><Zap size={14} /> Estado</button>
                    <button className={activeTab === 'config' ? 'active' : ''} onClick={() => setActiveTab('config')}><Settings size={14} /> Configuración</button>
                    <button className={activeTab === 'skills' ? 'active' : ''} onClick={() => setActiveTab('skills')}><Cpu size={14} /> Skills</button>
                    <button className={activeTab === 'historial' ? 'active' : ''} onClick={() => setActiveTab('historial')}><History size={14} /> Historial</button>
                </nav>
            </header>

            <div className="module-body scrollable">
                {activeTab === 'estado' && (
                    <div className="tab-estado">
                        <div className="estado-grid">
                            <div className="estado-left">
                                <section className="status-card">
                                    <h3 className="card-title">🦞 Clawbot Gateway</h3>
                                    <div className="status-row">
                                        <div className={`status-dot ${clawbotActive ? 'active' : 'inactive'}`}></div>
                                        <span>{clawbotActive ? 'Activo en localhost:18789' : 'Inactivo'}</span>
                                        <button className="btn btn-sm" onClick={() => window.location.reload()}><RefreshCw size={12} /> Reiniciar</button>
                                    </div>
                                    <p className="card-hint">Puente principal entre la IA y el hardware.</p>
                                </section>

                                <section className="status-card">
                                    <h3 className="card-title">🤖 Telegram Bot</h3>
                                    <div className="status-row">
                                        <div className={`status-dot ${config.clawbot?.telegram?.enabled ? 'active' : 'inactive'}`}></div>
                                        <span>{config.clawbot?.telegram?.enabled ? 'Bot Activo' : 'Inactivo'}</span>
                                        {config.clawbot?.telegram?.enabled ? (
                                            <button className="btn btn-sm btn-danger" onClick={handleStopTelegram}>Detener bot</button>
                                        ) : (
                                            <button className="btn btn-sm btn-primary" onClick={handleStartTelegram}>Iniciar bot</button>
                                        )}
                                    </div>
                                    <div className="status-details">
                                        <div className="detail"><span className="label">Bot:</span> <span className="val">@{config.clawbot?.telegram?.botUsername || 'Desconocido'}</span></div>
                                        <div className="detail"><span className="label">Chat ID:</span> <span className="val">{config.clawbot?.telegram?.chatId || 'Pendiente'}</span></div>
                                    </div>
                                </section>

                                <section className="status-card">
                                    <h3 className="card-title">📱 WhatsApp Agent</h3>
                                    <div className="status-row">
                                        <div className={`status-dot ${waStatus.status === 'connected' ? 'active' :
                                            waStatus.status === 'error' ? 'error' : 'inactive'
                                            }`}></div>
                                        <span>
                                            {waStatus.status === 'connected' ? 'Conectado' :
                                                waStatus.status === 'disconnected' ? 'Desconectado' :
                                                    waStatus.status === 'loading' ? 'Comprobando...' : 'Error'}
                                        </span>
                                    </div>
                                    <div className="status-details">
                                        <div className="detail"><span className="label">Número:</span> <span className="val">+34644984173</span></div>
                                        <div className="detail"><span className="label">Estado:</span> <span className="val">{waStatus.message}</span></div>
                                    </div>
                                    {waStatus.status === 'disconnected' && (
                                        <div className="wa-reconnect-hint" style={{ marginTop: '10px', fontSize: '11px', color: '#888' }}>
                                            <p>Reconectar via terminal:</p>
                                            <code style={{ background: 'rgba(0,0,0,0.2)', padding: '2px 5px', borderRadius: '3px' }}>openclaw channels login</code>
                                        </div>
                                    )}
                                </section>
                            </div>

                            <div className="estado-right">
                                <section className="stats-card">
                                    <h3 className="card-title">Estadísticas de Hoy</h3>
                                    <div className="big-stat">
                                        <span className="val">{stats.total}</span>
                                        <span className="label">Mensajes procesados</span>
                                    </div>
                                    <div className="stat-bars">
                                        <div className="stat-item">
                                            <div className="label"><span>Telegram</span> <span>{stats.telegram}</span></div>
                                            <div className="bar"><div className="fill tg" style={{ width: `${(stats.telegram / stats.total || 0) * 100}%` }}></div></div>
                                        </div>
                                        <div className="stat-item">
                                            <div className="label"><span>WhatsApp</span> <span>{stats.whatsapp}</span></div>
                                            <div className="bar"><div className="fill wa" style={{ width: `${(stats.whatsapp / stats.total || 0) * 100}%` }}></div></div>
                                        </div>
                                        <div className="stat-item errors">
                                            <div className="label"><span>Errores</span> <span>{stats.errors}</span></div>
                                            <div className="bar"><div className="fill err" style={{ width: `${(stats.errors / stats.total || 0) * 100}%` }}></div></div>
                                        </div>
                                    </div>
                                </section>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'config' && (
                    <div className="tab-config">
                        <section className="config-section">
                            <h3><Bot size={18} /> Configurar Telegram</h3>
                            <div className="config-row">
                                <label>Bot Token</label>
                                <div className="input-group">
                                    <input
                                        type="password"
                                        className="input"
                                        value={config.clawbot?.telegram?.botToken}
                                        onChange={(e) => handleSaveConfig({ clawbot: { ...config.clawbot, telegram: { ...config.clawbot.telegram, botToken: e.target.value } } })}
                                        placeholder="1234567890:AAF..."
                                    />
                                    <button className="btn btn-sm">Verificar</button>
                                </div>
                            </div>
                            <div className="help-box">
                                <p>Crea tu bot con <strong>@BotFather</strong> y pega el token aquí.</p>
                            </div>
                        </section>

                        <section className="config-section">
                            <h3><MessageSquare size={18} /> Configurar WhatsApp</h3>
                            <div className="config-row">
                                <label>Nombre del Grupo</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={config.clawbot?.whatsapp?.groupName}
                                    onChange={(e) => handleSaveConfig({ clawbot: { ...config.clawbot, whatsapp: { ...config.clawbot.whatsapp, groupName: e.target.value } } })}
                                />
                            </div>
                            <p className="hint">El agente solo responderá a mensajes dentro de este grupo.</p>
                        </section>
                    </div>
                )}

                {activeTab === 'skills' && (
                    <div className="tab-skills">
                        <div className="skills-header">
                            <h3>Skills Instaladas</h3>
                            <button className="btn btn-sm btn-primary" onClick={() => setIsEditingSkill({ name: '', content: '' })}>
                                <Plus size={14} /> Nueva Skill
                            </button>
                        </div>
                        <div className="skills-list">
                            {skills.map(s => (
                                <div key={s.name} className="skill-item">
                                    <div className="skill-info">
                                        <span className="skill-name">{s.name}</span>
                                        <span className="skill-path">~/.openclaw/skills/{s.name}/SKILL.md</span>
                                    </div>
                                    <div className="skill-actions">
                                        <button className="btn btn-sm" onClick={() => setIsEditingSkill(s)}><Terminal size={12} /> Editar</button>
                                        <button className="btn btn-sm btn-icon-only text-danger" onClick={() => handleDeleteSkill(s.name)}><Trash2 size={12} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {isEditingSkill && (
                            <div className="modal-overlay">
                                <div className="modal-content wide">
                                    <h3>{isEditingSkill.name ? `Editar Skill: ${isEditingSkill.name}` : 'Nueva Skill'}</h3>
                                    {!isEditingSkill.name && (
                                        <div className="form-group">
                                            <label>Nombre de la carpeta</label>
                                            <input type="text" className="input" value={newSkill.name} onChange={(e) => setNewSkill({ ...newSkill, name: e.target.value })} />
                                        </div>
                                    )}
                                    <div className="form-group">
                                        <label>Contenido (SKILL.md)</label>
                                        <textarea
                                            className="editor-textarea"
                                            defaultValue={isEditingSkill.content}
                                            onBlur={(e) => isEditingSkill.name ? isEditingSkill.content = e.target.value : setNewSkill({ ...newSkill, content: e.target.value })}
                                        ></textarea>
                                    </div>
                                    <div className="modal-actions">
                                        <button className="btn" onClick={() => setIsEditingSkill(null)}>Cancelar</button>
                                        <button className="btn btn-primary" onClick={() => handleSaveSkill(isEditingSkill.name ? isEditingSkill : newSkill)}>Guardar Skill</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'historial' && (
                    <div className="tab-historial">
                        <div className="historial-header">
                            <h3>Registro de Actividad</h3>
                            <button className="btn btn-sm" onClick={() => window.electronAPI.clawbot.clearHistory()}><Trash2 size={12} /> Limpiar</button>
                        </div>
                        <div className="chat-view">
                            {history.length === 0 ? <p className="empty">No hay mensajes registrados.</p> : (
                                history.map(h => (
                                    <div key={h.id} className={`chat-line ${h.type}`}>
                                        <span className={`channel-badge ${h.channel}`}>{h.channel === 'telegram' ? 'TG' : 'WA'}</span>
                                        <div className="message-content">
                                            <div className="meta">
                                                <span className="time">{new Date(parseInt(h.timestamp)).toLocaleTimeString()}</span>
                                                <span className="direction">{h.type === 'received' ? 'PREGUNTA' : 'RESPUESTA'}</span>
                                            </div>
                                            <p>{h.text}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ClawbotModule;
