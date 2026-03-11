import React from 'react';
import { Power, Settings, FileText, RefreshCw, AlertTriangle, Clock, Cpu } from 'lucide-react';

function timeAgo(dateStr) {
    if (!dateStr) return 'Nunca';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Ahora mismo';
    if (mins < 60) return `hace ${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `hace ${hours}h`;
    const days = Math.floor(hours / 24);
    return `hace ${days}d`;
}

const STATUS_MAP = {
    active: { label: 'ACTIVO', className: 'status-active', dot: '●' },
    disabled: { label: 'DESACTIVADO', className: 'status-disabled', dot: '○' },
    pending: { label: 'EN CONSTRUCCIÓN', className: 'status-pending', dot: '◌' }
};

const AgentCard = ({ agent, onToggle, onConfigure, onViewLogs, onRestart }) => {
    const status = STATUS_MAP[agent.status] || STATUS_MAP.disabled;
    const isPending = agent.status === 'pending';
    const hasErrors = agent.errors && agent.errors.length > 0;

    return (
        <div className={`agent-card ${agent.status} ${hasErrors ? 'has-errors' : ''}`}>
            <div className="agent-card-header">
                <div className="agent-identity">
                    <span className="agent-icon">{agent.icon}</span>
                    <div className="agent-meta">
                        <h3 className="agent-name">{agent.name}</h3>
                        <p className="agent-description">{agent.description}</p>
                    </div>
                </div>
                <button
                    className={`agent-toggle ${agent.status}`}
                    onClick={() => onToggle(agent.id)}
                    disabled={isPending}
                    title={isPending ? 'En construcción' : (agent.status === 'active' ? 'Desactivar' : 'Activar')}
                >
                    <Power size={16} />
                    <span>{agent.status === 'active' ? 'ON' : 'OFF'}</span>
                </button>
            </div>

            <div className="agent-card-body">
                <div className="agent-status-row">
                    <span className={`agent-status-badge ${status.className}`}>
                        {status.dot} {status.label}
                    </span>
                    {agent.config?.webhook_port && (
                        <span className="agent-detail">
                            <Cpu size={12} /> Puerto: {agent.config.webhook_port}
                        </span>
                    )}
                    {agent.config?.daemon_port && (
                        <span className="agent-detail">
                            <Cpu size={12} /> Puerto: {agent.config.daemon_port}
                        </span>
                    )}
                </div>

                <div className="agent-info-row">
                    <span className="agent-last-active">
                        <Clock size={12} /> {timeAgo(agent.last_active)}
                    </span>
                    {hasErrors && (
                        <span className="agent-error-count">
                            <AlertTriangle size={12} /> {agent.errors.length} error{agent.errors.length > 1 ? 'es' : ''}
                        </span>
                    )}
                </div>

                {isPending && (
                    <div className="agent-pending-badge">
                        <AlertTriangle size={14} />
                        <span>Este agente está en desarrollo</span>
                    </div>
                )}

                {agent.capabilities && (
                    <div className="agent-capabilities">
                        {agent.capabilities.map(cap => (
                            <span key={cap} className="capability-tag">{cap}</span>
                        ))}
                    </div>
                )}
            </div>

            <div className="agent-card-footer">
                <button className="agent-action-btn" onClick={() => onConfigure(agent)} disabled={isPending}>
                    <Settings size={14} /> Configurar
                </button>
                <button className="agent-action-btn" onClick={() => onViewLogs(agent)}>
                    <FileText size={14} /> Logs
                </button>
                <button className="agent-action-btn" onClick={() => onRestart(agent.id)} disabled={isPending}>
                    <RefreshCw size={14} /> Reiniciar
                </button>
            </div>
        </div>
    );
};

export default AgentCard;
