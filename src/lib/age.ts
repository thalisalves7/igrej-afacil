// Age & age-band helpers (calculated live, never persisted)

export function calcAge(birthday?: string | null): number | null {
  if (!birthday) return null;
  const nasc = new Date(birthday);
  if (isNaN(nasc.getTime())) return null;
  const hoje = new Date();
  let age = hoje.getFullYear() - nasc.getFullYear();
  const m = hoje.getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) age--;
  return age < 0 ? null : age;
}

export type BandKey = "crianca" | "adolescente" | "jovem" | "adulto" | "idoso" | "sem_info";

export type Band = {
  key: BandKey;
  label: string;
  icon: string;
  color: string; // hex for bars
};

export const BANDS: Band[] = [
  { key: "crianca", label: "Crianças", icon: "👶", color: "#74b9ff" },
  { key: "adolescente", label: "Adolescentes", icon: "🧒", color: "#55efc4" },
  { key: "jovem", label: "Jovens", icon: "🙋", color: "#a29bfe" },
  { key: "adulto", label: "Adultos", icon: "👤", color: "#1a3a6c" },
  { key: "idoso", label: "Idosos", icon: "🧓", color: "#fdcb6e" },
  { key: "sem_info", label: "Sem info", icon: "❓", color: "#94a3b8" },
];

export function getBand(age: number | null): Band {
  if (age === null || age === undefined) return BANDS[5];
  if (age <= 11) return BANDS[0];
  if (age <= 15) return BANDS[1];
  if (age <= 24) return BANDS[2];
  if (age <= 59) return BANDS[3];
  return BANDS[4];
}

export function formatBirthdayLong(birthday: string): string {
  const d = new Date(birthday);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

// Is birthday today? (compares month + day)
export function isBirthdayToday(birthday?: string | null): boolean {
  if (!birthday) return false;
  const d = new Date(birthday);
  const t = new Date();
  return d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
}

// Is birthday in the current month?
export function isBirthdayThisMonth(birthday?: string | null): boolean {
  if (!birthday) return false;
  const d = new Date(birthday);
  const t = new Date();
  return d.getMonth() === t.getMonth();
}
