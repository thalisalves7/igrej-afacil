import { createFileRoute, Link } from "@tanstack/react-router";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import {
  ArrowRight,
  Users,
  LineChart,
  Building2,
  Bell,
  Sparkles,
  Check,
  Wallet,
  Calendar,
  Shield,
} from "lucide-react";
import mockupDashboard from "@/assets/mockup-dashboard.jpg";
import mockupFinance from "@/assets/mockup-finance.jpg";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <BackgroundFX />
      <Nav />
      <Hero />
      <Logos />
      <Features />
      <FinanceShowcase />
      <Alerts />
      <CtaBlock />
      <Footer />
    </div>
  );
}

function BackgroundFX() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
      <div
        className="absolute inset-0 opacity-90"
        style={{ background: "var(--gradient-hero)" }}
      />
      <div className="absolute -top-40 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full blur-3xl opacity-30"
        style={{ background: "var(--gradient-primary)" }}
      />
    </div>
  );
}

function Nav() {
  return (
    <header className="sticky top-0 z-40">
      <div className="mx-auto max-w-7xl px-6 py-4">
        <div className="glass flex items-center justify-between rounded-2xl px-4 py-2.5">
          <Link to="/" className="flex items-center gap-2">
            <Logo size={28} />
            <span className="font-semibold tracking-tight">Igreja Fácil</span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
            <a href="#recursos" className="hover:text-foreground transition-colors">Recursos</a>
            <a href="#financeiro" className="hover:text-foreground transition-colors">Financeiro</a>
            <a href="#alertas" className="hover:text-foreground transition-colors">Alertas</a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeSwitcher />
            <Link
              to="/auth"
              className="hidden h-10 items-center rounded-full border border-border px-4 text-sm font-medium text-foreground/90 transition-colors hover:border-primary/50 sm:inline-flex"
            >
              Entrar
            </Link>
            <Link
              to="/auth"
              className="inline-flex h-10 items-center rounded-full px-4 text-sm font-semibold text-primary-foreground"
              style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
            >
              Criar conta
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative mx-auto max-w-7xl px-6 pt-16 pb-24 md:pt-24 md:pb-32">
      <div className="mx-auto max-w-3xl text-center">
        <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-glow" />
          Nova era da gestão ministerial
        </div>
        <h1 className="text-balance text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl">
          Menos burocracia.
          <br />
          <span className="text-gradient">Mais ministério.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-pretty text-base text-muted-foreground md:text-lg">
          Organize sua igreja, acompanhe finanças, membros e filiais em um único
          sistema simples, moderno e feito para liderança pastoral.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/auth"
            className="group inline-flex h-12 items-center gap-2 rounded-full px-6 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02]"
            style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
          >
            Criar conta grátis
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            to="/auth"
            className="inline-flex h-12 items-center rounded-full border border-border bg-surface/60 px-6 text-sm font-medium text-foreground backdrop-blur transition-colors hover:border-primary/40"
          >
            Entrar
          </Link>
        </div>
        <div className="mt-6 flex items-center justify-center gap-5 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-primary" /> Sem cartão</span>
          <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-primary" /> Multi-igreja</span>
          <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-primary" /> Mobile first</span>
        </div>
      </div>

      <div className="relative mx-auto mt-20 max-w-4xl">
        <div className="absolute inset-0 -z-10 mx-auto h-[80%] w-[80%] translate-y-12 rounded-[3rem] blur-3xl opacity-50"
          style={{ background: "var(--gradient-primary)" }}
        />
        <div className="neu-card overflow-hidden p-2 md:p-3">
          <img
            src={mockupDashboard}
            alt="Dashboard Igreja Fácil"
            width={1280}
            height={1280}
            className="w-full rounded-[1.5rem] object-cover animate-float"
          />
        </div>
      </div>
    </section>
  );
}

function Logos() {
  return (
    <section className="mx-auto max-w-5xl px-6 pb-16">
      <p className="mb-6 text-center text-xs uppercase tracking-[0.2em] text-muted-foreground">
        Pensado para igrejas de todos os tamanhos
      </p>
      <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-sm text-muted-foreground/70">
        <span>Matriz</span><span>•</span><span>Filiais</span><span>•</span>
        <span>Congregações</span><span>•</span><span>Ministérios</span><span>•</span>
        <span>Células</span>
      </div>
    </section>
  );
}

