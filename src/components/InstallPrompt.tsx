import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "ig-install-dismissed";

export function InstallPrompt() {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [showIos, setShowIos] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(DISMISS_KEY) === "1") return;
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      // @ts-expect-error iOS
      window.navigator.standalone === true;
    if (standalone) return;

    const onBIP = (e: Event) => {
      e.preventDefault();
      setEvt(e as BIPEvent);
    };
    window.addEventListener("beforeinstallprompt", onBIP);

    // iOS fallback: Safari não dispara beforeinstallprompt
    const ua = window.navigator.userAgent;
    const isIos = /iPhone|iPad|iPod/i.test(ua) && !/CriOS|FxiOS/i.test(ua);
    if (isIos) {
      const t = window.setTimeout(() => setShowIos(true), 4000);
      return () => {
        window.removeEventListener("beforeinstallprompt", onBIP);
        window.clearTimeout(t);
      };
    }

    return () => window.removeEventListener("beforeinstallprompt", onBIP);
  }, []);

  const dismiss = () => {
    try { window.localStorage.setItem(DISMISS_KEY, "1"); } catch {}
    setEvt(null);
    setShowIos(false);
  };

  const install = async () => {
    if (!evt) return;
    await evt.prompt();
    await evt.userChoice;
    dismiss();
  };

  if (!evt && !showIos) return null;

  return (
    <div className="fixed bottom-24 left-1/2 z-40 w-[min(100%-1.5rem,28rem)] -translate-x-1/2">
      <div className="glass flex items-center gap-3 rounded-2xl px-4 py-3 shadow-[var(--shadow-soft)]">
        <span
          className="grid h-10 w-10 place-items-center rounded-xl text-primary-foreground"
          style={{ background: "var(--gradient-primary)" }}
        >
          <Download className="h-4 w-4" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Instalar Igreja Fácil</p>
          <p className="truncate text-xs text-muted-foreground">
            {showIos ? "No Safari: toque em Compartilhar → Adicionar à Tela de Início" : "Acesso rápido direto do celular."}
          </p>
        </div>
        {evt && (
          <button
            onClick={install}
            className="rounded-full px-4 py-2 text-xs font-semibold text-primary-foreground"
            style={{ background: "var(--gradient-primary)" }}
          >
            Instalar
          </button>
        )}
        <button onClick={dismiss} aria-label="Dispensar" className="rounded-full p-2 text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
