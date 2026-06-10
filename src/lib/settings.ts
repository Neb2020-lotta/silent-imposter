import { useEffect, useState } from "react";

export type Difficulty = "easy" | "medium" | "hard";
export type Language = "de" | "en";
export type ThemeId = "ember" | "neon" | "royal";

export interface Settings {
  sounds: boolean;
  animations: boolean;
  roundTimer: number; // seconds, 0 = off
  imposterCount: number;
  difficulty: Difficulty;
  language: Language;
  theme: ThemeId;
}

export const DEFAULT_SETTINGS: Settings = {
  sounds: true,
  animations: true,
  roundTimer: 0,
  imposterCount: 1,
  difficulty: "medium",
  language: "de",
  theme: "ember",
};

const KEY = "silent-imposter-settings";

function read(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

const listeners = new Set<(s: Settings) => void>();
let current: Settings = read();

export function getSettings(): Settings {
  return current;
}

export function updateSettings(patch: Partial<Settings>) {
  current = { ...current, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {}
  listeners.forEach((l) => l(current));
}

export function resetSettings() {
  current = { ...DEFAULT_SETTINGS };
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {}
  listeners.forEach((l) => l(current));
}

export function useSettings(): Settings {
  const [s, setS] = useState<Settings>(current);
  useEffect(() => {
    const l = (next: Settings) => setS(next);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  return s;
}
