// Cargos ministeriais — apenas organização, NÃO permissões do app.
export type MinisterialRole =
  | "Pastor(a)"
  | "Missionário(a)"
  | "Evangelista"
  | "Presbítero"
  | "Diácono"
  | "Líder"
  | "Auxiliar"
  | "Membro"
  | "Visitante";

export const MINISTERIAL_ROLES: MinisterialRole[] = [
  "Pastor(a)",
  "Missionário(a)",
  "Evangelista",
  "Presbítero",
  "Diácono",
  "Líder",
  "Auxiliar",
  "Membro",
  "Visitante",
];

// tone keys map to existing semantic tokens (avoid hardcoded colors)
type Tone = {
  badge: string; // bg + text classes
  dot: string;
  emoji: string;
};

export const ROLE_TONES: Record<MinisterialRole, Tone> = {
  "Pastor(a)":     { badge: "bg-primary/15 text-primary border-primary/30",   dot: "bg-primary",     emoji: "⭐" },
  "Missionário(a)":{ badge: "bg-info/15 text-info border-info/30",            dot: "bg-info",        emoji: "🌍" },
  "Evangelista":   { badge: "bg-warning/15 text-warning border-warning/30",   dot: "bg-warning",     emoji: "🔥" },
  "Presbítero":    { badge: "bg-success/15 text-success border-success/30",   dot: "bg-success",     emoji: "🟢" },
  "Diácono":       { badge: "bg-wine/15 text-wine border-wine/30",            dot: "bg-wine",        emoji: "🍷" },
  "Líder":         { badge: "bg-accent/15 text-accent border-accent/30",      dot: "bg-accent",      emoji: "✨" },
  "Auxiliar":      { badge: "bg-muted/40 text-muted-foreground border-border",dot: "bg-muted",       emoji: "🤝" },
  "Membro":        { badge: "bg-surface-elevated text-foreground border-border", dot: "bg-foreground/40", emoji: "👤" },
  "Visitante":     { badge: "bg-surface-elevated text-muted-foreground border-border", dot: "bg-muted-foreground/40", emoji: "👋" },
};

export function roleTone(role?: string | null): Tone {
  if (!role) return ROLE_TONES["Membro"];
  return ROLE_TONES[role as MinisterialRole] ?? ROLE_TONES["Membro"];
}
