// src/app/(dashboard)/dashboard/usage/page.tsx — Usage analytics
import { BarChart3, Zap, Globe, Clock } from "lucide-react";

const stats = [
  { label: "Videos este mes", value: "3", limit: "5", icon: Zap, color: "text-[var(--color-primary)]" },
  { label: "API calls hoy", value: "7", limit: "10", icon: Globe, color: "text-[var(--color-accent)]" },
  { label: "Fichas totales", value: "5", limit: "∞", icon: BarChart3, color: "text-[var(--color-success)]" },
  { label: "Último procesamiento", value: "2h", limit: "", icon: Clock, color: "text-[var(--color-warning)]" },
];

export default function UsagePage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Uso y Consumo</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          Monitoriza tu consumo y los límites de tu plan
        </p>
      </div>

      {/* Plan badge */}
      <div className="glass rounded-xl p-6 mb-8 flex items-center justify-between">
        <div>
          <p className="text-sm text-[var(--muted-foreground)]">Plan actual</p>
          <p className="text-xl font-bold mt-1">Free</p>
        </div>
        <button className="px-4 py-2 rounded-lg border border-[var(--color-primary)] text-[var(--color-primary)] text-sm font-medium hover:bg-[var(--color-primary)]/10 transition-default">
          Mejorar plan
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="glass rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <s.icon className={`w-5 h-5 ${s.color}`} />
              {s.limit && (
                <span className="text-xs text-[var(--muted-foreground)]">
                  / {s.limit}
                </span>
              )}
            </div>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Usage bars */}
      <div className="glass rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Consumo del período</h2>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between text-sm mb-1.5">
              <span>Videos procesados</span>
              <span className="text-[var(--muted-foreground)]">3 / 5</span>
            </div>
            <div className="h-2 bg-[var(--muted)] rounded-full overflow-hidden">
              <div className="h-full gradient-bg rounded-full transition-all duration-500" style={{ width: "60%" }} />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between text-sm mb-1.5">
              <span>API calls (hoy)</span>
              <span className="text-[var(--muted-foreground)]">7 / 10</span>
            </div>
            <div className="h-2 bg-[var(--muted)] rounded-full overflow-hidden">
              <div className="h-full bg-[var(--color-accent)] rounded-full transition-all duration-500" style={{ width: "70%" }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
