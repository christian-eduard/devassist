// src/pages/ProjectDetailPage.jsx — Refactored with useParams/useNavigate
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import ImageCarousel from '../components/project/ImageCarousel';

const STATUS_CONFIG = {
    idea:     { label: 'Idea',       color: '#a78bfa', bg: 'rgba(167,139,250,0.15)' },
    research: { label: 'Research',   color: '#60a5fa', bg: 'rgba(96,165,250,0.15)' },
    active:   { label: 'Activo',     color: '#34d399', bg: 'rgba(52,211,153,0.15)' },
    paused:   { label: 'Pausado',    color: '#fbbf24', bg: 'rgba(251,191,36,0.15)' },
    done:     { label: 'Completado', color: '#6b7280', bg: 'rgba(107,114,128,0.15)' },
};

const SOURCE_BADGES = {
    manual:   { label: 'Manual',   color: '#94a3b8', icon: '✏️' },
    whatsapp: { label: 'WhatsApp', color: '#25d366', icon: '💬' },
    tess:     { label: 'Tess',     color: '#818cf8', icon: '🤖' },
    api:      { label: 'API',      color: '#60a5fa', icon: '⚡' },
};

const API_BASE = import.meta.env.VITE_API_URL || '/api';

function getImageFullUrl(url) {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    const base = API_BASE.replace('/api', '');
    return `${base}${url}`;
}

