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
    EyeOff,
    Globe,
    Zap,
    RefreshCw,
    Shield,
    User
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
    const [googleStatus, setGoogleStatus] = useState({ connected: false, account: 'Desconectado' });
    const [browsingStatus, setBrowsingStatus] = useState({ gateway: 'loading', extension: 'loading' });
    const [openClawConfig, setOpenClawConfig] = useState(null);
    const [newAllowedNumber, setNewAllowedNumber] = useState('');

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

        if (window.electronAPI.google) {
            const gStatus = await window.electronAPI.google.getStatus();
            setGoogleStatus(gStatus);
        }

        if (window.electronAPI.browsing) {
            const bStatus = await window.electronAPI.browsing.getStatus();
            setBrowsingStatus(bStatus);
        }

        if (window.electronAPI.config.loadOpenClaw) {
            const ocData = await window.electronAPI.config.loadOpenClaw();
            setOpenClawConfig(ocData);
        }
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

    const handleSaveOpenClaw = async (updates) => {
        const newOC = { ...openClawConfig, ...updates };
        setOpenClawConfig(newOC);
        const res = await window.electronAPI.config.saveOpenClaw(newOC);
        if (res.ok) {
            showToast('Ajustes de OpenClaw guardados', 'success');
        } else {
            showToast('Error al guardar en OpenClaw: ' + res.error, 'error');
        }
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
        { id: 'google', label: 'Google Workspace', icon: <Globe size={16} /> },
        { id: 'browsing', label: 'Navegación / Gateway', icon: <Zap size={16} /> },
        { id: 'clawbot', label: 'OpenClaw / TESS', icon: <Rocket size={16} /> }
    ];

    const handleGoogleAuth = async () => {
        try {
            await window.electronAPI.google.startAuth();
            showToast('Autorización iniciada en tu navegador', 'info');
        } catch (err) {
            showToast('Error al iniciar OAuth', 'error');
        }
    };

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

                {activeTab === 'google' && (
                    <section className="section">
                        <h3 className="section-title"><Globe size={18} /> Google Workspace (Drive, Docs, Calendar)</h3>
                        <div className="google-status-card">
                            <div className="google-status-info">
                                <span className={`status-badge ${googleStatus.connected ? 'online' : 'offline'}`}>
                                    {googleStatus.connected ? 'Conectado' : 'Sin vincular'}
                                </span>
                                <p className="google-account-name">{googleStatus.account}</p>
                                <p className="google-account-hint">Usa esta conexión para exportar fichas a Google Docs y sincronizar tu calendario técnico.</p>
                            </div>
                            <button className="btn btn-primary" onClick={handleGoogleAuth}>
                                <Rocket size={16} style={{ marginRight: 8 }} /> {googleStatus.connected ? 'Sincronizar Cuenta' : 'Vincular con Google'}
                            </button>
                        </div>
                        <p className="section-hint" style={{ marginTop: 12 }}>
                            Esta conexión utiliza el protocolo <strong style={{color: '#4f46e5'}}>Enterprise MCP</strong> de Presto AI. No almacenamos tus llaves maestras en nuestro sistema.
                        </p>

                        <div className="assistant-settings-box" style={{ marginTop: 24, padding: 20, background: 'var(--bg-2)', borderRadius: 12, border: '1px solid var(--border-1)' }}>
                            <h3 className="section-title" style={{ marginBottom: 16 }}>🏃‍♂️ Disponibilidad del Asistente (Aprendizaje)</h3>
                            <div className="section-row">
                                <span className="section-label">Horario de Inicio</span>
                                <input 
                                    type="time" 
                                    className="input sm" 
                                    value={config.assistant?.learningStart || '17:00'} 
                                    onChange={(e) => handleSaveConfig({ 
                                        assistant: { ...config.assistant, learningStart: e.target.value } 
                                    })}
                                />
                            </div>
                            <div className="section-row">
                                <span className="section-label">Horario de Fin</span>
                                <input 
                                    type="time" 
                                    className="input sm" 
                                    value={config.assistant?.learningEnd || '20:00'} 
                                    onChange={(e) => handleSaveConfig({ 
                                        assistant: { ...config.assistant, learningEnd: e.target.value } 
                                    })}
                                />
                            </div>
                            <div className="section-row">
                                <span className="section-label">Duración de Sesión (min)</span>
                                <input 
                                    type="number" 
                                    className="input sm" 
                                    value={config.assistant?.defaultSlotMinutes || 45} 
                                    onChange={(e) => handleSaveConfig({ 
                                        assistant: { ...config.assistant, defaultSlotMinutes: parseInt(e.target.value) } 
                                    })}
                                />
                            </div>
                            <div className="section-row">
                                <span className="section-label">Auto-confirmar tras (min)</span>
                                <input 
                                    type="number" 
                                    className="input sm" 
                                    value={config.assistant?.autoScheduleAfterMinutes || 30} 
                                    onChange={(e) => handleSaveConfig({ 
                                        assistant: { ...config.assistant, autoScheduleAfterMinutes: parseInt(e.target.value) } 
                                    })}
                                />
                            </div>
                            <p className="section-hint" style={{ marginTop: 12 }}>
                                TESS buscará huecos libres en este rango para agendar revisiones de herramientas y tutoriales automáticamente.
                            </p>
                        </div>
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

                        {/* Privacy / Allowlist Section */}
                        <section className="section" style={{ marginTop: 24 }}>
                            <h3 className="section-title"><Shield size={18} /> Privacidad y Lista Blanca</h3>
                            <p className="section-hint">TESS solo responderá a los números o IDs en esta lista. Otros serán ignorados.</p>
                            
                            <div className="allowlist-box" style={{ background: 'var(--bg-2)', borderRadius: 8, padding: 12, marginTop: 8 }}>
                                <div className="allowlist-items" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                                    {openClawConfig?.channels?.whatsapp?.allowFrom?.map(num => (
                                        <div key={num} className="tag" style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--accent-1)', color: 'white', padding: '4px 8px', borderRadius: 4, fontSize: 12 }}>
                                            {num}
                                            <button 
                                                onClick={() => {
                                                    const current = openClawConfig.channels.whatsapp.allowFrom || [];
                                                    handleSaveOpenClaw({
                                                        channels: {
                                                            ...openClawConfig.channels,
                                                            whatsapp: {
                                                                ...openClawConfig.channels.whatsapp,
                                                                allowFrom: current.filter(n => n !== num)
                                                            }
                                                        }
                                                    });
                                                }}
                                                style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: 14 }}
                                            >
                                                &times;
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <div className="section-row" style={{ gap: 8 }}>
                                    <input 
                                        type="text" 
                                        className="input sm" 
                                        placeholder="Ej: 34600112233@c.us" 
                                        value={newAllowedNumber}
                                        onChange={(e) => setNewAllowedNumber(e.target.value)}
                                    />
                                    <button 
                                        className="btn btn-sm btn-primary"
                                        onClick={() => {
                                            if (!newAllowedNumber) return;
                                            const current = openClawConfig.channels.whatsapp.allowFrom || [];
                                            if (current.includes(newAllowedNumber)) return;
                                            handleSaveOpenClaw({
                                                channels: {
                                                    ...openClawConfig.channels,
                                                    whatsapp: {
                                                        ...openClawConfig.channels.whatsapp,
                                                        allowFrom: [...current, newAllowedNumber]
                                                    }
                                                }
                                            });
                                            setNewAllowedNumber('');
                                        }}
                                    >
                                        Añadir
                                    </button>
                                </div>
                            </div>
                        </section>
                    </>
                )}

                {activeTab === 'browsing' && (
                    <section className="section">
                        <h3 className="section-title"><Zap size={18} /> Diagnóstico de Navegación (OpenClaw)</h3>
                        <div className="gateway-status-grid">
                            <div className="status-item-box">
                                <span className="status-label">OpenClaw Gateway</span>
                                <span className={`status-badge ${browsingStatus.gateway === 'online' ? 'online' : 'offline'}`}>
                                    {browsingStatus.gateway === 'online' ? 'Activo' : 'Inactivo'}
                                </span>
                                <p className="status-hint">Servicio local en el puerto 18789. Es el puente entre la IA y el Navegador.</p>
                            </div>
                            
                            <div className="status-item-box">
                                <span className="status-label">Extensión de Chrome</span>
                                <span className={`status-badge ${browsingStatus.extension === 'connected' ? 'online' : 'offline'}`}>
                                    {browsingStatus.extension === 'connected' ? 'Vinculada' : 'Sin pestaña activa'}
                                </span>
                                <p className="status-hint">Estado de la conexión con el plugin de OpenClaw en tu navegador principal.</p>
                            </div>
                        </div>

                        {/* Browser Profile Selection */}
                        <div className="section" style={{ marginTop: 24 }}>
                            <h3 className="section-title"><User size={18} /> Perfil del Navegador</h3>
                            <div className="section-row">
                                <span className="section-label">Motor de navegación</span>
                                <select 
                                    className="input sm"
                                    value={openClawConfig?.browser?.profile || 'user'}
                                    onChange={(e) => handleSaveOpenClaw({
                                        browser: {
                                            ...openClawConfig.browser,
                                            profile: e.target.value
                                        }
                                    })}
                                >
                                    <option value="user">Sesión Real (Chrome Personal)</option>
                                    <option value="openclaw">Sesión Aislada (Sandbox)</option>
                                </select>
                            </div>
                            <p className="section-hint">
                                {openClawConfig?.browser?.profile === 'user' ? 
                                    'Utiliza tu Chrome real con tus cuentas. Requiere el puerto 9222 activo.' : 
                                    'Crea un navegador limpio para cada tarea. No comparte cookies ni cuentas.'}
                            </p>
                        </div>

                        <div className="alert-message warning" style={{ marginTop: 24, padding: 16, background: 'rgba(234, 179, 8, 0.1)', border: '1px solid #eab308', borderRadius: 8 }}>
                            <p style={{ margin: 0, fontSize: 13, color: '#eab308' }}>
                                <strong>💡 Instrucción de Conexión:</strong> Para el perfil "Sesión Real", inicia Chrome desde la terminal con: <br/>
                                <code style={{ background: 'rgba(0,0,0,0.2)', padding: '2px 4px', borderRadius: 4 }}>/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222</code>
                            </p>
                        </div>

                        <div className="action-footer" style={{ marginTop: 24, display: 'flex', gap: 12 }}>
                            <button className="btn btn-primary" onClick={async () => {
                                const res = await window.electronAPI.browsing.getStatus();
                                setBrowsingStatus(res);
                                showToast('Estado actualizado', 'info');
                            }}>
                                <RefreshCw size={16} style={{ marginRight: 8 }} /> Verificar Conexión
                            </button>
                            <button className="btn btn-secondary" onClick={async () => {
                                const res = await window.electronAPI.browsing.restartGateway();
                                if (res.ok) showToast(res.message, 'success');
                            }}>
                                <Cpu size={16} style={{ marginRight: 8 }} /> Reiniciar Gateway
                            </button>
                        </div>
                    </section>
                )}

                <div className="settings-footer">
                    <p>DevAssist v1.1.0 — 100% Local AI System</p>
                </div>
            </div>
        </div>
    );
};

export default SettingsModule;
