import React, { useState, useEffect, useCallback } from 'react';
import {
    Sparkles,
    Zap,
    Bot,
    Folder,
    Bell,
    Search,
    Check,
    X,
    RefreshCw,
    MessageSquare,
    FileJson,
    Trash2,
    Database,
    Mic,
    Cpu
} from 'lucide-react';
import AgentsTab from './AgentsTab';

const SettingsModule = ({ showToast, clawbotActive, setClawbotActive, onNavigate }) => {
    const [config, setConfig] = useState(null);
    const [activeTab, setActiveTab] = useState('general');
    const [cacheStats, setCacheStats] = useState({ count: 0, sizeMB: '0.0' });
    const [isTestingGemini, setIsTestingGemini] = useState(false);
    const [geminiResult, setGeminiResult] = useState(null);

    // OpenClaw AI States
    const [ocConfig, setOcConfig] = useState(null);
    const [aiStatus, setAiStatus] = useState({
        gemini: 'loading',
        groq: 'loading',
        openrouter: 'loading'
    });

    // ── Load data ──
    const loadData = useCallback(async () => {
        if (!window.electronAPI) return;
        const data = await window.electronAPI.config.load();
        setConfig(data);

        const ocData = await window.electronAPI.config.getOpenClawAi();
        setOcConfig(ocData);

        const stats = await window.electronAPI.config.getCacheStats();
        setCacheStats(stats);

        checkAllAiStatus();
    }, []);

    const checkAllAiStatus = async () => {
        // Gemini
        const gRes = await window.electronAPI.ai.testGemini();
        // Placeholder check for others
        setAiStatus({
            gemini: gRes.ok ? 'online' : 'offline',
            groq: 'online', // Simple pilot for now
            openrouter: 'online'
        });
    };

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleSaveConfig = async (updates) => {
        const newConfig = { ...config, ...updates };
        setConfig(newConfig);
        await window.electronAPI.config.save(newConfig);
        showToast('Configuración guardada', 'success');
    };

    const handleSaveOcConfig = async (updates) => {
        const res = await window.electronAPI.config.saveOpenClawAi(updates);
        if (res.ok) {
            setOcConfig({ ...ocConfig, ...updates });
            showToast('Configuración de IA sincronizada con VECTRON', 'success');
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
        { id: 'agents', label: 'Agentes', icon: <Cpu size={16} /> },
        { id: 'storage', label: 'Almacenamiento', icon: <Database size={16} /> },
        { id: 'clawbot', label: 'Clawbot', icon: <Bot size={16} /> }
    ];

    return (
        <div className="settings-module">
            <header className="module-header">
                <div>
                    <h1>Configuración</h1>
                    <p>Gestiona tu entorno de trabajo y agentes</p>
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
                                    value={config.watchFolder}
                                    onChange={(e) => handleSaveConfig({ watchFolder: e.target.value })}
                                    placeholder="/Users/chris/Downloads"
                                />
                            </div>
                            <div className="section-row">
                                <span className="section-label">Nombre App Antigravity</span>
                                <input
                                    type="text"
                                    className="input sm"
                                    value={config.antigravityAppName}
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
                                    value={config.reminderDays}
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

                {activeTab === 'agents' && (
                    <AgentsTab showToast={showToast} />
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
                    <section className="section settings-section">
                        <h3 className="section-title"><Bot size={18} /> Clawbot Bridge</h3>
                        <p style={{ color: 'var(--text-2)', fontSize: 13, marginBottom: 12 }}>
                            La comunicación externa vía WhatsApp/Telegram y el sistema de agentes avanzado se gestiona en su propio módulo.
                        </p>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button className="btn btn-primary" onClick={() => onNavigate && onNavigate('clawbot')}>
                                Abrir Módulo Clawbot
                            </button>
                            <button className="btn outline" onClick={() => window.electronAPI.config.openClawbotSite()}>
                                Documentación OpenClaw
                            </button>
                        </div>
                    </section>
                )}

                <div className="settings-footer">
                    <p>DevAssist v1.1.0 — Powered by Eduardo Agent</p>
                </div>
            </div>
        </div>
    );
};

export default SettingsModule;
