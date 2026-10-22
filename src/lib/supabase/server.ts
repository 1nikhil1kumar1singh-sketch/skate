import { createClient } from "@supabase/supabase-js";
import { config } from "@/lib/config";

/** Server client for verifying access tokens (no cookie jar required). */
export function getSupabaseServer() {
  if (!config.supabaseConfigured) return null;
  return createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
