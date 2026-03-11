import React, { useState, useEffect, useCallback } from 'react';
import { Cpu, AlertTriangle } from 'lucide-react';
import AgentCard from './AgentCard';
import AgentConfigPanel from './AgentConfigPanel';
import './AgentsTab.css';

const AgentsTab = ({ showToast }) => {
    const [agents, setAgents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [configAgent, setConfigAgent] = useState(null);
    const [logsAgent, setLogsAgent] = useState(null);
    const [logs, setLogs] = useState([]);

    const loadAgents = useCallback(async () => {
        if (!window.electronAPI?.agents) return;
        const res = await window.electronAPI.agents.getAll();
        if (res.ok) setAgents(res.agents);
        setLoading(false);
    }, []);

    useEffect(() => { loadAgents(); }, [loadAgents]);

    const handleToggle = async (agentId) => {
        const res = await window.electronAPI.agents.toggle(agentId);
        if (res.ok) {
            showToast(`${res.agent.name} → ${res.agent.status === 'active' ? 'Activado' : 'Desactivado'}`, res.agent.status === 'active' ? 'success' : 'info');
            loadAgents();
        } else {
            showToast(res.error, 'error');
        }
    };

    const handleConfigure = (agent) => {
        setConfigAgent(agent);
    };

    const handleSaveConfig = async (agentId, config) => {
        const res = await window.electronAPI.agents.updateConfig(agentId, config);
        if (res.ok) loadAgents();
        else showToast(res.error, 'error');
    };

    const handleViewLogs = async (agent) => {
        setLogsAgent(agent);
        const res = await window.electronAPI.agents.getLogs(agent.id);
        if (res.ok) setLogs(res.errors || []);
    };

    const handleRestart = async (agentId) => {
        const res = await window.electronAPI.agents.restart(agentId);
        if (res.ok) {
            showToast('Agente reiniciado', 'success');
            loadAgents();
        } else {
            showToast(res.error, 'error');
        }
    };

    if (loading) return <div className="loading-state">Cargando agentes...</div>;

    const activeAgents = agents.filter(a => a.status === 'active');
    const pendingAgents = agents.filter(a => a.status === 'pending');
    const disabledAgents = agents.filter(a => a.status === 'disabled');

    return (
        <div className="agents-tab">
            <header className="agents-header">
                <div className="agents-header-info">
                    <Cpu size={22} />
                    <div>
                        <h2>Agentes VECTRON</h2>
                        <p>{activeAgents.length} activos · {pendingAgents.length} en construcción · {disabledAgents.length} desactivados</p>
                    </div>
                </div>
            </header>

            <div className="agents-grid">
                {agents.map(agent => (
                    <AgentCard
                        key={agent.id}
                        agent={agent}
                        onToggle={handleToggle}
                        onConfigure={handleConfigure}
                        onViewLogs={handleViewLogs}
                        onRestart={handleRestart}
                    />
                ))}
            </div>

            {configAgent && (
                <AgentConfigPanel
                    agent={configAgent}
                    onClose={() => setConfigAgent(null)}
                    onSave={handleSaveConfig}
                    showToast={showToast}
                />
            )}

            {logsAgent && (
                <div className="agent-config-overlay" onClick={() => setLogsAgent(null)}>
                    <div className="agent-logs-panel" onClick={e => e.stopPropagation()}>
                        <header className="config-panel-header">
                            <div className="config-panel-title">
                                <span className="agent-icon-large">{logsAgent.icon}</span>
                                <div>
                                    <h3>Logs: {logsAgent.name}</h3>
                                    <p>Últimos {logs.length} eventos</p>
                                </div>
                            </div>
                            <button className="config-close-btn" onClick={() => setLogsAgent(null)}>✕</button>
                        </header>
                        <div className="agent-logs-body">
                            {logs.length === 0 ? (
                                <p className="logs-empty">Sin errores registrados</p>
                            ) : logs.map((log, i) => (
                                <div key={i} className="log-entry">
                                    <span className="log-time">{new Date(log.timestamp).toLocaleString()}</span>
                                    <span className="log-msg"><AlertTriangle size={12} /> {log.message}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AgentsTab;
