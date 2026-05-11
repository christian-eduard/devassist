// src/app/page.tsx — Landing page
import Link from "next/link";
import {
  Zap,
  Key,
  Search,
  Play,
  ArrowRight,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Procesamiento IA",
    description:
      "Pega un enlace de TikTok, YouTube o Instagram y obtén una ficha de conocimiento completa en segundos.",
  },
  {
    icon: Key,
    title: "API Propia",
    description:
      "Genera tu API key única para integrar el procesamiento de video en tus propias aplicaciones.",
  },
  {
    icon: Search,
    title: "Búsqueda Semántica",
    description:
      "Busca en tu biblioteca de fichas con lenguaje natural. Encuentra lo relevante, no solo lo textual.",
  },
];

const plans = [
  {
    name: "Free",
    price: "0",
    period: "para siempre",
    features: [
      "5 videos/mes",
      "10 API calls/día",
      "Dashboard básico",
      "1 API key",
    ],
    cta: "Empezar gratis",
    highlighted: false,
  },
  {
    name: "Starter",
    price: "9",
    period: "/mes",
    features: [
      "50 videos/mes",
      "100 API calls/día",
      "Búsqueda semántica",
      "3 API keys",
      "Soporte email",
    ],
    cta: "Comenzar",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "29",
    period: "/mes",
    features: [
      "200 videos/mes",
      "500 API calls/día",
      "Búsqueda semántica",
      "10 API keys",
      "API RAG avanzada",
      "Soporte prioritario",
    ],
    cta: "Ir a Pro",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "99",
    period: "/mes",
    features: [
      "Videos ilimitados",
      "5000 API calls/día",
      "Todo incluido",
      "API keys ilimitadas",
      "SLA garantizado",
      "Soporte dedicado",
    ],
    cta: "Contactar",
    highlighted: false,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold">DevAssist</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-[var(--muted-foreground)]">
            <a href="#features" className="hover:text-[var(--foreground)] transition-default">
              Funcionalidades
            </a>
            <a href="#pricing" className="hover:text-[var(--foreground)] transition-default">
              Precios
            </a>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-default"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/register"
              className="text-sm px-4 py-2 rounded-lg gradient-bg text-white font-medium hover:opacity-90 transition-default"
            >
              Registrarse
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--muted)] text-xs text-[var(--muted-foreground)] mb-6">
            <Play className="w-3 h-3" />
            Plataforma de inteligencia de video con IA
          </div>
          <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6">
            Transforma videos en{" "}
            <span className="gradient-text">conocimiento</span>
          </h1>
          <p className="text-lg md:text-xl text-[var(--muted-foreground)] max-w-2xl mx-auto mb-10">
            Pega un enlace. Obtén una ficha técnica completa: transcripción,
            resumen, puntos clave, stack tecnológico y búsqueda semántica.
            Todo automático.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/register"
              className="px-8 py-3 rounded-xl gradient-bg text-white font-semibold text-base flex items-center gap-2 hover:opacity-90 transition-default hover:scale-[1.02]"
            >
              Empezar gratis
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#features"
              className="px-8 py-3 rounded-xl border border-[var(--border)] text-sm font-medium hover:bg-[var(--muted)] transition-default"
            >
              Ver funcionalidades
            </a>
          </div>
        </div>

        {/* Hero visual — gradient glow */}
        <div className="mt-16 max-w-5xl mx-auto relative">
          <div className="absolute inset-0 gradient-bg opacity-20 blur-3xl rounded-3xl" />
          <div className="relative glass rounded-2xl p-8 min-h-[300px] flex items-center justify-center">
            <div className="text-center">
              <div className="inline-flex items-center gap-3 px-6 py-3 rounded-xl bg-[var(--muted)] text-sm mb-4">
                <span className="text-[var(--muted-foreground)]">
                  https://tiktok.com/@checkthecar/video/763452...
                </span>
                <span className="px-2 py-0.5 rounded-md gradient-bg text-white text-xs font-medium">
                  Procesando
                </span>
              </div>
              <div className="w-full max-w-md mx-auto h-2 bg-[var(--muted)] rounded-full overflow-hidden">
                <div
                  className="h-full gradient-bg rounded-full"
                  style={{ width: "65%", animation: "pulse 2s infinite" }}
                />
              </div>
              <p className="text-xs text-[var(--muted-foreground)] mt-3">
                Etapa 3/4: Generando ficha de conocimiento...
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Todo lo que necesitas
          </h2>
          <p className="text-center text-[var(--muted-foreground)] mb-16 max-w-lg mx-auto">
            De un simple enlace a conocimiento estructurado y buscable.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="glass rounded-2xl p-8 hover:scale-[1.02] transition-default group"
              >
                <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center mb-5 group-hover:scale-110 transition-default">
                  <f.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{f.title}</h3>
                <p className="text-[var(--muted-foreground)] text-sm leading-relaxed">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Precios simples
          </h2>
          <p className="text-center text-[var(--muted-foreground)] mb-16 max-w-lg mx-auto">
            Empieza gratis. Escala cuando lo necesites.
          </p>
          <div className="grid md:grid-cols-4 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl p-6 flex flex-col ${
                  plan.highlighted
                    ? "gradient-border glass ring-2 ring-[var(--color-primary)]"
                    : "glass"
                }`}
              >
                {plan.highlighted && (
                  <span className="self-start px-3 py-1 rounded-full gradient-bg text-white text-xs font-medium mb-4">
                    Popular
                  </span>
                )}
                <h3 className="text-lg font-semibold mb-1">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-bold">{plan.price}€</span>
                  <span className="text-sm text-[var(--muted-foreground)]">
                    {plan.period}
                  </span>
                </div>
                <ul className="flex-1 space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]"
                    >
                      <CheckCircle2 className="w-4 h-4 text-[var(--color-success)] shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className={`w-full text-center py-2.5 rounded-lg text-sm font-medium transition-default ${
                    plan.highlighted
                      ? "gradient-bg text-white hover:opacity-90"
                      : "border border-[var(--border)] hover:bg-[var(--muted)]"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md gradient-bg flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold">DevAssist</span>
          </div>
          <p className="text-xs text-[var(--muted-foreground)]">
            © {new Date().getFullYear()} DevAssist. Todos los derechos
            reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
