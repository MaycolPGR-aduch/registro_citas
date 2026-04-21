import Link from "next/link";
import { redirect } from "next/navigation";
import {
  FaCalendarDay,
  FaCalendarCheck,
  FaUserMd,
  FaClock,
  FaTimesCircle,
  FaArrowRight,
  FaTachometerAlt,
} from "react-icons/fa";
import { getAuthContext, isStaffRole, resolveHomePath } from "@/lib/auth/session";
import { QuickLinksGrid } from "@/components/ui/quick-links-grid";

type RawAppointmentRow = {
  id: number;
  appointment_date: string;
  appointment_time: string;
  status: "scheduled" | "completed" | "cancelled" | "no_show";
  reason: string | null;
  patients:
    | { full_name: string; dni: string | null }
    | { full_name: string; dni: string | null }[]
    | null;
  doctors:
    | {
        full_name: string;
        specialties: { name: string } | { name: string }[] | null;
      }
    | {
        full_name: string;
        specialties: { name: string } | { name: string }[] | null;
      }[]
    | null;
};


function fmt(value: number | null | undefined) {
  return value ?? 0;
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

function statusLabel(status: RawAppointmentRow["status"]) {
  const map = {
    scheduled: "Programada",
    completed: "Completada",
    cancelled: "Cancelada",
    no_show: "No asistió",
  };
  return map[status] ?? status;
}

function statusClasses(status: RawAppointmentRow["status"]) {
  const map = {
    scheduled: "bg-sky-100 text-sky-700 border-sky-200",
    completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
    cancelled: "bg-rose-100 text-rose-700 border-rose-200",
    no_show: "bg-amber-100 text-amber-700 border-amber-200",
  };
  return map[status] ?? "bg-slate-100 text-slate-600 border-slate-200";
}

function extractPatient(row: RawAppointmentRow) {
  return Array.isArray(row.patients) ? (row.patients[0] ?? null) : row.patients;
}

function extractDoctor(row: RawAppointmentRow) {
  const doc = Array.isArray(row.doctors) ? (row.doctors[0] ?? null) : row.doctors;
  const spec = doc
    ? Array.isArray(doc.specialties)
      ? (doc.specialties[0] ?? null)
      : doc.specialties
    : null;
  return { full_name: doc?.full_name ?? "Sin médico", specialty: spec?.name ?? null };
}


export default async function DashboardPage() {
  const { supabase, user, profile } = await getAuthContext();

  if (!user || !profile) redirect("/login");
  if (!isStaffRole(profile.role)) redirect(resolveHomePath(profile.role));

  const today = new Date().toISOString().slice(0, 10);

  const [
    todayRes,
    pendingRes,
    activeDoctorsRes,
    availableSchedulesRes,
    cancelledRes,
    recentRes,
  ] = await Promise.all([
    supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("appointment_date", today),
    supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("status", "scheduled"),
    supabase
      .from("doctors")
      .select("id", { count: "exact", head: true })
      .eq("active", true),
    supabase
      .from("doctor_schedules")
      .select("id", { count: "exact", head: true })
      .eq("is_available", true)
      .gte("schedule_date", today),
    supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("status", "cancelled"),
    supabase
      .from("appointments")
      .select(
        "id, appointment_date, appointment_time, status, reason, patients(full_name, dni), doctors(full_name, specialties(name))",
      )
      .gte("appointment_date", today)
      .order("appointment_date", { ascending: true })
      .order("appointment_time", { ascending: true })
      .limit(8),
  ]);

  const metrics = [
    {
      label: "Citas de hoy",
      value: fmt(todayRes.count),
      icon: <FaCalendarDay className="text-xl" />,
      color: "bg-sky-500",
      light: "bg-sky-50 text-sky-600",
      description: "Programadas para hoy",
    },
    {
      label: "Citas pendientes",
      value: fmt(pendingRes.count),
      icon: <FaCalendarCheck className="text-xl" />,
      color: "bg-violet-500",
      light: "bg-violet-50 text-violet-600",
      description: "Con estado programada",
    },
    {
      label: "Médicos activos",
      value: fmt(activeDoctorsRes.count),
      icon: <FaUserMd className="text-xl" />,
      color: "bg-emerald-500",
      light: "bg-emerald-50 text-emerald-600",
      description: "Habilitados para atender",
    },
    {
      label: "Horarios libres",
      value: fmt(availableSchedulesRes.count),
      icon: <FaClock className="text-xl" />,
      color: "bg-amber-500",
      light: "bg-amber-50 text-amber-600",
      description: "Bloques aún disponibles",
    },
    {
      label: "Cancelaciones",
      value: fmt(cancelledRes.count),
      icon: <FaTimesCircle className="text-xl" />,
      color: "bg-rose-500",
      light: "bg-rose-50 text-rose-600",
      description: "Acumuladas en el sistema",
    },
  ];

  const recent = (recentRes.data ?? []) as RawAppointmentRow[];

  return (
    <section className="space-y-8">
      {/* ── Header ── */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-600">
            <FaTachometerAlt className="text-xl" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              Bienvenido, {profile.full_name}
            </h1>
            <p className="text-sm font-medium text-slate-500">
              Panel de operaciones — {new Intl.DateTimeFormat("es-PE", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date())}
            </p>
          </div>
        </div>
      </div>

      {/* ── Métricas ── */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_4px_20px_rgba(15,23,42,0.05)]"
          >
            {/* Barra de color superior */}
            <div className={`absolute inset-x-0 top-0 h-1 ${m.color}`} />
            <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl ${m.light}`}>
              {m.icon}
            </div>
            <p className="text-3xl font-black text-slate-900">{m.value}</p>
            <p className="mt-1 text-sm font-semibold text-slate-700">{m.label}</p>
            <p className="mt-0.5 text-xs text-slate-400">{m.description}</p>
          </div>
        ))}
      </div>

      {/* ── Próximas citas + Accesos rápidos ── */}
      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">

        {/* Tabla de próximas citas */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-900">Próximas citas</h2>
              <p className="text-xs text-slate-400">Siguientes atenciones agendadas desde hoy</p>
            </div>
            <Link
              href="/citas"
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
            >
              <span>Ver todas</span>
              <FaArrowRight className="text-[9px]" />
            </Link>
          </div>

          {recent.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-10 text-center">
              <p className="text-sm font-semibold text-slate-500">Sin próximas citas registradas</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs font-bold uppercase tracking-wider text-slate-400">
                    <th className="pb-3 pr-4">Fecha / Hora</th>
                    <th className="pb-3 pr-4">Paciente</th>
                    <th className="pb-3 pr-4">Médico</th>
                    <th className="pb-3">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((row) => {
                    const patient = extractPatient(row);
                    const doctor = extractDoctor(row);
                    return (
                      <tr key={row.id} className="border-b border-slate-50 last:border-0">
                        <td className="py-3 pr-4 align-top">
                          <p className="font-bold text-slate-800">{formatDate(row.appointment_date)}</p>
                          <p className="text-xs text-slate-400 font-mono">{row.appointment_time.slice(0, 5)}</p>
                        </td>
                        <td className="py-3 pr-4 align-top">
                          <p className="font-semibold text-slate-700">{patient?.full_name ?? "Sin paciente"}</p>
                          <p className="text-xs text-slate-400">{patient?.dni ?? "Sin DNI"}</p>
                        </td>
                        <td className="py-3 pr-4 align-top">
                          <p className="font-semibold text-slate-700">{doctor.full_name}</p>
                          <p className="text-[10px] font-bold uppercase tracking-wide text-sky-600">
                            {doctor.specialty ?? "Sin especialidad"}
                          </p>
                        </td>
                        <td className="py-3 align-top">
                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${statusClasses(row.status)}`}>
                            {statusLabel(row.status)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Accesos rápidos compactos */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
          <h2 className="mb-4 text-lg font-black text-slate-900">Accesos rápidos</h2>
          <div className="flex flex-col gap-2">
            {[
              { href: "/especialidades", label: "Especialidades", color: "text-blue-600 bg-blue-50" },
              { href: "/medicos", label: "Médicos", color: "text-sky-600 bg-sky-50" },
              { href: "/horarios", label: "Horarios", color: "text-indigo-600 bg-indigo-50" },
              { href: "/calendario", label: "Calendario", color: "text-indigo-600 bg-indigo-50" },
              { href: "/pacientes", label: "Pacientes", color: "text-violet-600 bg-violet-50" },
              { href: "/citas/nueva", label: "Nueva Cita", color: "text-emerald-600 bg-emerald-50" },
              { href: "/citas", label: "Gestión de Citas", color: "text-rose-600 bg-rose-50" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3 transition-all hover:border-slate-200 hover:bg-white hover:shadow-sm"
              >
                <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900">
                  {item.label}
                </span>
                <FaArrowRight className="text-[10px] text-slate-300 transition-all group-hover:translate-x-1 group-hover:text-sky-500" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── Cards de módulos animadas (Client Component) ── */}
      <div>
        <div className="mb-4">
          <h2 className="text-lg font-black text-slate-900">Módulos del sistema</h2>
          <p className="text-xs text-slate-400">Navega directamente a cada sección</p>
        </div>
        <QuickLinksGrid />
      </div>

      {/* ── Footer ── */}
      <div className="border-t border-slate-100 pt-6 text-center">
        <p className="text-xs font-medium text-slate-400">
          Sistema de Gestión de Citas Médicas © 2026 •{" "}
          <span className="font-bold text-emerald-500">En línea</span>
        </p>
      </div>
    </section>
  );
}
