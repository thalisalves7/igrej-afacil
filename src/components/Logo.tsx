import { type CSSProperties } from "react";

/**
 * Logo oficial do Igreja Fácil.
 * Igreja minimalista com cruz central.
 * Usa as cores do tema ativo (var(--primary) / --primary-glow / --primary-foreground).
 */

type Props = {
  size?: number;
  className?: string;
  /** "tile" mostra ícone dentro de um quadrado com gradiente. "mark" mostra apenas o ícone. */
  variant?: "tile" | "mark";
  /** Quando true, adiciona glow do tema. */
  glow?: boolean;
  style?: CSSProperties;
};

export function LogoIcon({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      fill="currentColor"
    >
      {/* cruz */}
      <rect x="30" y="6" width="4" height="14" rx="1.2" />
      <rect x="25" y="10" width="14" height="4" rx="1.2" />
      {/* corpo da igreja */}
      <path d="M32 18 L12 33 V54 H52 V33 Z" />
      {/* porta arqueada (recorte) */}
      <path
        d="M28 54 V44 a4 4 0 0 1 8 0 V54 Z"
        fill="color-mix(in oklab, var(--background) 70%, transparent)"
      />
      {/* janelinhas */}
      <circle cx="20" cy="42" r="2" fill="color-mix(in oklab, var(--background) 70%, transparent)" />
      <circle cx="44" cy="42" r="2" fill="color-mix(in oklab, var(--background) 70%, transparent)" />
    </svg>
  );
}

export function Logo({ size = 40, className = "", variant = "tile", glow = true, style }: Props) {
  if (variant === "mark") {
    return (
      <span
        className={`inline-grid place-items-center text-primary ${className}`}
        style={style}
      >
        <LogoIcon size={size} />
      </span>
    );
  }
  const tile = Math.round(size * 1.2);
  const inner = Math.round(size * 0.7);
  return (
    <span
      className={`inline-grid place-items-center rounded-2xl text-primary-foreground ${className}`}
      style={{
        width: tile,
        height: tile,
        background: "var(--gradient-primary)",
        boxShadow: glow ? "var(--shadow-glow)" : undefined,
        ...style,
      }}
    >
      <LogoIcon size={inner} />
    </span>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <Logo size={28} />
      <span className="font-semibold tracking-tight">Igreja Fácil</span>
    </span>
  );
}
