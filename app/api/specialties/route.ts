import { requireAuth, requireStaff } from "@/lib/auth/session";
import { errorResponse, successResponse } from "@/lib/http";
import { SpecialtySummary } from "@/lib/types";
import { normalizeOptionalText } from "@/lib/validation";

type SpecialtyBody = {
  name?: unknown;
  description?: unknown;
};

export async function GET() {
  const authResult = await requireAuth();
  if (!authResult.ok) {
    return authResult.response;
  }

  const { data, error } = await authResult.context.supabase
    .from("specialties")
    .select("id, name, description")
    .order("name", { ascending: true });

  if (error) {
    return errorResponse(500, "No se pudieron listar especialidades.", error.message);
  }

  return successResponse((data ?? []) as SpecialtySummary[]);
}

export async function POST(request: Request) {
  const authResult = await requireStaff();
  if (!authResult.ok) {
    return authResult.response;
  }

  let body: SpecialtyBody;
  try {
    body = (await request.json()) as SpecialtyBody;
  } catch {
    return errorResponse(400, "El cuerpo de la solicitud debe ser JSON valido.");
  }

  const name = normalizeOptionalText(body.name, 100);
  const description = normalizeOptionalText(body.description, 500);

  if (!name) {
    return errorResponse(400, "name es obligatorio.");
  }

  const { data, error } = await authResult.context.supabase
    .from("specialties")
    .insert({ name, description })
    .select("id, name, description")
    .single();

  if (error) {
    if (error.code === "23505") {
      return errorResponse(409, "Ya existe una especialidad con ese nombre.");
    }
    return errorResponse(500, "No se pudo registrar la especialidad.", error.message);
  }

  return successResponse(data as SpecialtySummary, 201);
}
