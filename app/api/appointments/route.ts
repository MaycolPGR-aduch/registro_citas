import { APPOINTMENT_SELECT, RawAppointment, hasActiveAppointmentInSchedule, lockSchedule, mapAppointment } from "@/lib/appointments";
import { errorResponse, successResponse } from "@/lib/http";
import { tryCreateSupabaseAdminClient } from "@/lib/supabase/admin";
import { isAppointmentStatus, normalizeOptionalText, parsePositiveInt } from "@/lib/validation";

type AppointmentBody = {
  patient_id?: unknown;
  doctor_id?: unknown;
  schedule_id?: unknown;
  reason?: unknown;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status");

  if (statusParam && !isAppointmentStatus(statusParam)) {
    return errorResponse(400, "status no es valido.");
  }

  const admin = tryCreateSupabaseAdminClient();
  if (!admin.client) {
    return errorResponse(500, "Configuracion de servidor incompleta.", admin.error);
  }

  let query = admin.client
    .from("appointments")
    .select(APPOINTMENT_SELECT)
    .order("appointment_date", { ascending: false })
    .order("appointment_time", { ascending: false })
    .limit(400);

  if (statusParam) {
    query = query.eq("status", statusParam);
  }

  const { data, error } = await query;
  if (error) {
    return errorResponse(500, "No se pudieron listar citas.", error.message);
  }

  return successResponse(((data ?? []) as RawAppointment[]).map(mapAppointment));
}

export async function POST(request: Request) {
  let body: AppointmentBody;
  try {
    body = (await request.json()) as AppointmentBody;
  } catch {
    return errorResponse(400, "El cuerpo de la solicitud debe ser JSON valido.");
  }

  const patientId = parsePositiveInt(body.patient_id);
  const doctorId = parsePositiveInt(body.doctor_id);
  const scheduleId = parsePositiveInt(body.schedule_id);
  const reason = normalizeOptionalText(body.reason, 500);

  if (!patientId || !doctorId || !scheduleId) {
    return errorResponse(400, "patient_id, doctor_id y schedule_id son obligatorios y deben ser enteros positivos.");
  }

  const admin = tryCreateSupabaseAdminClient();
  if (!admin.client) {
    return errorResponse(500, "Configuracion de servidor incompleta.", admin.error);
  }

  const { data: patient, error: patientError } = await admin.client
    .from("patients")
    .select("id")
    .eq("id", patientId)
    .maybeSingle();

  if (patientError) {
    return errorResponse(500, "No se pudo validar el paciente.", patientError.message);
  }
  if (!patient) {
    return errorResponse(404, "No existe el paciente indicado.");
  }

  const { data: doctor, error: doctorError } = await admin.client
    .from("doctors")
    .select("id, active")
    .eq("id", doctorId)
    .maybeSingle();

  if (doctorError) {
    return errorResponse(500, "No se pudo validar el medico.", doctorError.message);
  }
  if (!doctor) {
    return errorResponse(404, "No existe el medico indicado.");
  }
  if (!doctor.active) {
    return errorResponse(409, "El medico no esta activo para recibir citas.");
  }

  const { data: schedule, error: scheduleError } = await admin.client
    .from("doctor_schedules")
    .select("id, doctor_id, schedule_date, start_time, is_available")
    .eq("id", scheduleId)
    .maybeSingle();

  if (scheduleError) {
    return errorResponse(500, "No se pudo validar el horario.", scheduleError.message);
  }
  if (!schedule) {
    return errorResponse(404, "No existe el horario indicado.");
  }
  if (schedule.doctor_id !== doctorId) {
    return errorResponse(400, "El horario no pertenece al medico indicado.");
  }

  const activeCheck = await hasActiveAppointmentInSchedule(admin.client, scheduleId);
  if (!activeCheck.ok) {
    return errorResponse(500, "No se pudo validar disponibilidad del horario.", activeCheck.error);
  }
  if (activeCheck.hasActive) {
    return errorResponse(409, "El horario ya tiene una cita activa.");
  }

  const lockResult = await lockSchedule(admin.client, scheduleId);
  if (!lockResult.ok) {
    return errorResponse(409, lockResult.error);
  }

  const { data, error } = await admin.client
    .from("appointments")
    .insert({
      patient_id: patientId,
      doctor_id: doctorId,
      schedule_id: scheduleId,
      appointment_date: schedule.schedule_date,
      appointment_time: schedule.start_time,
      reason,
      status: "scheduled",
    })
    .select(APPOINTMENT_SELECT)
    .single();

  if (error) {
    await admin.client.from("doctor_schedules").update({ is_available: true }).eq("id", scheduleId);
    if (error.code === "23505") {
      return errorResponse(409, "El horario seleccionado ya tiene una cita activa.");
    }
    return errorResponse(500, "No se pudo registrar la cita.", error.message);
  }

  return successResponse(mapAppointment(data as RawAppointment), 201);
}
