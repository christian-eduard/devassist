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
    RefreshCw,
    ChevronDown,
    AlertCircle
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
        <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5153-4.9066 6.0462 6.0462 0 0 0-4.445-2.9155 6.0073 6.0073 0 0 0-5.064 1.4774 6.012 6.012 0 0 0-5.064-1.4774 6.0462 6.0462 0 0 0-4.445 2.9155 5.9847 5.9847 0 0 0-.5153 4.9066 6.0105 6.0105 0 0 0 1.4158 5.0133 5.9847 5.9847 0 0 0 .5153 4.9066 6.0462 6.0462 0 0 0 4.445 2.9155 6.0073 6.0073 0 0 0 5.064-1.4774 6.012 6.012 0 0 0 5.064 1.4774 6.0462 6.0462 0 0 0 4.445-2.9155 5.9847 5.9847 0 0 0 .5153-4.9066 6.0105 6.0105 0 0 0-1.4158-5.0133z" />
    </svg>
);

const HuggingFaceLogo = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 24, height: 24 }}>
        <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm5.5 13.5c-.828 0-1.5-.672-1.5-1.5s.672-1.5 1.5-1.5 1.5.672 1.5 1.5-.672 1.5-1.5 1.5zM7 11.5c.828 0 1.5.672 1.5 1.5s-.672 1.5-1.5 1.5-1.5-.672-1.5-1.5.672-1.5 1.5-1.5zm5 8c-2.67 0-5-1.33-6.17-3.33.16-.06.33-.11.51-.11h11.33c.18 0 .35.05.51.11C17 18.17 14.67 19.5 12 19.5z" />
    </svg>
);


const NeuralMap = () => (
    <div className="neural-map-container card luxury-glow">
        <div className="neural-bg-glow"></div>
        <h3 className="section-title"><Zap size={18} /> Orquestación Neural</h3>
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
                    <text x="100" y="155" textAnchor="middle">Local</text>
                </g>
                <g className="node input-node">
                    <circle cx="100" cy="230" r="28" />
                    <text x="100" y="235" textAnchor="middle">TikTok</text>
                </g>

                <g className="node core-node">
                    <circle cx="250" cy="150" r="45" />
                    <text x="250" y="155" textAnchor="middle" className="core-text">CORE</text>
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
        </div>
    </div>
);

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
    const [aiStatus, setAiStatus] = useState({ gemini: 'loading', groq: 'loading', openrouter: 'loading', openai: 'loading', huggingface: 'loading' });
    const [testResults, setTestResults] = useState({ gemini: '', groq: '', openrouter: '', openai: '', huggingface: '' });
    const [aiAssignments, setAiAssignments] = useState({});

    const loadConfig = useCallback(async () => {
        if (!window.electronAPI) return;
        const config = await window.electronAPI.ai.getConfig();
        if (config.gemini) setGeminiConfig(config.gemini);
        if (config.apiKeys) setApiKeys(config.apiKeys);
        if (config.aiAssignments) setAiAssignments(config.aiAssignments);

        // Initial silent check
        checkSimpleStatus();
    }, []);

    const checkSimpleStatus = async () => {
        if (!window.electronAPI) return;
        setAiStatus({
            gemini: geminiConfig.apiKey ? 'online' : 'offline',
            groq: apiKeys.groq ? 'online' : 'offline',
            openrouter: apiKeys.openrouter ? 'online' : 'offline',
            openai: apiKeys.openai ? 'online' : 'offline',
            huggingface: apiKeys.huggingface ? 'online' : 'offline'
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
        showToast(`API Key de ${provId} guardada localmente`, 'success');
        loadConfig();
    };

    const handleUpdateAssignment = async (taskId, providerId) => {
        const fullConfig = await window.electronAPI.config.load();
        const currentAssignment = fullConfig.aiAssignments?.[taskId] || {};
        const newAssignments = { 
            ...fullConfig.aiAssignments, 
            [taskId]: { ...currentAssignment, provider: providerId } 
        };
        await window.electronAPI.config.save({ ...fullConfig, aiAssignments: newAssignments });
        setAiAssignments(newAssignments);
        showToast(`Tarea [${taskId}] asignada a ${providerId}`, 'success');
    };

    return (
        <div className="aihub-module full-width">
            <header className="module-header luxury">
                <div className="header-info">
                    <h1>Mando Neural <span className="badge-live">V1.5</span></h1>
                    <p>Centro de mando securizado para orquestar modelos de IA locales</p>
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


                        </div>
                    </section>

                    <section className="hub-section">
                        <h3 className="section-title"><ShieldCheck size={18} /> Orquestación Neural (Tareas)</h3>
                        <div className="orchestration-row-luxury">
                            <div className="master-selector-outer">
                                <div className="master-badge-icon">
                                    <Zap size={28} className="master-icon" />
                                </div>
                                <div className="master-info-text">
                                    <h4>Motor Principal del Sistema</h4>
                                    <p>Este modelo actúa como el cerebro supervisor de toda la aplicación.</p>
                                </div>
                            </div>

                            <div className="tasks-grid-luxury">
                                {/* Tarea: Transcripción */}
                                <div className="task-assignment-card">
                                    <div className="task-header">
                                        <Bot size={16} />
                                        <span>Transcripción (Vault)</span>
                                    </div>
                                    <select 
                                        className="assignment-select"
                                        value={aiAssignments['vault-transcribe']?.provider || 'gemini'}
                                        onChange={(e) => handleUpdateAssignment('vault-transcribe', e.target.value)}
                                    >
                                        <option value="gemini">Google Gemini 2.5 Flash</option>
                                        <option value="groq">Groq (LPU Speed)</option>
                                        <option value="openrouter">OpenRouter (Auto)</option>
                                    </select>
                                </div>

                                {/* Tarea: Análisis */}
                                <div className="task-assignment-card">
                                    <div className="task-header">
                                        <Activity size={16} />
                                        <span>Análisis Técnico</span>
                                    </div>
                                    <select 
                                        className="assignment-select"
                                        value={aiAssignments['vault-analyze']?.provider || 'gemini'}
                                        onChange={(e) => handleUpdateAssignment('vault-analyze', e.target.value)}
                                    >
                                        <option value="gemini">Google Gemini 2.5 Flash</option>
                                        <option value="groq">Groq (LPU Speed)</option>
                                        <option value="openai">OpenAI (GPT-4o)</option>
                                    </select>
                                </div>

                                {/* Tarea: Investigación */}
                                <div className="task-assignment-card">
                                    <div className="task-header">
                                        <ShieldCheck size={16} />
                                        <span>Investigación Profunda</span>
                                    </div>
                                    <select 
                                        className="assignment-select"
                                        value={aiAssignments['vault-research']?.provider || 'gemini'}
                                        onChange={(e) => handleUpdateAssignment('vault-research', e.target.value)}
                                    >
                                        <option value="gemini">Google Gemini 2.5 Pro</option>
                                        <option value="openai">OpenAI (GPT-4o)</option>
                                        <option value="openrouter">OpenRouter (DeepSeek)</option>
                                    </select>
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
