import type { Metadata } from "next";
import { TopNav } from "@/components/ui/top-nav";
import { getAuthContext, isStaffRole } from "@/lib/auth/session";
import { signOutAction } from "@/app/auth/actions";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gestion de Citas Medicas",
  description: "Aplicacion academica para gestion de citas medicas con Next.js y Supabase.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const auth = await getAuthContext();
  const role = auth.profile?.role ?? null;
  const displayName = auth.profile?.full_name ?? auth.user?.email ?? "Usuario";

  const navItems = !auth.user
    ? [
        { href: "/login", label: "Login" },
        { href: "/registro", label: "Registro" },
      ]
    : isStaffRole(role)
      ? [
          { href: "/", label: "Dashboard" },
          { href: "/especialidades", label: "Especialidades" },
          { href: "/medicos", label: "Medicos" },
          { href: "/horarios", label: "Horarios" },
          { href: "/pacientes", label: "Pacientes" },
          { href: "/citas/nueva", label: "Nueva Cita" },
          { href: "/citas", label: "Citas" },
        ]
      : [
          { href: "/mi-citas", label: "Mis Citas" },
          { href: "/citas/nueva", label: "Nueva Cita" },
        ];

  return (
    <html lang="es">
      <body className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#dbeafe,_#eef2ff_38%,_#f8fafc_72%)] text-slate-900">
        <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/70 backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
            <div>
              <p className="text-lg font-semibold tracking-tight">Gestion de Citas Medicas</p>
              <p className="text-sm text-slate-600">Next.js + Supabase</p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-3">
              <TopNav items={navItems} />
              {auth.user && (
                <div className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700">
                  <span className="font-semibold">{displayName}</span>
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 uppercase tracking-wide">{role}</span>
                  <form action={signOutAction}>
                    <button type="submit" className="btn-secondary px-3 py-1 text-xs">
                      Cerrar sesion
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
