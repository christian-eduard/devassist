import React, { useState, useEffect, useCallback } from 'react';
import {
    Folder,
    Bell,
    Search,
    Database,
    Cpu,
    Trash2,
    Rocket,
    MessageSquare,
    Smartphone,
    Bot,
    Eye,
    EyeOff
} from 'lucide-react';
import './SettingsModule.css';

const SettingsModule = ({ showToast, onNavigate }) => {
    const [config, setConfig] = useState(null);
    const [activeTab, setActiveTab] = useState('general');
    const [cacheStats, setCacheStats] = useState({ count: 0, sizeMB: '0.0' });
    const [aiStatus, setAiStatus] = useState({
        gemini: 'loading',
        groq: 'online',
        openrouter: 'online'
    });

    const [waStatus, setWaStatus] = useState('disconnected');
    const [waQr, setWaQr] = useState(null);
    const [showToken, setShowToken] = useState(false);

    // ── Load data ──
    const loadData = useCallback(async () => {
        if (!window.electronAPI) return;
        const data = await window.electronAPI.config.load();
        setConfig(data);

        const stats = await window.electronAPI.config.getCacheStats();
        setCacheStats(stats);

        const waStat = await window.electronAPI.clawbot.getWaStatus();
        setWaStatus(waStat.status);
        if (waStat.qr) setWaQr(waStat.qr);

    }, []);

    const checkAllAiStatus = async () => {
        if (!window.electronAPI?.ai) return;
        const gRes = await window.electronAPI.ai.testGemini();
        setAiStatus(prev => ({
            ...prev,
            gemini: gRes.ok ? 'online' : 'offline'
        }));
    };

    useEffect(() => {
        loadData();

        if (window.electronAPI) {
            const cleanupWaStatus = window.electronAPI.clawbot.onWaStatus((data) => {
                setWaStatus(data.status);
                if (data.status !== 'waiting_qr') setWaQr(null);
            });
            const cleanupWaQr = window.electronAPI.clawbot.onWaQr((qr) => {
                setWaQr(qr);
                setWaStatus('waiting_qr');
            });
            return () => {
                cleanupWaStatus();
                cleanupWaQr();
            };
        }
    }, [loadData]);

    const handleSaveConfig = async (updates) => {
        const newConfig = { ...config, ...updates };
        setConfig(newConfig);
        await window.electronAPI.config.save(newConfig);
        if (updates.clawbot_telegramEnabled !== undefined || updates.clawbot_whatsappEnabled !== undefined || updates.clawbot_telegramToken) {
            await window.electronAPI.clawbot.syncConfig(newConfig);
        }
        showToast('Configuración guardada', 'success');
    };

    const handleClearCache = async () => {
        if (!window.electronAPI) return;
        const res = await window.electronAPI.config.clearCache();
        if (res.ok) {
            showToast(`Caché liberada: ${res.freed} MB (${res.count} archivos)`, 'success');
            loadData();
        } else {
            showToast('Error al limpiar caché', 'error');
        }
    };

    if (!config) return <div className="spinner"></div>;

    const tabs = [
        { id: 'general', label: 'General', icon: <Search size={16} /> },
        { id: 'storage', label: 'Almacenamiento', icon: <Database size={16} /> },
        { id: 'clawbot', label: 'OpenClaw / TESS', icon: <Rocket size={16} /> }
    ];

    return (
        <div className="settings-module">
            <header className="module-header">
                <div>
                    <h1>Configuración</h1>
                    <p>Gestiona tu entorno de trabajo y almacenamiento</p>
                </div>
            </header>

            <nav className="settings-tabs">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </nav>

            <div className="module-body scrollable">
                {activeTab === 'general' && (
                    <>
                        <section className="section">
                            <h3 className="section-title"><Folder size={18} /> Directorios</h3>
                            <div className="section-row">
                                <span className="section-label">Observar carpeta (TikTok)</span>
                                <input
                                    type="text"
                                    className="input sm"
                                    value={config.watchFolder || ''}
                                    onChange={(e) => handleSaveConfig({ watchFolder: e.target.value })}
                                    placeholder="/Users/chris/Downloads"
                                />
                            </div>
                            <div className="section-row">
                                <span className="section-label">Nombre App Antigravity</span>
                                <input
                                    type="text"
                                    className="input sm"
                                    value={config.antigravityAppName || ''}
                                    onChange={(e) => handleSaveConfig({ antigravityAppName: e.target.value })}
                                />
                            </div>
                        </section>

                        <section className="section">
                            <h3 className="section-title"><Bell size={18} /> Notificaciones</h3>
                            <div className="section-row">
                                <span className="section-label">Check de revisión de fichas</span>
                                <select
                                    className="input sm"
                                    value={config.reminderDays || 7}
                                    onChange={(e) => handleSaveConfig({ reminderDays: parseInt(e.target.value) })}
                                >
                                    <option value={3}>Cada 3 días</option>
                                    <option value={7}>Cada semana</option>
                                    <option value={14}>Cada 2 semanas</option>
                                    <option value={0}>Desactivado</option>
                                </select>
                            </div>
                        </section>
                    </>
                )}


                {activeTab === 'storage' && (
                    <section className="section">
                        <h3 className="section-title"><Database size={18} /> Almacenamiento</h3>
                        <div className="section-row">
                            <span className="section-label">Videos en caché</span>
                            <span className="section-value">{cacheStats.count} archivos ({cacheStats.sizeMB} MB)</span>
                            <button className="btn btn-sm btn-danger" onClick={handleClearCache} disabled={cacheStats.count === 0}>
                                <Trash2 size={12} /> Limpiar caché
                            </button>
                        </div>
                        <p className="section-hint">Se eliminan los archivos temporales de video. Las fichas de conocimiento permanecen intactas.</p>
                    </section>
                )}

                {activeTab === 'clawbot' && (
                    <>
                        {/* TESS Header */}
                        <div className="openclaw-header">
                            <div className="openclaw-avatar">
                                <Bot size={24} />
                            </div>
                            <div className="openclaw-header-info">
                                <h3>TESS — Agente Principal</h3>
                                <p>Tactical Executive Support System · Modelo: gemini-1.5-flash</p>
                                <div className="openclaw-status-pills">
                                    <span className={`status-pill ${config.clawbot_telegramEnabled && config.clawbot_telegramToken ? 'active' : ''}`}>
                                        <span className="dot"></span>Telegram
                                    </span>
                                    <span className={`status-pill ${waStatus === 'connected' ? 'active' : ''}`}>
                                        <span className="dot"></span>WhatsApp {waStatus === 'starting' ? '(Iniciando...)' : waStatus === 'waiting_qr' ? '(Escanea QR)' : ''}
                                    </span>
                                    <span className="status-pill active">
                                        <span className="dot"></span>Chat Local
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Telegram Channel */}
                        <div className="openclaw-channel-row">
                            <div className="openclaw-channel-icon">
                                <MessageSquare size={20} />
                            </div>
                            <div className="openclaw-channel-body">
                                <div className="openclaw-channel-header">
                                    <div>
                                        <p className="openclaw-channel-title">Telegram — @devassist_eduard_bot</p>
                                        <p className="openclaw-channel-sub">Canal de mensajería principal. TESS responde a cualquier mensaje con links o comandos.</p>
                                    </div>
                                    <label className="toggle-switch">
                                        <input
                                            type="checkbox"
                                            checked={!!config.clawbot_telegramEnabled}
                                            onChange={(e) => handleSaveConfig({ clawbot_telegramEnabled: e.target.checked })}
                                        />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>
                                {config.clawbot_telegramEnabled && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        <div className="openclaw-token-row">
                                            <input
                                                type={showToken ? 'text' : 'password'}
                                                className="input"
                                                value={config.clawbot_telegramToken || ''}
                                                onChange={(e) => setConfig({ ...config, clawbot_telegramToken: e.target.value })}
                                                onBlur={(e) => handleSaveConfig({ clawbot_telegramToken: e.target.value })}
                                                placeholder="Token del BotFather (ej: 856764...:AAH...)"
                                            />
                                            <button
                                                className="btn btn-sm"
                                                style={{ flexShrink: 0, padding: '6px 10px' }}
                                                onClick={() => setShowToken(v => !v)}
                                                title={showToken ? 'Ocultar token' : 'Mostrar token'}
                                            >
                                                {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                        <span style={{ fontSize: 11, color: config.clawbot_telegramToken ? '#22c55e' : 'var(--text-3)' }}>
                                            {config.clawbot_telegramToken
                                                ? `✓ Token activo: ${showToken ? config.clawbot_telegramToken : config.clawbot_telegramToken.substring(0,8) + '...' + config.clawbot_telegramToken.slice(-4)}`
                                                : '⚠ Sin token — el bot no responderá'}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* WhatsApp Channel */}
                        <div className="openclaw-channel-row" style={{ marginTop: 12 }}>
                            <div className="openclaw-channel-icon">
                                <Smartphone size={20} />
                            </div>
                            <div className="openclaw-channel-body">
                                <div className="openclaw-channel-header">
                                    <div>
                                        <p className="openclaw-channel-title">WhatsApp — +34 644 984 173</p>
                                        <p className="openclaw-channel-sub">
                                            {waStatus === 'connected' ? 'Sesión activa. TESS está escuchando tu número.' :
                                             waStatus === 'waiting_qr' ? 'Escanea el código QR con tu app de WhatsApp.' :
                                             waStatus === 'starting' ? 'Inicializando el cliente de WhatsApp...' :
                                             'Activa el interruptor para conectar WhatsApp.'}
                                        </p>
                                    </div>
                                    <label className="toggle-switch">
                                        <input
                                            type="checkbox"
                                            checked={!!config.clawbot_whatsappEnabled}
                                            onChange={(e) => handleSaveConfig({ clawbot_whatsappEnabled: e.target.checked })}
                                        />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>
                                {config.clawbot_whatsappEnabled && (
                                    <div className="openclaw-status-row">
                                        <div className={`openclaw-status-indicator ${waStatus}`}></div>
                                        <span>
                                            {waStatus === 'connected' ? '✅ Conectado y listo' :
                                             waStatus === 'starting' ? '⏳ Iniciando Puppeteer...' :
                                             waStatus === 'waiting_qr' ? '📱 Esperando escaneo QR' :
                                             '⚫ Desconectado'}
                                        </span>
                                    </div>
                                )}
                                {config.clawbot_whatsappEnabled && waStatus === 'waiting_qr' && waQr && (
                                    <div className="openclaw-qr-box">
                                        <img src={waQr} alt="WhatsApp QR" />
                                        <p>Abre WhatsApp → Dispositivos Vinculados → Vincular dispositivo</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}

                <div className="settings-footer">
                    <p>DevAssist v1.1.0 — 100% Local AI System</p>
                </div>
            </div>
        </div>
    );
};

export default SettingsModule;
