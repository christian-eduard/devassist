// src/app/(dashboard)/dashboard/settings/page.tsx — User settings
import { User, Mail, Shield } from "lucide-react";

export default function SettingsPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Configuración</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          Gestiona tu perfil y preferencias
        </p>
      </div>

      {/* Profile */}
      <div className="glass rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <User className="w-5 h-5" /> Perfil
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Nombre</label>
            <input
              type="text"
              defaultValue="Christian"
              className="w-full px-4 py-2.5 rounded-lg bg-[var(--input)] border border-[var(--border)] text-sm focus:ring-2 focus:ring-[var(--ring)] outline-none transition-default"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Email</label>
            <input
              type="email"
              defaultValue="chris@noahpro.es"
              disabled
              className="w-full px-4 py-2.5 rounded-lg bg-[var(--input)] border border-[var(--border)] text-sm opacity-60 cursor-not-allowed"
            />
          </div>
        </div>
        <button className="mt-4 px-4 py-2 rounded-lg gradient-bg text-white text-sm font-medium hover:opacity-90 transition-default">
          Guardar cambios
        </button>
      </div>

      {/* Security */}
      <div className="glass rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5" /> Seguridad
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Contraseña actual</label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full px-4 py-2.5 rounded-lg bg-[var(--input)] border border-[var(--border)] text-sm focus:ring-2 focus:ring-[var(--ring)] outline-none transition-default"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Nueva contraseña</label>
            <input
              type="password"
              placeholder="Mínimo 8 caracteres"
              className="w-full px-4 py-2.5 rounded-lg bg-[var(--input)] border border-[var(--border)] text-sm focus:ring-2 focus:ring-[var(--ring)] outline-none transition-default"
            />
          </div>
        </div>
        <button className="mt-4 px-4 py-2 rounded-lg border border-[var(--border)] text-sm font-medium hover:bg-[var(--muted)] transition-default">
          Cambiar contraseña
        </button>
      </div>
    </div>
  );
}
