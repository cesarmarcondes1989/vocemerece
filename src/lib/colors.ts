/**
 * Cor do planeta pela energia. Começa num azul-nebulosa bonito (nunca cinza, nunca vermelho)
 * e vai "esquentando" até o verde. Ninguém fica com cara de apagado.
 */
export function energyColor(energy: number, greenAt: number) {
  const r = Math.max(0, Math.min(1, energy / Math.max(1, greenAt)));
  if (r >= 1) return "#3ee08f";
  const hue = 245 - r * 95;           // 245 (azul-violeta) -> 150 (verde-água)
  return `hsl(${hue} 80% ${62 + r * 6}%)`;
}

export const isGreen = (energy: number, greenAt: number) => energy >= greenAt;

/** Nível de quem joga, pelo XP doado. */
export function level(xp: number) {
  const tiers = [
    [0, "Cadete"], [10, "Piloto(a)"], [30, "Navegador(a)"], [60, "Capitã(o) Estelar"], [100, "Lenda da Galáxia"],
  ] as const;
  let cur: (typeof tiers)[number] = tiers[0];
  for (const t of tiers) if (xp >= t[0]) cur = t;
  const idx = tiers.indexOf(cur);
  const next = tiers[idx + 1];
  return { name: cur[1], n: idx + 1, next: next ? next[0] : null, base: cur[0] };
}
