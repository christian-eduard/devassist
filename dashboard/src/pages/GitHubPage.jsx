// src/pages/GitHubPage.jsx — Browse GitHub repos and link to projects
import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';

export default function GitHubPage() {
    const [repos, setRepos] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [linkingRepo, setLinkingRepo] = useState(null);
    const [selectedProject, setSelectedProject] = useState('');

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [repoRes, projRes] = await Promise.all([
                api.getGitHubRepos(),
                api.getGitHubProjects(),
            ]);
            setRepos(repoRes.repos || []);
            setProjects(projRes.projects || []);
        } catch (err) { setError(err.message); }
        finally { setLoading(false); }
    };

    const handleLink = async (repo) => {
        if (!selectedProject) return;
        try {
            await api.linkRepo(selectedProject, repo.html_url, repo.name, repo.language);
            setLinkingRepo(null);
            setSelectedProject('');
            loadData();
        } catch (err) { setError(err.message); }
    };

    const handleUnlink = async (projectId) => {
        try {
            await api.unlinkRepo(projectId);
            loadData();
        } catch (err) { setError(err.message); }
    };

    const filtered = repos.filter(r => {
        if (filter === 'linked' && !r.linked_project) return false;
        if (filter === 'unlinked' && r.linked_project) return false;
        if (filter === 'private' && !r.private) return false;
        if (filter === 'public' && r.private) return false;
        if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    const linkedCount = repos.filter(r => r.linked_project).length;

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 className="page-title">
                        <span style={{ marginRight: '10px' }}>📂</span>GitHub Repos
                    </h1>
                    <p className="page-subtitle">
                        {repos.length} repositorios · {linkedCount} vinculados
                    </p>
                </div>
            </div>

            {/* Stats */}
            <div className="stats-row" style={{ marginBottom: '20px' }}>
                <div className="stat-card">
                    <div className="stat-value">{repos.length}</div>
                    <div className="stat-label">Total Repos</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{repos.filter(r => r.private).length}</div>
                    <div className="stat-label">Privados 🔒</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{repos.filter(r => !r.private).length}</div>
                    <div className="stat-label">Públicos 🌐</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value" style={{ color: 'var(--success)' }}>{linkedCount}</div>
                    <div className="stat-label">Vinculados 🔗</div>
                </div>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
                <div className="filter-bar" style={{ flex: 1 }}>
                    {[
                        { key: 'all', label: 'Todos' },
                        { key: 'linked', label: '🔗 Vinculados' },
                        { key: 'unlinked', label: '📌 Sin vincular' },
                        { key: 'private', label: '🔒 Privados' },
                        { key: 'public', label: '🌐 Públicos' },
                    ].map(f => (
                        <button key={f.key} onClick={() => setFilter(f.key)}
                            className={`btn btn-sm ${filter === f.key ? 'btn-primary' : 'btn-ghost'}`}>
                            {f.label}
                        </button>
                    ))}
                </div>
                <input className="input" placeholder="Buscar repo..."
                    value={search} onChange={e => setSearch(e.target.value)}
                    style={{ maxWidth: '220px' }} />
            </div>

            {/* Content */}
            {loading ? (
                <div className="loading"><div className="spinner" /></div>
            ) : error ? (
                <div className="empty-state">
                    <div className="icon">⚠️</div>
                    <p>{error}</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {filtered.map(repo => (
                        <div key={repo.name} className="card"
                            style={{
                                padding: '16px 20px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '16px',
                                borderLeft: repo.linked_project
                                    ? '3px solid var(--success)'
                                    : '3px solid transparent',
                            }}>

                            {/* Icon + Name */}
                            <div style={{ fontSize: '24px' }}>
                                {repo.private ? '🔒' : '🌐'}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                    <a href={repo.html_url} target="_blank" rel="noopener noreferrer"
                                        style={{ color: 'var(--text)', fontWeight: 600, fontSize: '15px', textDecoration: 'none' }}
                                        onClick={e => e.stopPropagation()}>
                                        {repo.name}
                                    </a>
                                    {repo.language && (
                                        <span className="ficha-tag" style={{
                                            background: 'rgba(96,165,250,0.15)',
                                            color: '#60a5fa',
                                            fontSize: '11px',
                                        }}>
                                            {repo.language}
                                        </span>
                                    )}
                                </div>
                                {repo.description && (
                                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.3 }}>
                                        {repo.description}
                                    </p>
                                )}
                                <div style={{ marginTop: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>
                                    Actualizado: {new Date(repo.pushed_at).toLocaleDateString('es-ES')}
                                </div>
                            </div>

                            {/* Link Status */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                {repo.linked_project ? (
                                    <>
                                        <span style={{
                                            background: 'rgba(52,211,153,0.15)',
                                            color: '#34d399',
                                            padding: '4px 10px',
                                            borderRadius: '6px',
                                            fontSize: '12px',
                                            fontWeight: 500,
                                        }}>
                                            {repo.linked_project.emoji || '🚀'} {repo.linked_project.name}
                                        </span>
                                        <button onClick={() => handleUnlink(repo.linked_project.id)}
                                            className="btn btn-sm btn-ghost"
                                            style={{ padding: '4px 8px', fontSize: '12px' }}
                                            title="Desvincular">
                                            ✖
                                        </button>
                                    </>
                                ) : linkingRepo === repo.name ? (
                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                        <select className="input" value={selectedProject}
                                            onChange={e => setSelectedProject(e.target.value)}
                                            style={{ fontSize: '12px', padding: '4px 8px', maxWidth: '180px' }}>
                                            <option value="">Seleccionar proyecto...</option>
                                            {projects.map(p => (
                                                <option key={p.id} value={p.id}>
                                                    {p.cover_emoji || '🚀'} {p.name}
                                                </option>
                                            ))}
                                        </select>
                                        <button onClick={() => handleLink(repo)}
                                            disabled={!selectedProject}
                                            className="btn btn-sm btn-primary"
                                            style={{ padding: '4px 10px', fontSize: '12px' }}>
                                            ✓
                                        </button>
                                        <button onClick={() => { setLinkingRepo(null); setSelectedProject(''); }}
                                            className="btn btn-sm btn-ghost"
                                            style={{ padding: '4px 8px', fontSize: '12px' }}>
                                            ✖
                                        </button>
                                    </div>
                                ) : (
                                    <button onClick={() => setLinkingRepo(repo.name)}
                                        className="btn btn-sm btn-ghost"
                                        style={{ padding: '4px 10px', fontSize: '12px' }}>
                                        🔗 Vincular
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}

                    {filtered.length === 0 && (
                        <div className="empty-state">
                            <div className="icon">📂</div>
                            <p>No hay repos que coincidan con el filtro</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
