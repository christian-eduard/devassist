// src/pages/DashboardPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import SubmitForm from '../components/SubmitForm';
import FichaCard from '../components/FichaCard';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [fichas, setFichas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, api: true, db: true });

  const loadFichas = useCallback(async () => {
    setLoading(true);
    try {
      const [fichasRes, healthRes] = await Promise.all([
        api.getFichas(),
        api.health(),
      ]);
      setFichas(fichasRes.fichas || []);
      setStats({
        total: fichasRes.count || 0,
        api: healthRes.checks?.api,
        db: healthRes.checks?.database,
      });
    } catch (err) {
      console.error('Failed to load fichas:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadFichas(); }, [loadFichas]);

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Knowledge Vault</h1>
        <p className="page-subtitle">Tu base de conocimiento personal generada por IA</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Fichas</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: stats.api ? 'var(--success)' : 'var(--danger)' }}>
            {stats.api ? '●' : '○'}
          </div>
          <div className="stat-label">API</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: stats.db ? 'var(--success)' : 'var(--danger)' }}>
            {stats.db ? '●' : '○'}
          </div>
          <div className="stat-label">Database</div>
        </div>
      </div>

      <SubmitForm onFichaCreated={loadFichas} />

      {loading ? (
        <div className="loading"><div className="spinner" /></div>
      ) : fichas.length === 0 ? (
        <div className="empty-state">
          <div className="icon">📭</div>
          <p>No hay fichas todavía. Envía un video para empezar.</p>
        </div>
      ) : (
        <div className="card-grid">
          {fichas.map((f) => (
            <FichaCard key={f.id} ficha={f} onClick={() => navigate(`/fichas/${f.id}`)} />
          ))}
        </div>
      )}
    </>
  );
}
