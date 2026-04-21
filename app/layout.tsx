import type { Metadata } from "next";
import { NavigationWrapper } from "@/components/ui/navigation-wrapper";
import { getAuthContext, isStaffRole } from "@/lib/auth/session";
import { signOutAction } from "@/app/auth/actions";
import { Toaster } from "sileo";
import "sileo/styles.css";
import {
  FaHome,
  FaStethoscope,
  FaUserMd,
  FaClock,
  FaUsers,
  FaCalendarCheck,
  FaPlusCircle,
  FaCalendarAlt,
  FaHospital,
  FaSignOutAlt,
  FaUserCircle,
  FaCalendarDay,
} from "react-icons/fa";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gestion de Citas Medicas",
  description: "Aplicacion academica para gestion de citas medicas con Next.js y Supabase.",
};

const staffNavItems = [
  { href: "/", label: "Dashboard", icon: <FaHome /> },
  { href: "/especialidades", label: "Especialidades", icon: <FaStethoscope /> },
  { href: "/medicos", label: "Medicos", icon: <FaUserMd /> },
  { href: "/horarios", label: "Horarios", icon: <FaClock /> },
  { href: "/calendario", label: "Agenda", icon: <FaCalendarDay /> },
  { href: "/pacientes", label: "Pacientes", icon: <FaUsers /> },
  { href: "/citas/nueva", label: "Nueva Cita", icon: <FaPlusCircle /> },
  { href: "/citas", label: "Citas", icon: <FaCalendarCheck /> },
];

const patientNavItems = [
  { href: "/mi-citas", label: "Mis Citas", icon: <FaCalendarAlt /> },
  { href: "/citas/nueva", label: "Nueva Cita", icon: <FaPlusCircle /> },
];

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const auth = await getAuthContext();
  const role = auth.profile?.role ?? null;
  const displayName = auth.profile?.full_name ?? auth.user?.email ?? "Usuario";

  const navItems = !auth.user
    ? []
    : isStaffRole(role)
      ? staffNavItems
      : patientNavItems;

  return (
    <html lang="es">
      <body className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#dbeafe,_#eef2ff_38%,_#f8fafc_72%)] text-slate-900">
        <Toaster position="bottom-right" theme="light" />
        
        {/* Solo mostrar Header si el usuario está autenticado */}
        {auth.user && (
          <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/70 backdrop-blur-xl">
            <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-600 text-white shadow-lg shadow-sky-200">
                  <FaHospital className="text-xl" />
                </div>
                <div>
                  <p className="text-lg font-bold tracking-tight text-slate-900">Gestión de Citas Médicas</p>
                  <p className="text-xs font-medium text-sky-600 uppercase tracking-wider">Sistema Hospitalario</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-3">
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/80 p-1.5 pr-4 shadow-sm backdrop-blur-sm">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                    <FaUserCircle className="text-xl" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-900 leading-tight">{displayName}</span>
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 leading-tight">{role}</span>
                  </div>
                  <form action={signOutAction} className="ml-2 border-l border-slate-200 pl-3">
                    <button type="submit" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600" title="Cerrar sesión">
                      <FaSignOutAlt />
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </header>
        )}

        {auth.user && <NavigationWrapper items={navItems} />}

        {/* El contenedor main no tendrá padding si no hay usuario, eliminando el scroll en Login/Registro */}
        <main className={auth.user ? "mx-auto w-full max-w-6xl px-4 py-4" : "w-full"}>
          {children}
        </main>
      </body>
    </html>
  );
}
