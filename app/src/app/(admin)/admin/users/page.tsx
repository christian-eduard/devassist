// src/app/(admin)/admin/users/page.tsx — Admin user management
import { Search, MoreHorizontal, Shield, Ban } from "lucide-react";

const mockUsers = [
  { id: "1", name: "Christian", email: "chris@noahpro.es", role: "super_admin", plan: "super_premium", fichas: 5, status: "active", joined: "2026-05-02" },
];

export default function AdminUsersPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Usuarios</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Gestiona los usuarios de la plataforma
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="glass rounded-xl p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
          <input
            type="text"
            placeholder="Buscar por nombre o email..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[var(--input)] border border-[var(--border)] text-sm focus:ring-2 focus:ring-[var(--ring)] outline-none transition-default"
          />
        </div>
      </div>

      {/* Users table */}
      <div className="glass rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border)]">
              {["Usuario", "Rol", "Plan", "Fichas", "Estado", "Registro", ""].map((h) => (
                <th key={h} className="text-left px-6 py-3 text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mockUsers.map((user) => (
              <tr key={user.id} className="border-b border-[var(--border)] hover:bg-[var(--muted)]/50 transition-default">
                <td className="px-6 py-4">
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">{user.email}</p>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    user.role === "super_admin" ? "bg-red-500/10 text-red-400" : "bg-blue-500/10 text-blue-400"
                  }`}>
                    {user.role === "super_admin" ? "Admin" : "Usuario"}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-0.5 rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)] text-xs font-medium">
                    {user.plan}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm">{user.fichas}</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium">
                    {user.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-[var(--muted-foreground)]">{user.joined}</td>
                <td className="px-6 py-4 text-right">
                  <button className="p-1.5 rounded-lg hover:bg-[var(--muted)] transition-default">
                    <MoreHorizontal className="w-4 h-4 text-[var(--muted-foreground)]" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
