import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';

const STATUS_CONFIG = {
    idea:     { label: 'Idea',       color: '#a78bfa', bg: 'rgba(167,139,250,0.15)' },
    research: { label: 'Research',   color: '#60a5fa', bg: 'rgba(96,165,250,0.15)' },
    active:   { label: 'Activo',     color: '#34d399', bg: 'rgba(52,211,153,0.15)' },
    paused:   { label: 'Pausado',    color: '#fbbf24', bg: 'rgba(251,191,36,0.15)' },
    done:     { label: 'Completado', color: '#6b7280', bg: 'rgba(107,114,128,0.15)' },
};

const EMOJIS = ['🚀', '🧠', '🎯', '💡', '🔬', '🛡️', '📊', '🤖', '🌐', '⚡', '🔗', '📦', '🎨', '🏗️', '📡', '🛸'];

export default function ProjectsPage({ onSelectProject }) {
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

    const filtered = filter === 'all' ? projects : projects.filter(p => p.status === filter);

    const statsCounts = {
        total: projects.length,
        idea: projects.filter(p => p.status === 'idea').length,
        active: projects.filter(p => p.status === 'active' || p.status === 'research').length,
        ideas: projects.reduce((sum, p) => sum + (p.idea_count || 0), 0),
    };

    return (
        <div style={{ padding: '32px 40px', color: '#e2e8f0', maxWidth: '1200px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#fff', margin: 0 }}>
                        Projects Hub
                    </h1>
                    <p style={{ color: '#94a3b8', marginTop: '6px', fontSize: '14px' }}>
                        Incuba ideas, vincula conocimiento y desarrolla proyectos desde WhatsApp o aquí
                    </p>
                </div>
                <button onClick={() => setShowCreate(!showCreate)} style={{
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 20px',
                    fontSize: '14px', fontWeight: '600', cursor: 'pointer',
                    transition: 'transform 0.15s, box-shadow 0.15s',
                    boxShadow: '0 4px 15px rgba(99,102,241,0.3)',
                }}>
                    + Nuevo Proyecto
                </button>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
                {[
                    { label: 'Total', value: statsCounts.total, color: '#818cf8' },
                    { label: 'Ideas', value: statsCounts.idea, color: '#a78bfa' },
                    { label: 'Activos', value: statsCounts.active, color: '#34d399' },
                    { label: 'Notas', value: statsCounts.ideas, color: '#fbbf24' },
                ].map(s => (
                    <div key={s.label} style={{
                        background: 'rgba(30,41,59,0.6)', borderRadius: '12px', padding: '16px 20px',
                        border: '1px solid rgba(148,163,184,0.1)',
                        backdropFilter: 'blur(10px)',
                    }}>
                        <div style={{ fontSize: '24px', fontWeight: '700', color: s.color }}>{s.value}</div>
                        <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Create Modal */}
            {showCreate && (
                <form onSubmit={handleCreate} style={{
                    background: 'rgba(30,41,59,0.8)', borderRadius: '16px', padding: '24px',
                    border: '1px solid rgba(99,102,241,0.3)', marginBottom: '28px',
                    backdropFilter: 'blur(12px)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                }}>
                    <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>Icono</label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '180px' }}>
                                {EMOJIS.map(e => (
                                    <button key={e} type="button" onClick={() => setForm(f => ({ ...f, cover_emoji: e }))} style={{
                                        background: form.cover_emoji === e ? 'rgba(99,102,241,0.3)' : 'rgba(51,65,85,0.5)',
                                        border: form.cover_emoji === e ? '1px solid #6366f1' : '1px solid transparent',
                                        borderRadius: '8px', padding: '4px 6px', fontSize: '18px', cursor: 'pointer',
                                    }}>{e}</button>
                                ))}
                            </div>
                        </div>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div>
                                <label style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '500', display: 'block', marginBottom: '6px' }}>Nombre del proyecto</label>
                                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                    placeholder="Ej: Drones Aeroportuarios"
                                    style={{ width: '100%', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: '8px', padding: '10px 14px', color: '#fff', fontSize: '14px', outline: 'none' }} />
                            </div>
                            <div>
                                <label style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '500', display: 'block', marginBottom: '6px' }}>Descripción</label>
                                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                    placeholder="¿De qué va este proyecto?"
                                    rows={2}
                                    style={{ width: '100%', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: '8px', padding: '10px 14px', color: '#fff', fontSize: '14px', outline: 'none', resize: 'vertical' }} />
                            </div>
                            <div>
                                <label style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '500', display: 'block', marginBottom: '6px' }}>Tags (separados por coma)</label>
                                <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                                    placeholder="drones, seguridad, IA"
                                    style={{ width: '100%', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: '8px', padding: '10px 14px', color: '#fff', fontSize: '14px', outline: 'none' }} />
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                        <button type="button" onClick={() => setShowCreate(false)} style={{
                            background: 'rgba(51,65,85,0.5)', color: '#94a3b8', border: 'none', borderRadius: '8px', padding: '8px 18px', cursor: 'pointer', fontSize: '13px',
                        }}>Cancelar</button>
                        <button type="submit" disabled={submitting || !form.name} style={{
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 18px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', opacity: submitting || !form.name ? 0.5 : 1,
                        }}>{submitting ? 'Creando...' : 'Crear Proyecto'}</button>
                    </div>
                </form>
            )}

            {/* Filters */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
                {['all', ...Object.keys(STATUS_CONFIG)].map(s => (
                    <button key={s} onClick={() => setFilter(s)} style={{
                        background: filter === s ? 'rgba(99,102,241,0.2)' : 'rgba(51,65,85,0.3)',
                        color: filter === s ? '#818cf8' : '#94a3b8',
                        border: filter === s ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(148,163,184,0.1)',
                        borderRadius: '20px', padding: '6px 16px', fontSize: '12px', cursor: 'pointer',
                        fontWeight: filter === s ? '600' : '400', transition: 'all 0.2s',
                    }}>
                        {s === 'all' ? 'Todos' : STATUS_CONFIG[s].label}
                    </button>
                ))}
            </div>

            {/* Project Grid */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>Cargando...</div>
            ) : filtered.length === 0 ? (
                <div style={{
                    textAlign: 'center', padding: '60px', color: '#64748b',
                    border: '2px dashed rgba(148,163,184,0.15)', borderRadius: '16px',
                }}>
                    <div style={{ fontSize: '40px', marginBottom: '12px' }}>💡</div>
                    <p style={{ fontSize: '15px' }}>No hay proyectos{filter !== 'all' ? ` en estado "${STATUS_CONFIG[filter]?.label}"` : ''}. Crea uno o dile a Tess desde WhatsApp.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                    {filtered.map(p => {
                        const sc = STATUS_CONFIG[p.status] || STATUS_CONFIG.idea;
                        const tags = Array.isArray(p.tags) ? p.tags : [];
                        return (
                            <div key={p.id} onClick={() => onSelectProject?.(p.id)} style={{
                                background: 'rgba(30,41,59,0.6)', borderRadius: '16px', padding: '20px',
                                border: '1px solid rgba(148,163,184,0.1)', cursor: 'pointer',
                                transition: 'all 0.25s ease', backdropFilter: 'blur(8px)',
                                position: 'relative', overflow: 'hidden',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.2)'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(148,163,184,0.1)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                    <div style={{ fontSize: '32px' }}>{p.cover_emoji || '🚀'}</div>
                                    <span style={{
                                        background: sc.bg, color: sc.color, fontSize: '11px', fontWeight: '600',
                                        padding: '3px 10px', borderRadius: '12px', textTransform: 'uppercase', letterSpacing: '0.5px',
                                    }}>{sc.label}</span>
                                </div>

                                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#f1f5f9', margin: '0 0 6px 0' }}>{p.name}</h3>
                                {p.description && (
                                    <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 12px 0', lineHeight: '1.5',
                                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                        {p.description}
                                    </p>
                                )}

                                {tags.length > 0 && (
                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                                        {tags.slice(0, 3).map((t, i) => (
                                            <span key={i} style={{
                                                background: 'rgba(99,102,241,0.12)', color: '#818cf8', fontSize: '11px',
                                                padding: '2px 8px', borderRadius: '6px',
                                            }}>{t}</span>
                                        ))}
                                        {tags.length > 3 && <span style={{ fontSize: '11px', color: '#64748b' }}>+{tags.length - 3}</span>}
                                    </div>
                                )}

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(148,163,184,0.1)', paddingTop: '12px', marginTop: 'auto' }}>
                                    <div style={{ display: 'flex', gap: '16px' }}>
                                        <span style={{ fontSize: '12px', color: '#64748b' }}>💡 {p.idea_count || 0} ideas</span>
                                        <span style={{ fontSize: '12px', color: '#64748b' }}>📄 {p.ficha_count || 0} fichas</span>
                                    </div>
                                    <button onClick={(e) => handleDelete(p.id, e)} style={{
                                        background: 'none', border: 'none', color: '#64748b', cursor: 'pointer',
                                        fontSize: '14px', padding: '4px', borderRadius: '4px',
                                        transition: 'color 0.2s',
                                    }}
                                    onMouseEnter={e => e.target.style.color = '#f87171'}
                                    onMouseLeave={e => e.target.style.color = '#64748b'}
                                    >🗑</button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
