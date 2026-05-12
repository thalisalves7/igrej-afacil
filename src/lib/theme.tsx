import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type ThemeName = "gold" | "blue" | "green" | "wine" | "brown" | "black" | "pink";

export const THEMES: { id: ThemeName; label: string; swatch: string }[] = [
  { id: "gold", label: "Dourado", swatch: "oklch(0.82 0.14 85)" },
  { id: "blue", label: "Azul", swatch: "oklch(0.7 0.17 250)" },
  { id: "green", label: "Verde", swatch: "oklch(0.74 0.16 155)" },
  { id: "wine", label: "Vinho", swatch: "oklch(0.55 0.17 15)" },
  { id: "brown", label: "Marrom", swatch: "oklch(0.6 0.08 55)" },
  { id: "black", label: "Preto", swatch: "oklch(0.92 0.005 260)" },
  { id: "pink", label: "Rosa", swatch: "oklch(0.75 0.17 0)" },
];

type Ctx = { theme: ThemeName; setTheme: (t: ThemeName) => void };
const ThemeCtx = createContext<Ctx>({ theme: "gold", setTheme: () => {} });

const STORAGE_KEY = "igreja-facil-theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>("gold");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(STORAGE_KEY) as ThemeName | null;
    if (saved && THEMES.find((t) => t.id === saved)) {
      setThemeState(saved);
    }
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.classList.add("dark");
  }, [theme]);

  const setTheme = (t: ThemeName) => {
    setThemeState(t);
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, t);
  };

  return <ThemeCtx.Provider value={{ theme, setTheme }}>{children}</ThemeCtx.Provider>;
}

export const useTheme = () => useContext(ThemeCtx);
