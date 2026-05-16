import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';

// Image Carousel for Original + Nano Banana variations
function ImageCarousel({ images, onPreview }) {
    const [currentIdx, setCurrentIdx] = useState(0);
    if (!images.length) return null;
    const current = images[currentIdx];

    return (
        <div onClick={(e) => e.stopPropagation()}>
            {/* Main image */}
            <div style={{ position: 'relative' }}>
                <img
                    src={current.url}
                    alt={current.label}
                    onClick={() => onPreview(current.url)}
                    style={{
                        width: '100%', maxHeight: '380px', objectFit: 'contain',
                        cursor: 'zoom-in', display: 'block', background: 'rgba(15,23,42,0.8)',
                    }}
                />
                {/* Label badge */}
                <div style={{
                    position: 'absolute', top: '10px', left: '10px',
                    background: current.type === 'original' ? 'rgba(52,211,153,0.9)' : 'rgba(99,102,241,0.9)',
                    color: '#fff', fontSize: '11px', fontWeight: '600',
                    padding: '4px 10px', borderRadius: '8px', backdropFilter: 'blur(4px)',
                }}>
                    {current.label}
                </div>
                {/* Counter */}
                {images.length > 1 && (
                    <div style={{
                        position: 'absolute', top: '10px', right: '10px',
                        background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '11px',
                        padding: '4px 8px', borderRadius: '8px',
                    }}>
                        {currentIdx + 1}/{images.length}
                    </div>
                )}
                {/* Nav arrows */}
                {images.length > 1 && (
                    <>
                        <button onClick={() => setCurrentIdx((currentIdx - 1 + images.length) % images.length)} style={{
                            position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)',
                            background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', fontSize: '18px',
                            width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer',
                        }}>‹</button>
                        <button onClick={() => setCurrentIdx((currentIdx + 1) % images.length)} style={{
                            position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                            background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', fontSize: '18px',
                            width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer',
                        }}>›</button>
                    </>
                )}
            </div>
            {/* Dot navigation */}
            {images.length > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', padding: '8px 0' }}>
                    {images.map((img, i) => (
                        <button key={i} onClick={() => setCurrentIdx(i)} style={{
                            width: i === currentIdx ? '20px' : '8px', height: '8px',
                            borderRadius: '4px', border: 'none', cursor: 'pointer',
                            background: i === currentIdx
                                ? (img.type === 'original' ? '#34d399' : '#818cf8')
                                : 'rgba(148,163,184,0.3)',
                            transition: 'all 0.2s ease',
                        }} />
                    ))}
                </div>
            )}
        </div>
    );
}

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

