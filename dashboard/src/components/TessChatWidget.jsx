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
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

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
            setMessages(prev => [...prev, { role: 'assistant', content: '❌ Error de conexión con el núcleo TESS.' }]);
        } finally {
            setLoading(false);
        }
    };

    if (!open) {
        return (
            <button 
                onClick={() => setOpen(true)}
                className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 rounded-full shadow-lg flex items-center justify-center hover:bg-indigo-700 transition-colors border-2 border-indigo-400 z-50 text-2xl"
            >
                🤖
            </button>
        );
    }

    return (
        <div className="fixed bottom-6 right-6 w-96 h-[600px] max-h-[80vh] bg-slate-900 border border-slate-700 shadow-2xl rounded-xl flex flex-col z-50 overflow-hidden">
            {/* Header */}
            <div className="bg-slate-800 p-4 border-b border-slate-700 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">🤖</span>
                    <div>
                        <h3 className="font-semibold text-white">TESS</h3>
                        <p className="text-xs text-indigo-400">Asistente Principal (Online)</p>
                    </div>
                </div>
                <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white">
                    ✕
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                    <div className="text-center text-slate-500 text-sm mt-4">
                        TESS inicializada. Lista para ayudar con tus proyectos y conocimientos.
                    </div>
                )}
                {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                            msg.role === 'user' 
                            ? 'bg-indigo-600 text-white rounded-br-none' 
                            : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-none'
                        }`}>
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-slate-800 text-slate-400 border border-slate-700 rounded-2xl rounded-bl-none px-4 py-2 text-sm">
                            Escribiendo...
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-3 bg-slate-800 border-t border-slate-700">
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="Pregúntale algo a TESS..."
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-full px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                    <button 
                        type="submit" 
                        disabled={loading || !input.trim()}
                        className="bg-indigo-600 text-white w-10 h-10 rounded-full flex items-center justify-center hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    >
                        ➤
                    </button>
                </div>
            </form>
        </div>
    );
}
