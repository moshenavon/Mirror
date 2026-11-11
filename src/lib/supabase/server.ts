import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";
import type { Database } from "./database.types";
import { getSupabaseEnv } from "./env";
import { mintSupabaseToken } from "./jwt";

const noSession = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };

/**
 * Supabase client acting as the signed-in user (RLS applies), or as `anon`
 * when there is no valid session.
 */
export async function createClient() {
  const { url, key } = getSupabaseEnv();
  const user = await verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!user) return createSupabaseClient<Database>(url, key, noSession);

  const token = await mintSupabaseToken({ sub: user.id, email: user.email, role: "authenticated" });
  return createSupabaseClient<Database>(url, key, { accessToken: async () => token });
}

/** Anonymous client (role `anon`) – used by the public submission link. */
export function createAnonClient() {
  const { url, key } = getSupabaseEnv();
  return createSupabaseClient<Database>(url, key, noSession);
}

/** Privileged client – only for the login callback (profile upsert). */
export async function createServiceClient() {
  const { url, key } = getSupabaseEnv();
  const token = await mintSupabaseToken({ role: "service_role" }, { ttlSeconds: 60 });
  return createSupabaseClient<Database>(url, key, { accessToken: async () => token });
}
