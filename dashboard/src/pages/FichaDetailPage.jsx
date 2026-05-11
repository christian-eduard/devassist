// src/pages/FichaDetailPage.jsx
import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';

export default function FichaDetailPage({ fichaId, onBack }) {
  const [ficha, setFicha] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.getFicha(fichaId);
        setFicha(res.ficha);
      } catch (err) {
        console.error('Failed to load ficha:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [fichaId]);

  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (!ficha) return <div className="empty-state"><p>Ficha no encontrada</p></div>;

  const metadata = ficha.metadata || {};
  const keyPoints = Array.isArray(ficha.key_points) ? ficha.key_points : [];
  const techStack = Array.isArray(ficha.tech_stack) ? ficha.tech_stack : [];
  const herramientas = metadata.herramientas || [];

  return (
    <div className="ficha-detail">
      <div className="back-link" onClick={onBack}>← Volver al dashboard</div>

      <h1 className="page-title">{ficha.title}</h1>
      <p className="page-subtitle" style={{ marginTop: '8px' }}>
        {metadata.categoria || ficha.content_type} · {ficha.channel} · {ficha.author || 'unknown'}
      </p>

      {ficha.video_path && (
        <>
          <div className="section-title">Vídeo</div>
          <div className="card" style={{ cursor: 'default', padding: '0', overflow: 'hidden', borderRadius: '12px' }}>
            <video
              controls
              style={{ width: '100%', maxHeight: '500px', display: 'block', background: '#000' }}
              src={ficha.video_path}
            >
              Tu navegador no soporta vídeo HTML5.
            </video>
          </div>
        </>
      )}

      {ficha.tl_dr && (
        <>
          <div className="section-title">TL;DR</div>
          <div className="card" style={{ cursor: 'default' }}>
            <p style={{ fontSize: '14px', lineHeight: '1.7' }}>{ficha.tl_dr}</p>
          </div>
        </>
      )}

      {keyPoints.length > 0 && (
        <>
          <div className="section-title">Puntos clave</div>
          <div className="card" style={{ cursor: 'default' }}>
            {keyPoints.map((point, i) => (
              <div className="key-point" key={i}>
                <span style={{ color: 'var(--accent)', marginRight: '8px' }}>▸</span>
                {point.replace(/\*\*/g, '')}
              </div>
            ))}
          </div>
        </>
      )}

      {ficha.manual_uso && (
        <>
          <div className="section-title">Manual de uso</div>
          <div className="card" style={{ cursor: 'default', whiteSpace: 'pre-wrap', fontSize: '13px', lineHeight: '1.8' }}>
            {ficha.manual_uso}
          </div>
        </>
      )}

      {techStack.length > 0 && (
        <>
          <div className="section-title">Tech stack</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {techStack.map((t, i) => (
              <span className="ficha-tag" key={i}>{t}</span>
            ))}
          </div>
        </>
      )}

      {herramientas.length > 0 && (
        <>
          <div className="section-title">Herramientas mencionadas</div>
          <div className="card" style={{ cursor: 'default' }}>
            {herramientas.map((h, i) => (
              <div key={i} style={{ padding: '8px 0', borderBottom: i < herramientas.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <strong style={{ color: 'var(--accent-secondary)' }}>{h.nombre}</strong>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>{h.descripcion}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {ficha.transcripcion && (
        <>
          <div className="section-title">Transcripción completa</div>
          <div className="card" style={{ cursor: 'default', maxHeight: '400px', overflow: 'auto', fontSize: '13px', lineHeight: '1.7', color: 'var(--text-secondary)' }}>
            {ficha.transcripcion}
          </div>
        </>
      )}

      <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
        {ficha.url_original && (
          <a href={ficha.url_original} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm">
            🔗 Ver original
          </a>
        )}
        <button className="btn btn-danger btn-sm" onClick={async () => {
          if (confirm('¿Eliminar esta ficha?')) {
            await api.deleteFicha(fichaId);
            onBack();
          }
        }}>
          🗑 Eliminar
        </button>
      </div>
    </div>
  );
}