export default function ProjectDetailPage() {
    const { id: projectId } = useParams();
    const navigate = useNavigate();
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [newIdea, setNewIdea] = useState('');
    const [submittingIdea, setSubmittingIdea] = useState(false);
    const [showLinkFicha, setShowLinkFicha] = useState(false);
    const [allFichas, setAllFichas] = useState([]);
    const [fichaSearch, setFichaSearch] = useState('');
    const [editing, setEditing] = useState(false);
    const [editForm, setEditForm] = useState({});
    const [expandedIdea, setExpandedIdea] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);

    const loadProject = useCallback(async () => {
        try {
            const res = await api.getProject(projectId);
            setProject(res.project);
            setEditForm({
                name: res.project.name,
                description: res.project.description || '',
                status: res.project.status,
                priority: res.project.priority,
            });
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [projectId]);

    useEffect(() => { loadProject(); }, [loadProject]);

    const handleAddIdea = async (e) => {
        e.preventDefault();
        if (!newIdea.trim()) return;
        setSubmittingIdea(true);
        try {
            await api.addIdea(projectId, { content: newIdea, source: 'manual', author: 'chris' });
            setNewIdea('');
            loadProject();
        } catch (err) { console.error(err); }
        finally { setSubmittingIdea(false); }
    };

    const handleDeleteIdea = async (ideaId, e) => {
        e.stopPropagation();
        try { await api.deleteIdea(projectId, ideaId); loadProject(); }
        catch (err) { console.error(err); }
    };

    const handleLinkFicha = async (fichaId) => {
        try { await api.linkFicha(projectId, fichaId); setShowLinkFicha(false); loadProject(); }
        catch (err) { console.error(err); }
    };

    const handleUnlinkFicha = async (fichaId) => {
        try { await api.unlinkFicha(projectId, fichaId); loadProject(); }
        catch (err) { console.error(err); }
    };

    const handleSaveEdit = async () => {
        try { await api.updateProject(projectId, editForm); setEditing(false); loadProject(); }
        catch (err) { console.error(err); }
    };

    const openFichaSearch = async () => {
        setShowLinkFicha(true);
        try {
            const res = await api.getFichas(100);
            setAllFichas(res.fichas || []);
        } catch (err) { console.error(err); }
    };

    if (loading) return <div className="loading"><div className="spinner" /></div>;
    if (!project) return <div className="empty-state"><p>Proyecto no encontrado</p></div>;

    const sc = STATUS_CONFIG[project.status] || STATUS_CONFIG.idea;
    const tags = Array.isArray(project.tags) ? project.tags : [];
    const ideas = project.ideas || [];
    const fichas = project.fichas || [];
    const linkedFichaIds = fichas.map(f => f.id);
    const filteredFichas = allFichas.filter(f =>
        !linkedFichaIds.includes(f.id) &&
        (!fichaSearch || f.title.toLowerCase().includes(fichaSearch.toLowerCase()))
    );

    return (
        <div style={{ color: '#e2e8f0' }}>
            {/* Image Lightbox */}
            {imagePreview && (
                <div onClick={() => setImagePreview(null)} style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out',
                    backdropFilter: 'blur(8px)',
                }}>
                    <img src={imagePreview} alt="Preview" style={{
                        maxWidth: '90vw', maxHeight: '90vh', borderRadius: '12px',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                    }} />
                    <button onClick={() => setImagePreview(null)} style={{
                        position: 'absolute', top: '20px', right: '20px', background: 'rgba(255,255,255,0.15)',
                        border: 'none', color: '#fff', fontSize: '20px', width: '40px', height: '40px',
                        borderRadius: '50%', cursor: 'pointer',
                    }}>✕</button>
                </div>
            )}

            {/* Back */}
            <div className="back-link" onClick={() => navigate('/projects')}>
                ← Volver a Proyectos
            </div>

            {/* Header */}
            <div style={{
                background: 'rgba(30,41,59,0.6)', borderRadius: '20px', padding: '28px',
                border: '1px solid rgba(148,163,184,0.1)', marginBottom: '24px',
                backdropFilter: 'blur(10px)',
            }}>
                {editing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                            className="input" style={{ fontSize: '20px', fontWeight: '700' }} />
                        <textarea value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} rows={2}
                            className="input" style={{ resize: 'vertical' }} />
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <select value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))} className="input">
                                {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                            </select>
                            <select value={editForm.priority} onChange={e => setEditForm(f => ({ ...f, priority: parseInt(e.target.value) }))} className="input">
                                {[1, 2, 3, 4, 5].map(p => <option key={p} value={p}>Prioridad {p}</option>)}
                            </select>
                            <button onClick={handleSaveEdit} className="btn btn-primary btn-sm">Guardar</button>
                            <button onClick={() => setEditing(false)} className="btn btn-ghost btn-sm">Cancelar</button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <span style={{ fontSize: '42px' }}>{project.cover_emoji || '🚀'}</span>
                                <div>
                                    <h1 className="page-title">{project.name}</h1>
                                    {project.description && <p className="page-subtitle" style={{ marginTop: '4px' }}>{project.description}</p>}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <span className="ficha-tag" style={{ background: sc.bg, color: sc.color }}>{sc.label}</span>
                                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>P{project.priority || 3}</span>
                                <button onClick={() => setEditing(true)} className="btn btn-ghost btn-sm">✏️ Editar</button>
                            </div>
                        </div>
                        {tags.length > 0 && (
                            <div className="ficha-meta" style={{ marginTop: '14px' }}>
                                {tags.map((t, i) => <span key={i} className="ficha-tag">{t}</span>)}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Two-column layout */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '24px' }}>
                {/* Ideas Timeline */}
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h2 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>💡 Ideas & Notas ({ideas.length})</h2>
                    </div>

                    {/* Add Idea Form */}
                    <form onSubmit={handleAddIdea} className="submit-section" style={{ marginBottom: '16px', display: 'flex', gap: '10px', padding: '14px' }}>
                        <input value={newIdea} onChange={e => setNewIdea(e.target.value)}
                            placeholder="Escribe una idea, nota o apunte..."
                            className="input" />
                        <button type="submit" disabled={submittingIdea || !newIdea.trim()} className="btn btn-primary btn-sm"
                            style={{ whiteSpace: 'nowrap' }}>
                            {submittingIdea ? '...' : '+ Añadir'}
                        </button>
                    </form>

                    {/* Ideas List */}
                    {ideas.length === 0 ? (
                        <div className="empty-state" style={{ padding: '40px', border: '2px dashed var(--border)' }}>
                            <p>Sin ideas aún. Escribe aquí arriba o dile a Tess desde WhatsApp.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {ideas.map(idea => {
                                const sb = SOURCE_BADGES[idea.source] || SOURCE_BADGES.manual;
                                const isExpanded = expandedIdea === idea.id;
                                const hasImage = !!idea.image_url;
                                const hasAnalysis = !!idea.image_analysis;
                                const imgUrl = getImageFullUrl(idea.image_url);

                                return (
                                    <div key={idea.id}
                                        onClick={() => setExpandedIdea(isExpanded ? null : idea.id)}
                                        className="card"
                                        style={{
                                            padding: isExpanded ? '18px 18px 14px' : '14px 16px',
                                            borderLeft: `3px solid ${sb.color}`,
                                            cursor: 'pointer',
                                            ...(isExpanded && { borderColor: 'rgba(99,102,241,0.3)', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }),
                                        }}
                                    >
                                        {/* Header row */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div style={{ flex: 1 }}>
                                                {idea.title && (
                                                    <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '600' }}>
                                                        {hasImage && '📸 '}{idea.title}
                                                    </h4>
                                                )}
                                                <p style={{
                                                    margin: 0, fontSize: '13px', lineHeight: '1.6', color: 'var(--text-primary)',
                                                    ...(!isExpanded && !idea.title && {
                                                        display: '-webkit-box', WebkitLineClamp: 2,
                                                        WebkitBoxOrient: 'vertical', overflow: 'hidden',
                                                    }),
                                                }}>
                                                    {!idea.title && hasImage && '📸 '}
                                                    {idea.content}
                                                </p>
                                            </div>
                                            <div style={{ display: 'flex', gap: '6px', marginLeft: '10px', flexShrink: 0 }}>
                                                {hasImage && !isExpanded && <span style={{ fontSize: '16px' }}>🖼️</span>}
                                                <button onClick={(e) => handleDeleteIdea(idea.id, e)}
                                                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '12px', padding: '2px 6px' }}>✕</button>
                                            </div>
                                        </div>

                                        {/* Expanded content */}
                                        {isExpanded && (
                                            <div style={{ marginTop: '12px' }}>
                                                {hasImage && imgUrl && (() => {
                                                    const genImgs = Array.isArray(idea.generated_images) ? idea.generated_images : [];
                                                    const allImages = [
                                                        { url: imgUrl, label: '📷 Original', type: 'original' },
                                                        ...genImgs.map(gi => ({
                                                            url: getImageFullUrl(gi.url),
                                                            label: gi.type === 'render_3d' ? '🎨 Render 3D' : gi.type === 'technical' ? '📐 Técnico' : '✨ Concept Art',
                                                            type: gi.type,
                                                        })),
                                                    ];

                                                    return (
                                                        <div style={{ marginBottom: '12px' }}>
                                                            <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', background: 'rgba(15,23,42,0.5)' }}>
                                                                <ImageCarousel images={allImages} onPreview={(url) => setImagePreview(url)} />
                                                            </div>
                                                            {genImgs.length > 0 && (
                                                                <div style={{ fontSize: '11px', color: 'var(--accent)', marginTop: '6px', textAlign: 'center' }}>
                                                                    🍌 {genImgs.length} variaciones generadas con Nano Banana
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })()}

                                                {hasAnalysis && (
                                                    <div style={{
                                                        background: 'rgba(99,102,241,0.08)', borderRadius: '10px',
                                                        padding: '12px 14px', marginBottom: '10px',
                                                        border: '1px solid rgba(99,102,241,0.15)',
                                                    }}>
                                                        <div style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: '600', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                            🔍 Análisis de imagen
                                                        </div>
                                                        <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.6', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                                                            {idea.image_analysis}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Footer metadata */}
                                        <div style={{ display: 'flex', gap: '10px', marginTop: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: '11px', color: sb.color, display: 'flex', alignItems: 'center', gap: '3px' }}>{sb.icon} {sb.label}</span>
                                            {idea.author && <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>por {idea.author}</span>}
                                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                                {new Date(idea.created_at).toLocaleDateString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            {!isExpanded && (hasImage || hasAnalysis) && (
                                                <span style={{ fontSize: '11px', color: 'var(--accent)', marginLeft: 'auto' }}>Click para expandir →</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Fichas Panel */}
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h2 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>📄 Fichas Vinculadas ({fichas.length})</h2>
                        <button onClick={openFichaSearch} className="btn btn-sm" style={{
                            background: 'rgba(99,102,241,0.15)', color: 'var(--accent)', border: '1px solid rgba(99,102,241,0.3)',
                        }}>+ Vincular</button>
                    </div>

                    {/* Link Ficha Modal */}
                    {showLinkFicha && (
                        <div className="card" style={{ marginBottom: '12px', backdropFilter: 'blur(10px)' }}>
                            <input value={fichaSearch} onChange={e => setFichaSearch(e.target.value)}
                                placeholder="Buscar ficha por título..."
                                className="input" style={{ width: '100%', marginBottom: '10px' }} />
                            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                {filteredFichas.length === 0 ? (
                                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '16px' }}>No hay fichas disponibles</p>
                                ) : filteredFichas.slice(0, 10).map(f => (
                                    <div key={f.id} onClick={() => handleLinkFicha(f.id)} className="card" style={{
                                        padding: '8px 10px', marginBottom: '4px', cursor: 'pointer', fontSize: '13px',
                                    }}>
                                        {f.title}
                                    </div>
                                ))}
                            </div>
                            <button onClick={() => setShowLinkFicha(false)} className="btn btn-ghost btn-sm" style={{ width: '100%', marginTop: '8px' }}>Cerrar</button>
                        </div>
                    )}

                    {/* Linked Fichas */}
                    {fichas.length === 0 ? (
                        <div className="empty-state" style={{ padding: '30px', border: '2px dashed var(--border)' }}>
                            <p>Sin fichas vinculadas. Pulsa "+ Vincular" para añadir del vault.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {fichas.map(f => (
                                <div key={f.id} className="card" style={{ padding: '14px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <h4 style={{ margin: 0, fontSize: '13px', fontWeight: '600' }}>{f.title}</h4>
                                        <button onClick={() => handleUnlinkFicha(f.id)}
                                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '11px', padding: '2px 6px' }}>✕</button>
                                    </div>
                                    {f.tl_dr && (
                                        <p className="ficha-tldr" style={{ marginTop: '6px', fontSize: '12px' }}>
                                            {f.tl_dr}
                                        </p>
                                    )}
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{f.content_type}</span>
                                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                            {new Date(f.created_at).toLocaleDateString('es', { day: 'numeric', month: 'short' })}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
