import { getSettings } from "./settings";

const dict = {
  de: {
    settings: "Einstellungen",
    sounds: "Sounds",
    animations: "Animationen",
    roundTimer: "Runden-Timer (Sekunden, 0 = aus)",
    imposterCount: "Anzahl Imposter",
    difficulty: "Schwierigkeit",
    language: "Sprache",
    theme: "Design",
    easy: "Leicht",
    medium: "Mittel",
    hard: "Schwer",
    reset: "Alle Einstellungen zurücksetzen",
    back: "Zurück",
    saved: "Gespeichert",
    resetDone: "Einstellungen zurückgesetzt",
  },
  en: {
    settings: "Settings",
    sounds: "Sounds",
    animations: "Animations",
    roundTimer: "Round timer (seconds, 0 = off)",
    imposterCount: "Imposter count",
    difficulty: "Difficulty",
    language: "Language",
    theme: "Theme",
    easy: "Easy",
    medium: "Medium",
    hard: "Hard",
    reset: "Reset all settings",
    back: "Back",
    saved: "Saved",
    resetDone: "Settings reset",
  },
} as const;

export type TranslationKey = keyof typeof dict.de;

export function t(key: TranslationKey): string {
  const lang = getSettings().language;
  return dict[lang][key] ?? dict.de[key];
}
