import { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || '/api';
const API_KEY = import.meta.env.VITE_API_KEY || 'devassist_prod_api_key_8Hj3kL9mQr5';

async function gql(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      ...options.headers,
    },
  });
  return res.json();
}

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
      const data = await gql('/graphify');
      setAnalyses(data.analyses || []);
    } catch (err) { console.error(err); }
    setLoading(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!url.trim()) return;
    setSubmitting(true);
    try {
      const data = await gql('/graphify', {
        method: 'POST',
        body: JSON.stringify({ url: url.trim() }),
      });
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
      const data = await gql(`/graphify/${id}`);
      setSelected(data);
    } catch (err) { console.error(err); }
  }

  async function handleQuery(e) {
    e.preventDefault();
    if (!queryText.trim() || !selected) return;
    try {
      const data = await gql(`/graphify/${selected.analysisId}/query?q=${encodeURIComponent(queryText)}`);
      setQueryResult(data.result);
    } catch (err) {
      setQueryResult('Error: ' + err.message);
    }
  }

  const statusBadge = (status) => {
    const colors = {
      completed: { bg: '#10b981', text: '#fff' },
      processing: { bg: '#f59e0b', text: '#000' },
      failed: { bg: '#ef4444', text: '#fff' },
    };
    const c = colors[status] || colors.processing;
    return (
      <span style={{
        background: c.bg, color: c.text,
        padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600
      }}>{status}</span>
    );
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ margin: 0, fontSize: '1.8rem' }}>⚡ Graphify</h1>
      <p style={{ color: '#94a3b8', marginTop: 4 }}>
        Knowledge graphs para proyectos de código — analiza repos y obtén mapas interactivos
      </p>

      {/* Submit form */}
      <form onSubmit={handleSubmit} style={{
        display: 'flex', gap: 12, marginTop: 20,
        background: '#1e293b', padding: 16, borderRadius: 12
      }}>
        <input
          type="url"
          placeholder="https://github.com/user/repo"
          value={url}
          onChange={e => setUrl(e.target.value)}
          style={{
            flex: 1, padding: '10px 14px', borderRadius: 8,
            border: '1px solid #334155', background: '#0f172a',
            color: '#e2e8f0', fontSize: 14
          }}
        />
        <button type="submit" disabled={submitting} style={{
          padding: '10px 24px', borderRadius: 8, border: 'none',
          background: submitting ? '#475569' : '#6366f1',
          color: '#fff', fontWeight: 600, cursor: submitting ? 'wait' : 'pointer',
          fontSize: 14
        }}>
          {submitting ? 'Analizando...' : '🔍 Analizar'}
        </button>
      </form>

      <div style={{ display: 'flex', gap: 24, marginTop: 24 }}>
        {/* Analyses list */}
        <div style={{ width: 340, flexShrink: 0 }}>
          <h3 style={{ marginBottom: 12 }}>Análisis recientes</h3>
          {loading && <p style={{ color: '#64748b' }}>Cargando...</p>}
          {analyses.map(a => (
            <div
              key={a.analysisId}
              onClick={() => loadDetail(a.analysisId)}
              style={{
                padding: 14, marginBottom: 8, borderRadius: 10,
                background: selected?.analysisId === a.analysisId ? '#1e293b' : '#0f172a',
                border: selected?.analysisId === a.analysisId ? '1px solid #6366f1' : '1px solid #1e293b',
                cursor: 'pointer', transition: 'all .15s'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <code style={{ fontSize: 13, color: '#e2e8f0' }}>{a.analysisId}</code>
                {statusBadge(a.status)}
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 6, wordBreak: 'break-all' }}>
                {a.url}
              </div>
              {a.stats && (
                <div style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>
                  {a.stats.nodes} nodos · {a.stats.edges} edges · {a.stats.communities} comunidades
                </div>
              )}
            </div>
          ))}
          {!loading && analyses.length === 0 && (
            <p style={{ color: '#475569', fontSize: 13 }}>Ningún análisis todavía</p>
          )}
        </div>

        {/* Detail panel */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {selected ? (
            <>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', marginBottom: 16
              }}>
                <h3 style={{ margin: 0 }}>
                  {selected.url?.split('/').slice(-2).join('/')}
                </h3>
                {statusBadge(selected.status)}
              </div>

              {/* Stats */}
              {selected.stats && (
                <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                  {[
                    { label: 'Nodos', value: selected.stats.nodes, icon: '🔵' },
                    { label: 'Edges', value: selected.stats.edges, icon: '🔗' },
                    { label: 'Comunidades', value: selected.stats.communities, icon: '🏘️' },
                  ].map(s => (
                    <div key={s.label} style={{
                      background: '#1e293b', padding: '12px 20px', borderRadius: 10,
                      textAlign: 'center', flex: 1
                    }}>
                      <div style={{ fontSize: 24, fontWeight: 700 }}>{s.icon} {s.value}</div>
                      <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* God Nodes */}
              {selected.godNodes?.length > 0 && (
                <div style={{
                  background: '#1e293b', padding: 16, borderRadius: 10, marginBottom: 16
                }}>
                  <h4 style={{ margin: '0 0 10px 0', color: '#f59e0b' }}>👑 God Nodes</h4>
                  {selected.godNodes.map((g, i) => (
                    <div key={i} style={{
                      display: 'flex', justifyContent: 'space-between',
                      padding: '6px 0', borderBottom: '1px solid #334155'
                    }}>
                      <code style={{ color: '#e2e8f0' }}>{g.name}</code>
                      <span style={{ color: '#94a3b8', fontSize: 13 }}>{g.edges} conexiones</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Action buttons */}
              {selected.status === 'completed' && (
                <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
                  {selected.files?.includes('graph.html') && (
                    <a href={`/uploads/graphify/${selected.analysisId}/graph.html`}
                       target="_blank" rel="noreferrer"
                       style={btnStyle('#6366f1')}>🕸️ Grafo Interactivo</a>
                  )}
                  {selected.files?.includes('callflow.html') && (
                    <a href={`/uploads/graphify/${selected.analysisId}/callflow.html`}
                       target="_blank" rel="noreferrer"
                       style={btnStyle('#10b981')}>📊 Call Flow</a>
                  )}
                  {selected.files?.includes('GRAPH_TREE.html') && (
                    <a href={`/uploads/graphify/${selected.analysisId}/GRAPH_TREE.html`}
                       target="_blank" rel="noreferrer"
                       style={btnStyle('#f59e0b')}>🌳 Árbol</a>
                  )}
                </div>
              )}

              {/* Query */}
              {selected.status === 'completed' && (
                <div style={{
                  background: '#1e293b', padding: 16, borderRadius: 10, marginBottom: 16
                }}>
                  <h4 style={{ margin: '0 0 10px 0' }}>🔍 Consultar grafo</h4>
                  <form onSubmit={handleQuery} style={{ display: 'flex', gap: 10 }}>
                    <input
                      placeholder="¿Cómo se conecta la autenticación con la DB?"
                      value={queryText}
                      onChange={e => setQueryText(e.target.value)}
                      style={{
                        flex: 1, padding: '8px 12px', borderRadius: 6,
                        border: '1px solid #334155', background: '#0f172a',
                        color: '#e2e8f0', fontSize: 13
                      }}
                    />
                    <button type="submit" style={btnStyle('#6366f1')}>Buscar</button>
                  </form>
                  {queryResult && (
                    <pre style={{
                      marginTop: 12, padding: 12, background: '#0f172a',
                      borderRadius: 8, fontSize: 12, color: '#94a3b8',
                      overflow: 'auto', maxHeight: 400, whiteSpace: 'pre-wrap'
                    }}>{queryResult}</pre>
                  )}
                </div>
              )}

              {/* Report */}
              {selected.report && (
                <details style={{ marginTop: 16 }}>
                  <summary style={{ cursor: 'pointer', color: '#94a3b8', fontSize: 14 }}>
                    📄 Informe completo (GRAPH_REPORT.md)
                  </summary>
                  <pre style={{
                    marginTop: 8, padding: 16, background: '#0f172a',
                    borderRadius: 10, fontSize: 12, color: '#cbd5e1',
                    overflow: 'auto', maxHeight: 600, whiteSpace: 'pre-wrap'
                  }}>{selected.report}</pre>
                </details>
              )}
            </>
          ) : (
            <div style={{
              textAlign: 'center', padding: '60px 20px', color: '#475569'
            }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🕸️</div>
              <p>Introduce una URL de GitHub para analizar un proyecto</p>
              <p style={{ fontSize: 13 }}>
                Graphify mapea el código en un grafo de conocimiento interactivo
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const btnStyle = (bg) => ({
  padding: '8px 16px', borderRadius: 8, border: 'none',
  background: bg, color: '#fff', fontWeight: 600, cursor: 'pointer',
  fontSize: 13, textDecoration: 'none', display: 'inline-block'
});
