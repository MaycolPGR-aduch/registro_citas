import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthContext, isStaffRole, resolveHomePath } from "@/lib/auth/session";

type RawAppointmentRow = {
  id: number;
  appointment_date: string;
  appointment_time: string;
  status: "scheduled" | "completed" | "cancelled" | "no_show";
  reason: string | null;
  patients:
    | {
        full_name: string;
        dni: string | null;
      }
    | {
        full_name: string;
        dni: string | null;
      }[]
    | null;
  doctors:
    | {
        full_name: string;
        specialties:
          | {
              name: string;
            }
          | {
              name: string;
            }[]
          | null;
      }
    | {
        full_name: string;
        specialties:
          | {
              name: string;
            }
          | {
              name: string;
            }[]
          | null;
      }[]
    | null;
};

function formatMetric(value: number | null | undefined) {
  return value ?? 0;
}

function formatDateLabel(date: string) {
  const parsed = new Date(`${date}T00:00:00`);
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function formatStatusLabel(status: RawAppointmentRow["status"]) {
  switch (status) {
    case "scheduled":
      return "Programada";
    case "completed":
      return "Completada";
    case "cancelled":
      return "Cancelada";
    case "no_show":
      return "No asistió";
    default:
      return status;
  }
}

function getStatusClasses(status: RawAppointmentRow["status"]) {
  switch (status) {
    case "scheduled":
      return "border-sky-200 bg-sky-100 text-sky-800";
    case "completed":
      return "border-emerald-200 bg-emerald-100 text-emerald-800";
    case "cancelled":
      return "border-rose-200 bg-rose-100 text-rose-800";
    case "no_show":
      return "border-amber-200 bg-amber-100 text-amber-800";
    default:
      return "border-slate-200 bg-slate-100 text-slate-700";
  }
}

function extractPatient(row: RawAppointmentRow) {
  return Array.isArray(row.patients) ? (row.patients[0] ?? null) : row.patients;
}

function extractDoctor(row: RawAppointmentRow) {
  const doctor = Array.isArray(row.doctors) ? (row.doctors[0] ?? null) : row.doctors;
  const specialty = doctor
    ? Array.isArray(doctor.specialties)
      ? (doctor.specialties[0] ?? null)
      : doctor.specialties
    : null;

  return {
    full_name: doctor?.full_name ?? "Sin médico",
    specialty_name: specialty?.name ?? null,
  };
}

export default async function DashboardPage() {
  const { supabase, user, profile } = await getAuthContext();

  if (!user || !profile) {
    redirect("/login");
  }

  if (!isStaffRole(profile.role)) {
    redirect(resolveHomePath(profile.role));
  }

  const today = new Date().toISOString().slice(0, 10);

  const [
    appointmentsTodayResult,
    pendingAppointmentsResult,
    activeDoctorsResult,
    availableSchedulesResult,
    cancelledAppointmentsResult,
    recentAppointmentsResult,
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
        `
        id,
        appointment_date,
        appointment_time,
        status,
        reason,
        patients(full_name, dni),
        doctors(full_name, specialties(name))
      `,
      )
      .gte("appointment_date", today)
      .order("appointment_date", { ascending: true })
      .order("appointment_time", { ascending: true })
      .limit(8),
  ]);

  const cards = [
    {
      title: "Citas de hoy",
      value: formatMetric(appointmentsTodayResult.count),
      description: "Programadas para la fecha actual.",
    },
    {
      title: "Citas pendientes",
      value: formatMetric(pendingAppointmentsResult.count),
      description: "Citas con estado programada.",
    },
    {
      title: "Médicos activos",
      value: formatMetric(activeDoctorsResult.count),
      description: "Profesionales habilitados para atender.",
    },
    {
      title: "Horarios disponibles",
      value: formatMetric(availableSchedulesResult.count),
      description: "Bloques de atención aún libres.",
    },
    {
      title: "Citas canceladas",
      value: formatMetric(cancelledAppointmentsResult.count),
      description: "Cancelaciones acumuladas en el sistema.",
    },
  ];

  const shortcuts = [
    {
      href: "/especialidades",
      title: "Especialidades",
      description: "Crear y administrar especialidades médicas.",
    },
    {
      href: "/medicos",
      title: "Médicos",
      description: "Registrar médicos y controlar su estado.",
    },
    {
      href: "/horarios",
      title: "Horarios",
      description: "Gestionar disponibilidad por médico.",
    },
    {
      href: "/pacientes",
      title: "Pacientes",
      description: "Consultar, registrar y actualizar pacientes.",
    },
    {
      href: "/citas/nueva",
      title: "Nueva cita",
      description: "Registrar una nueva cita médica.",
    },
    {
      href: "/citas",
      title: "Gestión de citas",
      description: "Editar, cancelar o revisar citas existentes.",
    },
  ];

  const recentAppointments = (recentAppointmentsResult.data ?? []) as RawAppointmentRow[];

  return (
    <div className="page-shell space-y-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-sky-700">Panel de personal</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
          Bienvenido, {profile.full_name}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Aquí puedes monitorear la operación del sistema y acceder rápido a los módulos principales.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => (
          <div key={card.title} className="card-soft p-5">
            <p className="text-sm font-medium text-slate-500">{card.title}</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{card.value}</p>
            <p className="mt-2 text-sm text-slate-600">{card.description}</p>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="card-soft p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Próximas citas</h2>
              <p className="text-sm text-slate-600">
                Vista rápida de las siguientes atenciones agendadas.
              </p>
            </div>

            <Link href="/citas" className="btn-secondary">
              Ver todas
            </Link>
          </div>

          <div className="mt-5 overflow-x-auto">
            {recentAppointments.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/80 p-6 text-center">
                <p className="text-base font-semibold text-slate-800">Sin próximas citas</p>
                <p className="mt-2 text-sm text-slate-600">
                  No hay citas futuras registradas por ahora.
                </p>
              </div>
            ) : (
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500">
                    <th className="pb-3 pr-4 font-medium">Fecha</th>
                    <th className="pb-3 pr-4 font-medium">Paciente</th>
                    <th className="pb-3 pr-4 font-medium">Médico</th>
                    <th className="pb-3 pr-4 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {recentAppointments.map((row) => {
                    const patient = extractPatient(row);
                    const doctor = extractDoctor(row);

                    return (
                      <tr key={row.id} className="border-b border-slate-100 last:border-b-0">
                        <td className="py-3 pr-4 align-top">
                          <div className="font-medium text-slate-900">
                            {formatDateLabel(row.appointment_date)}
                          </div>
                          <div className="text-slate-500">
                            {row.appointment_time.slice(0, 5)}
                          </div>
                        </td>

                        <td className="py-3 pr-4 align-top">
                          <div className="font-medium text-slate-900">
                            {patient?.full_name ?? "Sin paciente"}
                          </div>
                          <div className="text-slate-500">
                            {patient?.dni ?? "Sin DNI"}
                          </div>
                        </td>

                        <td className="py-3 pr-4 align-top">
                          <div className="font-medium text-slate-900">{doctor.full_name}</div>
                          <div className="text-slate-500">
                            {doctor.specialty_name ?? "Sin especialidad"}
                          </div>
                        </td>

                        <td className="py-3 pr-4 align-top">
                          <span
                            className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${getStatusClasses(
                              row.status,
                            )}`}
                          >
                            {formatStatusLabel(row.status)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="card-soft p-5">
          <h2 className="text-xl font-semibold text-slate-900">Accesos rápidos</h2>
          <p className="text-sm text-slate-600">
            Atajos para operar el sistema con menos pasos.
          </p>

          <div className="mt-5 grid gap-3">
            {shortcuts.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-sky-300 hover:bg-sky-50"
              >
                <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{item.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}