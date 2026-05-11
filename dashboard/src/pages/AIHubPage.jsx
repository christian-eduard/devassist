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

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        try {
            const data = await api.getAiConfig();
            setConfig(data);
        } catch (err) {
            console.error('Failed to load AI config', err);
            setMessage({ type: 'error', text: 'Error al cargar la configuración.' });
        } finally {
            setLoading(false);
        }
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
            loadConfig(); // Recargar para obtener "***" en lugar de las claves en texto plano si se guardaron
        } catch (err) {
            console.error('Failed to save AI config', err);
            setMessage({ type: 'error', text: 'Error al guardar la configuración.' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-white">Cargando configuración...</div>;

    return (
        <div className="p-8 text-white max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold mb-6 text-indigo-400">AI Hub</h1>
            <p className="text-slate-400 mb-8">
                Configura los proveedores de Inteligencia Artificial y gestiona tus claves de API de forma segura. Las claves se almacenan en el servidor.
            </p>

            {message && (
                <div className={`p-4 mb-6 rounded-md ${message.type === 'error' ? 'bg-red-900/50 text-red-200' : 'bg-green-900/50 text-green-200'}`}>
                    {message.text}
                </div>
            )}

            <form onSubmit={handleSave} className="space-y-6 bg-slate-900 p-6 rounded-lg border border-slate-800">
                
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Proveedor Activo</label>
                    <select 
                        name="provider" 
                        value={config.provider} 
                        onChange={handleChange}
                        className="w-full bg-slate-800 border border-slate-700 rounded-md p-2.5 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    >
                        <option value="gemini">Google Gemini</option>
                        <option value="openrouter">OpenRouter</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Modelo por Defecto</label>
                    <input 
                        type="text" 
                        name="defaultModel" 
                        value={config.defaultModel} 
                        onChange={handleChange}
                        placeholder="Ej: gemini-1.5-pro"
                        className="w-full bg-slate-800 border border-slate-700 rounded-md p-2.5 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                </div>

                <hr className="border-slate-800" />

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Gemini API Key</label>
                    <input 
                        type="password" 
                        name="geminiApiKey" 
                        value={config.geminiApiKey} 
                        onChange={handleChange}
                        placeholder={config.geminiApiKey === '***' ? '••••••••••••••••' : 'Ingresa tu clave de Gemini'}
                        className="w-full bg-slate-800 border border-slate-700 rounded-md p-2.5 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono text-sm"
                    />
                    <p className="text-xs text-slate-500 mt-1">Deja este campo en blanco si no deseas cambiar la clave existente.</p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">OpenRouter API Key</label>
                    <input 
                        type="password" 
                        name="openRouterApiKey" 
                        value={config.openRouterApiKey} 
                        onChange={handleChange}
                        placeholder={config.openRouterApiKey === '***' ? '••••••••••••••••' : 'Ingresa tu clave de OpenRouter'}
                        className="w-full bg-slate-800 border border-slate-700 rounded-md p-2.5 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono text-sm"
                    />
                    <p className="text-xs text-slate-500 mt-1">Deja este campo en blanco si no deseas cambiar la clave existente.</p>
                </div>

                <div className="pt-4">
                    <button 
                        type="submit" 
                        disabled={saving}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-4 rounded-md transition-colors disabled:opacity-50"
                    >
                        {saving ? 'Guardando...' : 'Guardar Configuración'}
                    </button>
                </div>
            </form>
        </div>
    );
}
