// src/components/FichaCard.jsx
import React from 'react';

export default function FichaCard({ ficha, onClick }) {
  const date = new Date(ficha.created_at).toLocaleDateString('es-ES', {
    day: 'numeric', month: 'short', year: 'numeric',
  });

  return (
    <div className="card ficha-card" onClick={onClick}>
      <div className="ficha-title">{ficha.title || 'Sin título'}</div>
      <div className="ficha-tldr">{ficha.tl_dr || 'Sin resumen disponible'}</div>
      <div className="ficha-meta">
        <span className="ficha-tag channel">{ficha.channel || 'api'}</span>
        {ficha.urgency && <span className="ficha-tag">⚡ {ficha.urgency}/5</span>}
        <span className="ficha-tag" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>
          {date}
        </span>
      </div>
    </div>
  );
}
