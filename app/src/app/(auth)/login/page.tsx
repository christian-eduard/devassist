"use client";
// src/app/(auth)/login/page.tsx — Login page
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "@/lib/auth-client";
import { Loader2, Mail, Lock } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn({ email, password });
      if (!result.ok) {
        setError(result.error || "Error al iniciar sesión");
      } else {
        router.push(result.user.role === "super_admin" ? "/admin" : "/dashboard");
      }
    } catch {
      setError("Error de conexión. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-center mb-2">Bienvenido de nuevo</h1>
      <p className="text-sm text-[var(--muted-foreground)] text-center mb-8">
        Inicia sesión para acceder a tu dashboard
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1.5">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="tu@email.com"
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[var(--input)] border border-[var(--border)] text-sm focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent outline-none transition-default" />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-1.5">Contraseña</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} placeholder="••••••••"
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[var(--input)] border border-[var(--border)] text-sm focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent outline-none transition-default" />
          </div>
        </div>

        <button type="submit" disabled={loading}
          className="w-full py-2.5 rounded-lg gradient-bg text-white font-medium text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-default disabled:opacity-50">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Iniciar sesión"}
        </button>
      </form>

      <p className="text-sm text-[var(--muted-foreground)] text-center mt-6">
        ¿No tienes cuenta?{" "}
        <Link href="/register" className="text-[var(--color-primary)] hover:underline font-medium">Regístrate</Link>
      </p>
    </>
  );
}
