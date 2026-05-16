// Camada sensorial: sons sutis + micro vibrações + intensidade visual.
// Tudo guardado por preferência do usuário (localStorage) e SSR-safe.

const SOUND_KEY = "ig-sound";
const HAPTIC_KEY = "ig-haptic";
const INTENSITY_KEY = "ig-intensity";

export type FeedbackKind = "tap" | "success" | "warning" | "error" | "switch";
export type Intensity = "soft" | "medium" | "premium";

export function getIntensity(): Intensity {
  if (typeof window === "undefined") return "medium";
  const v = window.localStorage.getItem(INTENSITY_KEY) as Intensity | null;
  return v === "soft" || v === "medium" || v === "premium" ? v : "medium";
}
export function setIntensity(v: Intensity) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(INTENSITY_KEY, v);
  document.documentElement.setAttribute("data-intensity", v);
}

export type FeedbackKind = "tap" | "success" | "warning" | "error" | "switch";

export function getPref(k: "sound" | "haptic"): boolean {
  if (typeof window === "undefined") return true;
  const v = window.localStorage.getItem(k === "sound" ? SOUND_KEY : HAPTIC_KEY);
  return v === null ? true : v === "1";
}
export function setPref(k: "sound" | "haptic", on: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(k === "sound" ? SOUND_KEY : HAPTIC_KEY, on ? "1" : "0");
}

let ctx: AudioContext | null = null;
function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  const Ctor = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext | undefined;
  if (!Ctor) return null;
  try { ctx = new Ctor(); } catch { ctx = null; }
  return ctx;
}

function tone(freq: number, dur: number, vol = 0.06, type: OscillatorType = "sine", delay = 0) {
  const a = ac(); if (!a) return;
  const t0 = a.currentTime + delay;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(vol, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function playSound(kind: FeedbackKind) {
  if (!getPref("sound")) return;
  switch (kind) {
    case "tap":     tone(880, 0.06, 0.03, "sine"); break;
    case "switch":  tone(660, 0.05, 0.025, "sine"); break;
    case "success": tone(660, 0.08, 0.04, "sine"); tone(990, 0.12, 0.04, "sine", 0.07); break;
    case "warning": tone(520, 0.12, 0.05, "triangle"); break;
    case "error":   tone(220, 0.18, 0.06, "sawtooth"); break;
  }
}

function vibrate(kind: FeedbackKind) {
  if (!getPref("haptic")) return;
  if (typeof navigator === "undefined" || !navigator.vibrate) return;
  const map: Record<FeedbackKind, number | number[]> = {
    tap: 8,
    switch: 5,
    success: [10, 30, 12],
    warning: [20, 40, 20],
    error: [30, 50, 30],
  };
  try { navigator.vibrate(map[kind]); } catch {}
}

export function feedback(kind: FeedbackKind = "tap") {
  playSound(kind);
  vibrate(kind);
}
