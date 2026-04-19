import { errorResponse, successResponse } from "@/lib/http";
import { tryCreateSupabaseAdminClient } from "@/lib/supabase/admin";
import { SpecialtySummary } from "@/lib/types";
import { normalizeOptionalText, parsePositiveInt } from "@/lib/validation";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type SpecialtyPatchBody = {
  name?: unknown;
  description?: unknown;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { id: idParam } = await context.params;
  const specialtyId = parsePositiveInt(idParam);
  if (!specialtyId) {
    return errorResponse(400, "El id de especialidad no es valido.");
  }

  let body: SpecialtyPatchBody;
  try {
    body = (await request.json()) as SpecialtyPatchBody;
  } catch {
    return errorResponse(400, "El cuerpo de la solicitud debe ser JSON valido.");
  }

  const updates: { name?: string; description?: string | null } = {};

  if (Object.prototype.hasOwnProperty.call(body, "name")) {
    const name = normalizeOptionalText(body.name, 100);
    if (!name) {
      return errorResponse(400, "name no puede estar vacio.");
    }
    updates.name = name;
  }

  if (Object.prototype.hasOwnProperty.call(body, "description")) {
    updates.description = normalizeOptionalText(body.description, 500);
  }

  if (Object.keys(updates).length === 0) {
    return errorResponse(400, "No se enviaron campos validos para actualizar.");
  }

  const admin = tryCreateSupabaseAdminClient();
  if (!admin.client) {
    return errorResponse(500, "Configuracion de servidor incompleta.", admin.error);
  }

  const { data, error } = await admin.client
    .from("specialties")
    .update(updates)
    .eq("id", specialtyId)
    .select("id, name, description")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      return errorResponse(409, "Ya existe una especialidad con ese nombre.");
    }
    return errorResponse(500, "No se pudo actualizar la especialidad.", error.message);
  }

  if (!data) {
    return errorResponse(404, "No existe la especialidad solicitada.");
  }

  return successResponse(data as SpecialtySummary);
}

export async function DELETE(_: Request, context: RouteContext) {
  const { id: idParam } = await context.params;
  const specialtyId = parsePositiveInt(idParam);
  if (!specialtyId) {
    return errorResponse(400, "El id de especialidad no es valido.");
  }

  const admin = tryCreateSupabaseAdminClient();
  if (!admin.client) {
    return errorResponse(500, "Configuracion de servidor incompleta.", admin.error);
  }

  const { error } = await admin.client.from("specialties").delete().eq("id", specialtyId);

  if (error) {
    if (error.code === "23503") {
      return errorResponse(409, "No se puede eliminar una especialidad con medicos asociados.");
    }
    return errorResponse(500, "No se pudo eliminar la especialidad.", error.message);
  }

  return successResponse({ deleted: true, id: specialtyId });
}
