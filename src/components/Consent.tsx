"use client";
import { useState } from "react";
import Sheet from "./Sheet";

export default function Consent({ onDone, onClose }: { onDone: () => void; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <Sheet title="Antes do primeiro cometa ☄️" onClose={onClose}>
      <ul className="mb-5 space-y-3 text-sm text-ink/90">
        <li>💛 <b>Aqui é lugar de carinho.</b> Zoeira pode, desrespeito não.</li>
        <li>🛡️ Todo comentário, mensagem e foto passa por uma checagem automática. Na dúvida, um gestor dá uma olhada antes de entregar.</li>
        <li>📸 Só mande fotos em que todo mundo que aparece toparia aparecer.</li>
        <li>🎬 No filme final do time podem aparecer <b>trechos anônimos</b> de elogios (sem nome de quem mandou nem de quem recebeu).</li>
        <li>🗑️ Fotos são apagadas em março de 2027. Quem recebe pode ocultar ou denunciar qualquer cometa.</li>
      </ul>
      <button disabled={busy} onClick={async () => { setBusy(true); await fetch("/api/consent", { method: "POST" }); onDone(); }}
        className="w-full rounded-full bg-accent py-3 font-bold text-black disabled:opacity-50">Combinado!</button>
    </Sheet>
  );
}
