import { requireAuth, requireStaff } from "@/lib/auth/session";
import { errorResponse, successResponse } from "@/lib/http";
import { DoctorSummary } from "@/lib/types";
import { normalizeOptionalText, parsePositiveInt, validateEmail } from "@/lib/validation";

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

type DoctorBody = {
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

export async function GET() {
  const authResult = await requireAuth();
  if (!authResult.ok) {
    return authResult.response;
  }

  const { data, error } = await authResult.context.supabase
    .from("doctors")
    .select(SELECT_DOCTOR)
    .order("full_name", { ascending: true });

  if (error) {
    return errorResponse(500, "No se pudieron listar medicos.", error.message);
  }

  return successResponse(((data ?? []) as RawDoctor[]).map(mapDoctor));
}

export async function POST(request: Request) {
  const authResult = await requireStaff();
  if (!authResult.ok) {
    return authResult.response;
  }

  let body: DoctorBody;
  try {
    body = (await request.json()) as DoctorBody;
  } catch {
    return errorResponse(400, "El cuerpo de la solicitud debe ser JSON valido.");
  }

  const fullName = normalizeOptionalText(body.full_name, 120);
  const specialtyId = parsePositiveInt(body.specialty_id);
  const email = body.email === undefined || body.email === null || body.email === "" ? null : validateEmail(body.email);
  const phone = normalizeOptionalText(body.phone, 30);
  const licenseNumber = normalizeOptionalText(body.license_number, 40);
  const active = typeof body.active === "boolean" ? body.active : true;

  if (!fullName || !specialtyId) {
    return errorResponse(400, "full_name y specialty_id son obligatorios.");
  }

  if (body.email && !email) {
    return errorResponse(400, "email no tiene un formato valido.");
  }

  const { data: specialty, error: specialtyError } = await authResult.context.supabase
    .from("specialties")
    .select("id")
    .eq("id", specialtyId)
    .maybeSingle();

  if (specialtyError) {
    return errorResponse(500, "No se pudo validar la especialidad.", specialtyError.message);
  }
  if (!specialty) {
    return errorResponse(404, "No existe la especialidad indicada.");
  }

  const { data, error } = await authResult.context.supabase
    .from("doctors")
    .insert({
      full_name: fullName,
      specialty_id: specialtyId,
      email,
      phone,
      license_number: licenseNumber,
      active,
    })
    .select(SELECT_DOCTOR)
    .single();

  if (error) {
    if (error.code === "23505") {
      return errorResponse(409, "Ya existe un medico con ese correo.");
    }
    return errorResponse(500, "No se pudo registrar el medico.", error.message);
  }

  return successResponse(mapDoctor(data as RawDoctor), 201);
}
