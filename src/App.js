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
        const loadN = async () => {
            if (window.electronAPI?.notifications?.load) {
                const list = await window.electronAPI.notifications.load();
                if (list) setNotifications(list);
            }
        };
        loadN();
    }, []);

    // ── VECTRON States ──
    const [isListening, setIsListening] = useState(false);
    const [isThinking, setIsThinking] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [audioStream, setAudioStream] = useState(null);
    const [showTextInput, setShowTextInput] = useState(false);
    const [textInput, setTextInput] = useState('');
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const silenceTimerRef = useRef(null);
    const analyserRef = useRef(null);
    const audioCtxRef = useRef(null);
    const conversationModeRef = useRef(false);

    // ── Detección de silencio para auto-stop ──
    const startSilenceDetection = (stream) => {
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            audioCtxRef.current = audioCtx;
            const source = audioCtx.createMediaStreamSource(stream);
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 512;
            analyser.smoothingTimeConstant = 0.2;
            source.connect(analyser);
            analyserRef.current = analyser;

            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            let silentFrames = 0;
            let totalFrames = 0;
            const SILENCE_THRESHOLD = 20; // Reacciona a picos (0-255)
            const SILENCE_DURATION = 50; // ~1.5 segundos de silencio relativo
            const MAX_DURATION = 300; // max ~10 segundos de escucha (300 frames a 30fps)
            let hasSpoken = false;

            const checkSilence = () => {
                if (!analyserRef.current) return;
                analyser.getByteFrequencyData(dataArray);

                // Usamos el pico máximo en lugar del promedio (más sensible a la voz)
                let maxVol = 0;
                for (let i = 0; i < dataArray.length; i++) {
                    if (dataArray[i] > maxVol) maxVol = dataArray[i];
                }

                totalFrames++;

                if (maxVol > SILENCE_THRESHOLD) {
                    hasSpoken = true;
                    silentFrames = 0;
                } else {
                    silentFrames++;
                }

                // Auto-stop si ya habló y hubo silencio, o si llegamos al límite de tiempo
                if ((hasSpoken && silentFrames > SILENCE_DURATION) || totalFrames > MAX_DURATION) {
                    stopListening();
                    return;
                }

                silenceTimerRef.current = requestAnimationFrame(checkSilence);
            };

            silenceTimerRef.current = requestAnimationFrame(checkSilence);
        } catch (e) {
            console.warn('[VAD] Silence detection not available:', e);
        }
    };

    const cleanupSilenceDetection = () => {
        if (silenceTimerRef.current) cancelAnimationFrame(silenceTimerRef.current);
        if (audioCtxRef.current) {
            audioCtxRef.current.close().catch(() => { });
            audioCtxRef.current = null;
        }
        analyserRef.current = null;
    };

    const startListening = async () => {
        if (isThinking || isSpeaking) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            setAudioStream(stream);
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunksRef.current.push(event.data);
            };

            mediaRecorder.onstop = async () => {
                cleanupSilenceDetection();
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                stream.getTracks().forEach(track => track.stop());
                setAudioStream(null);

                // Procesar independientemente del tamaño para no perder fragmentos cortos
                if (audioBlob.size > 0) {
                    handleProcessVoice(audioBlob);
                }
            };

            mediaRecorder.start(250); // chunks cada 250ms para mejor detección
            setIsListening(true);

            // Iniciar detección de silencio
            startSilenceDetection(stream);
        } catch (err) {
            console.error('Mic Error:', err);
            showToast('No se pudo acceder al micrófono', 'error');
        }
    };


    const stopListening = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        setIsListening(false);
    };

    const handleToggleListen = () => {
        if (isListening || conversationModeRef.current) {
            conversationModeRef.current = false;
            stopListening();
            showToast('Modo conversación desactivado', 'info');
        } else {
            conversationModeRef.current = true;
            startListening();
            showToast('Modo conversación activado', 'success');
        }
    };

    const handleProcessVoice = async (blob) => {
        if (!window.electronAPI) return;
        setIsThinking(true);
        try {
            const arrayBuffer = await blob.arrayBuffer();
            const result = await window.electronAPI.ai.transcribeAudio(arrayBuffer);
            if (result && result.text) {
                setLastUserText(result.text);
                setLastVectronText('');
                await window.electronAPI.clawbot.sendCommand(result.text);
            } else {
                showToast('No se detectó voz clara', 'info');
                // Si estamos en modo conversación y falló la voz, volvemos a escuchar tras un breve delay
                setIsThinking(false);
                if (conversationModeRef.current) {
                    setTimeout(() => startListening(), 500);
                }
            }
        } catch (err) {
            console.error('Transcription Error:', err);
            showToast('Error al procesar voz', 'error');
            setIsThinking(false);
            if (conversationModeRef.current) {
                conversationModeRef.current = false; // Desactivar ante un error fuerte
            }
        }
    };

    // ── Envío de texto (alternativo) ──
    const handleSendText = async (e) => {
        e.preventDefault();
        const text = textInput.trim();
        if (!text || isThinking) return;
        setTextInput('');
        setShowTextInput(false);
        setLastUserText(text);
        setLastVectronText('');
        setIsThinking(true);
        try {
            await window.electronAPI.clawbot.sendCommand(text);
        } catch (err) {
            showToast('Error al enviar', 'error');
        } finally {
            setIsThinking(false);
        }
    };

    // ── Global Voice Output Listener ──
    useEffect(() => {
        if (!window.electronAPI) return;
        const unSub = window.electronAPI.clawbot.onMessageSent(async (data) => {
            // Speak if it's from vectron
            if (data && data.userId === 'vectron' && data.text) {
                setLastVectronText(data.text);
                setIsThinking(false);
                try {
                    const audioRes = await window.electronAPI.ai.synthesizeSpeech(data.text);
                    if (audioRes?.ok && audioRes.audioBase64) {
                        setIsSpeaking(true);
                        // Decodificar base64 a Blob y reproducir
                        const byteChars = atob(audioRes.audioBase64);
                        const byteNums = new Array(byteChars.length);
                        for (let i = 0; i < byteChars.length; i++) byteNums[i] = byteChars.charCodeAt(i);
                        const byteArray = new Uint8Array(byteNums);
                        const blob = new Blob([byteArray], { type: 'audio/mpeg' });
                        const blobUrl = URL.createObjectURL(blob);

                        const audio = new Audio(blobUrl);
                        audio.onended = () => {
                            setIsSpeaking(false);
                            URL.revokeObjectURL(blobUrl);
                            // Auto-resume listening
                            if (conversationModeRef.current) {
                                setTimeout(() => startListening(), 500);
                            }
                        };
                        audio.onerror = (e) => {
                            console.warn('[TTS] Audio playback error:', e);
                            setIsSpeaking(false);
                            URL.revokeObjectURL(blobUrl);
                            if (conversationModeRef.current) setTimeout(() => startListening(), 500);
                        };
                        audio.play().catch((e) => {
                            console.warn('[TTS] Play rejected:', e.message);
                            setIsSpeaking(false);
                            URL.revokeObjectURL(blobUrl);
                            if (conversationModeRef.current) setTimeout(() => startListening(), 500);
                        });
                    } else {
                        // Si no hay audio, simplemente no hablamos
                        setIsSpeaking(false);
                        if (conversationModeRef.current) setTimeout(() => startListening(), 500);
                    }
                } catch (e) {
                    console.warn('[TTS] Synthesis error (non-blocking):', e.message || e);
                    setIsSpeaking(false);
                    if (conversationModeRef.current) setTimeout(() => startListening(), 500);
                }
            }
        });
        return () => unSub();
    }, []);

    const hasGreetedRef = useRef(false);
    useEffect(() => {
        if (!hasGreetedRef.current) {
            hasGreetedRef.current = true;
            setTimeout(() => {
                if (window.electronAPI?.clawbot) {
                    window.electronAPI.clawbot.sendCommand("GREET_USER_STARTUP");
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

    // ── Global Event Registration ──
    useEffect(() => {
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
                    isListening={isListening}
                    isThinking={isThinking}
                    isSpeaking={isSpeaking}
                    onToggleListen={handleToggleListen}
                    audioStream={audioStream}
                    notificationCount={notifications.filter(n => !n.read).length}
                    onToggleNC={() => setNcOpen(!ncOpen)}
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
