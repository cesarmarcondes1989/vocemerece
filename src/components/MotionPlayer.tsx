"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

export type Slide = { key: string; duration: number; bg?: string; content: React.ReactNode };

export const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.6, ease: [0.2, 0.8, 0.2, 1] as const },
});

/** Player estilo stories: toque à direita avança, à esquerda volta, segurar pausa. O último slide fica parado. */
export default function MotionPlayer({ slides, videoName }: { slides: Slide[]; videoName?: string }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [run, setRun] = useState(0);                    // muda a key: reinicia todas as animações
  const rec = useVideoRecorder(videoName);
  const restart = useCallback(() => { setI(0); setPaused(false); setRun((r) => r + 1); }, []);
  const next = useCallback(() => setI((v) => Math.min(v + 1, slides.length - 1)), [slides.length]);
  const prev = useCallback(() => setI((v) => Math.max(v - 1, 0)), []);

  // gravando: ao chegar no último slide, segura 5s e encerra o vídeo
  useEffect(() => {
    if (rec.state !== "recording" || i !== slides.length - 1) return;
    const t = setTimeout(rec.stop, 5000);
    return () => clearTimeout(t);
  }, [rec.state, rec.stop, i, slides.length]);

  useEffect(() => {
    if (paused || i === slides.length - 1) return;
    const t = setTimeout(next, slides[i].duration);
    return () => clearTimeout(t);
  }, [i, paused, next, slides]);

  const slide = slides[i];
  return (
    <main className="fixed inset-0 select-none overflow-hidden"
      onPointerDown={() => rec.state !== "recording" && setPaused(true)}
      onPointerUp={(e) => { if (rec.state === "recording") return; setPaused(false); if ((e.target as HTMLElement).closest("a,button")) return; (e.clientX < window.innerWidth / 3 ? prev : next)(); }}>
      <div className="absolute inset-x-0 top-0 z-20 flex gap-1 p-3 pt-[max(env(safe-area-inset-top),12px)]">
        {slides.map((s, k) => (
          <div key={s.key} className="h-1 flex-1 overflow-hidden rounded bg-white/20">
            {(k < i || (k === i && k === slides.length - 1)) && <div className="h-full w-full bg-white" />}
            {k === i && k < slides.length - 1 && (
              <motion.div key={`${run}-${s.key}-bar`} className="h-full bg-white" initial={{ width: 0 }}
                animate={{ width: paused ? undefined : "100%" }} transition={{ duration: s.duration / 1000, ease: "linear" }} />
            )}
          </div>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.section key={`${run}-${slide.key}`} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
          {slide.bg && (
            <>
              <motion.img src={slide.bg} alt="" className="absolute inset-0 h-full w-full object-cover" initial={{ scale: 1.15 }} animate={{ scale: 1 }} transition={{ duration: slide.duration / 1000 }} />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
            </>
          )}
          <div className="relative mx-auto flex h-full max-w-xl flex-col items-center justify-center gap-5 px-7 py-20 text-center">{slide.content}</div>
        </motion.section>
      </AnimatePresence>
      {rec.supported && rec.state !== "recording" && (
        <button onClick={async () => { if (await rec.start()) restart(); }}
          className="absolute bottom-[max(env(safe-area-inset-bottom),16px)] right-4 z-30 rounded-full bg-black/60 px-4 py-2 text-sm backdrop-blur">
          {rec.state === "saving" ? "⏳ salvando…" : "🎥 Baixar vídeo"}
        </button>
      )}
      {rec.error && <p className="absolute bottom-16 right-4 z-30 max-w-xs rounded-xl bg-red-500/80 p-2 text-xs">{rec.error}</p>}
    </main>
  );
}

/**
 * Grava a própria aba (Screen Capture API) enquanto o filme toca e baixa MP4 (ou WebM, se o navegador
 * não gravar MP4). Funciona no Chrome/Edge do computador; no celular, use a gravação de tela do aparelho.
 */
function useVideoRecorder(name = "universo-2026") {
  const [state, setState] = useState<"idle" | "recording" | "saving">("idle");
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  // só no navegador (no servidor é sempre false): evita diferença de hidratação
  const supported = useSyncExternalStore(
    () => () => {},
    () => !!navigator.mediaDevices?.getDisplayMedia && typeof MediaRecorder !== "undefined" && !/Android|iPhone|iPad/i.test(navigator.userAgent),
    () => false,
  );

  const start = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 }, audio: false,
        // @ts-expect-error opções do Chrome para já sugerir "esta aba"
        preferCurrentTab: true, selfBrowserSurface: "include",
      });
      const mime = ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm"].find((m) => MediaRecorder.isTypeSupported(m)) ?? "";
      const r = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 });
      const chunks: Blob[] = [];
      r.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      r.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const type = (r.mimeType || mime).split(";")[0] || "video/webm";
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob(chunks, { type }));
        a.download = `${name}.${type.includes("mp4") ? "mp4" : "webm"}`;
        a.click();
        setState("idle");
      };
      stream.getVideoTracks()[0].addEventListener("ended", () => r.state === "recording" && r.stop());
      r.start(1000);
      recRef.current = r;
      setState("recording");
      return true;
    } catch {
      setError("Gravação cancelada. No compartilhamento, escolha “Esta aba”.");
      return false;
    }
  }, [name]);

  const stop = useCallback(() => {
    if (recRef.current?.state === "recording") { setState("saving"); recRef.current.stop(); }
  }, []);

  return { supported, state, error, start, stop };
}
