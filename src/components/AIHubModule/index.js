import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Zap,
    Bot,
    Key,
    Activity,
    Cpu,
    ShieldCheck,
    Save,
    CheckCircle,
    ArrowRight,
    RefreshCw,
    ChevronDown,
    AlertCircle,
    Volume2,
    Play
} from 'lucide-react';
import './AIHubModule.css';

// Custom SVG Logos for AI Providers
const GeminiLogo = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 24, height: 24 }}>
        <path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1-8.313-12.454z" />
        <circle cx="12" cy="12" r="1" fill="currentColor" />
    </svg>
);

const GroqLogo = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 24, height: 24 }}>
        <path d="M12 2L2 7l10 5l10-5l-10-5zM2 17l10 5l10-5M2 12l10 5l10-5" />
    </svg>
);

const OpenRouterLogo = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 24, height: 24 }}>
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <line x1="9" y1="3" x2="9" y2="21" />
        <line x1="15" y1="3" x2="15" y2="21" />
        <line x1="3" y1="9" x2="21" y2="9" />
        <line x1="3" y1="15" x2="21" y2="15" />
    </svg>
);

const OpenAILogo = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 24, height: 24 }}>
        <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5153-4.9066 6.0462 6.0462 0 0 0-4.445-2.9155 6.0073 6.0073 0 0 0-5.064 1.4774 6.012 6.012 0 0 0-5.064-1.4774 6.0462 6.0462 0 0 0-4.445 2.9155 5.9847 5.9847 0 0 0-.5153 4.9066 6.0105 6.0105 0 0 0 1.4158 5.0133 5.9847 5.9847 0 0 0 .5153 4.9066 6.0462 6.0462 0 0 0 4.445 2.9155 6.0073 6.0073 0 0 0 5.064-1.4774 6.012 6.012 0 0 0 5.064 1.4774 6.0462 6.0462 0 0 0 4.445-2.9155 5.9847 5.9847 0 0 0 .5153-4.9066 6.0105 6.0105 0 0 0-1.4158-5.0133zM12.312 22.4902a3.7121 3.7121 0 0 1-2.4385-.9024l.139-.0799 4.636-2.6691a.888.888 0 0 0 .444-.7688v-6.5612l1.865 1.0776a.016.016 0 0 1 .0085.014v5.2012a3.7918 3.7918 0 0 1-3.654 3.6886zm-10.209-4.664a3.7124 3.7124 0 0 1 .1372-2.5975l.139.0801 4.6346 2.6713a.8882.8882 0 0 0 .8903 0l5.6834-3.279v2.155a.016.016 0 0 1-.0073.014l-4.5057 2.6a3.7921 3.7921 0 0 1-4.922-1.0503l-2.0493-4.0936zm.0565-10.968a3.7123 3.7123 0 0 1 2.5753-1.705l.139.0801 4.636 2.6691a.888.888 0 0 0 .444.7688v6.5612l-1.865-1.0776a.016.016 0 0 1-.0085-.014V8.5434a3.7918 3.7918 0 0 1 3.654-3.6886zm15.824 3.7123a3.7124 3.7124 0 0 1-.1372 2.5975l-.139-.0801-4.6346-2.6713a.8882.8882 0 0 0-.8903 0l-5.6834 3.279v-2.155a.016.016 0 0 1 .0073-.014l4.5057-2.6a3.7921 3.7921 0 0 1 4.922 1.0503l1.5495 3.0936z" />
    </svg>
);

const HuggingFaceLogo = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 24, height: 24 }}>
        <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm5.5 13.5c-.828 0-1.5-.672-1.5-1.5s.672-1.5 1.5-1.5 1.5.672 1.5 1.5-.672 1.5-1.5 1.5zM7 11.5c.828 0 1.5.672 1.5 1.5s-.672 1.5-1.5 1.5-1.5-.672-1.5-1.5.672-1.5 1.5-1.5zm5 8c-2.67 0-5-1.33-6.17-3.33.16-.06.33-.11.51-.11h11.33c.18 0 .35.05.51.11C17 18.17 14.67 19.5 12 19.5z" />
    </svg>
);

