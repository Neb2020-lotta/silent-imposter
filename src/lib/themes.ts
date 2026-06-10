export type ThemeId = "ember" | "neon" | "royal";

export interface ThemeMeta {
  id: ThemeId;
  label: string;
  swatch: string[]; // hex preview
}

export const THEMES: ThemeMeta[] = [
  { id: "ember", label: "Charcoal Ember", swatch: ["#1a1a1a", "#2d2d2d", "#4a4a4a", "#e85d3a"] },
  { id: "neon", label: "Neon Cyber", swatch: ["#0a0a1f", "#141432", "#1e1e5a", "#22d3ee"] },
  { id: "royal", label: "Noir Gold", swatch: ["#0d0d0d", "#1a1a1a", "#c9a84c", "#f0d78c"] },
];

export function applyTheme(id: ThemeId) {
  document.documentElement.setAttribute("data-theme", id);
}
