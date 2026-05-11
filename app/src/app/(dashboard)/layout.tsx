// src/app/(dashboard)/layout.tsx — Dashboard layout with sidebar
import { Sparkles } from "lucide-react";
import { DashboardSidebar } from "@/components/layout/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <DashboardSidebar />
      <main className="flex-1 ml-64 p-8">{children}</main>
    </div>
  );
}
