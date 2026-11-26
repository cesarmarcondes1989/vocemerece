import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/supabase";
import { cookieOptions, hashToken, SESSION_COOKIE, sessionValue } from "@/lib/session";

// O NFC abre /t/{token}. Trocamos o token por um cookie de sessão e acendemos o planeta.
export async function GET(req: NextRequest, ctx: RouteContext<"/t/[token]">) {
  const { token } = await ctx.params;
  const supa = db();
  const { data: person } = await supa
    .from("people")
    .select("id")
    .eq("token_hash", hashToken(token))
    .maybeSingle();

  if (!person) return NextResponse.redirect(new URL("/?erro=planeta-desconhecido", req.url));

  // Acende o planeta (só na primeira vez) -> Realtime avisa todo mundo
  await supa.from("planets").update({ lit_at: new Date().toISOString() }).eq("id", person.id).is("lit_at", null);

  const res = NextResponse.redirect(new URL("/eu", req.url));
  res.cookies.set(SESSION_COOKIE, sessionValue(person.id), cookieOptions);
  return res;
}
