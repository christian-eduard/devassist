// src/pages/NotasSueltasPage.jsx — Inbox de notas sin proyecto asignado
import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { api, API_BASE } from '../lib/api';

export default function NotasSueltasPage() {
    const { token } = useAuth();
    const [ideas, setIdeas] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lightbox, setLightbox] = useState(null);
    const [filter, setFilter] = useState('all');
    const [assigning, setAssigning] = useState(null); // ideaId being assigned

    useEffect(() => {
        fetchIdeas();
        api.getProjects().then(d => setProjects(d.projects || [])).catch(() => {});
    }, [token]);

    const fetchIdeas = async () => {
        try {
            const data = await api.getUnassignedIdeas();
            if (data.ok) setIdeas(data.ideas);
        } catch (err) {
            console.error('Error fetching unassigned ideas', err);
        } finally {
            setLoading(false);
        }
    };

    const deleteIdea = async (ideaId) => {
        if (!window.confirm('¿Eliminar esta nota suelta?')) return;
        try {
            const data = await api.deleteUnassignedIdea(ideaId);
            if (data.ok) setIdeas(ideas.filter(i => i.id !== ideaId));
        } catch (err) { console.error(err); }
    };

    const assignIdea = async (ideaId, projectName) => {
        setAssigning(ideaId);
        try {
            const data = await api.assignIdea({ ideaId, projectName });
            if (data.ok) {
                setIdeas(ideas.filter(i => i.id !== ideaId));
            }
        } catch (err) { console.error(err); }
        finally { setAssigning(null); }
    };

    const filtered = filter === 'all' ? ideas
        : filter === 'images' ? ideas.filter(i => i.image_url)
        : ideas.filter(i => !i.image_url);

    const stats = {
        total: ideas.length,
        images: ideas.filter(i => i.image_url).length,
        text: ideas.filter(i => !i.image_url).length,
        generated: ideas.reduce((n, i) => n + (i.generated_images?.length || 0), 0),
    };

    if (loading) return <div className="loading"><div className="spinner" /></div>;

    return (
        <div>
            {/* Header */}
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 className="page-title">Notas Sueltas</h1>
                    <p className="page-subtitle">Tu inbox de ideas, fotos y notas enviadas desde WhatsApp sin proyecto asignado</p>
                </div>
                {ideas.length > 0 && (
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '6px 14px', borderRadius: '20px' }}>
                        {ideas.length} {ideas.length === 1 ? 'nota' : 'notas'}
                    </span>
                )}
            </div>

            {/* Stats */}
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                {[
                    { label: 'Total', value: stats.total, icon: '📝' },
                    { label: 'Con Imagen', value: stats.images, icon: '🖼️' },
                    { label: 'Solo Texto', value: stats.text, icon: '💬' },
                    { label: 'Generadas', value: stats.generated, icon: '🍌' },
                ].map(s => (
                    <div key={s.label} className="stat-card">
                        <div className="stat-value">{s.value}</div>
                        <div className="stat-label">{s.icon} {s.label}</div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="filter-bar">
                {[
                    { key: 'all', label: 'Todas' },
                    { key: 'images', label: '🖼️ Con imagen' },
                    { key: 'text', label: '💬 Solo texto' },
                ].map(f => (
                    <button key={f.key} onClick={() => setFilter(f.key)}
                        className={`btn btn-sm btn-pill ${filter === f.key ? 'active' : ''}`}>
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            {filtered.length === 0 ? (
                <div className="empty-state">
                    <div className="icon">📭</div>
                    <p>{ideas.length === 0
                        ? 'No hay notas sueltas. Envía una imagen o texto a Tess sin mencionar un proyecto.'
                        : 'No hay notas que coincidan con el filtro seleccionado.'
                    }</p>
                </div>
            ) : (
                <div className="card-grid">
                    {filtered.map(idea => {
                        const isProduct = idea.metadata?.classification === 'product';
                        const genImages = idea.generated_images || [];
                        return (
                            <div key={idea.id} className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

                                {/* Image header */}
                                {idea.image_url && (
                                    <div
                                        style={{ width: '100%', height: '200px', overflow: 'hidden', cursor: 'pointer', position: 'relative', background: 'var(--bg-primary)' }}
                                        onClick={() => setLightbox(idea.image_url)}
                                    >
                                        <img
                                            src={idea.image_url}
                                            alt="Nota"
                                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.3s' }}
                                            onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }}
                                            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                        />
                                        <div style={{
                                            position: 'absolute', top: '8px', right: '8px',
                                            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
                                            padding: '4px 10px', borderRadius: '12px',
                                            fontSize: '11px', color: '#fff', fontWeight: 500
                                        }}>
                                            🔍 Ampliar
                                        </div>
                                    </div>
                                )}

                                {/* Body */}
                                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', flex: 1 }}>

                                    {/* Top row: source + actions */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                        <span className="ficha-tag channel" style={{ fontSize: '11px' }}>
                                            {idea.source === 'whatsapp' ? '📱 WhatsApp' : '💻 Dashboard'} · {idea.author || 'Tess'}
                                        </span>
                                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                            {/* Move to project dropdown */}
                                            <select
                                                onChange={(e) => { if (e.target.value) assignIdea(idea.id, e.target.value); e.target.value = ''; }}
                                                disabled={assigning === idea.id}
                                                style={{
                                                    background: 'var(--bg-primary)', color: 'var(--text-secondary)',
                                                    border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                                                    padding: '4px 8px', fontSize: '11px', cursor: 'pointer',
                                                    maxWidth: '140px'
                                                }}
                                                title="Mover a proyecto"
                                            >
                                                <option value="">{assigning === idea.id ? '⏳ Moviendo...' : '📂 Mover a...'}</option>
                                                {projects.map(p => (
                                                    <option key={p.id} value={p.name}>{p.cover_emoji || '📁'} {p.name}</option>
                                                ))}
                                            </select>
                                            <button onClick={() => deleteIdea(idea.id)} className="btn btn-sm btn-danger"
                                                style={{ padding: '4px 8px', fontSize: '14px' }} title="Eliminar nota">
                                                🗑
                                            </button>
                                        </div>
                                    </div>

                                    {/* Title */}
                                    {idea.title && (
                                        <h3 className="ficha-title" style={{ marginBottom: '8px' }}>{idea.title}</h3>
                                    )}

                                    {/* Content */}
                                    <p className="ficha-tldr" style={{ WebkitLineClamp: 5, marginBottom: '16px', flex: 1 }}>
                                        {idea.content || 'Sin descripción'}
                                    </p>

                                    {/* AI Analysis */}
                                    {idea.image_analysis && (
                                        <div style={{
                                            padding: '12px 14px', marginBottom: '12px',
                                            background: 'rgba(0, 230, 118, 0.06)',
                                            borderLeft: '3px solid var(--success)',
                                            borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
                                            fontSize: '13px', lineHeight: '1.6'
                                        }}>
                                            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--success)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>
                                                ✨ Análisis AI
                                            </span>
                                            <span style={{ color: 'var(--text-secondary)' }}>{idea.image_analysis}</span>
                                        </div>
                                    )}

                                    {/* Product metadata */}
                                    {isProduct && idea.metadata && (
                                        <div style={{
                                            padding: '12px 14px', marginBottom: '12px',
                                            background: 'rgba(251, 191, 36, 0.06)',
                                            borderLeft: '3px solid var(--warning)',
                                            borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
                                            fontSize: '13px', lineHeight: '1.6'
                                        }}>
                                            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--warning)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>
                                                🛍️ Producto Identificado
                                            </span>
                                            <div style={{ color: 'var(--text-secondary)' }}>
                                                {idea.metadata.brand && <div><strong>Marca:</strong> {idea.metadata.brand}</div>}
                                                {idea.metadata.estimated_price && <div><strong>Precio:</strong> {idea.metadata.estimated_price}€</div>}
                                                {idea.metadata.key_specs?.length > 0 && <div><strong>Specs:</strong> {idea.metadata.key_specs.join(', ')}</div>}
                                            </div>
                                        </div>
                                    )}

                                    {/* Nano Banana generations */}
                                    {genImages.length > 0 && (
                                        <div style={{ marginBottom: '12px' }}>
                                            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>
                                                🍌 Nano Banana · {genImages.length} variaciones
                                            </span>
                                            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(genImages.length, 4)}, 1fr)`, gap: '6px' }}>
                                                {genImages.map((img, i) => (
                                                    <div key={i} style={{
                                                        aspectRatio: '1/1', borderRadius: 'var(--radius-sm)', overflow: 'hidden',
                                                        border: '1px solid var(--border)', cursor: 'pointer', background: 'var(--bg-primary)'
                                                    }} onClick={() => setLightbox(img)}>
                                                        <img src={img} alt={`Gen ${i + 1}`}
                                                            style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s' }}
                                                            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                                                            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Footer */}
                                    <div className="card-footer">
                                        <div className="card-footer-stats">
                                            <span>📅 {new Date(idea.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                            {genImages.length > 0 && <span>🍌 {genImages.length}</span>}
                                        </div>
                                        <div className="ficha-meta" style={{ marginTop: 0 }}>
                                            {idea.image_url && <span className="ficha-tag">imagen</span>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Lightbox */}
            {lightbox && (
                <div onClick={() => setLightbox(null)} style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000,
                    cursor: 'zoom-out', animation: 'tess-slide-up 0.2s ease'
                }}>
                    <img src={lightbox} alt="Preview"
                        style={{ maxWidth: '90vw', maxHeight: '85vh', borderRadius: '12px', boxShadow: '0 32px 80px rgba(0,0,0,0.6)' }}
                        onClick={e => e.stopPropagation()}
                    />
                    <button onClick={() => setLightbox(null)} style={{
                        position: 'absolute', top: '24px', right: '24px',
                        background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff',
                        width: '40px', height: '40px', borderRadius: '50%', fontSize: '20px',
                        cursor: 'pointer', backdropFilter: 'blur(4px)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center'
                    }}>✕</button>
                </div>
            )}
        </div>
    );
}
