// src/pages/SearchPage.jsx
import React, { useState } from 'react';
import { api } from '../lib/api';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [synthesis, setSynthesis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSearch(e) {
    e.preventDefault();
    if (!query.trim() || loading) return;

    setLoading(true);
    setError('');
    setResults(null);
    setSynthesis(null);

    try {
      const res = await api.search(query.trim());
      setResults(res.results || []);
      setSynthesis(res.synthesis || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Búsqueda Semántica</h1>
        <p className="page-subtitle">Pregunta cualquier cosa — busca en tu vault con IA</p>
      </div>

      <div className="submit-section">
        <form className="submit-form" onSubmit={handleSearch}>
          <input
            className="input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="¿Qué quieres saber? Ej: ¿Cómo optimizar prompts de IA?"
            disabled={loading}
          />
          <button className="btn btn-primary" type="submit" disabled={loading || !query.trim()}>
            {loading ? '⏳ Buscando...' : '🔍 Buscar'}
          </button>
        </form>
      </div>

      {error && (
        <div style={{ color: 'var(--danger)', fontSize: '13px', marginBottom: '16px' }}>
          ❌ {error}
        </div>
      )}

      {loading && <div className="loading"><div className="spinner" /></div>}

      {synthesis && (
        <div className="search-synthesis">{synthesis}</div>
      )}

      {results && results.length === 0 && (
        <div className="empty-state">
          <div className="icon">🔎</div>
          <p>No se encontraron fichas relevantes para tu búsqueda.</p>
        </div>
      )}

      {results && results.length > 0 && (
        <div style={{ marginTop: '24px' }}>
          <div className="section-title">Resultados ({results.length})</div>
          {results.map((r) => (
            <div className="card search-result" key={r.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="ficha-title">{r.title}</div>
                <div className="search-similarity">{(r.similarity * 100).toFixed(1)}%</div>
              </div>
              <div className="ficha-tldr">{r.tl_dr}</div>
              {r.tech_stack && r.tech_stack.length > 0 && (
                <div className="ficha-meta" style={{ marginTop: '8px' }}>
                  {r.tech_stack.map((t, i) => <span className="ficha-tag" key={i}>{t}</span>)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
