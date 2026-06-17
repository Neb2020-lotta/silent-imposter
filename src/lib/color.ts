// Safe color utilities. All inputs MUST be validated with HEX_COLOR_REGEX
// before being applied to the DOM. The validated color is exclusively
// written to a CSS custom property (--game-accent) on :root — never as
// an inline style for arbitrary user content. This prevents style/XSS
// injection through the color picker.

export const HEX_COLOR_REGEX = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

export function isValidHex(input: string): boolean {
  return HEX_COLOR_REGEX.test(input);
}

function expandHex(hex: string): string {
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

const ACCENT_VAR = "--game-accent";

/** Apply a validated hex color as a CSS variable. Inline styles are never used for user content. */
export function applyAccentColor(hex: string | null) {
  const root = document.documentElement;
  if (!hex) {
    root.style.removeProperty(ACCENT_VAR);
    return;
  }
  const hsl = hexToHslString(hex);
  if (!hsl) {
    root.style.removeProperty(ACCENT_VAR);
    return;
  }
  root.style.setProperty(ACCENT_VAR, hsl);
}
