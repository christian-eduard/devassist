import React, { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';

const styles = {
    trigger: {
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        width: '56px',
        height: '56px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
        border: '2px solid rgba(129,140,248,0.5)',
        boxShadow: '0 8px 32px rgba(99,102,241,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        zIndex: 9999,
        fontSize: '24px',
        transition: 'transform 0.2s, box-shadow 0.2s',
    },
    container: {
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        width: '380px',
        height: '520px',
        maxHeight: '80vh',
        background: '#0f172a',
        border: '1px solid #334155',
        borderRadius: '16px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 9999,
        overflow: 'hidden',
    },
    header: {
        background: '#1e293b',
        padding: '14px 16px',
        borderBottom: '1px solid #334155',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
    },
    headerTitle: {
        margin: 0,
        fontSize: '15px',
        fontWeight: 600,
        color: '#f1f5f9',
    },
    headerSub: {
        margin: 0,
        fontSize: '11px',
        color: '#818cf8',
    },
    closeBtn: {
        background: 'none',
        border: 'none',
        color: '#94a3b8',
        fontSize: '18px',
        cursor: 'pointer',
        padding: '4px',
        lineHeight: 1,
    },
    messages: {
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    emptyMsg: {
        textAlign: 'center',
        color: '#64748b',
        fontSize: '13px',
        marginTop: '24px',
    },
    msgRow: (isUser) => ({
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
    }),
    msgBubble: (isUser) => ({
        maxWidth: '80%',
        padding: '10px 14px',
        borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
        fontSize: '13px',
        lineHeight: 1.5,
        whiteSpace: 'pre-wrap',
        ...(isUser
            ? { background: '#4f46e5', color: '#fff' }
            : { background: '#1e293b', color: '#e2e8f0', border: '1px solid #334155' }
        ),
    }),
    form: {
        padding: '12px',
        background: '#1e293b',
        borderTop: '1px solid #334155',
    },
    inputRow: {
        display: 'flex',
        gap: '8px',
    },
    input: {
        flex: 1,
        background: '#0f172a',
        border: '1px solid #334155',
        borderRadius: '24px',
        padding: '10px 16px',
        fontSize: '13px',
        color: '#f1f5f9',
        outline: 'none',
    },
    sendBtn: {
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        background: '#4f46e5',
        border: 'none',
        color: '#fff',
        fontSize: '16px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
};

export default function TessChatWidget() {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        if (open && messages.length === 0) {
            initAgentAndLoadMemory();
        }
    }, [open]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const initAgentAndLoadMemory = async () => {
        try {
            await api.initAgent();
            const res = await api.getAgentMemory('tess-core', 'default');
            setMessages(res.memory || []);
        } catch (err) {
            console.error('Failed to init TESS', err);
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const userMsg = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setLoading(true);

        try {
            const res = await api.chatAgent({ agentId: 'tess-core', message: userMsg, channel: 'default' });
            setMessages(prev => [...prev, { role: 'assistant', content: res.reply }]);
        } catch (err) {
            console.error('Failed to chat', err);
            setMessages(prev => [...prev, { role: 'assistant', content: '❌ Error de conexión con TESS.' }]);
        } finally {
            setLoading(false);
        }
    };

    if (!open) {
        return (
            <button
                onClick={() => setOpen(true)}
                style={styles.trigger}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                title="Hablar con TESS"
            >
                🤖
            </button>
        );
    }

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <div style={styles.headerLeft}>
                    <span style={{ fontSize: '22px' }}>🤖</span>
                    <div>
                        <h3 style={styles.headerTitle}>TESS</h3>
                        <p style={styles.headerSub}>Asistente Principal (Online)</p>
                    </div>
                </div>
                <button onClick={() => setOpen(false)} style={styles.closeBtn}>✕</button>
            </div>

            <div style={styles.messages}>
                {messages.length === 0 && (
                    <div style={styles.emptyMsg}>
                        TESS inicializada. Lista para ayudar con tus proyectos y conocimientos.
                    </div>
                )}
                {messages.map((msg, i) => (
                    <div key={i} style={styles.msgRow(msg.role === 'user')}>
                        <div style={styles.msgBubble(msg.role === 'user')}>
                            {msg.content}
                        </div>
                    </div>
                ))}
                {loading && (
                    <div style={styles.msgRow(false)}>
                        <div style={{ ...styles.msgBubble(false), color: '#94a3b8' }}>
                            Escribiendo...
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSend} style={styles.form}>
                <div style={styles.inputRow}>
                    <input
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="Pregúntale algo a TESS..."
                        style={styles.input}
                        onFocus={e => { e.target.style.borderColor = '#6366f1'; }}
                        onBlur={e => { e.target.style.borderColor = '#334155'; }}
                    />
                    <button
                        type="submit"
                        disabled={loading || !input.trim()}
                        style={{ ...styles.sendBtn, opacity: (loading || !input.trim()) ? 0.5 : 1 }}
                    >
                        ➤
                    </button>
                </div>
            </form>
        </div>
    );
}
