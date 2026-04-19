import "server-only";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getServerEnv } from "@/lib/env/server";

export function createSupabaseAdminClient() {
  const env = getServerEnv();
  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function tryCreateSupabaseAdminClient():
  | { client: SupabaseClient; error: null }
  | { client: null; error: string } {
  try {
    return { client: createSupabaseAdminClient(), error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo inicializar el cliente de Supabase.";
    return { client: null, error: message };
  }
}
