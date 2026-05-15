import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type ThemeName = "gold" | "blue" | "green" | "wine" | "brown" | "black" | "pink";

type ThemeMeta = {
  id: ThemeName;
  label: string;
  swatch: string;
  /** Cores hex usadas para favicon e theme-color (renderização fora do CSS). */
  hex: { from: string; to: string; bg: string };
};

export const THEMES: ThemeMeta[] = [
  { id: "gold",  label: "Dourado Ministerial", swatch: "oklch(0.82 0.14 85)",  hex: { from: "#f4c95d", to: "#e8a93a", bg: "#0b0b14" } },
  { id: "blue",  label: "Azul Premium",        swatch: "oklch(0.7 0.17 250)",  hex: { from: "#7aa6ff", to: "#4f7cff", bg: "#0b0b14" } },
  { id: "green", label: "Verde Esperança",     swatch: "oklch(0.74 0.16 155)", hex: { from: "#7be0b1", to: "#3fbf85", bg: "#0b0b14" } },
  { id: "wine",  label: "Vinho Elegante",      swatch: "oklch(0.55 0.17 15)",  hex: { from: "#c64a55", to: "#8a2434", bg: "#0b0b14" } },
  { id: "brown", label: "Marrom Clássico",     swatch: "oklch(0.6 0.08 55)",   hex: { from: "#c69a73", to: "#8a6442", bg: "#0b0b14" } },
  { id: "black", label: "Preto Premium",       swatch: "oklch(0.92 0.005 260)",hex: { from: "#e8e8ee", to: "#a8a8b3", bg: "#0b0b14" } },
  { id: "pink",  label: "Rosa Suave",          swatch: "oklch(0.75 0.17 0)",   hex: { from: "#ff9ec0", to: "#ec5f9a", bg: "#0b0b14" } },
];

type Ctx = { theme: ThemeName; setTheme: (t: ThemeName) => void; meta: ThemeMeta };
const ThemeCtx = createContext<Ctx>({ theme: "gold", setTheme: () => {}, meta: THEMES[0] });

const STORAGE_KEY = "igreja-facil-theme";

function buildIconSvg(from: string, to: string, bg: string) {
  return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>
<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
<stop offset='0%' stop-color='${from}'/><stop offset='100%' stop-color='${to}'/>
</linearGradient></defs>
<rect width='64' height='64' rx='14' fill='${bg}'/>
<g fill='url(#g)'>
<rect x='30' y='10' width='4' height='14' rx='1.2'/>
<rect x='25' y='14' width='14' height='4' rx='1.2'/>
<path d='M32 22 L13 36 V55 H51 V36 Z'/>
</g>
<path d='M28 55 V46 a4 4 0 0 1 8 0 V55 Z' fill='${bg}'/>
<circle cx='20' cy='44' r='2' fill='${bg}'/>
<circle cx='44' cy='44' r='2' fill='${bg}'/>
</svg>`;
}

function applyFavicon(meta: ThemeMeta) {
  if (typeof document === "undefined") return;
  const svg = buildIconSvg(meta.hex.from, meta.hex.to, meta.hex.bg);
  const href = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

  // Substitui (ou cria) ícone dinâmico
  let link = document.querySelector<HTMLLinkElement>('link[data-dynamic-icon="1"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    link.type = "image/svg+xml";
    link.dataset.dynamicIcon = "1";
    document.head.appendChild(link);
  }
  link.href = href;

  // theme-color
  let tc = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!tc) {
    tc = document.createElement("meta");
    tc.name = "theme-color";
    document.head.appendChild(tc);
  }
  tc.content = meta.hex.bg;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>("gold");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(STORAGE_KEY) as ThemeName | null;
    if (saved && THEMES.find((t) => t.id === saved)) setThemeState(saved);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.classList.add("dark");
    const meta = THEMES.find((t) => t.id === theme) ?? THEMES[0];
    applyFavicon(meta);
  }, [theme]);

  const setTheme = (t: ThemeName) => {
    setThemeState(t);
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, t);
  };

  const meta = THEMES.find((t) => t.id === theme) ?? THEMES[0];
  return <ThemeCtx.Provider value={{ theme, setTheme, meta }}>{children}</ThemeCtx.Provider>;
}

export const useTheme = () => useContext(ThemeCtx);
