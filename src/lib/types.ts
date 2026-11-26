export type Story = {
  headline?: string;                                   // "Seu 2026 foi de foguete"
  moments?: { title: string; text: string; photo?: string }[];
  numbers?: { value: string; label: string }[];
  words?: string[];                                    // 3 palavras
  quotes?: { text: string; from: string }[];           // o que o time diz
  thanks?: string;                                     // agradecimento + 2027
};

export type Person = {
  id: string;
  slug: string;
  name: string;
  nickname: string;
  is_moderator: boolean;
  story: Story;
  consent_at: string | null;
  photo_path: string | null;
};

export type Planet = {
  id: string;
  nickname: string;
  color: string;
  x: number;
  y: number;
  size: number;
  lit_at: string | null;
  energy: number;    // energia recebida (com teto por remetente) -> cor
  received: number;  // total recebido -> Sol do Time
  senders: number;
  xp: number;        // XP doado
  visited: number;   // planetas visitados -> Explorador(a) Intergaláctico(a)
};

export type GamePhase = "lobby" | "playing" | "capsule" | "finale";
export type Game = {
  phase: GamePhase;
  green_at: number;
  sender_cap: number;
  started_at: string | null;
  all_green_at: string | null;
  finale_at: string | null;
  stats: GameStats | null;
};

export type GameStats = {
  people: number;
  totals: { all: number; reaction: number; comment: number; text: number; sticker: number; photo: number };
  pairs: number;              // pares de pessoas que se conectaram
  connectedPct: number;       // % das conexões possíveis
  minutes: number;            // duração do jogo
  explorer: { id: string; nickname: string; visited: number } | null;
  sun: { id: string; nickname: string; received: number } | null;
  topGivers: { nickname: string; xp: number }[];
  highlights: string[];       // trechos anônimos escolhidos pela IA
  themes: string[];           // palavras/temas que mais apareceram
  headline: string;
};

export type ProfileItem = { id: string; text: string; emoji: string; status?: string };

export type Comet = { id: string; from_id: string; to_id: string; created_at: string };

export type CometKind = "text" | "sticker" | "photo" | "audio" | "reaction" | "comment";

/** Reações rápidas nos itens do perfil (sem moderação: não têm texto). */
export const REACTIONS = ["❤️", "🔥", "👏", "😂", "🚀", "🤯"] as const;

/** Stickers curados: sem texto livre = sem risco. Linguagem neutra de gênero. */
export const STICKERS = [
  { id: "foguete", emoji: "🚀", label: "Foguete do ano" },
  { id: "cafe", emoji: "☕", label: "Parceria de café" },
  { id: "cerebro", emoji: "🧠", label: "Cérebro do time" },
  { id: "salvou", emoji: "🛟", label: "Salvou meu dia" },
  { id: "zoeira", emoji: "😂", label: "Lenda da zoeira" },
  { id: "brilhou", emoji: "🌟", label: "Brilhou demais" },
  { id: "calma", emoji: "🧘", label: "Paz no caos" },
  { id: "abraco", emoji: "🤗", label: "Abraço apertado" },
  { id: "bug", emoji: "🐛", label: "Caçador(a) de bugs" },
  { id: "dj", emoji: "🎧", label: "Trilha sonora do time" },
  { id: "planta", emoji: "🌱", label: "Cresceu muito" },
  { id: "2027", emoji: "🪐", label: "Bora 2027 junto" },
] as const;

export const TEXT_PROMPTS = [
  "Obrigado(a) por…",
  "Aprendi com você que…",
  "Meu momento favorito com você em 2026 foi…",
  "Em 2027 eu quero…",
  "Você é a pessoa que…",
];
