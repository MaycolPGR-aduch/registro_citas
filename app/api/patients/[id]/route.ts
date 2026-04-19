import { errorResponse, successResponse } from "@/lib/http";
import { tryCreateSupabaseAdminClient } from "@/lib/supabase/admin";
import { PatientSummary } from "@/lib/types";
import { isValidIsoDate, normalizeOptionalText, parsePositiveInt, validateEmail } from "@/lib/validation";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type PatientPatchBody = {
  full_name?: unknown;
  dni?: unknown;
  birth_date?: unknown;
  phone?: unknown;
  email?: unknown;
};

const SELECT_PATIENT = "id, full_name, dni, birth_date, phone, email";

export async function PATCH(request: Request, context: RouteContext) {
  const { id: idParam } = await context.params;
  const patientId = parsePositiveInt(idParam);
  if (!patientId) {
    return errorResponse(400, "El id de paciente no es valido.");
  }

  let body: PatientPatchBody;
  try {
    body = (await request.json()) as PatientPatchBody;
  } catch {
    return errorResponse(400, "El cuerpo de la solicitud debe ser JSON valido.");
  }

  const updates: {
    full_name?: string;
    dni?: string | null;
    birth_date?: string | null;
    phone?: string | null;
    email?: string | null;
  } = {};

  if (Object.prototype.hasOwnProperty.call(body, "full_name")) {
    const fullName = normalizeOptionalText(body.full_name, 120);
    if (!fullName) {
      return errorResponse(400, "full_name no puede estar vacio.");
    }
    updates.full_name = fullName;
  }

  if (Object.prototype.hasOwnProperty.call(body, "dni")) {
    updates.dni = normalizeOptionalText(body.dni, 20);
  }

  if (Object.prototype.hasOwnProperty.call(body, "birth_date")) {
    if (body.birth_date === "" || body.birth_date === null) {
      updates.birth_date = null;
    } else if (isValidIsoDate(body.birth_date)) {
      updates.birth_date = body.birth_date;
    } else {
      return errorResponse(400, "birth_date debe tener formato YYYY-MM-DD.");
    }
  }

  if (Object.prototype.hasOwnProperty.call(body, "phone")) {
    updates.phone = normalizeOptionalText(body.phone, 30);
  }

  if (Object.prototype.hasOwnProperty.call(body, "email")) {
    if (body.email === "" || body.email === null) {
      updates.email = null;
    } else {
      const email = validateEmail(body.email);
      if (!email) {
        return errorResponse(400, "email no tiene un formato valido.");
      }
      updates.email = email;
    }
  }

  if (Object.keys(updates).length === 0) {
    return errorResponse(400, "No se enviaron campos validos para actualizar.");
  }

  const admin = tryCreateSupabaseAdminClient();
  if (!admin.client) {
    return errorResponse(500, "Configuracion de servidor incompleta.", admin.error);
  }

  const { data, error } = await admin.client
    .from("patients")
    .update(updates)
    .eq("id", patientId)
    .select(SELECT_PATIENT)
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      return errorResponse(409, "Ya existe otro paciente con el mismo DNI o correo.");
    }
    return errorResponse(500, "No se pudo actualizar el paciente.", error.message);
  }

  if (!data) {
    return errorResponse(404, "No existe el paciente solicitado.");
  }

  return successResponse(data as PatientSummary);
}

export async function DELETE(_: Request, context: RouteContext) {
  const { id: idParam } = await context.params;
  const patientId = parsePositiveInt(idParam);
  if (!patientId) {
    return errorResponse(400, "El id de paciente no es valido.");
  }

  const admin = tryCreateSupabaseAdminClient();
  if (!admin.client) {
    return errorResponse(500, "Configuracion de servidor incompleta.", admin.error);
  }

  const { error } = await admin.client.from("patients").delete().eq("id", patientId);

  if (error) {
    if (error.code === "23503") {
      return errorResponse(409, "No se puede eliminar el paciente porque tiene citas asociadas.");
    }
    return errorResponse(500, "No se pudo eliminar el paciente.", error.message);
  }

  return successResponse({ deleted: true, id: patientId });
}
