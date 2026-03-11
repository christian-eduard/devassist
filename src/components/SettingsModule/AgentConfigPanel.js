import React, { useState } from 'react';
import { X, Save, RefreshCw } from 'lucide-react';

const AgentConfigPanel = ({ agent, onClose, onSave, showToast }) => {
    const [config, setConfig] = useState({ ...agent.config });
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSave(agent.id, config);
            showToast(`Configuración de ${agent.name} guardada`, 'success');
            onClose();
        } catch (e) {
            showToast('Error al guardar configuración', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const renderConfigField = (key, value) => {
        if (Array.isArray(value)) {
            return (
                <div className="config-field" key={key}>
                    <label className="config-label">{key.replace(/_/g, ' ')}</label>
                    <input
                        type="text"
                        className="premium-input"
                        value={value.join(', ')}
                        onChange={e => setConfig({
                            ...config,
                            [key]: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                        })}
                    />
                    <span className="config-hint">Separados por comas</span>
                </div>
            );
        }

        if (typeof value === 'boolean') {
            return (
                <div className="config-field config-field-toggle" key={key}>
                    <label className="config-label">{key.replace(/_/g, ' ')}</label>
                    <label className="switch">
                        <input
                            type="checkbox"
                            checked={value}
                            onChange={e => setConfig({ ...config, [key]: e.target.checked })}
                        />
                        <span className="slider"></span>
                    </label>
                </div>
            );
        }

        if (typeof value === 'number') {
            return (
                <div className="config-field" key={key}>
                    <label className="config-label">{key.replace(/_/g, ' ')}</label>
                    <input
                        type="number"
                        className="premium-input"
                        value={value}
                        onChange={e => setConfig({ ...config, [key]: parseInt(e.target.value) || 0 })}
                    />
                </div>
            );
        }

        return (
            <div className="config-field" key={key}>
                <label className="config-label">{key.replace(/_/g, ' ')}</label>
                <input
                    type="text"
                    className="premium-input"
                    value={value || ''}
                    onChange={e => setConfig({ ...config, [key]: e.target.value })}
                />
            </div>
        );
    };

    return (
        <div className="agent-config-overlay" onClick={onClose}>
            <div className="agent-config-panel" onClick={e => e.stopPropagation()}>
                <header className="config-panel-header">
                    <div className="config-panel-title">
                        <span className="agent-icon-large">{agent.icon}</span>
                        <div>
                            <h3>{agent.name}</h3>
                            <p>Configuración del agente</p>
                        </div>
                    </div>
                    <button className="config-close-btn" onClick={onClose}>
                        <X size={18} />
                    </button>
                </header>

                <div className="config-panel-body">
                    {Object.entries(config).map(([key, value]) => renderConfigField(key, value))}
                </div>

                <footer className="config-panel-footer">
                    <button className="btn-save-config" onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                        Guardar Configuración
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default AgentConfigPanel;