const ElevenLabsLogo = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 24, height: 24 }}>
        <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18c-3.314 0-6-2.686-6-6s2.686-6 6-6 6 2.686 6 6-2.686 6-6 6z" />
        <path d="M12 14c-1.105 0-2-.895-2-2s.895-2 2-2 2 .895 2 2-.895 2-2 2z" />
    </svg>
);

const NeuralMap = () => (
    <div className="neural-map-container card luxury-glow">
        <div className="neural-bg-glow"></div>
        <h3 className="section-title"><Zap size={18} /> Orquestación VECTRON Neural</h3>
        <div className="schematic-wrapper">
            <svg viewBox="0 0 800 300" className="neural-svg">
                <path d="M100 70 L250 150" className="path-line anim" />
                <path d="M100 150 L250 150" className="path-line anim" />
                <path d="M100 230 L250 150" className="path-line anim" />

                <path d="M250 150 L500 40" className="path-line anim-delay" />
                <path d="M250 150 L500 95" className="path-line anim-delay" />
                <path d="M250 150 L500 150" className="path-line anim-delay" />
                <path d="M250 150 L500 205" className="path-line anim-delay" />
                <path d="M250 150 L500 260" className="path-line anim-delay" />

                <path d="M500 40 L700 150" className="path-line anim-final" />
                <path d="M500 95 L700 150" className="path-line anim-final" />
                <path d="M500 150 L700 150" className="path-line anim-final" />
                <path d="M500 205 L700 150" className="path-line anim-final" />
                <path d="M500 260 L700 150" className="path-line anim-final" />

                <g className="node input-node">
                    <circle cx="100" cy="70" r="28" />
                    <text x="100" y="75" textAnchor="middle">Vault</text>
                </g>
                <g className="node input-node">
                    <circle cx="100" cy="150" r="28" />
                    <text x="100" y="155" textAnchor="middle">WA</text>
                </g>
                <g className="node input-node">
                    <circle cx="100" cy="230" r="28" />
                    <text x="100" y="235" textAnchor="middle">TikTok</text>
                </g>

                <g className="node core-node">
                    <circle cx="250" cy="150" r="45" />
                    <text x="250" y="155" textAnchor="middle" className="core-text">VECTRON</text>
                </g>

                <g className="node model-node">
                    <circle cx="500" cy="40" r="22" />
                    <text x="500" y="44" textAnchor="middle" style={{ fontSize: '8px' }}>Gemini</text>
                </g>
                <g className="node model-node">
                    <circle cx="500" cy="95" r="22" />
                    <text x="500" y="99" textAnchor="middle" style={{ fontSize: '8px' }}>Groq</text>
                </g>
                <g className="node model-node">
                    <circle cx="500" cy="150" r="22" />
                    <text x="500" y="154" textAnchor="middle" style={{ fontSize: '8px' }}>OpenAI</text>
                </g>
                <g className="node model-node">
                    <circle cx="500" cy="205" r="22" />
                    <text x="500" y="209" textAnchor="middle" style={{ fontSize: '8px' }}>Router</text>
                </g>
                <g className="node model-node">
                    <circle cx="500" cy="260" r="22" />
                    <text x="500" y="264" textAnchor="middle" style={{ fontSize: '8px' }}>H.Face</text>
                </g>

                <g className="node output-node">
                    <circle cx="700" cy="150" r="40" />
                    <text x="700" y="155" textAnchor="middle">IA Hub</text>
                </g>
            </svg>
            <div className="map-tutorial">
                <h4>Pipeline Neuronal</h4>
                <p>Procesamiento asíncrono y redundante de datos multimedia.</p>
                <div className="stats-row">
                    <div className="stat"><Activity size={14} /> Velocidad <br /><span>Flash</span></div>
                    <div className="stat"><ShieldCheck size={14} /> Seguridad <br /><span>AES-256</span></div>
                </div>
            </div>
        </div>
    </div>
);

