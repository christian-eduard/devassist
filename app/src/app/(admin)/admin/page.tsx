"use client";
// src/app/(admin)/admin/page.tsx — Admin metrics dashboard (real data)
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getToken } from "@/lib/auth-client";
import { Users, FileText, Cpu, DollarSign, TrendingUp, Loader2 } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://api.noahpro.studio/api";

interface Stats {
  users: { total: number; today: number };
  fichas: { total: number; thisWeek: number };
  jobs: { total: number; completed: number; failed: number };
  ai: { tokens: number; cost: number };
}

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth("super_admin");
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !user) return;
    async function fetchStats() {
      try {
        const token = getToken();
        const res = await fetch(`${API_BASE}/admin/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.ok) setStats(data.stats);
      } catch (err) {
        console.error("Failed to fetch stats:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [authLoading, user]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  const kpis = stats
    ? [
        { label: "Usuarios totales", value: stats.users.total.toString(), sub: `+${stats.users.today} hoy`, icon: Users, color: "text-[var(--color-primary)]" },
        { label: "Fichas generadas", value: stats.fichas.total.toString(), sub: `+${stats.fichas.thisWeek} esta semana`, icon: FileText, color: "text-[var(--color-accent)]" },
        { label: "Tokens IA usados", value: `${(stats.ai.tokens / 1000).toFixed(1)}K`, sub: "Gemini 2.5 Flash", icon: Cpu, color: "text-[var(--color-success)]" },
        { label: "Coste estimado", value: `${stats.ai.cost.toFixed(2)}€`, sub: "Este mes", icon: DollarSign, color: "text-[var(--color-warning)]" },
      ]
    : [];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Panel de Administración</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          Métricas globales del sistema DevAssist · {user?.name}
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="glass rounded-xl p-5 hover:scale-[1.02] transition-default">
            <div className="flex items-center justify-between mb-3">
              <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
              <TrendingUp className="w-4 h-4 text-[var(--color-success)]" />
            </div>
            <p className="text-2xl font-bold">{kpi.value}</p>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">{kpi.label}</p>
            <p className="text-xs text-[var(--color-success)] mt-0.5">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {stats && (
        <div className="glass rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Pipeline de Jobs</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-lg bg-[var(--muted)]">
              <p className="text-2xl font-bold">{stats.jobs.total}</p>
              <p className="text-xs text-[var(--muted-foreground)]">Total</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-emerald-500/10">
              <p className="text-2xl font-bold text-emerald-400">{stats.jobs.completed}</p>
              <p className="text-xs text-[var(--muted-foreground)]">Completados</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-red-500/10">
              <p className="text-2xl font-bold text-red-400">{stats.jobs.failed}</p>
              <p className="text-xs text-[var(--muted-foreground)]">Fallidos</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
