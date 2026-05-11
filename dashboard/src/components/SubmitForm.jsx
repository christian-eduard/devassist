// src/components/SubmitForm.jsx
import React, { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';

export default function SubmitForm({ onFichaCreated }) {
  const [url, setUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [jobId, setJobId] = useState(null);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const pollRef = useRef(null);

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!url.trim() || submitting) return;

    setSubmitting(true);
    setError('');
    setProgress('Enviando...');

    try {
      const res = await api.submitUrl(url.trim());
      setJobId(res.jobId);
      setProgress('Video encolado — procesando...');

      // Poll for status
      pollRef.current = setInterval(async () => {
        try {
          const job = await api.getJob(res.jobId);
          setProgress(job.job.progress || 'Procesando...');

          if (job.job.status === 'completed') {
            clearInterval(pollRef.current);
            setSubmitting(false);
            setJobId(null);
            setUrl('');
            setProgress('');
            if (onFichaCreated) onFichaCreated();
          } else if (job.job.status === 'failed') {
            clearInterval(pollRef.current);
            setSubmitting(false);
            setError(job.job.error || 'Error en el procesamiento');
            setProgress('');
          } else if (job.job.status === 'duplicate') {
            clearInterval(pollRef.current);
            setSubmitting(false);
            setProgress('');
            setUrl('');
            setError(`Ya existe: ${job.job.progress}`);
          }
        } catch {
          // Keep polling
        }
      }, 3000);
    } catch (err) {
      setSubmitting(false);
      setError(err.message);
      setProgress('');
    }
  }

  const progressPercent = progress.includes('1/4') ? 25
    : progress.includes('2/4') ? 50
    : progress.includes('3/4') ? 75
    : progress.includes('4/4') ? 90
    : progress.includes('éxito') ? 100
    : 10;

  return (
    <div className="submit-section">
      <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>
        📹 Procesar nuevo video
      </h2>
      <form className="submit-form" onSubmit={handleSubmit}>
        <input
          className="input"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Pega una URL de TikTok, YouTube o Instagram..."
          disabled={submitting}
        />
        <button className="btn btn-primary" type="submit" disabled={submitting || !url.trim()}>
          {submitting ? '⏳ Procesando...' : '🚀 Analizar'}
        </button>
      </form>

      {submitting && (
        <>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
          <div className="progress-text">{progress}</div>
        </>
      )}

      {error && (
        <div style={{ marginTop: '12px', color: 'var(--danger)', fontSize: '13px' }}>
          ❌ {error}
        </div>
      )}
    </div>
  );
}
