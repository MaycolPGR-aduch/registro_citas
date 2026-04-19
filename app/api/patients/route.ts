import { errorResponse, successResponse } from "@/lib/http";
import { tryCreateSupabaseAdminClient } from "@/lib/supabase/admin";
import { PatientSummary } from "@/lib/types";
import { isValidIsoDate, normalizeOptionalText, validateEmail } from "@/lib/validation";

type PatientBody = {
  full_name?: unknown;
  dni?: unknown;
  birth_date?: unknown;
  phone?: unknown;
  email?: unknown;
};

const SELECT_PATIENT = "id, full_name, dni, birth_date, phone, email";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const queryText = normalizeOptionalText(searchParams.get("query"), 80);

  const admin = tryCreateSupabaseAdminClient();
  if (!admin.client) {
    return errorResponse(500, "Configuracion de servidor incompleta.", admin.error);
  }

  let query = admin.client.from("patients").select(SELECT_PATIENT).order("full_name", { ascending: true }).limit(200);

  if (queryText) {
    const escaped = queryText.replace(/,/g, "");
    query = query.or(`full_name.ilike.%${escaped}%,dni.ilike.%${escaped}%,email.ilike.%${escaped}%`);
  }

  const { data, error } = await query;
  if (error) {
    return errorResponse(500, "No se pudieron listar pacientes.", error.message);
  }

  return successResponse((data ?? []) as PatientSummary[]);
}

export async function POST(request: Request) {
  let body: PatientBody;
  try {
    body = (await request.json()) as PatientBody;
  } catch {
    return errorResponse(400, "El cuerpo de la solicitud debe ser JSON valido.");
  }

  const fullName = normalizeOptionalText(body.full_name, 120);
  if (!fullName) {
    return errorResponse(400, "full_name es obligatorio.");
  }

  const dni = normalizeOptionalText(body.dni, 20);
  const phone = normalizeOptionalText(body.phone, 30);
  const email = body.email === undefined || body.email === null || body.email === "" ? null : validateEmail(body.email);
  const birthDate = body.birth_date === undefined || body.birth_date === null || body.birth_date === ""
    ? null
    : body.birth_date;

  if (body.email && !email) {
    return errorResponse(400, "email no tiene un formato valido.");
  }

  if (birthDate && !isValidIsoDate(birthDate)) {
    return errorResponse(400, "birth_date debe tener formato YYYY-MM-DD.");
  }

  const admin = tryCreateSupabaseAdminClient();
  if (!admin.client) {
    return errorResponse(500, "Configuracion de servidor incompleta.", admin.error);
  }

  const { data, error } = await admin.client
    .from("patients")
    .insert({
      full_name: fullName,
      dni,
      birth_date: birthDate,
      phone,
      email,
    })
    .select(SELECT_PATIENT)
    .single();

  if (error) {
    if (error.code === "23505") {
      return errorResponse(409, "Ya existe un paciente con el mismo DNI o correo.");
    }
    return errorResponse(500, "No se pudo registrar el paciente.", error.message);
  }

  return successResponse(data as PatientSummary, 201);
}
