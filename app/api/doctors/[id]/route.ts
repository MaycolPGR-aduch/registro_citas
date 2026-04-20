import { requireStaff } from "@/lib/auth/session";
import { errorResponse, successResponse } from "@/lib/http";
import { DoctorSummary } from "@/lib/types";
import { normalizeOptionalText, parseBoolean, parsePositiveInt, validateEmail } from "@/lib/validation";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type RawDoctor = {
  id: number;
  full_name: string;
  email: string | null;
  phone: string | null;
  license_number: string | null;
  active: boolean;
  specialty_id: number;
  specialties:
    | {
        id: number;
        name: string;
      }
    | {
        id: number;
        name: string;
      }[]
    | null;
};

type DoctorPatchBody = {
  full_name?: unknown;
  specialty_id?: unknown;
  email?: unknown;
  phone?: unknown;
  license_number?: unknown;
  active?: unknown;
};

const SELECT_DOCTOR = "id, full_name, email, phone, license_number, active, specialty_id, specialties(id, name)";

function mapDoctor(raw: RawDoctor): DoctorSummary {
  const specialty = Array.isArray(raw.specialties) ? raw.specialties[0] ?? null : raw.specialties;
  return {
    id: raw.id,
    full_name: raw.full_name,
    email: raw.email,
    phone: raw.phone,
    license_number: raw.license_number,
    active: raw.active,
    specialty_id: raw.specialty_id,
    specialty_name: specialty?.name ?? null,
  };
}

export async function PATCH(request: Request, context: RouteContext) {
  const authResult = await requireStaff();
  if (!authResult.ok) {
    return authResult.response;
  }

  const { id: idParam } = await context.params;
  const doctorId = parsePositiveInt(idParam);
  if (!doctorId) {
    return errorResponse(400, "El id de medico no es valido.");
  }

  let body: DoctorPatchBody;
  try {
    body = (await request.json()) as DoctorPatchBody;
  } catch {
    return errorResponse(400, "El cuerpo de la solicitud debe ser JSON valido.");
  }

  const updates: {
    full_name?: string;
    specialty_id?: number;
    email?: string | null;
    phone?: string | null;
    license_number?: string | null;
    active?: boolean;
  } = {};

  if (Object.prototype.hasOwnProperty.call(body, "full_name")) {
    const fullName = normalizeOptionalText(body.full_name, 120);
    if (!fullName) {
      return errorResponse(400, "full_name no puede estar vacio.");
    }
    updates.full_name = fullName;
  }

  if (Object.prototype.hasOwnProperty.call(body, "specialty_id")) {
    const specialtyId = parsePositiveInt(body.specialty_id);
    if (!specialtyId) {
      return errorResponse(400, "specialty_id debe ser un entero positivo.");
    }
    updates.specialty_id = specialtyId;
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

  if (Object.prototype.hasOwnProperty.call(body, "phone")) {
    updates.phone = normalizeOptionalText(body.phone, 30);
  }

  if (Object.prototype.hasOwnProperty.call(body, "license_number")) {
    updates.license_number = normalizeOptionalText(body.license_number, 40);
  }

  if (Object.prototype.hasOwnProperty.call(body, "active")) {
    const active = parseBoolean(body.active);
    if (active === null) {
      return errorResponse(400, "active debe ser true o false.");
    }
    updates.active = active;
  }

  if (Object.keys(updates).length === 0) {
    return errorResponse(400, "No se enviaron campos validos para actualizar.");
  }

  const { data: existing, error: existingError } = await authResult.context.supabase
    .from("doctors")
    .select("id")
    .eq("id", doctorId)
    .maybeSingle();

  if (existingError) {
    return errorResponse(500, "No se pudo validar el medico.", existingError.message);
  }
  if (!existing) {
    return errorResponse(404, "No existe el medico solicitado.");
  }

  if (updates.specialty_id) {
    const { data: specialty, error: specialtyError } = await authResult.context.supabase
      .from("specialties")
      .select("id")
      .eq("id", updates.specialty_id)
      .maybeSingle();

    if (specialtyError) {
      return errorResponse(500, "No se pudo validar la especialidad.", specialtyError.message);
    }
    if (!specialty) {
      return errorResponse(404, "No existe la especialidad indicada.");
    }
  }

  const { data, error } = await authResult.context.supabase
    .from("doctors")
    .update(updates)
    .eq("id", doctorId)
    .select(SELECT_DOCTOR)
    .single();

  if (error) {
    if (error.code === "23505") {
      return errorResponse(409, "Ya existe un medico con ese correo.");
    }
    return errorResponse(500, "No se pudo actualizar el medico.", error.message);
  }

  return successResponse(mapDoctor(data as RawDoctor));
}

export async function DELETE(_: Request, context: RouteContext) {
  const authResult = await requireStaff();
  if (!authResult.ok) {
    return authResult.response;
  }

  const { id: idParam } = await context.params;
  const doctorId = parsePositiveInt(idParam);
  if (!doctorId) {
    return errorResponse(400, "El id de medico no es valido.");
  }

  const { data: existing, error: existingError } = await authResult.context.supabase
    .from("doctors")
    .select("id")
    .eq("id", doctorId)
    .maybeSingle();

  if (existingError) {
    return errorResponse(500, "No se pudo validar el medico.", existingError.message);
  }
  if (!existing) {
    return errorResponse(404, "No existe el medico solicitado.");
  }

  const { error } = await authResult.context.supabase.from("doctors").delete().eq("id", doctorId);

  if (error) {
    if (error.code === "23503") {
      return errorResponse(409, "No se puede eliminar el medico porque tiene datos asociados.");
    }
    return errorResponse(500, "No se pudo eliminar el medico.", error.message);
  }

  return successResponse({ deleted: true, id: doctorId });
}
