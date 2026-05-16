import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';

export default function AIHubPage() {
    const [config, setConfig] = useState({
        provider: 'gemini',
        defaultModel: 'gemini-1.5-pro',
        geminiApiKey: '',
        openRouterApiKey: ''
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => { loadConfig(); }, []);

    const loadConfig = async () => {
        try {
            const data = await api.getAiConfig();
            setConfig(data);
        } catch (err) {
            console.error('Failed to load AI config', err);
            setMessage({ type: 'error', text: 'Error al cargar la configuración.' });
        } finally { setLoading(false); }
    };

    const handleChange = (e) => {
        setConfig({ ...config, [e.target.name]: e.target.value });
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);
        try {
            await api.updateAiConfig(config);
            setMessage({ type: 'success', text: 'Configuración guardada correctamente.' });
            loadConfig();
        } catch (err) {
            console.error('Failed to save AI config', err);
            setMessage({ type: 'error', text: 'Error al guardar la configuración.' });
        } finally { setSaving(false); }
    };

    if (loading) return <div className="loading"><div className="spinner" /></div>;

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">AI Hub</h1>
                <p className="page-subtitle">
                    Configura los proveedores de Inteligencia Artificial y gestiona tus claves de API de forma segura.
                </p>
            </div>

            {message && (
                <div className="card" style={{
                    marginBottom: '20px', padding: '14px 20px',
                    borderColor: message.type === 'error' ? 'var(--danger)' : 'var(--success)',
                    background: message.type === 'error' ? 'rgba(255,82,82,0.1)' : 'rgba(0,230,118,0.1)',
                    color: message.type === 'error' ? 'var(--danger)' : 'var(--success)',
                }}>
                    {message.text}
                </div>
            )}

            <form onSubmit={handleSave} className="submit-section" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                    <label style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500', display: 'block', marginBottom: '8px' }}>Proveedor Activo</label>
                    <select name="provider" value={config.provider} onChange={handleChange} className="input">
                        <option value="gemini">Google Gemini</option>
                        <option value="openrouter">OpenRouter</option>
                    </select>
                </div>

                <div>
                    <label style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500', display: 'block', marginBottom: '8px' }}>Modelo por Defecto</label>
                    <input type="text" name="defaultModel" value={config.defaultModel} onChange={handleChange}
                        placeholder="Ej: gemini-1.5-pro" className="input" />
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid var(--border)' }} />

                <div>
                    <label style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500', display: 'block', marginBottom: '8px' }}>Gemini API Key</label>
                    <input type="password" name="geminiApiKey" value={config.geminiApiKey} onChange={handleChange}
                        placeholder={config.geminiApiKey === '***' ? '••••••••••••••••' : 'Ingresa tu clave de Gemini'}
                        className="input" style={{ fontFamily: 'monospace' }} />
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>Deja en blanco si no deseas cambiar la clave existente.</p>
                </div>

                <div>
                    <label style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500', display: 'block', marginBottom: '8px' }}>OpenRouter API Key</label>
                    <input type="password" name="openRouterApiKey" value={config.openRouterApiKey} onChange={handleChange}
                        placeholder={config.openRouterApiKey === '***' ? '••••••••••••••••' : 'Ingresa tu clave de OpenRouter'}
                        className="input" style={{ fontFamily: 'monospace' }} />
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>Deja en blanco si no deseas cambiar la clave existente.</p>
                </div>

                <div style={{ paddingTop: '8px' }}>
                    <button type="submit" disabled={saving} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                        {saving ? 'Guardando...' : 'Guardar Configuración'}
                    </button>
                </div>
            </form>
        </div>
    );
}
