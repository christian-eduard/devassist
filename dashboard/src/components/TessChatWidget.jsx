// src/components/TessChatWidget.jsx — Using design system CSS
import React, { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';

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
                className="tess-trigger"
                onClick={() => setOpen(true)}
                title="Hablar con TESS"
            >
                🤖
            </button>
        );
    }

    return (
        <div className="tess-container">
            <div className="tess-header">
                <div className="tess-header-left">
                    <span className="tess-avatar">🤖</span>
                    <div>
                        <h3 className="tess-header-title">TESS</h3>
                        <p className="tess-header-sub">Asistente Principal</p>
                    </div>
                </div>
                <button onClick={() => setOpen(false)} className="tess-close">✕</button>
            </div>

            <div className="tess-messages">
                {messages.length === 0 && (
                    <div className="tess-empty">
                        TESS inicializada. Lista para ayudar con tus proyectos y conocimientos.
                    </div>
                )}
                {messages.map((msg, i) => (
                    <div key={i} className={`tess-msg-row ${msg.role === 'user' ? 'user' : 'assistant'}`}>
                        <div className={`tess-bubble ${msg.role === 'user' ? 'user' : 'assistant'}`}>
                            {msg.content}
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="tess-msg-row assistant">
                        <div className="tess-bubble assistant tess-typing">
                            <span></span><span></span><span></span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSend} className="tess-form">
                <div className="tess-input-row">
                    <input
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="Pregúntale algo a TESS..."
                        className="tess-input"
                    />
                    <button
                        type="submit"
                        disabled={loading || !input.trim()}
                        className="tess-send"
                    >
                        ➤
                    </button>
                </div>
            </form>
        </div>
    );
}
