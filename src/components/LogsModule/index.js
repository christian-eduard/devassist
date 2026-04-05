import React, { useState, useEffect, useRef } from 'react';
import { Terminal, RefreshCw, Trash2, AlertCircle, Search } from 'lucide-react';
import './LogsModule.css';

const LogsModule = ({ showToast }) => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState('');
    const logEndRef = useRef(null);

    const fetchLogs = async () => {
        if (!window.electronAPI) return;
        setLoading(true);
        const res = await window.electronAPI.system.getLogs();
        if (res.ok) {
            const logLines = res.logs.split('\n').filter(l => l.trim());
            setLogs(logLines);
        } else {
            showToast('Error al obtener logs: ' + res.error, 'error');
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchLogs();
        // Auto-refresh removed to save resources
    }, []);

    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    const filteredLogs = logs.filter(line => {
        if (!line) return false;
        const lineStr = String(line);
        return !filter || lineStr.toLowerCase().includes(filter.toLowerCase());
    });

    const getLineClass = (line) => {
        const lo = String(line).toLowerCase();
        if (lo.includes('error') || lo.includes('fail') || lo.includes('unauthorized')) return 'log-error';
        if (lo.includes('warn')) return 'log-warn';
        if (lo.includes('info')) return 'log-info';
        return '';
    };

    return (
        <div className="logs-module full-width">
            <header className="module-header luxury">
                <div className="header-info">
                    <h1>Mando de Logs <span className="badge-live">DEBUG</span></h1>
                    <p>Monitoreo en tiempo real de eventos de red y agentes IA</p>
                </div>
                <div className="header-actions">
                    <div className="search-box">
                        <Search size={14} />
                        <input
                            type="text"
                            placeholder="Filtrar eventos..."
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                        />
                    </div>
                    <button className={`btn-refresh ${loading ? 'spinning' : ''}`} onClick={fetchLogs}>
                        <RefreshCw size={16} />
                    </button>
                    <button className="btn-clear" onClick={() => setLogs([])}>
                        <Trash2 size={16} />
                    </button>
                </div>
            </header>

            <div className="module-body scrollable">
                <div className="terminal-container">
                    <div className="terminal-header">
                        <Terminal size={14} />
                        <span>devassist-system.log</span>
                        <div className="terminal-dots">
                            <span className="dot red"></span>
                            <span className="dot yellow"></span>
                            <span className="dot green"></span>
                        </div>
                    </div>
                    <div className="terminal-screen">
                        {filteredLogs.length === 0 ? (
                            <div className="empty-terminal">
                                <AlertCircle size={32} />
                                <p>No hay eventos detectados en el búfer</p>
                            </div>
                        ) : (
                            filteredLogs.map((line, i) => (
                                <div key={i} className={`log-line ${getLineClass(line)}`}>
                                    <span className="ln">{i + 1}</span>
                                    <span className="content">{line}</span>
                                </div>
                            ))
                        )}
                        <div ref={logEndRef} />
                    </div>
                </div>

                <div className="log-summary-cards">
                    <div className="log-card total">
                        <label>Total Eventos</label>
                        <span>{logs.length}</span>
                    </div>
                    <div className="log-card errors">
                        <label>Errores Críticos</label>
                        <span>{logs.filter(l => l.toLowerCase().includes('error')).length}</span>
                    </div>
                    <div className="log-card warnings">
                        <label>Advertencias</label>
                        <span>{logs.filter(l => l.toLowerCase().includes('warn')).length}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LogsModule;
