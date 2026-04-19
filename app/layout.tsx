import type { Metadata } from "next";
import { TopNav } from "@/components/ui/top-nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gestion de Citas Medicas",
  description: "Aplicacion academica para gestion de citas medicas con Next.js y Supabase.",
};

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/especialidades", label: "Especialidades" },
  { href: "/medicos", label: "Medicos" },
  { href: "/horarios", label: "Horarios" },
  { href: "/pacientes", label: "Pacientes" },
  { href: "/citas/nueva", label: "Nueva Cita" },
  { href: "/citas", label: "Citas" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#dbeafe,_#eef2ff_38%,_#f8fafc_72%)] text-slate-900">
        <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/70 backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
            <div>
              <p className="text-lg font-semibold tracking-tight">Gestion de Citas Medicas</p>
              <p className="text-sm text-slate-600">Next.js + Supabase</p>
            </div>
            <TopNav items={navItems} />
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
