import "server-only";
import { User } from "@supabase/supabase-js";
import { errorResponse } from "@/lib/http";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ProfileSummary, UserRole } from "@/lib/types";

type AuthContext = {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  user: User | null;
  profile: ProfileSummary | null;
  patientId: number | null;
};

export function isStaffRole(role: UserRole | null | undefined): role is "admin" | "receptionist" {
  return role === "admin" || role === "receptionist";
}

export function resolveHomePath(role: UserRole | null | undefined): string {
  return role === "patient" ? "/mi-citas" : "/";
}

export async function getAuthContext(): Promise<AuthContext> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      supabase,
      user: null,
      profile: null,
      patientId: null,
    };
  }

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .eq("id", user.id)
    .maybeSingle();

  const profile = (profileRow ?? null) as ProfileSummary | null;

  const { data: patientRow } = await supabase
    .from("patients")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();

  return {
    supabase,
    user,
    profile,
    patientId: patientRow?.id ?? null,
  };
}

export async function requireAuth() {
  const context = await getAuthContext();
  if (!context.user || !context.profile) {
    return {
      ok: false as const,
      response: errorResponse(401, "No autenticado."),
    };
  }

  return {
    ok: true as const,
    context: {
      ...context,
      user: context.user,
      profile: context.profile,
    },
  };
}

export async function requireRole(allowedRoles: UserRole[]) {
  const authResult = await requireAuth();
  if (!authResult.ok) {
    return authResult;
  }

  if (!allowedRoles.includes(authResult.context.profile.role)) {
    return {
      ok: false as const,
      response: errorResponse(403, "No autorizado."),
    };
  }

  return authResult;
}

export async function requireStaff() {
  const authResult = await requireAuth();
  if (!authResult.ok) {
    return authResult;
  }

  if (!isStaffRole(authResult.context.profile.role)) {
    return {
      ok: false as const,
      response: errorResponse(403, "Solo personal autorizado."),
    };
  }

  return authResult;
}

export async function requirePatient() {
  const authResult = await requireAuth();
  if (!authResult.ok) {
    return authResult;
  }

  if (authResult.context.profile.role !== "patient") {
    return {
      ok: false as const,
      response: errorResponse(403, "Solo pacientes."),
    };
  }

  if (!authResult.context.patientId) {
    return {
      ok: false as const,
      response: errorResponse(403, "No existe perfil de paciente asociado."),
    };
  }

  return authResult;
}
