import { createClient } from "@supabase/supabase-js";
import { env } from "../config/env.js";

let cachedClient;

export function getSupabaseClient() {
  if (cachedClient) return cachedClient;

  if (!env.SUPABASE_URL) {
    throw new Error("Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) for backend runtime.");
  }

  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY for backend runtime. Add it to .env before starting API/pipeline.");
  }

  cachedClient = createClient(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    }
  );

  return cachedClient;
}
