import { randomUUID } from "node:crypto";
import { z } from "zod";
import { currentPerson } from "@/lib/session";
import { db } from "@/lib/supabase";

const Body = z.object({
  contentType: z.enum(["image/jpeg", "image/png", "image/webp", "audio/webm", "audio/mp4", "audio/mpeg", "audio/ogg"]),
});
const EXT: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
  "audio/webm": "webm", "audio/mp4": "m4a", "audio/mpeg": "mp3", "audio/ogg": "ogg",
};

// Upload vai direto do celular para o Supabase (fora do limite de body da Vercel), em quarentena.
export async function POST(req: Request) {
  const me = await currentPerson();
  if (!me) return Response.json({ error: "sem planeta" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "tipo de arquivo não suportado" }, { status: 400 });

  const path = `${me.id}/${randomUUID()}.${EXT[parsed.data.contentType]}`;
  const { data, error } = await db().storage.from("uploads").createSignedUploadUrl(path);
  if (error || !data) return Response.json({ error: "falha ao preparar upload" }, { status: 500 });
  return Response.json({ path: data.path, token: data.token });
}
