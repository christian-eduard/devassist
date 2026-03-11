import React, { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from './components/Sidebar';
import ProjectsModule from './components/ProjectsModule';
import FichasModule from './components/FichasModule';
import NotesModule from './components/NotesModule';
import AIHubModule from './components/AIHubModule';
import SettingsModule from './components/SettingsModule';
import ClawbotModule from './components/ClawbotModule';
import LogsModule from './components/LogsModule';
import OfficeModule from './components/OfficeModule';
import CapabilitiesModule from './components/CapabilitiesModule';
import ConversationDisplay from './components/ConversationDisplay';
import NotificationCenter from './components/NotificationCenter';
const MODULES = ['projects', 'fichas', 'notes', 'aihub', 'office', 'clawbot', 'capabilities', 'logs', 'settings'];

function App() {
    const [toast, setToast] = useState(null);
    const [lastUserText, setLastUserText] = useState('');
    const [lastVectronText, setLastVectronText] = useState('');

    const showToast = useCallback((message, type = 'info') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    }, []);

    const [activeModule, setActiveModule] = useState('projects');
    const [clawbotActive, setClawbotActive] = useState(false);
    const [systemStatus, setSystemStatus] = useState({ gateway: 'loading', ai: 'loading' });
    const [theme, setTheme] = useState(localStorage.getItem('devassist-theme') || 'dark');
    const [notifications, setNotifications] = useState([]);
    const [ncOpen, setNcOpen] = useState(false);

    // ── Notifications Logic ──
    const addNotification = useCallback((n) => {
        setNotifications(prev => [{
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            timestamp: Date.now(),
            read: false,
            ...n
        }, ...prev]);
    }, []);

    // Persistence: Save to Disk
    useEffect(() => {
        const persist = async () => {
            if (window.electronAPI?.notifications?.save && notifications.length > 0) {
                await window.electronAPI.notifications.save(notifications);
            }
        };
        persist();
    }, [notifications]);

    // Initial Load
    useEffect(() => {
        const init = async () => {
            console.info('[App] Iniciando Reactor VECTRON (init phase)...');

            if (window.electronAPI?.notifications?.load) {
                const list = await window.electronAPI.notifications.load();
                if (list) setNotifications(list);
            }
        };
        init();
        console.info('[App] VECTRON Reactor iniciado. Componente montado.');
    }, []);

    // ── VECTRON States ──
    const [isThinking, setIsThinking] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const isSpeakingRef = useRef(false);

    // Sincronizar ref con estado para uso en callbacks estables
    useEffect(() => {
        isSpeakingRef.current = isSpeaking;
    }, [isSpeaking]);

    const [showTextInput, setShowTextInput] = useState(false);
    const [textInput, setTextInput] = useState('');
    const [conversationMode, setConversationMode] = useState(false);
    const conversationModeRef = useRef(false);

    const handleToggleListen = () => {
        // Voz desactivada por motivos de estabilidad
        showToast('VECTRON Voz desactivada para estabilidad', 'error');
    };

    // ── Envío de texto (alternativo) ──
    const handleSendText = async (e) => {
        if (e) e.preventDefault();
        const text = textInput.trim();
        if (!text || isThinking) return;
        setLastUserText(text);
        setLastVectronText('');
        setTextInput('');
        setShowTextInput(false);
        setIsThinking(true);
        try {
            await window.electronAPI.clawbot.sendCommand(text);
        } catch (err) {
            showToast('Error al enviar', 'error');
        } finally {
            setIsThinking(false);
            // Tras enviar texto, activamos escucha automática en el siguiente tick para evitar colisiones
            setTimeout(() => {
                if (!conversationModeRef.current) {
                    setConversationMode(true);
                    conversationModeRef.current = true;
                }
            }, 100);
        }
    };

    // ── Global Voice Output Listener (Streaming & Final) ──
    useEffect(() => {
        if (!window.electronAPI) return;

        // 1. Manejo de Chunks (Streaming para Real-Time)
        const unSubChunks = window.electronAPI.clawbot.onResponseChunk(async (data) => {
            try {
                if (data && data.text) {
                    setIsSpeaking(true);
                }
            } catch (e) {
                console.error('[App] Error en chunk handler:', e);
            }
        });

        // 2. Manejo de Mensaje Final (Telegram o Fallback)
        const unSubFinal = window.electronAPI.clawbot.onMessageSent(async (data) => {
            if (data && data.userId === 'vectron' && data.text) {
                setLastVectronText(data.text);
                setIsThinking(false);

                // Si recibimos respuesta, forzamos modo escucha para que el usuario pueda replicar
                if (!conversationModeRef.current) {
                    setConversationMode(true);
                    conversationModeRef.current = true;
                }

                // Pequeño delay antes de apagar la animación de habla
                setTimeout(() => setIsSpeaking(false), 2000);
            }
        });

        return () => {
            unSubChunks();
            unSubFinal();
        };
    }, []);

    const hasGreetedRef = useRef(false);
    useEffect(() => {
        if (!hasGreetedRef.current) {
            hasGreetedRef.current = true;
            setTimeout(() => {
                if (window.electronAPI?.clawbot) {
                    // Eliminamos el nombre 'Chris' para cumplir con la restricción del usuario
                    window.electronAPI.clawbot.sendCommand("Preséntate como VECTRON y saluda al Señor");
                }
            }, 3000);
        }
    }, []);

    const updateStatus = useCallback(async () => {
        if (!window.electronAPI) return;
        try {
            const status = await window.electronAPI.clawbot.getSystemStatus();
            setSystemStatus(status);
            setClawbotActive(status.gateway === 'online');
        } catch (err) {
            console.error('Status Error:', err);
        }
    }, []);

    const prevStatusRef = useRef(systemStatus);
    useEffect(() => {
        if (prevStatusRef.current.gateway === 'online' && systemStatus.gateway === 'offline') {
            showToast('⚠️ VECTRON Gateway desconectado', 'error');
            addNotification({ title: 'SYSTEM ALERT', message: 'VECTRON Gateway desconectado', type: 'error' });
        } else if (prevStatusRef.current.gateway === 'offline' && systemStatus.gateway === 'online') {
            showToast('✅ VECTRON Gateway operativo', 'success');
            addNotification({ title: 'SYSTEM RECOVERY', message: 'VECTRON Gateway restablecido', type: 'success' });
        }
        prevStatusRef.current = systemStatus;
    }, [systemStatus, showToast, addNotification]);

    useEffect(() => {
        updateStatus();
        const interval = setInterval(updateStatus, 15000);
        return () => clearInterval(interval);
    }, [updateStatus]);

    useEffect(() => {
        localStorage.setItem('devassist-theme', theme);
        if (theme === 'light') document.body.classList.add('light-mode');
        else document.body.classList.remove('light-mode');
    }, [theme]);

    const [sentiment, setSentiment] = useState(null);

    // ── Global Event Registration ──
    useEffect(() => {
        const handleAction = (e) => {
            if (e.detail?.type) {
                setSentiment(e.detail.type);
                // Resetear sentimiento tras unos segundos si es temporal
                if (['SUCCESS', 'FAIL', 'ANALYZING'].includes(e.detail.type)) {
                    setTimeout(() => setSentiment(null), 4000);
                }
            }
        };
        window.addEventListener('vectron:action', handleAction);

        const handleWinNotify = (e) => e.detail && addNotification(e.detail);
        window.addEventListener('vectron:notify', handleWinNotify);

        const unSubs = [];
        if (window.electronAPI?.clawbot) {
            unSubs.push(window.electronAPI.clawbot.onNotify(data => data && addNotification(data)));
            unSubs.push(window.electronAPI.clawbot.onNewVideo(data => {
                addNotification({ title: 'VIDEO DETECTADO', message: `Nuevo video: ${data.fileName}`, type: 'info' });
            }));
            unSubs.push(window.electronAPI.clawbot.onProjectEvent(data => {
                addNotification({ title: 'ALERTA PROYECTO', message: data.message, type: 'info' });
            }));
            unSubs.push(window.electronAPI.clawbot.onFichaCreated(data => {
                addNotification({ title: 'VAULT ACTUALIZADO', message: `Nueva ficha: ${data.titulo}`, type: 'success' });
            }));
        }

        return () => {
            window.removeEventListener('vectron:notify', handleWinNotify);
            unSubs.forEach(u => u());
        };
    }, [addNotification]);


    const renderModule = () => {
        switch (activeModule) {
            case 'projects': return <ProjectsModule showToast={showToast} />;
            case 'fichas': return <FichasModule showToast={showToast} />;
            case 'notes': return <NotesModule showToast={showToast} />;
            case 'aihub': return <AIHubModule showToast={showToast} />;
            case 'logs': return <LogsModule showToast={showToast} />;
            case 'capabilities': return <CapabilitiesModule showToast={showToast} />;
            case 'office': return <OfficeModule showToast={showToast} />;
            case 'clawbot': return <ClawbotModule showToast={showToast} clawbotActive={clawbotActive} setClawbotActive={setClawbotActive} />;
            case 'settings': return <SettingsModule showToast={showToast} clawbotActive={clawbotActive} setClawbotActive={setClawbotActive} onNavigate={setActiveModule} />;
            default: return <ProjectsModule showToast={showToast} />;
        }
    };

    return (
        <div className={`app-layout ${theme === 'light' ? 'light-mode' : ''}`}>
            <div className="titlebar-drag" />
            <div className="app-body">
                <Sidebar
                    activeModule={activeModule}
                    onNavigate={setActiveModule}
                    clawbotActive={clawbotActive}
                    onClawbotClick={() => setActiveModule('clawbot')}
                    theme={theme}
                    onToggleTheme={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
                    systemStatus={systemStatus}
                    isListening={false}
                    isThinking={isThinking}
                    isSpeaking={isSpeaking}
                    onToggleListen={handleToggleListen}
                    audioStream={null}
                    notificationCount={notifications.filter(n => !n.read).length}
                    onToggleNC={() => setNcOpen(!ncOpen)}
                    sentiment={sentiment}
                />
                <main className="main-content">{renderModule()}</main>

                {ncOpen && (
                    <NotificationCenter
                        notifications={notifications}
                        onClose={() => setNcOpen(false)}
                        onClearAll={() => setNotifications([])}
                        onDelete={id => setNotifications(prev => prev.filter(n => n.id !== id))}
                        onAction={(id) => setNotifications(prev => prev.filter(n => n.id !== id))}
                    />
                )}
            </div>
            {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}
            <ConversationDisplay lastUserText={lastUserText} lastVectronText={lastVectronText} isThinking={isThinking} isSpeaking={isSpeaking} />

            {/* Botón flotante de texto (alternativa discreta) */}
            <div className="vectron-text-toggle">
                {showTextInput ? (
                    <form className="vectron-text-form" onSubmit={handleSendText}>
                        <input
                            type="text"
                            value={textInput}
                            onChange={(e) => setTextInput(e.target.value)}
                            placeholder="Escribe a VECTRON..."
                            autoFocus
                            className="vectron-text-input"
                        />
                        <button type="button" className="vectron-text-close" onClick={() => setShowTextInput(false)}>✕</button>
                    </form>
                ) : (
                    <button className="vectron-text-btn" onClick={() => setShowTextInput(true)} title="Escribir a VECTRON">
                        ⌨
                    </button>
                )}
            </div>
        </div>
    );
}

export default App;
