import { requireAuth, requireStaff } from "@/lib/auth/session";
import { errorResponse, successResponse } from "@/lib/http";
import { ScheduleSummary } from "@/lib/types";
import { isValidIsoDate, isValidTime, parseBoolean, parsePositiveInt, timeToMinutes } from "@/lib/validation";

type ScheduleBody = {
  doctor_id?: unknown;
  schedule_date?: unknown;
  start_time?: unknown;
  end_time?: unknown;
  is_available?: unknown;
};

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
  appointments:
    | {
        id: number;
        status: string;
      }[]
    | null;
};

const SELECT_SCHEDULE =
  "id, doctor_id, schedule_date, start_time, end_time, is_available, doctors(full_name, specialties(name)), appointments(id, status)";

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
  const onlyAvailableParam = searchParams.get("onlyAvailable");

  const doctorId = doctorIdParam ? parsePositiveInt(doctorIdParam) : null;
  if (doctorIdParam && !doctorId) {
    return errorResponse(400, "doctorId debe ser un entero positivo.");
  }

  if (dateParam && !isValidIsoDate(dateParam)) {
    return errorResponse(400, "date debe tener formato YYYY-MM-DD.");
  }

  const onlyAvailable = onlyAvailableParam ? parseBoolean(onlyAvailableParam) : false;
  if (onlyAvailableParam && onlyAvailable === null) {
    return errorResponse(400, "onlyAvailable debe ser true o false.");
  }

  let query = authResult.context.supabase
    .from("doctor_schedules")
    .select(SELECT_SCHEDULE)
    .order("schedule_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (doctorId) {
    query = query.eq("doctor_id", doctorId);
  }

  if (dateParam) {
    query = query.eq("schedule_date", dateParam);
  }

  if (onlyAvailable === true) {
    query = query.eq("is_available", true);
  }

  const { data, error } = await query;
  if (error) {
    return errorResponse(500, "No se pudieron listar horarios.", error.message);
  }

  const mapped = ((data ?? []) as RawSchedule[]).map(mapSchedule);
  const filtered = onlyAvailable === true ? mapped.filter((row) => !row.has_active_appointment) : mapped;

  return successResponse(filtered);
}

export async function POST(request: Request) {
  const authResult = await requireStaff();
  if (!authResult.ok) {
    return authResult.response;
  }

  let body: ScheduleBody;
  try {
    body = (await request.json()) as ScheduleBody;
  } catch {
    return errorResponse(400, "El cuerpo de la solicitud debe ser JSON valido.");
  }

  const doctorId = parsePositiveInt(body.doctor_id);
  const scheduleDate = body.schedule_date;
  const startTime = body.start_time;
  const endTime = body.end_time;
  const isAvailable = body.is_available === undefined ? true : parseBoolean(body.is_available);

  if (!doctorId || !isValidIsoDate(scheduleDate) || !isValidTime(startTime) || !isValidTime(endTime)) {
    return errorResponse(400, "doctor_id, schedule_date, start_time y end_time son obligatorios y deben ser validos.");
  }

  if (isAvailable === null) {
    return errorResponse(400, "is_available debe ser true o false.");
  }

  if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
    return errorResponse(400, "end_time debe ser mayor a start_time.");
  }

  const { data: doctor, error: doctorError } = await authResult.context.supabase
    .from("doctors")
    .select("id")
    .eq("id", doctorId)
    .maybeSingle();

  if (doctorError) {
    return errorResponse(500, "No se pudo validar el medico.", doctorError.message);
  }
  if (!doctor) {
    return errorResponse(404, "No existe el medico indicado.");
  }

  const { data, error } = await authResult.context.supabase
    .from("doctor_schedules")
    .insert({
      doctor_id: doctorId,
      schedule_date: scheduleDate,
      start_time: startTime,
      end_time: endTime,
      is_available: isAvailable,
    })
    .select(SELECT_SCHEDULE)
    .single();

  if (error) {
    if (error.code === "23505") {
      return errorResponse(409, "Ya existe ese bloque horario para el medico.");
    }
    if (error.code === "23514") {
      return errorResponse(400, "Rango horario invalido.");
    }
    return errorResponse(500, "No se pudo registrar el horario.", error.message);
  }

  return successResponse(mapSchedule(data as RawSchedule), 201);
}
