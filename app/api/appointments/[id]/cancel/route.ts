import { releaseScheduleIfNoActiveAppointments } from "@/lib/appointments";
import { errorResponse, successResponse } from "@/lib/http";
import { tryCreateSupabaseAdminClient } from "@/lib/supabase/admin";
import { normalizeOptionalText, parsePositiveInt } from "@/lib/validation";

type CancelBody = {
  notes?: unknown;
};

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
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

  const admin = tryCreateSupabaseAdminClient();
  if (!admin.client) {
    return errorResponse(500, "Configuracion de servidor incompleta.", admin.error);
  }

  const { data: appointment, error: appointmentError } = await admin.client
    .from("appointments")
    .select("id, status, schedule_id")
    .eq("id", appointmentId)
    .maybeSingle();

  if (appointmentError) {
    return errorResponse(500, "No se pudo consultar la cita.", appointmentError.message);
  }
  if (!appointment) {
    return errorResponse(404, "No existe la cita solicitada.");
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

  const { data, error } = await admin.client
    .from("appointments")
    .update(payload)
    .eq("id", appointmentId)
    .select("id, status, notes")
    .single();

  if (error) {
    return errorResponse(500, "No se pudo cancelar la cita.", error.message);
  }

  const releaseResult = await releaseScheduleIfNoActiveAppointments(admin.client, appointment.schedule_id);
  if (!releaseResult.ok) {
    return errorResponse(500, "La cita se cancelo, pero no se pudo liberar el horario.", releaseResult.error);
  }

  return successResponse(data);
}
