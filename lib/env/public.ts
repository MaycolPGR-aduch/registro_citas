import { getRequiredEnv } from "@/lib/env/shared";

export const publicEnv = {
  supabaseUrl: getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: getRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
};
