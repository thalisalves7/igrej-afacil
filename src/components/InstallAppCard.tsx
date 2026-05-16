import { useEffect, useState } from "react";
import { Download, Smartphone, Check, Share2 } from "lucide-react";
import { feedback } from "@/lib/feedback";
import { toast } from "sonner";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallAppCard() {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      // @ts-expect-error iOS
      window.navigator.standalone === true;
    if (standalone) setInstalled(true);

    const ua = window.navigator.userAgent;
    setIsIos(/iPhone|iPad|iPod/i.test(ua) && !/CriOS|FxiOS/i.test(ua));

    const onBIP = (e: Event) => {
      e.preventDefault();
      setEvt(e as BIPEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onBIP);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = async () => {
    feedback("tap");
    if (!evt) {
      if (isIos) {
        toast.info("No Safari: toque em Compartilhar → Adicionar à Tela de Início.", { duration: 5000 });
      } else {
        toast.info("Abra o menu do navegador e escolha 'Instalar aplicativo'.", { duration: 4500 });
      }
      return;
    }
    await evt.prompt();
    const choice = await evt.userChoice;
    if (choice.outcome === "accepted") {
      feedback("success");
      setEvt(null);
    }
  };

  if (installed) {
    return (
      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Aplicativo</h2>
        <div className="neu-card flex items-center gap-3 p-4">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">
            <Check className="h-4 w-4" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold">Aplicativo instalado</p>
            <p className="text-xs text-muted-foreground">Você já está usando o Igreja Fácil instalado.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-6">
      <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Instalar Aplicativo</h2>
      <div className="neu-card relative overflow-hidden p-5">
        <div
          aria-hidden
          className="absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-30 blur-3xl animate-pulse-glow"
          style={{ background: "var(--gradient-primary)" }}
        />
        <div className="relative flex items-start gap-3">
          <span
            className="grid h-12 w-12 place-items-center rounded-2xl text-primary-foreground"
            style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
          >
            <Smartphone className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <p className="text-base font-semibold">Tenha o Igreja Fácil no celular</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Acesso direto da tela inicial, em tela cheia, com o ícone oficial do seu tema.
            </p>
          </div>
        </div>

        <button
          onClick={install}
          className="group relative mt-5 flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl px-5 py-4 text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.98]"
          style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
        >
          <span
            aria-hidden
            className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full"
          />
          {isIos && !evt ? <Share2 className="h-4 w-4" /> : <Download className="h-4 w-4" />}
          Baixar App
        </button>

        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1"><Check className="h-3 w-3 text-primary" /> Android</span>
          <span className="inline-flex items-center gap-1"><Check className="h-3 w-3 text-primary" /> iPhone</span>
          <span className="inline-flex items-center gap-1"><Check className="h-3 w-3 text-primary" /> Desktop</span>
        </div>
      </div>
    </section>
  );
}
