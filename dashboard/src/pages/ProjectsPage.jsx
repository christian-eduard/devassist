import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';

export default function ProjectsPage() {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [name, setName] = useState('');
    const [path, setPath] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadProjects();
    }, []);

    const loadProjects = async () => {
        try {
            const res = await api.getProjects();
            setProjects(res.projects || []);
        } catch (err) {
            console.error('Failed to load projects', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name || !path) return;
        setSubmitting(true);
        try {
            await api.createProject({ name, path });
            setName('');
            setPath('');
            loadProjects();
        } catch (err) {
            console.error('Failed to create project', err);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('¿Seguro que quieres eliminar este proyecto?')) return;
        try {
            await api.deleteProject(id);
            loadProjects();
        } catch (err) {
            console.error('Failed to delete project', err);
        }
    };

    return (
        <div className="p-8 text-white max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-6 text-indigo-400">Proyectos</h1>
            <p className="text-slate-400 mb-8">
                Registra y escanea tus repositorios de código locales o remotos para integrar su contexto en el cerebro de DevAssist.
            </p>

            <form onSubmit={handleSubmit} className="mb-8 p-6 bg-slate-900 rounded-lg border border-slate-800 flex gap-4 items-end">
                <div className="flex-1">
                    <label className="block text-sm font-medium text-slate-300 mb-2">Nombre del Proyecto</label>
                    <input 
                        type="text" 
                        value={name} 
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ej: devassist-web"
                        className="w-full bg-slate-800 border border-slate-700 rounded-md p-2.5 text-white focus:outline-none focus:border-indigo-500"
                    />
                </div>
                <div className="flex-1">
                    <label className="block text-sm font-medium text-slate-300 mb-2">Ruta o URL Git</label>
                    <input 
                        type="text" 
                        value={path} 
                        onChange={(e) => setPath(e.target.value)}
                        placeholder="/Users/..."
                        className="w-full bg-slate-800 border border-slate-700 rounded-md p-2.5 text-white focus:outline-none focus:border-indigo-500"
                    />
                </div>
                <button 
                    type="submit" 
                    disabled={submitting || !name || !path}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-6 rounded-md transition-colors disabled:opacity-50"
                >
                    {submitting ? 'Añadiendo...' : 'Añadir'}
                </button>
            </form>

            {loading ? (
                <div className="text-center text-slate-500 py-10">Cargando proyectos...</div>
            ) : projects.length === 0 ? (
                <div className="text-center text-slate-500 py-10 border border-dashed border-slate-700 rounded-lg">
                    No tienes proyectos registrados.
                </div>
            ) : (
                <div className="grid gap-4">
                    {projects.map(p => (
                        <div key={p.id} className="p-4 bg-slate-900 border border-slate-800 rounded-lg flex justify-between items-center hover:border-indigo-500 transition-colors">
                            <div>
                                <h3 className="text-lg font-semibold text-white">{p.name}</h3>
                                <p className="text-sm text-slate-400 mt-1 font-mono">{p.path}</p>
                                <span className="inline-block mt-2 px-2 py-1 bg-slate-800 text-xs text-indigo-300 rounded border border-slate-700">
                                    {p.stack}
                                </span>
                            </div>
                            <div>
                                <button 
                                    onClick={() => handleDelete(p.id)}
                                    className="text-red-400 hover:text-red-300 hover:bg-red-900/30 px-3 py-1.5 rounded transition-colors"
                                >
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
