"use client";
// src/app/(dashboard)/dashboard/page.tsx — Main dashboard (real data)
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getToken } from "@/lib/auth-client";
import { Loader2, ExternalLink, Trash2, Clock, Sparkles } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://api.noahpro.studio/api";

interface Ficha {
  id: string;
  title: string;
  tl_dr: string;
  channel: string;
  author: string;
  urgency: number;
  content_type: string;
  created_at: string;
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [fichas, setFichas] = useState<Ficha[]>([]);
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState("");

  const fetchFichas = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/v1/fichas?limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.ok) setFichas(data.fichas || []);
    } catch (err) {
      console.error("Failed to fetch fichas:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user) fetchFichas();
  }, [authLoading, user, fetchFichas]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setSubmitting(true);
    setSubmitStatus("Enviando...");

    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/v1/fichas`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ url, channel: "app" }),
      });
      const data = await res.json();

      if (data.ok && data.jobId) {
        setSubmitStatus("Procesando video...");
        // Poll job status
        const pollInterval = setInterval(async () => {
          const jobRes = await fetch(`${API_BASE}/v1/fichas/jobs/${data.jobId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const jobData = await jobRes.json();
          if (jobData.ok && jobData.job) {
            setSubmitStatus(jobData.job.progress || "Procesando...");
            if (jobData.job.status === "completed" || jobData.job.status === "duplicate") {
              clearInterval(pollInterval);
              setSubmitting(false);
              setUrl("");
              setSubmitStatus("");
              fetchFichas();
            } else if (jobData.job.status === "failed") {
              clearInterval(pollInterval);
              setSubmitting(false);
              setSubmitStatus(`Error: ${jobData.job.error}`);
            }
          }
        }, 3000);
      } else {
        setSubmitStatus(data.error || "Error al enviar");
        setSubmitting(false);
      }
    } catch {
      setSubmitStatus("Error de conexión");
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta ficha?")) return;
    const token = getToken();
    await fetch(`${API_BASE}/v1/fichas/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchFichas();
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Mis Fichas</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            {user?.name} · Plan {user?.plan} · {fichas.length} fichas
          </p>
        </div>
      </div>

      {/* Submit URL form */}
      <div className="glass rounded-xl p-6 mb-8">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Pega un enlace de TikTok, YouTube o Instagram..."
            disabled={submitting}
            className="flex-1 px-4 py-2.5 rounded-lg bg-[var(--input)] border border-[var(--border)] text-sm focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent outline-none transition-default disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={submitting || !url.trim()}
            className="px-6 py-2.5 rounded-lg gradient-bg text-white font-medium text-sm hover:opacity-90 transition-default shrink-0 disabled:opacity-50 flex items-center gap-2"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Procesar
          </button>
        </form>
        {submitStatus && (
          <p className="text-xs text-[var(--muted-foreground)] mt-2">{submitStatus}</p>
        )}
      </div>

      {/* Fichas grid */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-5 h-5 animate-spin text-[var(--muted-foreground)]" />
        </div>
      ) : fichas.length === 0 ? (
        <div className="text-center py-16 text-[var(--muted-foreground)]">
          <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No tienes fichas aún. Pega un enlace arriba para empezar.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {fichas.map((ficha) => (
            <div key={ficha.id} className="glass rounded-xl p-6 hover:scale-[1.01] transition-default group">
              <h3 className="font-semibold text-sm mb-2 line-clamp-2">{ficha.title}</h3>
              <p className="text-xs text-[var(--muted-foreground)] line-clamp-3 mb-4">
                {ficha.tl_dr || "Sin resumen"}
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-[var(--muted)] text-xs text-[var(--muted-foreground)]">
                    {ficha.channel}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
                    <Clock className="w-3 h-3" />
                    {new Date(ficha.created_at).toLocaleDateString("es")}
                  </span>
                </div>
                <button
                  onClick={() => handleDelete(ficha.id)}
                  className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400 transition-default"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
