import React, { useEffect, useRef, useCallback } from 'react';
import { Bot, X, Send, Trash2, ArrowUp, Loader2 } from 'lucide-react';
import './TessChatWidget.css';

const TESS_LOGO = '/tess-logo.png'; // fallback to emoji

function Message({ msg }) {
    const isTess = msg.role === 'assistant';

    return (
        <div className={`tess-msg ${isTess ? 'tess-msg--assistant' : 'tess-msg--user'}`}>
            {isTess && (
                <div className="tess-msg-avatar" aria-label="TESS">
                    <Bot size={18} />
                </div>
            )}
            <div className="tess-msg-bubble">
                <p className="tess-msg-content">{msg.content}</p>
                <span className="tess-msg-time">
                    {new Date(msg.timestamp || Date.now()).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                </span>
            </div>
        </div>
    );
}

function TypingIndicator() {
    return (
        <div className="tess-msg tess-msg--assistant">
            <div className="tess-msg-avatar">
                <Bot size={18} />
            </div>
            <div className="tess-msg-bubble tess-msg-bubble--typing">
                <span></span><span></span><span></span>
            </div>
        </div>
    );
}

export default function TessChatWidget({ open, setOpen }) {
    const [messages, setMessages] = React.useState([]);
    const [input, setInput] = React.useState('');
    const [isTyping, setIsTyping] = React.useState(false);
    const [hasGreeted, setHasGreeted] = React.useState(false);
    
    const bottomRef = useRef(null);
    const inputRef = useRef(null);

    // Cargar historial al montar
    useEffect(() => {
        (async () => {
            if (!window.electronAPI?.agents) return;
            try {
                const memory = await window.electronAPI.agents.getMemory({ agentId: 'main', limit: 20 });
                if (memory?.length > 0) {
                    const formatted = memory
                        .filter(m => m.role === 'user' || m.role === 'assistant')
                        .map(m => ({
                            id: m.id,
                            role: m.role,
                            content: m.content,
                            timestamp: m.timestamp,
                        }));
                    setMessages(formatted);
                }
            } catch (e) {
                console.warn('[TESS] No se pudo cargar historial:', e.message);
            }
        })();
    }, []);

    // Scroll automático al último mensaje
    useEffect(() => {
        if (open) {
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isTyping, open]);

    // Al abrir, saludo de TESS (solo una vez por sesión)
    useEffect(() => {
        if (open && !hasGreeted && messages.length === 0) {
            setHasGreeted(true);
            const greeting = {
                id: 'greeting',
                role: 'assistant',
                content: 'Sistemas en línea (Gemini 1.5). He revisado el estado del sistema y todo está en orden. Soy TESS, su agente principal. ¿En qué puedo ayudarle hoy?',
                timestamp: new Date().toISOString()
            };
            setTimeout(() => setMessages([greeting]), 400);
        }
        if (open) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [open, hasGreeted, messages.length]);

    const sendMessage = useCallback(async () => {
        const text = input.trim();
        if (!text || isTyping) return;

        const userMsg = {
            id: `u_${Date.now()}`,
            role: 'user',
            content: text,
            timestamp: new Date().toISOString(),
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        try {
            if (!window.electronAPI?.agents) {
                throw new Error('Motor de agentes no disponible.');
            }
            const result = await window.electronAPI.agents.chat({
                message: text,
                agentId: 'main'
            });

            const tessMsg = {
                id: `t_${Date.now()}`,
                role: 'assistant',
                content: result.response || 'No hubo respuesta del sistema.',
                timestamp: new Date().toISOString(),
            };
            setMessages(prev => [...prev, tessMsg]);
        } catch (e) {
            const errMsg = {
                id: `err_${Date.now()}`,
                role: 'assistant',
                content: `Error de comunicación: ${e.message}`,
                timestamp: new Date().toISOString(),
            };
            setMessages(prev => [...prev, errMsg]);
        } finally {
            setIsTyping(false);
        }
    }, [input, isTyping]);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    if (!open) return null;

    return (
        <div className={`tess-panel ${open ? 'tess-panel--open' : ''}`} aria-label="Chat TESS" style={{
            bottom: '80px',
            right: '20px',
            position: 'fixed',
            zIndex: 10000
        }}>
            {/* Header */}
            <div className="tess-panel-header">
                <div className="tess-header-identity">
                    <div className="tess-header-avatar">
                        <Bot size={24} />
                    </div>
                    <div>
                        <span className="tess-header-name">TESS</span>
                        <span className="tess-header-sub">Agente Principal · En línea</span>
                    </div>
                </div>
                <div className="tess-header-actions">
                    <button
                        className="tess-icon-btn"
                        title="Limpiar historial"
                        onClick={async () => {
                            if (window.confirm('¿Desea limpiar el historial de TESS?')) {
                                await window.electronAPI?.agents?.clearMemory('main');
                                setMessages([]);
                                setHasGreeted(false);
                            }
                        }}
                    >
                        <Trash2 size={16} />
                    </button>
                    <button className="tess-icon-btn" onClick={() => setOpen(false)}>
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div className="tess-messages">
                {messages.map(msg => (
                    <Message key={msg.id} msg={msg} />
                ))}
                {isTyping && <TypingIndicator />}
                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="tess-input-bar">
                <textarea
                    ref={inputRef}
                    className="tess-input"
                    placeholder="Escribe a TESS..."
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={1}
                    disabled={isTyping}
                />
                <button
                    className={`tess-send-btn ${isTyping ? 'loading' : ''}`}
                    onClick={sendMessage}
                    disabled={!input.trim() || isTyping}
                    title="Enviar"
                >
                    {isTyping ? <Loader2 size={18} className="spin" /> : <ArrowUp size={20} />}
                </button>
            </div>
        </div>
    );
}
