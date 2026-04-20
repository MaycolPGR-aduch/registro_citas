import { releaseScheduleIfNoActiveAppointments } from "@/lib/appointments";
import { isStaffRole, requireAuth } from "@/lib/auth/session";
import { errorResponse, successResponse } from "@/lib/http";
import { normalizeOptionalText, parsePositiveInt } from "@/lib/validation";

type CancelBody = {
  notes?: unknown;
};

type RouteContext = {
  params: Promise<{ id: string }>;
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

  let body: CancelBody = {};
  try {
    body = (await request.json()) as CancelBody;
  } catch {
    body = {};
  }

  const notes = normalizeOptionalText(body.notes, 1000);
  const { data: appointment, error: appointmentError } = await authResult.context.supabase
    .from("appointments")
    .select("id, status, schedule_id, patient_id")
    .eq("id", appointmentId)
    .maybeSingle();

  if (appointmentError) {
    return errorResponse(500, "No se pudo consultar la cita.", appointmentError.message);
  }
  if (!appointment) {
    return errorResponse(404, "No existe la cita solicitada.");
  }

  if (!isStaffRole(authResult.context.profile.role)) {
    if (!authResult.context.patientId || appointment.patient_id !== authResult.context.patientId) {
      return errorResponse(403, "Solo puedes cancelar tus propias citas.");
    }
  }

  if (appointment.status === "cancelled") {
    return errorResponse(409, "La cita ya esta cancelada.");
  }

  const payload: { status: "cancelled"; notes?: string | null } = {
    status: "cancelled",
  };
  if (Object.prototype.hasOwnProperty.call(body, "notes")) {
    payload.notes = notes;
  }

  const { data, error } = await authResult.context.supabase
    .from("appointments")
    .update(payload)
    .eq("id", appointmentId)
    .select("id, status, notes")
    .single();

  if (error) {
    return errorResponse(500, "No se pudo cancelar la cita.", error.message);
  }

  const releaseResult = await releaseScheduleIfNoActiveAppointments(authResult.context.supabase, appointment.schedule_id);
  if (!releaseResult.ok) {
    return errorResponse(500, "La cita se cancelo, pero no se pudo liberar el horario.", releaseResult.error);
  }

  return successResponse(data);
}
