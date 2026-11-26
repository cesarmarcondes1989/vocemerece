"use client";
import { useEffect, useRef, useState } from "react";
import { browserDb } from "@/lib/supabase-browser";
import { STICKERS, TEXT_PROMPTS, type CometKind, type Planet } from "@/lib/types";
import Sheet from "./Sheet";

type Result = { status: "approved" | "review" | "rejected"; reason: string | null; suggestion: string | null } | null;
const MAX_AUDIO_S = 30;

/** Reduz a foto no próprio celular: upload mais rápido + moderação mais barata. */
async function downscale(file: File, max = 1600): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);   // canvas também remove EXIF/localização
  return new Promise((res) => c.toBlob((b) => res(b!), "image/jpeg", 0.85));
}

async function upload(blob: Blob, contentType: string): Promise<string> {
  const r = await fetch("/api/upload-url", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ contentType }) });
  if (!r.ok) throw new Error((await r.json()).error ?? "falha no upload");
  const { path, token } = await r.json();
  const { error } = await browserDb().storage.from("uploads").uploadToSignedUrl(path, token, blob, { contentType });
  if (error) throw error;
  return path;
}

export default function Composer({ target, onClose }: { target: Planet; onClose: () => void }) {
  const [tab, setTab] = useState<CometKind>("text");
  const [text, setText] = useState("");
  const [sticker, setSticker] = useState<string | null>(null);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [audio, setAudio] = useState<{ blob: Blob; type: string } | null>(null);
  const [recording, setRecording] = useState(0);
  const [capsule, setCapsule] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result>(null);
  const recRef = useRef<MediaRecorder | null>(null);

  useEffect(() => () => recRef.current?.stream.getTracks().forEach((t) => t.stop()), []);

  async function startRec() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const type = ["audio/webm", "audio/mp4", "audio/ogg"].find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
      const rec = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => chunks.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const base = (rec.mimeType || type || "audio/webm").split(";")[0];
        setAudio({ blob: new Blob(chunks, { type: base }), type: base });
        setRecording(0);
      };
      rec.start();
      recRef.current = rec;
      const t0 = Date.now();
      const tick = setInterval(() => {
        const s = Math.floor((Date.now() - t0) / 1000);
        if (rec.state !== "recording") return clearInterval(tick);
        setRecording(s + 1);
        if (s >= MAX_AUDIO_S) { rec.stop(); clearInterval(tick); }
      }, 250);
    } catch {
      setError("Não consegui acessar o microfone 🎙️");
    }
  }

  async function send(overrideText?: string) {
    setBusy(true); setError(null);
    try {
      let mediaPath: string | null = null, mediaType: string | null = null;
      if (tab === "photo" && photo) { mediaType = "image/jpeg"; mediaPath = await upload(photo, mediaType); }
      if (tab === "audio" && audio) { mediaType = audio.type; mediaPath = await upload(audio.blob, mediaType); }
      const body = overrideText ?? text;
      const r = await fetch("/api/messages", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ to: target.id, kind: tab, body: body || null, sticker, mediaPath, mediaType, capsule }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setResult(j);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Algo deu errado");
    } finally {
      setBusy(false);
    }
  }

  const ready = tab === "text" ? text.trim().length > 0 : tab === "sticker" ? !!sticker : tab === "photo" ? !!photo : !!audio;

  if (result)
    return (
      <Sheet title={`Para ${target.nickname}`} onClose={onClose}>
        {result.status === "approved" && <p className="py-6 text-center text-2xl">☄️ Cometa a caminho!<br /><span className="text-base text-muted">Olha ele cruzando o céu.</span></p>}
        {result.status === "review" && <p className="py-6 text-center text-lg">🛰️ Seu cometa está na alfândega galáctica.<br /><span className="text-sm text-muted">{result.reason}. Logo chega!</span></p>}
        {result.status === "rejected" && (
          <div className="space-y-4 py-2">
            <p className="text-lg">🫣 Esse cometa não decolou.</p>
            <p className="text-muted">{result.reason}</p>
            {result.suggestion && (
              <div className="rounded-2xl border border-accent/40 bg-accent/10 p-4">
                <p className="mb-2 text-sm text-accent">Que tal assim?</p>
                <p className="mb-3">“{result.suggestion}”</p>
                <button disabled={busy} onClick={() => { setText(result.suggestion!); setResult(null); setTab("text"); send(result.suggestion!); }}
                  className="rounded-full bg-accent px-4 py-2 font-semibold text-black">Mandar essa versão</button>
              </div>
            )}
            <button onClick={() => setResult(null)} className="text-sm underline">Escrever de novo</button>
          </div>
        )}
        {result.status !== "rejected" && <button onClick={onClose} className="w-full rounded-full bg-white/10 py-3">Voltar ao universo</button>}
      </Sheet>
    );

  return (
    <Sheet title={<>Cometa para <span style={{ color: target.color }}>{target.nickname}</span></>} onClose={onClose}>
      <div className="mb-4 grid grid-cols-4 gap-1 rounded-full bg-white/5 p-1 text-sm">
        {([["text", "✍️ Texto"], ["sticker", "✨ Sticker"], ["photo", "📸 Foto"], ["audio", "🎙️ Áudio"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`rounded-full py-2 ${tab === k ? "bg-white text-black font-semibold" : ""}`}>{l}</button>
        ))}
      </div>

      {tab === "text" && (
        <>
          <div className="mb-3 flex flex-wrap gap-2">
            {TEXT_PROMPTS.map((p) => (
              <button key={p} onClick={() => setText(p.replace("…", " "))} className="rounded-full border border-white/15 px-3 py-1 text-xs">{p}</button>
            ))}
          </div>
          <textarea value={text} onChange={(e) => setText(e.target.value.slice(0, 300))} rows={4} placeholder="Escreve com carinho (zoeira liberada 😄)"
            className="w-full rounded-2xl border border-white/10 bg-white/5 p-3 outline-none focus:border-accent" />
          <p className="text-right text-xs text-muted">{text.length}/300</p>
        </>
      )}

      {tab === "sticker" && (
        <div className="grid grid-cols-3 gap-2">
          {STICKERS.map((s) => (
            <button key={s.id} onClick={() => setSticker(s.id)}
              className={`rounded-2xl border p-3 text-center ${sticker === s.id ? "border-accent bg-accent/15" : "border-white/10"}`}>
              <div className="text-4xl">{s.emoji}</div><div className="mt-1 text-xs">{s.label}</div>
            </button>
          ))}
        </div>
      )}

      {tab === "photo" && (
        <div className="space-y-3">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={URL.createObjectURL(photo)} alt="prévia" className="max-h-72 w-full rounded-2xl object-contain" />
          ) : (
            <label className="block cursor-pointer rounded-2xl border border-dashed border-white/25 p-8 text-center">
              📸 Escolher ou tirar uma foto juntos
              <input type="file" accept="image/*" className="hidden"
                onChange={async (e) => { const f = e.target.files?.[0]; if (f) setPhoto(await downscale(f)); }} />
            </label>
          )}
          <input value={text} onChange={(e) => setText(e.target.value.slice(0, 300))} placeholder="Legenda (opcional)"
            className="w-full rounded-full border border-white/10 bg-white/5 px-4 py-2" />
          {photo && <button onClick={() => setPhoto(null)} className="text-sm underline">Trocar foto</button>}
        </div>
      )}

      {tab === "audio" && (
        <div className="space-y-3 text-center">
          {recording > 0 ? (
            <button onClick={() => recRef.current?.stop()} className="mx-auto block h-24 w-24 animate-pulse rounded-full bg-red-500 text-white">
              ■ {MAX_AUDIO_S - recording + 1}s
            </button>
          ) : audio ? (
            <>
              <audio controls src={URL.createObjectURL(audio.blob)} className="w-full" />
              <button onClick={() => setAudio(null)} className="text-sm underline">Gravar de novo</button>
            </>
          ) : (
            <button onClick={startRec} className="mx-auto block h-24 w-24 rounded-full bg-white/10 text-3xl">🎙️</button>
          )}
          <p className="text-xs text-muted">Até {MAX_AUDIO_S}s. Áudios passam por um gestor antes de chegar.</p>
        </div>
      )}

      <label className="mt-4 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={capsule} onChange={(e) => setCapsule(e.target.checked)} />
        🔒 Cápsula do tempo: só abre em dezembro de 2027
      </label>

      {error && <p className="mt-3 rounded-xl bg-red-500/15 p-3 text-sm text-red-200">{error}</p>}

      <button disabled={!ready || busy} onClick={() => send()}
        className="mt-4 w-full rounded-full bg-accent py-3 font-bold text-black disabled:opacity-40">
        {busy ? "Checando a rota… 🛰️" : "Lançar cometa ☄️"}
      </button>
    </Sheet>
  );
}
