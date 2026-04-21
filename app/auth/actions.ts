"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveHomePath } from "@/lib/auth/session";
import { AuthFormState } from "@/app/auth/form-state";
import { UserRole } from "@/lib/types";

function normalizeSafePath(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return null;
  }

  if (value === "/login" || value === "/registro") {
    return null;
  }

  return value;
}

async function getRoleFromProfile(userId: string): Promise<UserRole | null> {
  const supabase = await createSupabaseServerClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  return (profile?.role ?? null) as UserRole | null;
}

export async function signInAction(
  _: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const nextPath = normalizeSafePath(formData.get("next"));

  if (!email || !password) {
    return {
      error: "Email y password son obligatorios.",
      message: null,
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return {
      error: error?.message ?? "No se pudo iniciar sesión.",
      message: null,
    };
  }

  const role = await getRoleFromProfile(data.user.id);
  redirect(nextPath ?? resolveHomePath(role));
}

export async function signUpPatientAction(
  _: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!fullName || !email || !password) {
    return {
      error: "Nombre, email y password son obligatorios.",
      message: null,
    };
  }

  if (password.length < 8) {
    return {
      error: "El password debe tener al menos 8 caracteres.",
      message: null,
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  if (error) {
    return {
      error: error.message,
      message: null,
    };
  }

  if (data.session) {
    redirect("/mi-citas");
  }

  return {
    error: null,
    message: "Cuenta creada correctamente. Inicia sesión para continuar.",
  };
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}