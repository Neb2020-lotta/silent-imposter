// Safe color utilities. All inputs MUST be validated with HEX_COLOR_REGEX
// before being applied to the DOM. Validated colors are written exclusively
// to predefined CSS custom properties on :root — never as inline styles for
// arbitrary user content. This prevents style/XSS injection.

export const HEX_COLOR_REGEX = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

export function isValidHex(input: string): boolean {
  return HEX_COLOR_REGEX.test(input);
}

export function expandHex(hex: string): string {
  if (hex.length === 4) {
    return "#" + hex.slice(1).split("").map((c) => c + c).join("");
  }
  return hex;
}

/** Convert a validated #RRGGBB / #RGB string to "H S% L%" (no commas). */
export function hexToHslString(hex: string): string | null {
  if (!isValidHex(hex)) return null;
  const full = expandHex(hex);
  const r = parseInt(full.slice(1, 3), 16) / 255;
  const g = parseInt(full.slice(3, 5), 16) / 255;
  const b = parseInt(full.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/**
 * Palette slots. Each maps a user-friendly key to a fixed CSS variable.
 * Only variables in this allowlist can ever be written to — preventing
 * arbitrary property injection from saved/imported settings.
 */
export const PALETTE_SLOTS = {
  accent: "--game-accent",
  background: "--game-bg-start",
  backgroundEnd: "--game-bg-end",
  card: "--game-card-bg",
  text: "--game-text",
  secondary: "--game-secondary",
  border: "--game-border",
  input: "--game-input-bg",
} as const;

export type PaletteSlot = keyof typeof PALETTE_SLOTS;

export type Palette = Partial<Record<PaletteSlot, string | null>>;

const ACCENT_VAR = PALETTE_SLOTS.accent;

/** Backward-compat single-accent applier. */
export function applyAccentColor(hex: string | null) {
  applyPaletteSlot("accent", hex);
}

/** Apply a single palette slot. Removes the override if hex is null/invalid. */
export function applyPaletteSlot(slot: PaletteSlot, hex: string | null) {
  const root = document.documentElement;
  const cssVar = PALETTE_SLOTS[slot];
  if (!hex) {
    root.style.removeProperty(cssVar);
    return;
  }
  const hsl = hexToHslString(hex);
  if (!hsl) {
    root.style.removeProperty(cssVar);
    return;
  }
  root.style.setProperty(cssVar, hsl);
}

/** Apply an entire palette. Unknown keys are ignored by the allowlist. */
export function applyPalette(palette: Palette | null | undefined) {
  // First clear all slots, then apply provided ones — keeps state predictable across theme changes.
  const root = document.documentElement;
  (Object.keys(PALETTE_SLOTS) as PaletteSlot[]).forEach((slot) => {
    root.style.removeProperty(PALETTE_SLOTS[slot]);
  });
  if (!palette) return;
  (Object.keys(palette) as PaletteSlot[]).forEach((slot) => {
    if (slot in PALETTE_SLOTS) applyPaletteSlot(slot, palette[slot] ?? null);
  });
}
