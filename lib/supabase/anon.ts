import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env/public";

export function createSupabaseAnonClient() {
  return createClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    auth: {
      persistSession: false,
    },
  });
}
