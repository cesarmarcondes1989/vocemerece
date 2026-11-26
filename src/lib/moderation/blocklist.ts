// Camada 1: lista de bloqueio PT-BR. Rápida, grátis, pega o óbvio (inclusive "p0rr4", "f.d.p").
// Só entra aqui o que é inequívoco. Ambíguo ("puta trabalho", "bolo gostoso") fica para a IA.

const HARD = [
  "buceta", "xoxota", "xereca", "piroca", "pauzao", "boquete", "punheta", "siririca",
  "nude", "nudes", "porno", "porn", "xvideos", "pornhub", "onlyfans", "putaria", "transar", "foder", "fodase",
  "filhodaputa", "fdp", "vtnc", "vsf", "tnc", "pnc", "arrombado", "arrombada", "desgracado", "desgracada",
  "vagabunda", "vagabundo", "vadia", "piranha", "corno", "corna", "babaca", "escroto", "escrota",
  "viado", "viadinho", "bicha", "sapatao", "traveco", "retardado", "retardada", "mongoloide",
  "nazista", "hitler", "tomarnocu", "vaisefoder", "vaisefuder",
];

const LEET: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s", "!": "i" };

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")       // tira acentos
    .replace(/[0-9@$!]/g, (c) => LEET[c] ?? c)              // leetspeak
    .replace(/(.)\1{2,}/g, "$1$1");                          // "porrrraaa" -> "porraa"
}

/** Retorna o termo encontrado ou null. Checa palavras e também a versão "colada" (f.d.p -> fdp). */
export function blocklistHit(text: string): string | null {
  const norm = normalize(text);
  const words = norm.split(/[^a-z]+/).filter(Boolean);
  const squashed = norm.replace(/[^a-z]/g, "");
  const dedup = (w: string) => w.replace(/(.)\1+/g, "$1");
  for (const term of HARD) {
    if (words.some((w) => w === term || dedup(w) === term)) return term;
    if (term.length >= 6 && squashed.includes(term)) return term;   // "filho da puta" -> "filhodaputa"
  }
  // siglas soletradas: "f d p", "v s f"
  const letters = words.filter((w) => w.length === 1).join("");
  for (const sigla of ["fdp", "vsf", "vtnc", "tnc", "pnc"]) if (letters.includes(sigla)) return sigla;
  return null;
}
