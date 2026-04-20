import { requireAuth } from "@/lib/auth/session";
import { errorResponse, successResponse } from "@/lib/http";
import { ScheduleSummary } from "@/lib/types";
import { isValidIsoDate, parsePositiveInt } from "@/lib/validation";

type RawSchedule = {
  id: number;
  doctor_id: number;
  schedule_date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
  doctors:
    | {
        full_name: string;
        active: boolean;
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
        active: boolean;
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
  appointments:
    | {
        id: number;
        status: string;
      }[]
    | null;
};

function mapSchedule(raw: RawSchedule): ScheduleSummary {
  const doctor = Array.isArray(raw.doctors) ? raw.doctors[0] ?? null : raw.doctors;
  const specialty = doctor
    ? Array.isArray(doctor.specialties)
      ? doctor.specialties[0] ?? null
      : doctor.specialties
    : null;
  const appointments = raw.appointments ?? [];

  return {
    id: raw.id,
    doctor_id: raw.doctor_id,
    schedule_date: raw.schedule_date,
    start_time: raw.start_time,
    end_time: raw.end_time,
    is_available: raw.is_available,
    doctor_name: doctor?.full_name ?? "Sin medico",
    specialty_name: specialty?.name ?? null,
    has_active_appointment: appointments.some((appointment) => appointment.status !== "cancelled"),
  };
}

export async function GET(request: Request) {
  const authResult = await requireAuth();
  if (!authResult.ok) {
    return authResult.response;
  }

  const { searchParams } = new URL(request.url);
  const doctorIdParam = searchParams.get("doctorId");
  const dateParam = searchParams.get("date");

  const doctorId = doctorIdParam ? parsePositiveInt(doctorIdParam) : null;
  if (doctorIdParam && !doctorId) {
    return errorResponse(400, "doctorId debe ser un entero positivo.");
  }

  if (dateParam && !isValidIsoDate(dateParam)) {
    return errorResponse(400, "date debe tener formato YYYY-MM-DD.");
  }

  let query = authResult.context.supabase
    .from("doctor_schedules")
    .select(
      "id, doctor_id, schedule_date, start_time, end_time, is_available, doctors!inner(full_name, active, specialties(name)), appointments(id, status)",
    )
    .eq("is_available", true)
    .eq("doctors.active", true)
    .order("schedule_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (doctorId) {
    query = query.eq("doctor_id", doctorId);
  }

  if (dateParam) {
    query = query.eq("schedule_date", dateParam);
  }

  const { data, error } = await query;
  if (error) {
    return errorResponse(500, "No se pudieron listar horarios disponibles.", error.message);
  }

  const schedules = ((data ?? []) as RawSchedule[])
    .map(mapSchedule)
    .filter((schedule) => !schedule.has_active_appointment);

  return successResponse(schedules);
}
