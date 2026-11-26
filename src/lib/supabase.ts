import "server-only";
import { createClient } from "@supabase/supabase-js";

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Variável de ambiente ausente: ${name}`);
  return v;
}

/** Cliente com service role — SÓ no servidor. Ignora RLS. */
export function db() {
  return createClient(
    required("NEXT_PUBLIC_SUPABASE_URL"),
    required("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export async function signedUrl(bucket: string, path: string | null | undefined, seconds = 60 * 60) {
  if (!path) return null;
  const { data } = await db().storage.from(bucket).createSignedUrl(path, seconds);
  return data?.signedUrl ?? null;
}