const CustomSelect = ({ value, options, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = options.find(opt => opt.value === value);

    return (
        <div className="custom-select-container" ref={containerRef}>
            <div className={`custom-select-trigger ${isOpen ? 'open' : ''}`} onClick={() => setIsOpen(!isOpen)}>
                <span>{selectedOption ? selectedOption.label : 'Seleccionar modelo...'}</span>
                <ChevronDown size={16} className={`arrow ${isOpen ? 'rotated' : ''}`} />
            </div>
            {isOpen && (
                <div className="custom-select-options luxury-glow">
                    {options.map(opt => (
                        <div
                            key={opt.value}
                            className={`custom-option ${value === opt.value ? 'selected' : ''}`}
                            onClick={() => {
                                onChange(opt.value);
                                setIsOpen(false);
                            }}
                        >
                            <div className="opt-content">
                                <span className="opt-label">{opt.label}</span>
                                {opt.hint && <span className="opt-hint">{opt.hint}</span>}
                            </div>
                            {value === opt.value && <CheckCircle size={14} className="check" />}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const ProviderCard = ({ id, name, logo, currentKey, onSave, onTest, models, status, testStatus }) => {
    const [inputValue, setInputValue] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isTesting, setIsTesting] = useState(false);

    const handleSaveAction = async () => {
        if (!inputValue) return;
        setIsSaving(true);
        await onSave(inputValue);
        setInputValue('');
        setIsSaving(false);
    };

    const handleTestAction = async () => {
        setIsTesting(true);
        await onTest();
        setIsTesting(false);
    };

    const maskKey = (key) => {
        if (!key) return <span className="no-conf">PENDIENTE CONFIGURACIÓN</span>;
        return <span className="conf-masked">CONEXIÓN CONFIGURADA •••• {key.slice(-4)}</span>;
    };

    return (
        <div className={`luxury-card wide-card ${status}`}>
            <div className="card-glass-header luxury">
                <div className="provider-brand">
                    <div className={`brand-logo ${id}`}>{logo}</div>
                    <div className="brand-text">
                        <h4>{name}</h4>
                        {maskKey(currentKey)}
                    </div>
                </div>
                <div className="header-actions-right">
                    <button
                        className={`btn-test-connection ${isTesting ? 'spinning' : ''} ${testStatus || ''}`}
                        onClick={handleTestAction}
                        disabled={isTesting || !currentKey}
                        title="Comprobar conexión"
                    >
                        <RefreshCw size={14} />
                        <span>Comprobar</span>
                    </button>
                    <div className={`status-pill ${status}`}>
                        <div className="pulse-dot"></div>
                        {status.toUpperCase()}
                    </div>
                </div>
            </div>
            <div className="card-body">
                <div className="key-action-row">
                    <div className="input-with-button">
                        <Key size={14} className="input-icon" />
                        <input
                            type="password"
                            placeholder="Introduce nueva clave API para actualizar..."
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                        />
                        <button
                            className={`btn-save-inline ${inputValue ? 'ready' : ''}`}
                            onClick={handleSaveAction}
                            disabled={!inputValue || isSaving}
                        >
                            {isSaving ? <span className="spinner-tiny"></span> : <Save size={16} />}
                        </button>
                    </div>
                </div>
                <div className="model-footer">
                    <label>Ecosistema de Modelos Disponibles</label>
                    <div className="model-pill-container">
                        {models.map(m => (
                            <span key={m.name} className={`m-pill ${m.active ? 'active' : ''}`}>
                                {m.active && <CheckCircle size={10} />}
                                {m.name}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

const AIHubModule = ({ showToast }) => {
    const [geminiConfig, setGeminiConfig] = useState({ apiKey: '', model: 'gemini-2.0-flash-001' });
    const [apiKeys, setApiKeys] = useState({});
    const [ocConfig, setOcConfig] = useState(null);
    const [aiStatus, setAiStatus] = useState({ gemini: 'loading', groq: 'loading', openrouter: 'loading', openai: 'loading', huggingface: 'loading', elevenlabs: 'loading' });
    const [testResults, setTestResults] = useState({ gemini: '', groq: '', openrouter: '', openai: '', huggingface: '', elevenlabs: '' });

    const loadConfig = useCallback(async () => {
        if (!window.electronAPI) return;
        const config = await window.electronAPI.ai.getConfig();
        if (config.gemini) setGeminiConfig(config.gemini);
        if (config.apiKeys) setApiKeys(config.apiKeys);

        const ocData = await window.electronAPI.config.getOpenClawAi();
        setOcConfig(ocData);
        // Initial silent check
        checkSimpleStatus();
    }, []);

    const checkSimpleStatus = async () => {
        if (!window.electronAPI) return;
        // Simple heuristic based on key presence for initial state
        setAiStatus({
            gemini: geminiConfig.apiKey ? 'online' : 'offline',
            groq: apiKeys.groq ? 'online' : 'offline',
            openrouter: apiKeys.openrouter ? 'online' : 'offline',
            openai: apiKeys.openai ? 'online' : 'offline',
            huggingface: apiKeys.huggingface ? 'online' : 'offline',
            elevenlabs: apiKeys.elevenlabs ? 'online' : 'offline'
        });
    };

    useEffect(() => { loadConfig(); }, [loadConfig]);

    const testProvider = async (provider) => {
        if (!window.electronAPI) return;
        let result;
        setTestResults(prev => ({ ...prev, [provider]: 'testing' }));

        if (provider === 'gemini') result = await window.electronAPI.ai.testGemini();
        else if (provider === 'groq') result = await window.electronAPI.ai.testGroq();
        else if (provider === 'openrouter') result = await window.electronAPI.ai.testOpenRouter();
        else if (provider === 'openai') result = await window.electronAPI.ai.testOpenAI();
        else if (provider === 'huggingface') result = await window.electronAPI.ai.testHuggingFace();
        else if (provider === 'elevenlabs') result = await window.electronAPI.ai.testElevenLabs();

        if (result?.ok) {
            showToast(`${provider.toUpperCase()} conectado correctamente`, 'success');
            setAiStatus(prev => ({ ...prev, [provider]: 'online' }));
            setTestResults(prev => ({ ...prev, [provider]: 'success' }));
        } else {
            showToast(`Error en ${provider}: ${result?.error || 'Conexión fallida'}`, 'error');
            setAiStatus(prev => ({ ...prev, [provider]: 'offline' }));
            setTestResults(prev => ({ ...prev, [provider]: 'error' }));
        }
    };

    const handleSaveGemini = async (val) => {
        const newConf = { ...geminiConfig, apiKey: val };
        setGeminiConfig(newConf);
        await window.electronAPI.ai.saveGeminiConfig(newConf);
        showToast('Gemini API Key actualizada', 'success');
        loadConfig();
    };

    const handleUpdateProviderKey = async (provId, key) => {
        const fullConfig = await window.electronAPI.config.load();
        const newApiKeys = { ...apiKeys, [provId]: key };
        await window.electronAPI.config.save({ ...fullConfig, apiKeys: newApiKeys });
        setApiKeys(newApiKeys);

        const envMap = {
            groq: 'GROQ_API_KEY',
            openrouter: 'OPENROUTER_API_KEY',
            openai: 'OPENAI_API_KEY',
            huggingface: 'HUGGINGFACE_HUB_TOKEN',
            elevenlabs: 'ELEVENLABS_API_KEY'
        };
        const envKey = envMap[provId];
        await window.electronAPI.config.saveOpenClawAi({ env: { [envKey]: key } });
        showToast(`API Key de ${provId} sincronizada`, 'success');
        loadConfig();
    };

    const handleSaveOcConfig = async (primaryModel) => {
        const updates = { model: { primary: primaryModel } };
        const res = await window.electronAPI.config.saveOpenClawAi(updates);
        if (res.ok) {
            setOcConfig({ ...ocConfig, ...updates });
            showToast('Nivel maestro actualizado', 'success');
        }
    };

    const masterOptions = [
        { value: 'gemini/gemini-2.0-flash-001', label: 'Gemini 2.0 Flash', hint: 'Recomendado para visión' },
        { value: 'openai/gpt-4o-mini', label: 'GPT-4o Mini', hint: 'Equilibrado y eficiente' },
        { value: 'groq/llama-3.1-70b-versatile', label: 'Llama 3.3 Groq', hint: 'Ultra-rápido' },
        { value: 'huggingface/meta-llama/Llama-3.3-70B-Instruct', label: 'Llama 3.3 (HF)', hint: 'Potencia Open Source' },
        { value: 'openrouter/anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet', hint: 'Razonamiento complejo' },
        { value: 'openrouter/google/gemini-2.0-flash-001', label: 'Gemini 2.0 (Router)', hint: 'Redundancia externa' }
    ];

    return (
        <div className="aihub-module full-width">
            <header className="module-header luxury">
                <div className="header-info">
                    <h1>Mando Neural <span className="badge-live">VECTRON v2.0</span></h1>
                    <p>Centro de mando securizado para orquestar modelos de IA de alto rendimiento</p>
                </div>
            </header>

            <div className="module-body scrollable">
                <NeuralMap />

                <div className="luxury-full-layout">

                    <section className="hub-section">
                        <h3 className="section-title"><Cpu size={18} /> Motores de Procesamiento</h3>
                        <div className="engines-row-luxury">

                            <ProviderCard
                                id="gemini"
                                name="Google Gemini"
                                logo={<GeminiLogo />}
                                currentKey={geminiConfig.apiKey}
                                status={aiStatus.gemini}
                                testStatus={testResults.gemini}
                                onSave={handleSaveGemini}
                                onTest={() => testProvider('gemini')}
                                models={[
                                    { name: '2.0 Flash', active: true },
                                    { name: '1.5 Pro', active: false }
                                ]}
                            />

                            <ProviderCard
                                id="groq"
                                name="Groq LPU"
                                logo={<GroqLogo />}
                                currentKey={apiKeys.groq}
                                status={aiStatus.groq}
                                testStatus={testResults.groq}
                                onSave={(key) => handleUpdateProviderKey('groq', key)}
                                onTest={() => testProvider('groq')}
                                models={[
                                    { name: 'Llama 3.1 70B', active: true },
                                    { name: 'Mixtral 8x7B', active: false }
                                ]}
                            />

                            <ProviderCard
                                id="openrouter"
                                name="OpenRouter"
                                logo={<OpenRouterLogo />}
                                currentKey={apiKeys.openrouter}
                                status={aiStatus.openrouter}
                                testStatus={testResults.openrouter}
                                onSave={(key) => handleUpdateProviderKey('openrouter', key)}
                                onTest={() => testProvider('openrouter')}
                                models={[
                                    { name: 'Claude 3.5', active: true },
                                    { name: 'DeepSeek V3', active: false }
                                ]}
                            />

                            <ProviderCard
                                id="openai"
                                name="OpenAI"
                                logo={<OpenAILogo />}
                                currentKey={apiKeys.openai}
                                status={aiStatus.openai}
                                testStatus={testResults.openai}
                                onSave={(key) => handleUpdateProviderKey('openai', key)}
                                onTest={() => testProvider('openai')}
                                models={[
                                    { name: 'GPT-4o', active: true },
                                    { name: 'o1-preview', active: false }
                                ]}
                            />

                            <ProviderCard
                                id="huggingface"
                                name="Hugging Face"
                                logo={<HuggingFaceLogo />}
                                currentKey={apiKeys.huggingface}
                                status={aiStatus.huggingface}
                                testStatus={testResults.huggingface}
                                onSave={(key) => handleUpdateProviderKey('huggingface', key)}
                                onTest={() => testProvider('huggingface')}
                                models={[
                                    { name: 'Llama 3.3', active: true },
                                    { name: 'Mistral', active: false }
                                ]}
                            />

                            <ProviderCard
                                id="elevenlabs"
                                name="ElevenLabs (Voice)"
                                logo={<ElevenLabsLogo />}
                                currentKey={apiKeys.elevenlabs}
                                status={aiStatus.elevenlabs}
                                testStatus={testResults.elevenlabs}
                                onSave={(key) => handleUpdateProviderKey('elevenlabs', key)}
                                onTest={() => testProvider('elevenlabs')}
                                models={[
                                    { name: 'Vocal Jarvis', active: true },
                                    { name: 'Natural Reader', active: false }
                                ]}
                            />

                        </div>
                    </section>

                    <section className="hub-section">
                        <h3 className="section-title"><Bot size={18} /> Orquestación VECTRON Maestro</h3>
                        <div className="orchestration-row-luxury card luxury-glow">
                            <div className="row-item main-model">
                                <label>NÚCLEO PRIMARIO ACTIVO</label>
                                <div className="master-selector-outer">
                                    <div className="master-badge-icon">
                                        <Cpu size={24} className="master-icon" />
                                    </div>
                                    <CustomSelect
                                        value={ocConfig?.model?.primary || ''}
                                        options={masterOptions}
                                        onChange={handleSaveOcConfig}
                                    />
                                </div>
                            </div>
                            <div className="row-item fallbacks">
                                <label>CADENA DE REDUNDANCIA DINÁMICA</label>
                                <div className="redundancy-grid">
                                    {(ocConfig?.model?.fallbacks || []).slice(0, 5).map((f, i) => (
                                        <React.Fragment key={f}>
                                            <div className="f-node-luxury">
                                                <span className="rank">{i + 1}</span>
                                                <span className="node-text">{f.split('/').pop()}</span>
                                            </div>
                                            {i < 4 && i < (ocConfig?.model?.fallbacks?.length - 1) && <ArrowRight size={20} className="arrow-separator" />}
                                        </React.Fragment>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="hub-section">
                        <h3 className="section-title"><Volume2 size={18} /> Laboratorio de Voz VECTRON (JARVIS)</h3>
                        <div className="voice-test-card card luxury-glow">
                            <div className="voice-layout">
                                <div className="voice-info">
                                    <p>Configuración de voz natural de alta fidelidad. Por defecto está configurada la voz de <strong>V.I.S.O.R / JARVIS</strong> para todas las interacciones.</p>
                                </div>
                                <div className="voice-action-box">
                                    <input
                                        type="text"
                                        className="input"
                                        placeholder="Escribe algo para que VECTRON lo diga..."
                                        defaultValue="Señor Chris, todos los sistemas están operativos y a su servicio."
                                        id="voice-test-input"
                                    />
                                    <button className="btn-primary" onClick={async () => {
                                        const text = document.getElementById('voice-test-input').value;
                                        if (!text) return;
                                        showToast('Sintetizando voz...', 'info');
                                        const res = await window.electronAPI.ai.synthesizeSpeech(text);
                                        if (res.ok) {
                                            const audio = new Audio('file://' + res.audioPath);
                                            audio.play();
                                            showToast('VECTRON hablando', 'success');
                                        } else {
                                            showToast('Error de voz: ' + res.error, 'error');
                                        }
                                    }}>
                                        <Play size={16} /> Hablar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default AIHubModule;
