// src/app/(dashboard)/dashboard/api-keys/page.tsx — API Keys management
import { Key, Plus, Copy, Trash2, AlertTriangle } from "lucide-react";

export default function ApiKeysPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">API Keys</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Genera y gestiona tus claves de API para integrar DevAssist
          </p>
        </div>
        <button className="px-4 py-2.5 rounded-lg gradient-bg text-white font-medium text-sm flex items-center gap-2 hover:opacity-90 transition-default">
          <Plus className="w-4 h-4" />
          Nueva API Key
        </button>
      </div>

      {/* Info banner */}
      <div className="glass rounded-xl p-4 mb-6 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-[var(--color-warning)] shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium mb-1">Importante</p>
          <p className="text-[var(--muted-foreground)]">
            Tu API key solo se muestra una vez al crearla. Guárdala en un lugar seguro.
            Si la pierdes, deberás generar una nueva.
          </p>
        </div>
      </div>

      {/* API Keys table */}
      <div className="glass rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="text-left px-6 py-3 text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
                Nombre
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
                Key
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
                Último uso
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
                Estado
              </th>
              <th className="text-right px-6 py-3 text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-[var(--border)] hover:bg-[var(--muted)]/50 transition-default">
              <td className="px-6 py-4 text-sm font-medium">Default</td>
              <td className="px-6 py-4">
                <code className="text-xs bg-[var(--muted)] px-2 py-1 rounded font-mono">
                  da_live_u8k3m_••••••••••••
                </code>
              </td>
              <td className="px-6 py-4 text-sm text-[var(--muted-foreground)]">Hace 2 horas</td>
              <td className="px-6 py-4">
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium">
                  Activa
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  <button className="p-1.5 rounded-lg hover:bg-[var(--muted)] transition-default text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                    <Copy className="w-4 h-4" />
                  </button>
                  <button className="p-1.5 rounded-lg hover:bg-red-500/10 transition-default text-[var(--muted-foreground)] hover:text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Usage example */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4">Ejemplo de uso</h2>
        <div className="glass rounded-xl p-6">
          <pre className="text-sm text-[var(--muted-foreground)] overflow-x-auto font-mono">
{`curl -X POST https://api.noahpro.studio/api/v1/fichas \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: da_live_u8k3m_tu_api_key" \\
  -d '{"url": "https://tiktok.com/@user/video/123"}'`}
          </pre>
        </div>
      </div>
    </div>
  );
}
