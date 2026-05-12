// src/components/Sidebar.jsx
import React from 'react';

export default function Sidebar({ currentPage, onNavigate }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        NoahPro<span>.studio</span>
      </div>

      <button
        className={`nav-item ${currentPage === 'dashboard' ? 'active' : ''}`}
        onClick={() => onNavigate('dashboard')}
      >
        <span className="nav-icon">📊</span>
        Knowledge Vault
      </button>

      <button
        className={`nav-item ${currentPage === 'projects' ? 'active' : ''}`}
        onClick={() => onNavigate('projects')}
      >
        <span className="nav-icon">📁</span>
        Proyectos
      </button>

      <button
        className={`nav-item ${currentPage === 'search' ? 'active' : ''}`}
        onClick={() => onNavigate('search')}
      >
        <span className="nav-icon">🔍</span>
        Búsqueda RAG
      </button>

      <button
        className={`nav-item ${currentPage === 'aihub' ? 'active' : ''}`}
        onClick={() => onNavigate('aihub')}
      >
        <span className="nav-icon">🤖</span>
        AI Hub
      </button>

      <button
        className={`nav-item ${currentPage === 'graphify' ? 'active' : ''}`}
        onClick={() => onNavigate('graphify')}
      >
        <span className="nav-icon">⚡</span>
        Graphify
      </button>

      <div style={{ flex: 1 }} />

      <div style={{ padding: '12px', fontSize: '11px', color: 'var(--text-muted)' }}>
        DevAssist Cloud v1.0
      </div>
    </aside>
  );
}
