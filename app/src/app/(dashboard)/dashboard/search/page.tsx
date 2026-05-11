// src/app/(dashboard)/dashboard/search/page.tsx — Semantic search page
export default function SearchPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Búsqueda Semántica</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          Busca en tus fichas usando lenguaje natural
        </p>
      </div>

      <div className="glass rounded-xl p-6 mb-8">
        <form className="flex gap-3">
          <input
            type="text"
            placeholder="¿Qué estás buscando? Ej: 'cómo optimizar rendimiento en React'"
            className="flex-1 px-4 py-2.5 rounded-lg bg-[var(--input)] border border-[var(--border)] text-sm focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent outline-none transition-default"
          />
          <button
            type="submit"
            className="px-6 py-2.5 rounded-lg gradient-bg text-white font-medium text-sm hover:opacity-90 transition-default shrink-0"
          >
            Buscar
          </button>
        </form>
      </div>

      <div className="text-center py-16 text-[var(--muted-foreground)]">
        <p className="text-sm">Escribe una consulta para buscar en tus fichas</p>
      </div>
    </div>
  );
}
