// src/pages/ProjectsPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

const STATUS_CONFIG = {
    idea:     { label: 'Idea',       color: '#a78bfa', bg: 'rgba(167,139,250,0.15)' },
    research: { label: 'Research',   color: '#60a5fa', bg: 'rgba(96,165,250,0.15)' },
    active:   { label: 'Activo',     color: '#34d399', bg: 'rgba(52,211,153,0.15)' },
    paused:   { label: 'Pausado',    color: '#fbbf24', bg: 'rgba(251,191,36,0.15)' },
    done:     { label: 'Completado', color: '#6b7280', bg: 'rgba(107,114,128,0.15)' },
};

const EMOJIS = ['🚀', '🧠', '🎯', '💡', '🔬', '🛡️', '📊', '🤖', '🌐', '⚡', '🔗', '📦', '🎨', '🏗️', '📡', '🛸'];

export default function ProjectsPage() {
    const navigate = useNavigate();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [filter, setFilter] = useState('all');
    const [form, setForm] = useState({ name: '', description: '', cover_emoji: '🚀', tags: '' });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => { loadProjects(); }, []);

    const loadProjects = async () => {
        try {
            const res = await api.getProjects();
            setProjects(res.projects || []);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!form.name) return;
        setSubmitting(true);
        try {
            await api.createProject({
                name: form.name,
                description: form.description,
                cover_emoji: form.cover_emoji,
                tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
            });
            setForm({ name: '', description: '', cover_emoji: '🚀', tags: '' });
            setShowCreate(false);
            loadProjects();
        } catch (err) { console.error(err); }
        finally { setSubmitting(false); }
    };

    const handleDelete = async (id, e) => {
        e.stopPropagation();
        if (!confirm('¿Eliminar este proyecto y todas sus ideas?')) return;
        try { await api.deleteProject(id); loadProjects(); } catch (err) { console.error(err); }
    };

    const filtered = (filter === 'all' ? projects : projects.filter(p => p.status === filter))
        .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

    const statsCounts = {
        total: projects.length,
        idea: projects.filter(p => p.status === 'idea').length,
        active: projects.filter(p => p.status === 'active' || p.status === 'research').length,
        ideas: projects.reduce((sum, p) => sum + (p.idea_count || 0), 0),
    };

    return (
        <div>
            {/* Header */}
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 className="page-title">Projects Hub</h1>
                    <p className="page-subtitle">Incuba ideas, vincula conocimiento y desarrolla proyectos desde WhatsApp o aquí</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowCreate(!showCreate)}>
                    + Nuevo Proyecto
                </button>
            </div>

            {/* Stats */}
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                {[
                    { label: 'Total', value: statsCounts.total },
                    { label: 'Ideas', value: statsCounts.idea },
                    { label: 'Activos', value: statsCounts.active },
                    { label: 'Notas', value: statsCounts.ideas },
                ].map(s => (
                    <div key={s.label} className="stat-card">
                        <div className="stat-value">{s.value}</div>
                        <div className="stat-label">{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Create Form */}
            {showCreate && (
                <form onSubmit={handleCreate} className="submit-section" style={{ marginBottom: '28px' }}>
                    <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label className="field-label">Icono</label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '180px' }}>
                                {EMOJIS.map(e => (
                                    <button key={e} type="button" onClick={() => setForm(f => ({ ...f, cover_emoji: e }))}
                                        className={`emoji-btn ${form.cover_emoji === e ? 'active' : ''}`}>{e}</button>
                                ))}
                            </div>
                        </div>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div>
                                <label className="field-label">Nombre del proyecto</label>
                                <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                    placeholder="Ej: Drones Aeroportuarios" />
                            </div>
                            <div>
                                <label className="field-label">Descripción</label>
                                <textarea className="input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                    placeholder="¿De qué va este proyecto?" rows={2} style={{ resize: 'vertical' }} />
                            </div>
                            <div>
                                <label className="field-label">Tags (separados por coma)</label>
                                <input className="input" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                                    placeholder="drones, seguridad, IA" />
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                        <button type="button" onClick={() => setShowCreate(false)} className="btn btn-ghost">Cancelar</button>
                        <button type="submit" disabled={submitting || !form.name} className="btn btn-primary">
                            {submitting ? 'Creando...' : 'Crear Proyecto'}
                        </button>
                    </div>
                </form>
            )}

            {/* Filters */}
            <div className="filter-bar">
                {['all', ...Object.keys(STATUS_CONFIG)].map(s => (
                    <button key={s} onClick={() => setFilter(s)}
                        className={`btn btn-sm btn-pill ${filter === s ? 'active' : ''}`}>
                        {s === 'all' ? 'Todos' : STATUS_CONFIG[s].label}
                    </button>
                ))}
            </div>

            {/* Project Grid */}
            {loading ? (
                <div className="loading"><div className="spinner"></div></div>
            ) : filtered.length === 0 ? (
                <div className="empty-state">
                    <div className="icon">💡</div>
                    <p>No hay proyectos{filter !== 'all' ? ` en estado "${STATUS_CONFIG[filter]?.label}"` : ''}. Crea uno o dile a Tess desde WhatsApp.</p>
                </div>
            ) : (
                <div className="card-grid">
                    {filtered.map(p => {
                        const sc = STATUS_CONFIG[p.status] || STATUS_CONFIG.idea;
                        const tags = Array.isArray(p.tags) ? p.tags : [];
                        return (
                            <div key={p.id} className="card ficha-card" onClick={() => navigate(`/projects/${p.id}`)}
                                style={p.pinned ? { borderColor: 'var(--accent)', boxShadow: '0 0 12px rgba(167,139,250,0.2)' } : {}}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                    <div style={{ fontSize: '32px' }}>{p.cover_emoji || '🚀'}{p.pinned ? <span style={{ fontSize: '14px', marginLeft: '4px' }}>📌</span> : null}</div>
                                    <span className="ficha-tag" style={{ background: sc.bg, color: sc.color }}>
                                        {sc.label}
                                    </span>
                                </div>

                                <h3 className="ficha-title">{p.name}</h3>
                                {p.description && (
                                    <p className="ficha-tldr">{p.description}</p>
                                )}

                                {tags.length > 0 && (
                                    <div className="ficha-meta">
                                        {tags.slice(0, 3).map((t, i) => (
                                            <span key={i} className="ficha-tag">{t}</span>
                                        ))}
                                        {tags.length > 3 && <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>+{tags.length - 3}</span>}
                                    </div>
                                )}

                                <div className="card-footer">
                                    <div className="card-footer-stats">
                                        <span>💡 {p.idea_count || 0} ideas</span>
                                        <span>📄 {p.ficha_count || 0} fichas</span>
                                    </div>
                                    <button onClick={(e) => handleDelete(p.id, e)} className="btn btn-sm btn-danger"
                                        style={{ padding: '4px 8px', fontSize: '14px' }}>
                                        🗑
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
