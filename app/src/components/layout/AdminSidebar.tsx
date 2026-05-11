"use client";
// src/components/layout/AdminSidebar.tsx — Admin panel sidebar
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sparkles,
  Users,
  CreditCard,
  BarChart3,
  Settings,
  LayoutDashboard,
  LogOut,
  Shield,
} from "lucide-react";
import { signOut } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin", icon: BarChart3, label: "Métricas" },
  { href: "/admin/users", icon: Users, label: "Usuarios" },
  { href: "/admin/plans", icon: CreditCard, label: "Planes" },
  { href: "/admin/config", icon: Settings, label: "Configuración" },
  { href: "/dashboard", icon: LayoutDashboard, label: "Mi Dashboard" },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 glass border-r border-[var(--border)] flex flex-col z-40">
      <div className="h-16 flex items-center gap-2 px-6 border-b border-[var(--border)]">
        <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div>
          <span className="text-lg font-bold">Admin</span>
          <span className="text-xs text-[var(--muted-foreground)] ml-1">Panel</span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/admin" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-default",
                isActive
                  ? "bg-red-500/10 text-red-400"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-[var(--border)]">
        <button
          onClick={() => signOut()}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--muted-foreground)] hover:text-red-400 hover:bg-red-500/10 transition-default w-full"
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