export default function ProjectDetailPage({ projectId, onBack }) {
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

    const getImageFullUrl = (url) => {
        if (!url) return null;
        if (url.startsWith('http')) return url;
        // Relative URLs from our server
        const base = API_BASE.replace('/api', '');
        return `${base}${url}`;
    };

    if (loading) return <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>Cargando proyecto...</div>;
    if (!project) return <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>Proyecto no encontrado</div>;

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
        <div style={{ padding: '32px 40px', color: '#e2e8f0', maxWidth: '1100px', margin: '0 auto' }}>
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
            <div onClick={onBack} style={{ color: '#818cf8', cursor: 'pointer', fontSize: '14px', marginBottom: '20px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
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
                            style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: '8px', padding: '10px', color: '#fff', fontSize: '20px', fontWeight: '700', outline: 'none' }} />
                        <textarea value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} rows={2}
                            style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: '8px', padding: '10px', color: '#fff', fontSize: '14px', outline: 'none', resize: 'vertical' }} />
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <select value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
                                style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: '8px', padding: '8px', color: '#fff', fontSize: '13px', outline: 'none' }}>
                                {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                            </select>
                            <select value={editForm.priority} onChange={e => setEditForm(f => ({ ...f, priority: parseInt(e.target.value) }))}
                                style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: '8px', padding: '8px', color: '#fff', fontSize: '13px', outline: 'none' }}>
                                {[1, 2, 3, 4, 5].map(p => <option key={p} value={p}>Prioridad {p}</option>)}
                            </select>
                            <button onClick={handleSaveEdit} style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>Guardar</button>
                            <button onClick={() => setEditing(false)} style={{ background: 'rgba(51,65,85,0.5)', color: '#94a3b8', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px' }}>Cancelar</button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <span style={{ fontSize: '42px' }}>{project.cover_emoji || '🚀'}</span>
                                <div>
                                    <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#fff', margin: 0 }}>{project.name}</h1>
                                    {project.description && <p style={{ color: '#94a3b8', margin: '4px 0 0', fontSize: '14px' }}>{project.description}</p>}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <span style={{
                                    background: sc.bg, color: sc.color, fontSize: '12px', fontWeight: '600',
                                    padding: '4px 12px', borderRadius: '12px', textTransform: 'uppercase',
                                }}>{sc.label}</span>
                                <span style={{ fontSize: '12px', color: '#64748b' }}>P{project.priority || 3}</span>
                                <button onClick={() => setEditing(true)} style={{
                                    background: 'rgba(51,65,85,0.5)', color: '#94a3b8', border: 'none',
                                    borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontSize: '12px',
                                }}>✏️ Editar</button>
                            </div>
                        </div>
                        {tags.length > 0 && (
                            <div style={{ display: 'flex', gap: '8px', marginTop: '14px', flexWrap: 'wrap' }}>
                                {tags.map((t, i) => (
                                    <span key={i} style={{
                                        background: 'rgba(99,102,241,0.12)', color: '#818cf8', fontSize: '12px',
                                        padding: '3px 10px', borderRadius: '8px',
                                    }}>{t}</span>
                                ))}
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
                        <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#f1f5f9', margin: 0 }}>💡 Ideas & Notas ({ideas.length})</h2>
                    </div>

                    {/* Add Idea Form */}
                    <form onSubmit={handleAddIdea} style={{
                        background: 'rgba(30,41,59,0.5)', borderRadius: '12px', padding: '14px',
                        border: '1px solid rgba(148,163,184,0.1)', marginBottom: '16px',
                        display: 'flex', gap: '10px',
                    }}>
                        <input value={newIdea} onChange={e => setNewIdea(e.target.value)}
                            placeholder="Escribe una idea, nota o apunte..."
                            style={{
                                flex: 1, background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(148,163,184,0.15)',
                                borderRadius: '8px', padding: '10px 14px', color: '#fff', fontSize: '13px', outline: 'none',
                            }} />
                        <button type="submit" disabled={submittingIdea || !newIdea.trim()} style={{
                            background: '#6366f1', color: '#fff', border: 'none', borderRadius: '8px',
                            padding: '10px 16px', cursor: 'pointer', fontSize: '13px', fontWeight: '600',
                            opacity: submittingIdea || !newIdea.trim() ? 0.5 : 1, whiteSpace: 'nowrap',
                        }}>{submittingIdea ? '...' : '+ Añadir'}</button>
                    </form>

                    {/* Ideas List */}
                    {ideas.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b', fontSize: '13px', border: '2px dashed rgba(148,163,184,0.1)', borderRadius: '12px' }}>
                            Sin ideas aún. Escribe aquí arriba o dile a Tess desde WhatsApp.
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
                                        style={{
                                            background: 'rgba(30,41,59,0.5)', borderRadius: '14px',
                                            padding: isExpanded ? '18px 18px 14px' : '14px 16px',
                                            border: `1px solid ${isExpanded ? 'rgba(99,102,241,0.3)' : 'rgba(148,163,184,0.08)'}`,
                                            borderLeft: `3px solid ${sb.color}`,
                                            cursor: 'pointer', transition: 'all 0.2s ease',
                                            ...(isExpanded && { boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }),
                                        }}
                                    >
                                        {/* Header row */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div style={{ flex: 1 }}>
                                                {idea.title && (
                                                    <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '600', color: '#f1f5f9' }}>
                                                        {hasImage && '📸 '}{idea.title}
                                                    </h4>
                                                )}
                                                <p style={{
                                                    margin: 0, fontSize: '13px', lineHeight: '1.6', color: '#e2e8f0',
                                                    ...(!isExpanded && !idea.title && {
                                                        display: '-webkit-box', WebkitLineClamp: 2,
                                                        WebkitBoxOrient: 'vertical', overflow: 'hidden',
                                                    }),
                                                }}>
                                                    {!idea.title && hasImage && '📸 '}
                                                    {isExpanded ? idea.content : idea.content}
                                                </p>
                                            </div>
                                            <div style={{ display: 'flex', gap: '6px', marginLeft: '10px', flexShrink: 0 }}>
                                                {hasImage && !isExpanded && (
                                                    <span style={{ fontSize: '16px' }}>🖼️</span>
                                                )}
                                                <button onClick={(e) => handleDeleteIdea(idea.id, e)} style={{
                                                    background: 'none', border: 'none', color: '#64748b', cursor: 'pointer',
                                                    fontSize: '12px', padding: '2px 6px',
                                                }}>✕</button>
                                            </div>
                                        </div>

                                        {/* Expanded content */}
                                        {isExpanded && (
                                            <div style={{ marginTop: '12px' }}>
                                                {/* Image Gallery: Original + Nano Banana */}
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
                                                            {/* Image carousel */}
                                                            <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', background: 'rgba(15,23,42,0.5)' }}>
                                                                <ImageCarousel
                                                                    images={allImages}
                                                                    onPreview={(url) => { setImagePreview(url); }}
                                                                />
                                                            </div>
                                                            {genImgs.length > 0 && (
                                                                <div style={{ fontSize: '11px', color: '#818cf8', marginTop: '6px', textAlign: 'center' }}>
                                                                    🍌 {genImgs.length} variaciones generadas con Nano Banana
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })()}

                                                {/* Image Analysis */}
                                                {hasAnalysis && (
                                                    <div style={{
                                                        background: 'rgba(99,102,241,0.08)', borderRadius: '10px',
                                                        padding: '12px 14px', marginBottom: '10px',
                                                        border: '1px solid rgba(99,102,241,0.15)',
                                                    }}>
                                                        <div style={{ fontSize: '11px', color: '#818cf8', fontWeight: '600', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                            🔍 Análisis de imagen
                                                        </div>
                                                        <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.6', color: '#cbd5e1', whiteSpace: 'pre-wrap' }}>
                                                            {idea.image_analysis}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Footer metadata */}
                                        <div style={{ display: 'flex', gap: '10px', marginTop: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: '11px', color: sb.color, display: 'flex', alignItems: 'center', gap: '3px' }}>{sb.icon} {sb.label}</span>
                                            {idea.author && <span style={{ fontSize: '11px', color: '#64748b' }}>por {idea.author}</span>}
                                            <span style={{ fontSize: '11px', color: '#475569' }}>
                                                {new Date(idea.created_at).toLocaleDateString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            {!isExpanded && (hasImage || hasAnalysis) && (
                                                <span style={{ fontSize: '11px', color: '#818cf8', marginLeft: 'auto' }}>Click para expandir →</span>
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
                        <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#f1f5f9', margin: 0 }}>📄 Fichas Vinculadas ({fichas.length})</h2>
                        <button onClick={openFichaSearch} style={{
                            background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)',
                            borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontSize: '12px', fontWeight: '500',
                        }}>+ Vincular</button>
                    </div>

                    {/* Link Ficha Modal */}
                    {showLinkFicha && (
                        <div style={{
                            background: 'rgba(30,41,59,0.9)', borderRadius: '12px', padding: '14px',
                            border: '1px solid rgba(99,102,241,0.3)', marginBottom: '12px',
                            backdropFilter: 'blur(10px)',
                        }}>
                            <input value={fichaSearch} onChange={e => setFichaSearch(e.target.value)}
                                placeholder="Buscar ficha por título..."
                                style={{
                                    width: '100%', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(148,163,184,0.2)',
                                    borderRadius: '8px', padding: '8px 12px', color: '#fff', fontSize: '13px', outline: 'none', marginBottom: '10px',
                                }} />
                            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                {filteredFichas.length === 0 ? (
                                    <p style={{ fontSize: '12px', color: '#64748b', textAlign: 'center', padding: '16px' }}>No hay fichas disponibles</p>
                                ) : filteredFichas.slice(0, 10).map(f => (
                                    <div key={f.id} onClick={() => handleLinkFicha(f.id)} style={{
                                        padding: '8px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px',
                                        color: '#e2e8f0', transition: 'background 0.15s',
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.15)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                        {f.title}
                                    </div>
                                ))}
                            </div>
                            <button onClick={() => setShowLinkFicha(false)} style={{
                                width: '100%', marginTop: '8px', background: 'rgba(51,65,85,0.3)', color: '#94a3b8',
                                border: 'none', borderRadius: '6px', padding: '6px', cursor: 'pointer', fontSize: '12px',
                            }}>Cerrar</button>
                        </div>
                    )}

                    {/* Linked Fichas */}
                    {fichas.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '30px', color: '#64748b', fontSize: '13px', border: '2px dashed rgba(148,163,184,0.1)', borderRadius: '12px' }}>
                            Sin fichas vinculadas. Pulsa "+ Vincular" para añadir del vault.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {fichas.map(f => (
                                <div key={f.id} style={{
                                    background: 'rgba(30,41,59,0.5)', borderRadius: '12px', padding: '14px',
                                    border: '1px solid rgba(148,163,184,0.08)',
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <h4 style={{ margin: 0, fontSize: '13px', fontWeight: '600', color: '#f1f5f9' }}>{f.title}</h4>
                                        <button onClick={() => handleUnlinkFicha(f.id)} style={{
                                            background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '11px', padding: '2px 6px',
                                        }}>✕</button>
                                    </div>
                                    {f.tl_dr && (
                                        <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#94a3b8', lineHeight: '1.5',
                                            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                            {f.tl_dr}
                                        </p>
                                    )}
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                        <span style={{ fontSize: '11px', color: '#64748b' }}>{f.content_type}</span>
                                        <span style={{ fontSize: '11px', color: '#475569' }}>
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
