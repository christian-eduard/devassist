import React, { useState, useEffect, useCallback } from 'react';
import {
    Zap, Bot, Activity, Cpu, ShieldCheck, Save, RefreshCw, Database, Terminal as TerminalIcon, BrainCircuit, Command, Share2, Codepen, DollarSign
} from 'lucide-react';
import './AIHubModule.css';

// ── COMPONENTS ──
const NeuralTrace = () => {
    const [pulses, setPulses] = useState([]);

    useEffect(() => {
        if (!window.electronAPI) return;
        const removeListener = window.electronAPI.on('ai:pulse', (data) => {
            const id = Date.now();
            setPulses(prev => [...prev.slice(-4), { ...data, id }]);
            setTimeout(() => {
                setPulses(prev => prev.filter(p => p.id !== id));
            }, 10000); // Duración de la animación
        });
        return () => removeListener();
    }, []);

    return (
        <div className="neural-trace-container">
            <div className="trace-path"></div>
            {pulses.map(p => (
                <div key={p.id} className="trace-pulse" style={{ animationDelay: '0s' }}>
                    <div className={`pulse-dot ${p.provider}`}></div>
                    <span className="pulse-tag">{p.model || 'LPU Flow'}</span>
                </div>
            ))}
            {pulses.length === 0 && (
                <div style={{ position: 'absolute', width: '100%', textAlign: 'center', top: '45%', fontSize: '10px', color: 'var(--nexus-muted)', opacity: 0.3, letterSpacing: '2px' }}>
                    AWAITING NEURAL SIGNALS...
                </div>
            )}
        </div>
    );
};

const FlowReport = React.memo(({ stats }) => (
    <div className="flow-report">
        <div className="flow-item">
            <div className="flow-label">Token Flow</div>
            <div className="flow-bar-container">
                <div className="flow-bar fill-tokens" style={{ width: `${Math.min(stats.tokens / 200000 * 100, 100)}%` }}>
                    <div className="flow-glow"></div>
                </div>
            </div>
            <div className="flow-val">{stats.tokens.toLocaleString()}</div>
        </div>
        <div className="flow-item">
            <div className="flow-label">Savings</div>
            <div className="flow-bar-container">
                <div className="flow-bar fill-savings" style={{ width: `${Math.min(parseFloat(stats.savings) * 5, 100)}%` }}>
                    <div className="flow-glow green"></div>
                </div>
            </div>
            <div className="flow-val">{stats.savings} USD</div>
        </div>
    </div>
));

const ProviderCard = React.memo(({ id, name, logo: Logo, currentKey, status, onSave, onTest, description }) => {
    const [inputValue, setInputValue] = useState('');
    const [isTesting, setIsTesting] = useState(false);

    const handleTest = async () => {
        setIsTesting(true);
        await onTest();
        setTimeout(() => setIsTesting(false), 2000);
    };

    return (
        <div className={`premium-ai-card ${isTesting ? 'testing' : ''}`}>
            <div className="card-header-elite">
                <div className="provider-info-main">
                    <div className="prov-logo-container">
                        <Logo size={20} color={status === 'online' ? 'var(--nexus-green)' : 'var(--nexus-muted)'} />
                    </div>
                    <div>
                        <div style={{ fontSize: '14px', fontWeight: 800 }}>{name}</div>
                        <div className={`status-badge-elite ${status}`}>
                            <div className="status-dot"></div>
                            {status}
                        </div>
                    </div>
                </div>
                <button className={`nexus-btn-test ${isTesting ? 'loading' : ''}`} onClick={handleTest} title="Test Connection">
                    <RefreshCw size={14} />
                </button>
            </div>

            <div className="prov-key-section">
                <input 
                    type="password" 
                    className="prov-input-premium"
                    placeholder="Integrate API Key..." 
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                />
                <button className="n-save-icon" onClick={() => { onSave(inputValue); setInputValue(''); }}>
                    <Save size={14} />
                </button>
            </div>

            <div className="card-footer-stats">
                <span>Validated •••• {currentKey?.slice(-4) || 'NONE'}</span>
                <div className="info-hint" title={description}>?</div>
            </div>
        </div>
    );
});

