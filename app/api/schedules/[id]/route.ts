import { errorResponse, successResponse } from "@/lib/http";
import { tryCreateSupabaseAdminClient } from "@/lib/supabase/admin";
import { ScheduleSummary } from "@/lib/types";
import { isValidIsoDate, isValidTime, parseBoolean, parsePositiveInt, timeToMinutes } from "@/lib/validation";

type RouteContext = {
  params: Promise<{ id: string }>;
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

type SchedulePatchBody = {
  doctor_id?: unknown;
  schedule_date?: unknown;
  start_time?: unknown;
  end_time?: unknown;
  is_available?: unknown;
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

export async function PATCH(request: Request, context: RouteContext) {
  const { id: idParam } = await context.params;
  const scheduleId = parsePositiveInt(idParam);
  if (!scheduleId) {
    return errorResponse(400, "El id de horario no es valido.");
  }

  let body: SchedulePatchBody;
  try {
    body = (await request.json()) as SchedulePatchBody;
  } catch {
    return errorResponse(400, "El cuerpo de la solicitud debe ser JSON valido.");
  }

  const updates: {
    doctor_id?: number;
    schedule_date?: string;
    start_time?: string;
    end_time?: string;
    is_available?: boolean;
  } = {};

  if (Object.prototype.hasOwnProperty.call(body, "doctor_id")) {
    const doctorId = parsePositiveInt(body.doctor_id);
    if (!doctorId) {
      return errorResponse(400, "doctor_id debe ser un entero positivo.");
    }
    updates.doctor_id = doctorId;
  }

  if (Object.prototype.hasOwnProperty.call(body, "schedule_date")) {
    if (!isValidIsoDate(body.schedule_date)) {
      return errorResponse(400, "schedule_date debe tener formato YYYY-MM-DD.");
    }
    updates.schedule_date = body.schedule_date;
  }

  if (Object.prototype.hasOwnProperty.call(body, "start_time")) {
    if (!isValidTime(body.start_time)) {
      return errorResponse(400, "start_time no es valido.");
    }
    updates.start_time = body.start_time;
  }

  if (Object.prototype.hasOwnProperty.call(body, "end_time")) {
    if (!isValidTime(body.end_time)) {
      return errorResponse(400, "end_time no es valido.");
    }
    updates.end_time = body.end_time;
  }

  if (Object.prototype.hasOwnProperty.call(body, "is_available")) {
    const isAvailable = parseBoolean(body.is_available);
    if (isAvailable === null) {
      return errorResponse(400, "is_available debe ser true o false.");
    }
    updates.is_available = isAvailable;
  }

  if (Object.keys(updates).length === 0) {
    return errorResponse(400, "No se enviaron campos validos para actualizar.");
  }

  const admin = tryCreateSupabaseAdminClient();
  if (!admin.client) {
    return errorResponse(500, "Configuracion de servidor incompleta.", admin.error);
  }

  const { data: current, error: currentError } = await admin.client
    .from("doctor_schedules")
    .select("id, start_time, end_time")
    .eq("id", scheduleId)
    .maybeSingle();

  if (currentError) {
    return errorResponse(500, "No se pudo validar el horario.", currentError.message);
  }
  if (!current) {
    return errorResponse(404, "No existe el horario solicitado.");
  }

  const startTime = updates.start_time ?? current.start_time;
  const endTime = updates.end_time ?? current.end_time;
  if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
    return errorResponse(400, "end_time debe ser mayor a start_time.");
  }

  if (updates.doctor_id) {
    const { data: doctor, error: doctorError } = await admin.client
      .from("doctors")
      .select("id")
      .eq("id", updates.doctor_id)
      .maybeSingle();

    if (doctorError) {
      return errorResponse(500, "No se pudo validar el medico.", doctorError.message);
    }
    if (!doctor) {
      return errorResponse(404, "No existe el medico indicado.");
    }
  }

  const { data: activeAppointments, error: activeAppointmentsError } = await admin.client
    .from("appointments")
    .select("id")
    .eq("schedule_id", scheduleId)
    .neq("status", "cancelled")
    .limit(1);

  if (activeAppointmentsError) {
    return errorResponse(500, "No se pudo validar el estado del horario.", activeAppointmentsError.message);
  }

  if (updates.is_available === true && (activeAppointments ?? []).length > 0) {
    return errorResponse(409, "No se puede marcar disponible un horario con cita activa.");
  }

  const { data, error } = await admin.client
    .from("doctor_schedules")
    .update(updates)
    .eq("id", scheduleId)
    .select(SELECT_SCHEDULE)
    .single();

  if (error) {
    if (error.code === "23505") {
      return errorResponse(409, "Ya existe ese bloque horario para el medico.");
    }
    if (error.code === "23514") {
      return errorResponse(400, "Rango horario invalido.");
    }
    return errorResponse(500, "No se pudo actualizar el horario.", error.message);
  }

  return successResponse(mapSchedule(data as RawSchedule));
}

export async function DELETE(_: Request, context: RouteContext) {
  const { id: idParam } = await context.params;
  const scheduleId = parsePositiveInt(idParam);
  if (!scheduleId) {
    return errorResponse(400, "El id de horario no es valido.");
  }

  const admin = tryCreateSupabaseAdminClient();
  if (!admin.client) {
    return errorResponse(500, "Configuracion de servidor incompleta.", admin.error);
  }

  const { data: appointments, error: appointmentsError } = await admin.client
    .from("appointments")
    .select("id")
    .eq("schedule_id", scheduleId)
    .limit(1);

  if (appointmentsError) {
    return errorResponse(500, "No se pudo validar referencias del horario.", appointmentsError.message);
  }

  if ((appointments ?? []).length > 0) {
    return errorResponse(409, "No se puede eliminar un horario con citas asociadas.");
  }

  const { error } = await admin.client.from("doctor_schedules").delete().eq("id", scheduleId);

  if (error) {
    return errorResponse(500, "No se pudo eliminar el horario.", error.message);
  }

  return successResponse({ deleted: true, id: scheduleId });
}
