import { type CSSProperties } from "react";

/**
 * Logo oficial do Igreja Fácil.
 * Casa estilizada (teto + colunas em L) com cruz central.
 * Usa cores do tema ativo (currentColor / --primary / --gradient-primary).
 */

type Props = {
  size?: number;
  className?: string;
  variant?: "tile" | "mark";
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
      {/* Telhado em pico (chevron) */}
      <path d="M32 8 L8 30 L14 30 L32 16 L50 30 L56 30 Z" />
      {/* Coluna esquerda em L */}
      <path d="M10 30 H18 V46 H26 V54 H10 Z" />
      {/* Coluna direita em L */}
      <path d="M54 30 H46 V46 H38 V54 H54 Z" />
      {/* Cruz central */}
      <rect x="30" y="22" width="4" height="30" rx="1" />
      <rect x="24" y="32" width="16" height="4" rx="1" />
    </svg>
  );
}

export function Logo({ size = 40, className = "", variant = "tile", glow = true, style }: Props) {
  if (variant === "mark") {
    return (
      <span className={`inline-grid place-items-center text-primary ${className}`} style={style}>
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