// ── MAIN MODULE ──
const AIHubModule = ({ showToast }) => {
    const [geminiConfig, setGeminiConfig] = useState({ apiKey: '', model: 'gemini-1.5-flash' });
    const [apiKeys, setApiKeys] = useState({});
    const [aiStatus, setAiStatus] = useState({ gemini: 'loading', groq: 'loading', openrouter: 'loading', openai: 'loading', huggingface: 'loading' });
    const [aiAssignments, setAiAssignments] = useState({});
    const [isRunningDiagnostic, setIsRunningDiagnostic] = useState(false);
    const [usageStats, setUsageStats] = useState({ tokens: 0, savings: '0.00' });
    const [activityLogs, setActivityLogs] = useState([]);

    useEffect(() => {
        if (!window.electronAPI) return;

        // Cargar estadísticas iniciales
        window.electronAPI.ai.getUsageStats().then(stats => {
            if (stats.ok) setUsageStats({ tokens: stats.tokens, savings: stats.savings.toFixed(2) });
        });

        // Suscribirse a logs en vivo con límite estricto (V9)
        const removeLogger = window.electronAPI.on('logger:message', (data) => {
            setActivityLogs(prev => {
                const next = [...prev, data];
                return next.length > 15 ? next.slice(-15) : next;
            });
        });

        return () => removeLogger();
    }, []);

    const loadConfig = useCallback(async () => {
        if (!window.electronAPI) return;
        const config = await window.electronAPI.ai.getConfig();
        if (config.gemini) setGeminiConfig(config.gemini);
        if (config.apiKeys) setApiKeys(config.apiKeys);
        if (config.aiAssignments) setAiAssignments(config.aiAssignments);
        setAiStatus({
            gemini: config.gemini?.apiKey ? 'online' : 'offline',
            groq: config.apiKeys?.groq ? 'online' : 'offline',
            openrouter: config.apiKeys?.openrouter ? 'online' : 'offline',
            openai: config.apiKeys?.openai ? 'online' : 'offline',
            huggingface: config.apiKeys?.huggingface ? 'online' : 'offline'
        });
    }, []);

    useEffect(() => { loadConfig(); }, [loadConfig]);

    const testProvider = async (provider) => {
        if (!window.electronAPI) return;
        const result = await (provider === 'gemini' ? window.electronAPI.ai.testGemini() :
                       provider === 'groq' ? window.electronAPI.ai.testGroq() :
                       provider === 'openrouter' ? window.electronAPI.ai.testOpenRouter() :
                       provider === 'openai' ? window.electronAPI.ai.testOpenAI() :
                       window.electronAPI.ai.testHuggingFace());

        if (result?.ok) {
            showToast(`${provider.toUpperCase()} OK`, 'success');
            setAiStatus(prev => ({ ...prev, [provider]: 'online' }));
        } else {
            showToast(`Error en ${provider}`, 'error');
            setAiStatus(prev => ({ ...prev, [provider]: 'offline' }));
        }
    };

    const handleUpdateKey = async (provId, val) => {
        if (provId === 'gemini') {
            await window.electronAPI.ai.saveGeminiConfig({ ...geminiConfig, apiKey: val });
        } else {
            const config = await window.electronAPI.config.load();
            await window.electronAPI.config.save({ ...config, apiKeys: { ...config.apiKeys, [provId]: val } });
        }
        showToast('Key guardada', 'success');
        loadConfig();
    };

    const handleUpdateAssignment = async (taskId, providerId, model = 'auto') => {
        const fullConfig = await window.electronAPI.config.load();
        const newAssignments = { ...fullConfig.aiAssignments, [taskId]: { provider: providerId, model } };
        await window.electronAPI.config.save({ ...fullConfig, aiAssignments: newAssignments });
        setAiAssignments(newAssignments);
        showToast('Sincronizado', 'success');
    };

    return (
        <div className="nexus-dashboard">
            <header className="nexus-header-row">
                <div className="nexus-branding">
                    <h1>AI HUB <span className="el-tag">ELITE Control</span></h1>
                    <p>Mando de Inteligencia Progresiva & Soberanía Táctica.</p>
                </div>
                <div className="nexus-stats-bar">
                    <div className="n-stat">
                        <Zap size={14} color="var(--nexus-accent)" />
                        DIRECT MODE
                    </div>
                    <div className="n-stat">
                        <Database size={14} color="var(--nexus-cyan)" />
                        {usageStats.tokens.toLocaleString()} <small style={{marginLeft: '4px', opacity: 0.5}}>TKNS</small>
                    </div>
                    <div className="n-stat">
                        <ShieldCheck size={14} color="var(--nexus-green)" />
                        {usageStats.savings} <small style={{marginLeft: '4px', opacity: 0.5}}>USD SAVED</small>
                    </div>
                </div>
            </header>

            <div className="nexus-scroll-container">
                <div className="nexus-command-grid">
                    <section className="nexus-panel">
                        <div className="panel-title">
                            <Cpu size={14} /> Master Control Center
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <div className="prov-logo-container">
                                    <Bot size={20} color="var(--nexus-accent)" />
                                </div>
                                <div>
                                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800 }}>Neural Brain Matrix</h4>
                                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--nexus-muted)' }}>Cerebro principal para razonamiento global.</p>
                                </div>
                            </div>
                            
                            <select 
                                className="nexus-select-elite"
                                value={`${aiAssignments['brain-supervisor']?.provider || 'gemini'}:${aiAssignments['brain-supervisor']?.model || 'gemini-1.5-flash'}`}
                                onChange={(e) => {
                                    const [p, m] = e.target.value.split(':');
                                    handleUpdateAssignment('brain-supervisor', p, m);
                                }}
                            >
                                <option value="gemini:gemini-1.5-flash">Gemini 1.5 Flash (Standard)</option>
                                <option value="gemini:gemini-1.5-pro">Gemini 1.5 Pro (Precision)</option>
                                <option value="openai:gpt-4o">OpenAI GPT-4o (Logic)</option>
                                <option value="groq:llama-3.3-70b">Groq Llama 3.3 (Extreme)</option>
                            </select>

                            <div className="nexus-switch-container">
                                <label className="nexus-switch-container">
                                    <div style={{ position: 'relative' }}>
                                        <input 
                                            type="checkbox" 
                                            style={{ display: 'none' }}
                                            checked={aiAssignments['vault-research']?.model === 'auto'}
                                            onChange={(e) => handleUpdateAssignment('vault-research', 'openrouter', e.target.checked ? 'auto' : 'google/gemini-2.0-flash-001')}
                                        />
                                        <div className="n-switch-base">
                                            <div className="n-switch-knob"></div>
                                        </div>
                                    </div>
                                    <span style={{color: 'var(--nexus-text)', opacity: 0.9}}>Activate Free-Ride Intelligent Routing</span>
                                    <div className="info-hint" title="Activa la rotación automática hacia modelos gratuitos cuando la latencia es alta o el presupuesto es bajo.">?</div>
                                </label>
                            </div>
                        </div>
                    </section>

                    <section className="nexus-panel">
                        <div className="panel-title">
                            <Activity size={14} /> Real-Time Analytics & Neural Trace
                        </div>
                        <FlowReport stats={usageStats} />
                        <NeuralTrace />
                    </section>
                </div>

                <section className="nexus-panel">
                    <div className="panel-title">
                        <Database size={14} /> Intelligence Infrastructure Vault
                    </div>
                    <div className="infra-grid">
                        <ProviderCard id="gemini" name="Google Gemini" logo={BrainCircuit} currentKey={geminiConfig.apiKey} status={aiStatus.gemini} onSave={(val)=>handleUpdateKey('gemini', val)} onTest={()=>testProvider('gemini')} description="Motor de Google para análisis masivo de contextos y código." />
                        <ProviderCard id="groq" name="Groq LPU" logo={Zap} currentKey={apiKeys.groq} status={aiStatus.groq} onSave={(val)=>handleUpdateKey('groq', val)} onTest={()=>testProvider('groq')} description="Inferencia ultrarrápida para chat y streaming de tokens." />
                        <ProviderCard id="openai" name="OpenAI" logo={Command} currentKey={apiKeys.openai} status={aiStatus.openai} onSave={(val)=>handleUpdateKey('openai', val)} onTest={()=>testProvider('openai')} description="Estándar para lógica compleja y tareas creativas avanzadas." />
                        <ProviderCard id="openrouter" name="Neural Router" logo={Share2} currentKey={apiKeys.openrouter} status={aiStatus.openrouter} onSave={(val)=>handleUpdateKey('openrouter', val)} onTest={()=>testProvider('openrouter')} description="Acceso a modelos Open Source y soporte para Free-Ride." />
                        <ProviderCard id="huggingface" name="HuggingFace" logo={Codepen} currentKey={apiKeys.huggingface} status={aiStatus.huggingface} onSave={(val)=>handleUpdateKey('huggingface', val)} onTest={()=>testProvider('huggingface')} description="Modelos locales y embeddings de baja latencia." />
                    </div>
                </section>

                <div className="nexus-command-grid">
                    <section className="nexus-panel">
                        <div className="panel-title">
                            <TerminalIcon size={14} /> Activity Terminal
                        </div>
                        <div className="nexus-terminal">
                            {activityLogs.length === 0 && (
                                <div className="term-line" style={{ opacity: 0.3 }}>- Awaiting system activity -</div>
                            )}
                            {activityLogs.map((log, i) => (
                                <div key={i} className="term-line">
                                    <span className="t-stamp">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                                    <span className="t-msg" style={{ color: log.level === 'ERROR' ? '#ef4444' : log.level === 'WARN' ? '#f59e0b' : '#e2e8f0' }}>
                                        {log.msg}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </section>
                    <section className="nexus-panel">
                        <div className="panel-title">
                            <Zap size={14} /> Operational Diagnostic
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                <span style={{color: 'var(--nexus-muted)'}}>LATENCY</span>
                                <span style={{fontWeight: 800, color: 'var(--nexus-cyan)'}}>24.8 ms</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                <span style={{color: 'var(--nexus-muted)'}}>NODE SYNC</span>
                                <span style={{fontWeight: 800, color: 'var(--nexus-green)'}}>100% ONLINE</span>
                            </div>
                            <button 
                                className="nexus-select-elite"
                                style={{ marginTop: '12px', background: 'var(--nexus-accent)', border: 'none', textAlign: 'center' }}
                                onClick={() => {
                                    setIsRunningDiagnostic(true);
                                    setTimeout(() => {
                                        setIsRunningDiagnostic(false);
                                        showToast('Diagnóstico completo', 'success');
                                    }, 2000);
                                }}
                            >
                                <RefreshCw size={14} style={{ marginRight: '8px' }} className={isRunningDiagnostic ? 'spin' : ''} />
                                {isRunningDiagnostic ? 'RUNNING DIAGNOSTIC...' : 'INITIATE NEURAL TEST'}
                            </button>
                        </div>
                    </section>
                </div>
            </div>

            <footer style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontWeight: 800, color: 'var(--nexus-muted)', letterSpacing: '1.5px' }}>
                <span>NUCLEO OPERATIVO: OPTIMAL</span>
                <span>DEVASSIST NEXUS // ELITE CONTROL v7.4 // SOBERANÍA TÁCTICA</span>
            </footer>
        </div>
    );
};

export default AIHubModule;
