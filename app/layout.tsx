import type { Metadata } from "next";
import { TopNav } from "@/components/ui/top-nav";
import { getAuthContext, isStaffRole } from "@/lib/auth/session";
import { signOutAction } from "@/app/auth/actions";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gestión de Citas Médicas",
  description: "Aplicación académica para gestión de citas médicas con Next.js y Supabase.",
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
          { href: "/medicos", label: "Médicos" },
          { href: "/horarios", label: "Horarios" },
          { href: "/pacientes", label: "Pacientes" },
          { href: "/citas/nueva", label: "Nueva cita" },
          { href: "/citas", label: "Citas" },
        ]
      : [
          { href: "/mi-citas", label: "Mis citas" },
          { href: "/citas/nueva", label: "Nueva cita" },
        ];

  const roleLabel =
    role === "admin"
      ? "Admin"
      : role === "receptionist"
        ? "Recepción"
        : role === "patient"
          ? "Paciente"
          : "Invitado";

  return (
    <html lang="es">
      <body className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#dbeafe,_#eef2ff_38%,_#f8fafc_72%)] text-slate-900">
        <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xl font-semibold tracking-tight text-slate-900">
                  Gestión de Citas Médicas
                </p>
                <p className="text-sm text-slate-600">
                  Plataforma de gestión para personal y pacientes
                </p>
              </div>

              {auth.user ? (
                <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {displayName}
                    </p>
                    <p className="text-xs text-slate-500">{roleLabel}</p>
                  </div>

                  <form action={signOutAction}>
                    <button type="submit" className="btn-secondary px-3 py-2 text-sm">
                      Cerrar sesión
                    </button>
                  </form>
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <TopNav items={navItems} />

              {auth.user ? (
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                  Rol: {roleLabel}
                </span>
              ) : (
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                  Acceso público
                </span>
              )}
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}