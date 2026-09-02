/** Utilidades de color para el selector "rueda" (HSV) y para derivar los
 *  tonos claro/oscuro de un acento personalizado a partir de un solo hex. */

export interface Hsv {
  h: number; // 0-360
  s: number; // 0-1
  v: number; // 0-1
}

export function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const int = parseInt(full, 16);
  if (full.length !== 6 || Number.isNaN(int)) return [0, 0, 0];
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

export function rgbToHex(r: number, g: number, b: number): string {
  const c = (n: number) => Math.round(clamp01(n / 255) * 255).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

export function rgbToHsv(r: number, g: number, b: number): Hsv {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rn) h = 60 * (((gn - bn) / d) % 6);
    else if (max === gn) h = 60 * ((bn - rn) / d + 2);
    else h = 60 * ((rn - gn) / d + 4);
  }
  if (h < 0) h += 360;
  const s = max === 0 ? 0 : d / max;
  return { h, s, v: max };
}

export function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let [r, g, b] = [0, 0, 0];
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

export function hexToHsv(hex: string): Hsv {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHsv(r, g, b);
}

export function hsvToHex(h: number, s: number, v: number): string {
  const [r, g, b] = hsvToRgb(h, s, v);
  return rgbToHex(r, g, b);
}

export function isValidHex(hex: string): boolean {
  return /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex);
}

/** Mezcla `hex` hacia `target` en proporción `t` (0 = hex puro, 1 = target puro). */
function mixHex(hex: string, target: [number, number, number], t: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r + (target[0] - r) * t, g + (target[1] - g) * t, b + (target[2] - b) * t);
}

/** "R G B" en enteros — el formato que usan las variables CSS de index.css
 *  (se consumen como `rgb(var(--primary) / alpha)`). */
function hexToCssTriplet(hex: string): string {
  const [r, g, b] = hexToRgb(hex);
  return `${Math.round(r)} ${Math.round(g)} ${Math.round(b)}`;
}

/** Deriva los 4 tonos de un acento (base + claro/medio/oscuro) a partir de
 *  un único color elegido por el usuario, mezclando hacia blanco/negro —
 *  funciona para cualquier hex de entrada sin artefactos de matiz raros. */
export function deriveAccentShades(hex: string): {
  primary: string;
  primary200: string;
  primary400: string;
  primary600: string;
} {
  return {
    primary: hexToCssTriplet(hex),
    primary200: hexToCssTriplet(mixHex(hex, [255, 255, 255], 0.55)),
    primary400: hexToCssTriplet(mixHex(hex, [0, 0, 0], 0.12)),
    primary600: hexToCssTriplet(mixHex(hex, [0, 0, 0], 0.42)),
  };
}
