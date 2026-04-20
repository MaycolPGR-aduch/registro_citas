import {
  APPOINTMENT_SELECT,
  RawAppointment,
  hasActiveAppointmentInSchedule,
  lockSchedule,
  mapAppointment,
  releaseScheduleIfNoActiveAppointments,
} from "@/lib/appointments";
import { isStaffRole, requireAuth, requireStaff } from "@/lib/auth/session";
import { errorResponse, successResponse } from "@/lib/http";
import { isAppointmentStatus, normalizeOptionalText, parsePositiveInt } from "@/lib/validation";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type AppointmentPatchBody = {
  status?: unknown;
  reason?: unknown;
  notes?: unknown;
  doctor_id?: unknown;
  schedule_id?: unknown;
};

export async function PATCH(request: Request, context: RouteContext) {
  const authResult = await requireAuth();
  if (!authResult.ok) {
    return authResult.response;
  }

  const { id: idParam } = await context.params;
  const appointmentId = parsePositiveInt(idParam);
  if (!appointmentId) {
    return errorResponse(400, "El id de cita no es valido.");
  }

  let body: AppointmentPatchBody;
  try {
    body = (await request.json()) as AppointmentPatchBody;
  } catch {
    return errorResponse(400, "El cuerpo de la solicitud debe ser JSON valido.");
  }

  const isStaff = isStaffRole(authResult.context.profile.role);
  if (!isStaff && (Object.prototype.hasOwnProperty.call(body, "doctor_id") || Object.prototype.hasOwnProperty.call(body, "schedule_id"))) {
    return errorResponse(403, "Los pacientes no pueden cambiar medico ni horario.");
  }

  const { data: current, error: currentError } = await authResult.context.supabase
    .from("appointments")
    .select("id, status, doctor_id, schedule_id, patient_id")
    .eq("id", appointmentId)
    .maybeSingle();

  if (currentError) {
    return errorResponse(500, "No se pudo consultar la cita.", currentError.message);
  }
  if (!current) {
    return errorResponse(404, "No existe la cita solicitada.");
  }

  if (!isStaff) {
    if (!authResult.context.patientId || current.patient_id !== authResult.context.patientId) {
      return errorResponse(403, "Solo puedes editar tus propias citas.");
    }
  }

  const nextStatus = body.status === undefined ? current.status : body.status;
  if (!isAppointmentStatus(nextStatus)) {
    return errorResponse(400, "status no es valido.");
  }
  if (!isStaff && body.status !== undefined && nextStatus !== "scheduled" && nextStatus !== "cancelled") {
    return errorResponse(403, "Como paciente solo puedes usar estados scheduled o cancelled.");
  }

  const nextDoctorId = body.doctor_id === undefined ? current.doctor_id : parsePositiveInt(body.doctor_id);
  const nextScheduleId = body.schedule_id === undefined ? current.schedule_id : parsePositiveInt(body.schedule_id);
  if (!nextDoctorId || !nextScheduleId) {
    return errorResponse(400, "doctor_id y schedule_id deben ser enteros positivos.");
  }

  if (
    nextStatus === "cancelled" &&
    (nextDoctorId !== current.doctor_id || nextScheduleId !== current.schedule_id)
  ) {
    return errorResponse(400, "No se puede cambiar doctor u horario cuando la cita se marca como cancelada.");
  }

  const updates: {
    status?: "scheduled" | "completed" | "cancelled" | "no_show";
    reason?: string | null;
    notes?: string | null;
    doctor_id?: number;
    schedule_id?: number;
    appointment_date?: string;
    appointment_time?: string;
  } = {};

  if (body.status !== undefined) {
    updates.status = nextStatus;
  }
  if (Object.prototype.hasOwnProperty.call(body, "reason")) {
    updates.reason = normalizeOptionalText(body.reason, 500);
  }
  if (Object.prototype.hasOwnProperty.call(body, "notes")) {
    updates.notes = normalizeOptionalText(body.notes, 1000);
  }

  let lockedScheduleId: number | null = null;

  if (nextStatus !== "cancelled") {
    const { data: doctor, error: doctorError } = await authResult.context.supabase
      .from("doctors")
      .select("id, active")
      .eq("id", nextDoctorId)
      .maybeSingle();

    if (doctorError) {
      return errorResponse(500, "No se pudo validar el medico.", doctorError.message);
    }
    if (!doctor) {
      return errorResponse(404, "No existe el medico indicado.");
    }
    if (!doctor.active) {
      return errorResponse(409, "El medico no esta activo.");
    }

    const { data: targetSchedule, error: targetScheduleError } = await authResult.context.supabase
      .from("doctor_schedules")
      .select("id, doctor_id, schedule_date, start_time, is_available")
      .eq("id", nextScheduleId)
      .maybeSingle();

    if (targetScheduleError) {
      return errorResponse(500, "No se pudo validar el horario.", targetScheduleError.message);
    }
    if (!targetSchedule) {
      return errorResponse(404, "No existe el horario indicado.");
    }
    if (targetSchedule.doctor_id !== nextDoctorId) {
      return errorResponse(400, "El horario no pertenece al medico indicado.");
    }

    const activeCheck = await hasActiveAppointmentInSchedule(authResult.context.supabase, nextScheduleId, appointmentId);
    if (!activeCheck.ok) {
      return errorResponse(500, "No se pudo validar disponibilidad del horario.", activeCheck.error);
    }
    if (activeCheck.hasActive) {
      return errorResponse(409, "El horario ya tiene una cita activa.");
    }

    const scheduleChanged = nextScheduleId !== current.schedule_id;
    const wasCancelled = current.status === "cancelled";
    if (scheduleChanged || wasCancelled) {
      if (!targetSchedule.is_available) {
        return errorResponse(409, "El horario no esta disponible.");
      }

      const lockResult = await lockSchedule(authResult.context.supabase, nextScheduleId);
      if (!lockResult.ok) {
        return errorResponse(409, lockResult.error);
      }
      lockedScheduleId = nextScheduleId;
    }

    if (scheduleChanged) {
      updates.schedule_id = nextScheduleId;
      updates.doctor_id = nextDoctorId;
      updates.appointment_date = targetSchedule.schedule_date;
      updates.appointment_time = targetSchedule.start_time;
    } else if (nextDoctorId !== current.doctor_id) {
      updates.doctor_id = nextDoctorId;
    }
  }

  if (Object.keys(updates).length === 0) {
    return errorResponse(400, "No se enviaron campos validos para actualizar.");
  }

  const { data, error } = await authResult.context.supabase
    .from("appointments")
    .update(updates)
    .eq("id", appointmentId)
    .select(APPOINTMENT_SELECT)
    .single();

  if (error) {
    if (lockedScheduleId) {
      await authResult.context.supabase.from("doctor_schedules").update({ is_available: true }).eq("id", lockedScheduleId);
    }
    if (error.code === "23505") {
      return errorResponse(409, "El horario seleccionado ya tiene una cita activa.");
    }
    return errorResponse(500, "No se pudo actualizar la cita.", error.message);
  }

  const finalStatus = (updates.status ?? current.status) as "scheduled" | "completed" | "cancelled" | "no_show";
  const finalScheduleId = updates.schedule_id ?? current.schedule_id;
  if (finalStatus === "cancelled" || finalScheduleId !== current.schedule_id) {
    const releaseResult = await releaseScheduleIfNoActiveAppointments(authResult.context.supabase, current.schedule_id);
    if (!releaseResult.ok) {
      return errorResponse(500, "La cita se actualizo, pero no se pudo liberar el horario.", releaseResult.error);
    }
  }

  return successResponse(mapAppointment(data as RawAppointment));
}

export async function DELETE(_: Request, context: RouteContext) {
  const authResult = await requireStaff();
  if (!authResult.ok) {
    return authResult.response;
  }

  const { id: idParam } = await context.params;
  const appointmentId = parsePositiveInt(idParam);
  if (!appointmentId) {
    return errorResponse(400, "El id de cita no es valido.");
  }

  const { data: current, error: currentError } = await authResult.context.supabase
    .from("appointments")
    .select("id, schedule_id")
    .eq("id", appointmentId)
    .maybeSingle();

  if (currentError) {
    return errorResponse(500, "No se pudo consultar la cita.", currentError.message);
  }
  if (!current) {
    return errorResponse(404, "No existe la cita solicitada.");
  }

  const { error } = await authResult.context.supabase.from("appointments").delete().eq("id", appointmentId);
  if (error) {
    return errorResponse(500, "No se pudo eliminar la cita.", error.message);
  }

  const releaseResult = await releaseScheduleIfNoActiveAppointments(authResult.context.supabase, current.schedule_id);
  if (!releaseResult.ok) {
    return errorResponse(500, "La cita se elimino, pero no se pudo liberar el horario.", releaseResult.error);
  }

  return successResponse({ deleted: true, id: appointmentId });
}