function Features() {
  const items = [
    { icon: Users, title: "Gestão de membros", desc: "Visitantes, líderes e acompanhamento pastoral em poucos cliques." },
    { icon: LineChart, title: "Financeiro inteligente", desc: "Entradas, saídas, saldo e gráficos modernos em tempo real." },
    { icon: Building2, title: "Multi-igrejas", desc: "Matriz, filiais e dashboard centralizado em uma só conta." },
    { icon: Bell, title: "Alertas inteligentes", desc: "Aniversários, visitantes sem retorno e contas vencendo." },
    { icon: Calendar, title: "Agenda completa", desc: "Cultos, reuniões e campanhas em um calendário visual." },
    { icon: Shield, title: "Dados isolados", desc: "Cada conta com seu próprio espaço seguro e privado." },
  ];
  return (
    <section id="recursos" className="mx-auto max-w-7xl px-6 py-24">
      <div className="mx-auto mb-14 max-w-2xl text-center">
        <h2 className="text-balance text-4xl font-bold tracking-tight md:text-5xl">
          Tudo que sua igreja precisa.
          <br />
          <span className="text-muted-foreground">Nada que ela não precise.</span>
        </h2>
      </div>
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {items.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="neu-card group p-6 transition-transform hover:-translate-y-1">
            <div
              className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl text-primary-foreground"
              style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
            >
              <Icon className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function FinanceShowcase() {
  return (
    <section id="financeiro" className="mx-auto max-w-7xl px-6 py-24">
      <div className="grid items-center gap-14 md:grid-cols-2">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1 text-xs text-muted-foreground">
            <Wallet className="h-3.5 w-3.5 text-primary" />
            Carro-chefe
          </span>
          <h2 className="mt-4 text-balance text-4xl font-bold tracking-tight md:text-5xl">
            A clareza financeira que sua liderança merece.
          </h2>
          <p className="mt-5 max-w-md text-muted-foreground">
            Entenda a saúde financeira da igreja em menos de 3 segundos. Filtre
            por matriz ou filiais, exporte PDF profissional e envie resumos
            direto pelo WhatsApp.
          </p>
          <ul className="mt-8 space-y-3 text-sm">
            {[
              "Gráfico moderno com entradas, saídas e saldo",
              "Filtros por período e por igreja",
              "PDF com logo e movimentações",
              "Compartilhamento instantâneo no WhatsApp",
            ].map((it) => (
              <li key={it} className="flex items-start gap-3">
                <span className="mt-1 grid h-5 w-5 place-items-center rounded-full bg-primary/15 text-primary">
                  <Check className="h-3 w-3" />
                </span>
                <span className="text-foreground/90">{it}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative">
          <div className="absolute inset-0 -z-10 rounded-[3rem] blur-3xl opacity-40"
            style={{ background: "var(--gradient-primary)" }}
          />
          <div className="neu-card overflow-hidden p-2">
            <img
              src={mockupFinance}
              alt="Financeiro Igreja Fácil"
              width={1280}
              height={1280}
              loading="lazy"
              className="w-full rounded-[1.5rem]"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function Alerts() {
  const items = [
    { title: "Aniversário hoje", desc: "Maria completa 42 anos." },
    { title: "Visitante sem retorno", desc: "João visitou há 14 dias." },
    { title: "Conta vencendo", desc: "Energia elétrica vence amanhã." },
    { title: "Evento confirmado", desc: "Culto de oração às 19h30." },
  ];
  return (
    <section id="alertas" className="mx-auto max-w-7xl px-6 py-24">
      <div className="mx-auto mb-12 max-w-2xl text-center">
        <h2 className="text-balance text-4xl font-bold tracking-tight md:text-5xl">
          Nunca mais perca o que importa.
        </h2>
        <p className="mt-4 text-muted-foreground">
          Alertas inteligentes que cuidam do detalhe enquanto você cuida das pessoas.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((a) => (
          <div key={a.title} className="neu-card p-5">
            <div className="mb-3 inline-flex items-center gap-2 text-xs text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-glow" />
              Alerta
            </div>
            <p className="font-semibold">{a.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{a.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function CtaBlock() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-24">
      <div className="neu-card relative overflow-hidden p-10 text-center md:p-16">
        <div className="absolute inset-0 -z-10 opacity-60"
          style={{ background: "var(--gradient-hero)" }}
        />
        <h2 className="text-balance text-4xl font-bold tracking-tight md:text-5xl">
          Comece hoje. <span className="text-gradient">Em minutos.</span>
        </h2>
        <p className="mx-auto mt-4 max-w-md text-muted-foreground">
          Cadastre sua igreja matriz, convide sua equipe e tenha uma central
          ministerial inteligente na palma da mão.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/auth"
            className="inline-flex h-12 items-center gap-2 rounded-full px-7 text-sm font-semibold text-primary-foreground"
            style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
          >
            Criar conta grátis
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/auth"
            className="inline-flex h-12 items-center rounded-full border border-border bg-surface/60 px-6 text-sm font-medium backdrop-blur"
          >
            Entrar
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border/60 py-10">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 text-sm text-muted-foreground md:flex-row">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg text-primary-foreground"
            style={{ background: "var(--gradient-primary)" }}
          >
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <span className="font-medium text-foreground">Igreja Fácil</span>
        </div>
        <p>© {new Date().getFullYear()} Igreja Fácil — Feito com cuidado para a igreja.</p>
      </div>
    </footer>
  );
}
