"use server";
import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { draftStory } from "@/lib/draft";
import { slotFor, slugify, tokenFor } from "@/lib/people";
import { currentModerator } from "@/lib/session";
import { db } from "@/lib/supabase";
import type { Story } from "@/lib/types";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

async function uploadPhoto(slug: string, name: string, file: FormDataEntryValue | null): Promise<string | null> {
  if (!(file instanceof File) || file.size === 0) return null;
  const path = `${slug}/${name}-${Date.now()}.jpg`;
  const { error } = await db().storage.from("stories").upload(path, Buffer.from(await file.arrayBuffer()), { contentType: "image/jpeg", upsert: true });
  if (error) throw new Error(`Falha ao subir foto: ${error.message}`);
  return path;
}

export type SaveResult = { ok: true; slug: string } | { ok: false; error: string };

export async function savePerson(f: FormData): Promise<SaveResult> {
  if (!(await currentModerator())) return { ok: false, error: "sem permissão" };
  try {
    const supa = db();
    const id = str(f, "id") || null;
    const name = str(f, "name");
    const nickname = str(f, "nickname") || name.split(" ")[0];
    if (!name) return { ok: false, error: "Nome é obrigatório" };

    let slug = str(f, "slug");
    if (!id) {
      slug = slugify(slug || name);
      const { data: taken } = await supa.from("people").select("id").eq("slug", slug).maybeSingle();
      if (taken) slug = `${slug}-${Math.random().toString(36).slice(2, 5)}`;
    }

    const moments = [0, 1, 2].map((i) => ({ title: str(f, `m${i}_title`), text: str(f, `m${i}_text`), photo: str(f, `m${i}_photo_keep`) || undefined }))
      .filter((m) => m.title || m.text);
    for (const [i, m] of moments.entries()) {
      const up = await uploadPhoto(slug, `momento${i}`, f.get(`m${i}_photo`));
      if (up) m.photo = up;
    }
    const story: Story = {
      headline: str(f, "headline") || undefined,
      moments,
      numbers: [0, 1, 2].map((i) => ({ value: str(f, `n${i}_value`), label: str(f, `n${i}_label`) })).filter((n) => n.value && n.label),
      words: [0, 1, 2].map((i) => str(f, `w${i}`)).filter(Boolean),
      quotes: [0, 1].map((i) => ({ text: str(f, `q${i}_text`), from: str(f, `q${i}_from`) })).filter((q) => q.text),
      thanks: str(f, "thanks") || undefined,
    };
    const photo = (await uploadPhoto(slug, "perfil", f.get("photo"))) ?? (str(f, "photo_keep") || null);

    const row = { name, nickname, is_moderator: f.get("is_moderator") === "on", story, photo_path: photo };
    if (id) {
      const { error } = await supa.from("people").update(row).eq("id", id);
      if (error) return { ok: false, error: error.message };
      await supa.from("planets").update({ nickname }).eq("id", id);
    } else {
      const token_hash = createHash("sha256").update(tokenFor(slug)).digest("hex");
      const { data, error } = await supa.from("people").insert({ ...row, slug, token_hash }).select("id").single();
      if (error || !data) return { ok: false, error: error?.message ?? "falha ao criar" };
      const { count } = await supa.from("planets").select("id", { count: "exact", head: true });
      const s = slotFor(count ?? 0);
      await supa.from("planets").insert({ id: data.id, nickname, color: s.color, x: s.x, y: s.y });
    }
    revalidatePath("/admin/pessoas");
    return { ok: true, slug };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "erro inesperado" };
  }
}

export async function deletePerson(f: FormData) {
  if (!(await currentModerator())) throw new Error("sem permissão");
  await db().from("people").delete().eq("id", str(f, "id"));   // cascata: planeta, mensagens, cápsula
  revalidatePath("/admin/pessoas");
}

export async function draftFromNotes(name: string, nickname: string, notes: string): Promise<{ story: Story | null; error?: string }> {
  if (!(await currentModerator())) return { story: null, error: "sem permissão" };
  if (notes.trim().length < 20) return { story: null, error: "Escreve um pouco mais nas notas (mín. 20 caracteres)" };
  try {
    return { story: await draftStory(name, nickname, notes) };
  } catch (e) {
    console.error("[draft]", e);
    return { story: null, error: "A IA não respondeu. Confere a ANTHROPIC_API_KEY na Vercel." };
  }
}
