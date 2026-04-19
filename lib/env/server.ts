import "server-only";
import { getRequiredEnv } from "@/lib/env/shared";

export function getServerEnv() {
  return {
    supabaseUrl: getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    supabaseAnonKey: getRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    supabaseServiceRoleKey: getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
  };
}
