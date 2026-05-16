// src/pages/GraphifyPage.jsx — Uses shared api.js (no more duplicate gql)
import { useState, useEffect } from 'react';
import { api } from '../lib/api';

export default function GraphifyPage() {
  const [url, setUrl] = useState('');
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selected, setSelected] = useState(null);
  const [queryText, setQueryText] = useState('');
  const [queryResult, setQueryResult] = useState('');

  useEffect(() => { loadAnalyses(); }, []);

  async function loadAnalyses() {
    setLoading(true);
    try {
      const data = await api.getAnalyses();
      setAnalyses(data.analyses || []);
    } catch (err) { console.error(err); }
    setLoading(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!url.trim()) return;
    setSubmitting(true);
    try {
      const data = await api.submitAnalysis(url.trim());
      alert(`Análisis iniciado: ${data.analysisId}. Se procesará en background.`);
      setUrl('');
      setTimeout(loadAnalyses, 5000);
    } catch (err) {
      alert('Error: ' + err.message);
    }
    setSubmitting(false);
  }

  async function loadDetail(id) {
    try {
      const data = await api.getAnalysis(id);
      setSelected(data);
    } catch (err) { console.error(err); }
  }

  async function handleQuery(e) {
    e.preventDefault();
    if (!queryText.trim() || !selected) return;
    try {
      const data = await api.queryGraph(selected.analysisId, queryText);
      setQueryResult(data.result);
    } catch (err) {
      setQueryResult('Error: ' + err.message);
    }
  }

  const statusBadge = (status) => {
    const styles = {
      completed: { bg: 'rgba(0,230,118,0.15)', color: 'var(--success)' },
      processing: { bg: 'rgba(255,171,0,0.15)', color: 'var(--warning)' },
      failed: { bg: 'rgba(255,82,82,0.15)', color: 'var(--danger)' },
    };
    const s = styles[status] || styles.processing;
    return (
      <span className="ficha-tag" style={{ background: s.bg, color: s.color }}>
        {status}
      </span>
    );
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">⚡ Graphify</h1>
        <p className="page-subtitle">
          Knowledge graphs para proyectos de código — analiza repos y obtén mapas interactivos
        </p>
      </div>

      {/* Submit form */}
      <form onSubmit={handleSubmit} className="submit-section">
        <div className="submit-form">
          <input
            type="url"
            placeholder="https://github.com/user/repo"
            value={url}
            onChange={e => setUrl(e.target.value)}
            className="input"
          />
          <button type="submit" disabled={submitting} className="btn btn-primary">
            {submitting ? 'Analizando...' : '🔍 Analizar'}
          </button>
        </div>
      </form>

      <div style={{ display: 'flex', gap: '24px', marginTop: '24px' }}>
        {/* Analyses list */}
        <div style={{ width: '340px', flexShrink: 0 }}>
          <h3 className="section-title">Análisis recientes</h3>
          {loading && <div className="loading"><div className="spinner" /></div>}
          {analyses.map(a => (
            <div
              key={a.analysisId}
              onClick={() => loadDetail(a.analysisId)}
              className="card"
              style={{
                marginBottom: '8px', cursor: 'pointer',
                borderColor: selected?.analysisId === a.analysisId ? 'var(--accent)' : undefined,
                boxShadow: selected?.analysisId === a.analysisId ? '0 0 15px var(--accent-glow)' : undefined,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <code style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{a.analysisId}</code>
                {statusBadge(a.status)}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px', wordBreak: 'break-all' }}>
                {a.url}
              </div>
              {a.stats && (
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {a.stats.nodes} nodos · {a.stats.edges} edges · {a.stats.communities} comunidades
                </div>
              )}
            </div>
          ))}
          {!loading && analyses.length === 0 && (
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Ningún análisis todavía</p>
          )}
        </div>

        {/* Detail panel */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {selected ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 className="page-title" style={{ fontSize: '20px' }}>
                  {selected.url?.split('/').slice(-2).join('/')}
                </h3>
                {statusBadge(selected.status)}
              </div>

              {/* Stats */}
              {selected.stats && (
                <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                  {[
                    { label: 'Nodos', value: selected.stats.nodes, icon: '🔵' },
                    { label: 'Edges', value: selected.stats.edges, icon: '🔗' },
                    { label: 'Comunidades', value: selected.stats.communities, icon: '🏘️' },
                  ].map(s => (
                    <div key={s.label} className="stat-card">
                      <div className="stat-value" style={{ fontSize: '24px' }}>{s.icon} {s.value}</div>
                      <div className="stat-label">{s.label}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* God Nodes */}
              {selected.godNodes?.length > 0 && (
                <div className="card" style={{ marginBottom: '16px' }}>
                  <h4 style={{ margin: '0 0 10px 0', color: 'var(--warning)' }}>👑 God Nodes</h4>
                  {selected.godNodes.map((g, i) => (
                    <div key={i} className="key-point" style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <code style={{ color: 'var(--text-primary)' }}>{g.name}</code>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{g.edges} conexiones</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Action buttons */}
              {selected.status === 'completed' && (
                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
                  {selected.files?.includes('graph.html') && (
                    <a href={`/uploads/graphify/${selected.analysisId}/graph.html`}
                       target="_blank" rel="noreferrer" className="btn btn-primary">🕸️ Grafo Interactivo</a>
                  )}
                  {selected.files?.includes('callflow.html') && (
                    <a href={`/uploads/graphify/${selected.analysisId}/callflow.html`}
                       target="_blank" rel="noreferrer" className="btn" style={{ background: 'var(--success)', color: '#000' }}>📊 Call Flow</a>
                  )}
                  {selected.files?.includes('GRAPH_TREE.html') && (
                    <a href={`/uploads/graphify/${selected.analysisId}/GRAPH_TREE.html`}
                       target="_blank" rel="noreferrer" className="btn" style={{ background: 'var(--warning)', color: '#000' }}>🌳 Árbol</a>
                  )}
                </div>
              )}

              {/* Query */}
              {selected.status === 'completed' && (
                <div className="card" style={{ marginBottom: '16px' }}>
                  <h4 style={{ margin: '0 0 10px 0' }}>🔍 Consultar grafo</h4>
                  <form onSubmit={handleQuery} className="submit-form">
                    <input placeholder="¿Cómo se conecta la autenticación con la DB?" value={queryText}
                      onChange={e => setQueryText(e.target.value)} className="input" />
                    <button type="submit" className="btn btn-primary">Buscar</button>
                  </form>
                  {queryResult && (
                    <pre style={{
                      marginTop: '12px', padding: '12px', background: 'var(--bg-primary)',
                      borderRadius: 'var(--radius-sm)', fontSize: '12px', color: 'var(--text-secondary)',
                      overflow: 'auto', maxHeight: '400px', whiteSpace: 'pre-wrap'
                    }}>{queryResult}</pre>
                  )}
                </div>
              )}

              {/* Report */}
              {selected.report && (
                <details style={{ marginTop: '16px' }}>
                  <summary style={{ cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '14px' }}>
                    📄 Informe completo (GRAPH_REPORT.md)
                  </summary>
                  <pre style={{
                    marginTop: '8px', padding: '16px', background: 'var(--bg-primary)',
                    borderRadius: 'var(--radius)', fontSize: '12px', color: 'var(--text-primary)',
                    overflow: 'auto', maxHeight: '600px', whiteSpace: 'pre-wrap'
                  }}>{selected.report}</pre>
                </details>
              )}
            </>
          ) : (
            <div className="empty-state">
              <div className="icon">🕸️</div>
              <p>Introduce una URL de GitHub para analizar un proyecto</p>
              <p style={{ fontSize: '13px', marginTop: '4px' }}>
                Graphify mapea el código en un grafo de conocimiento interactivo
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
