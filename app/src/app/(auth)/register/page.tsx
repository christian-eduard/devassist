"use client";
// src/app/(auth)/register/page.tsx — Register page
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signUp } from "@/lib/auth-client";
import { Loader2, Mail, Lock, User } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signUp({ name, email, password });
      if (!result.ok) {
        setError(result.error || "Error al crear la cuenta");
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("Error de conexión. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-center mb-2">Crea tu cuenta</h1>
      <p className="text-sm text-[var(--muted-foreground)] text-center mb-8">
        Empieza a procesar videos con IA gratis
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
        )}

        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-1.5">Nombre</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
            <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Tu nombre"
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[var(--input)] border border-[var(--border)] text-sm focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent outline-none transition-default" />
          </div>
        </div>

        <div>
          <label htmlFor="reg-email" className="block text-sm font-medium mb-1.5">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
            <input id="reg-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="tu@email.com"
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[var(--input)] border border-[var(--border)] text-sm focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent outline-none transition-default" />
          </div>
        </div>

        <div>
          <label htmlFor="reg-password" className="block text-sm font-medium mb-1.5">Contraseña</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
            <input id="reg-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} placeholder="Mínimo 8 caracteres"
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[var(--input)] border border-[var(--border)] text-sm focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent outline-none transition-default" />
          </div>
        </div>

        <button type="submit" disabled={loading}
          className="w-full py-2.5 rounded-lg gradient-bg text-white font-medium text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-default disabled:opacity-50">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Crear cuenta"}
        </button>
      </form>

      <p className="text-sm text-[var(--muted-foreground)] text-center mt-6">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="text-[var(--color-primary)] hover:underline font-medium">Inicia sesión</Link>
      </p>
    </>
  );
}
