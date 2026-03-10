import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff, Loader, Volume2 } from 'lucide-react';
import './CommandBar.css';

const CommandBar = ({ onSendCommand, isListening, isThinking, isSpeaking, onToggleListen }) => {
    const [input, setInput] = useState('');
    const [history, setHistory] = useState([]);
    const [historyIdx, setHistoryIdx] = useState(-1);
    const inputRef = useRef(null);

    // Focus con Ctrl+K o Cmd+K
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                inputRef.current?.focus();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const text = input.trim();
        if (!text || isThinking) return;

        setHistory(prev => [text, ...prev].slice(0, 50));
        setHistoryIdx(-1);
        setInput('');

        if (onSendCommand) {
            await onSendCommand(text);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            const nextIdx = Math.min(historyIdx + 1, history.length - 1);
            setHistoryIdx(nextIdx);
            if (history[nextIdx]) setInput(history[nextIdx]);
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            const nextIdx = Math.max(historyIdx - 1, -1);
            setHistoryIdx(nextIdx);
            setInput(nextIdx === -1 ? '' : history[nextIdx]);
        }
    };

    const statusClass = isListening ? 'listening' : isThinking ? 'thinking' : isSpeaking ? 'speaking' : 'idle';

    return (
        <div className={`command-bar ${statusClass}`}>
            <div className={`command-status-indicator ${statusClass}`} />
            <form className="command-form" onSubmit={handleSubmit}>
                <input
                    ref={inputRef}
                    type="text"
                    className="command-input"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={
                        isListening ? 'VECTRON escuchando...' :
                            isThinking ? 'VECTRON procesando...' :
                                isSpeaking ? 'VECTRON hablando...' :
                                    'Escribe un comando para VECTRON... (⌘K)'
                    }
                    disabled={isThinking}
                    autoComplete="off"
                    spellCheck="false"
                />
                <div className="command-actions">
                    <button
                        type="button"
                        className={`cmd-btn mic-btn ${isListening ? 'active' : ''}`}
                        onClick={onToggleListen}
                        title={isListening ? 'Detener escucha' : 'Activar micrófono'}
                        disabled={isThinking}
                    >
                        {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                    </button>
                    {isThinking ? (
                        <div className="cmd-btn loading-btn">
                            <Loader size={16} className="spin" />
                        </div>
                    ) : isSpeaking ? (
                        <div className="cmd-btn speaking-btn">
                            <Volume2 size={16} />
                        </div>
                    ) : (
                        <button
                            type="submit"
                            className="cmd-btn send-btn"
                            disabled={!input.trim()}
                            title="Enviar comando"
                        >
                            <Send size={16} />
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
};

export default CommandBar;
