import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getEnv } from "./env.js";

let anonClient: SupabaseClient | null = null;
let serviceClient: SupabaseClient | null = null;

/** Anon client — used to verify user JWTs via auth.getUser(token). */
export function getSupabaseAnon(): SupabaseClient {
  if (anonClient) return anonClient;
  const env = getEnv();
  anonClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  return anonClient;
}

/** Service-role client — bypasses RLS for trusted backend operations. */
export function getSupabaseAdmin(): SupabaseClient {
  if (serviceClient) return serviceClient;
  const env = getEnv();
  serviceClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  return serviceClient;
}
