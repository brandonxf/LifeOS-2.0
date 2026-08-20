// Genera las imágenes fuente para @capacitor/assets (ícono adaptativo y
// splash screen) a partir del logo PWA existente (public/pwa-512x512.png).
// Se corre una sola vez (o cuando cambie el logo); el resultado queda en
// client/resources y de ahí `npx capacitor-assets generate` produce todos
// los tamaños/densidades nativas de Android.
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const BG = '#080a08'; // mismo theme_color/background_color que el manifest PWA
const OUT = fileURLToPath(new URL('../resources/', import.meta.url));
const LOGO = fileURLToPath(new URL('../public/pwa-512x512.png', import.meta.url));

mkdirSync(OUT, { recursive: true });

async function solid(size, color) {
  return sharp({
    create: { width: size, height: size, channels: 4, background: color },
  });
}

async function main() {
  // ── Ícono adaptativo (fg + bg) ──────────────────────────────────────
  // El logo va al 60% del lienzo para quedar dentro de la "safe zone" que
  // Android respeta al recortar el ícono con distintas máscaras (círculo,
  // squircle, etc).
  const iconSize = 1024;
  const logoSize = Math.round(iconSize * 0.6);
  const logoBuf = await sharp(LOGO).resize(logoSize, logoSize, { fit: 'contain' }).toBuffer();

  await (await solid(iconSize, BG))
    .composite([{ input: logoBuf, gravity: 'center' }])
    .png()
    .toFile(`${OUT}icon-foreground.png`);

  await (await solid(iconSize, BG)).png().toFile(`${OUT}icon-background.png`);

  // Ícono legacy (pre-Android 8, sin máscara adaptativa): logo un poco más
  // grande porque no hay recorte de forma que compense.
  const legacyLogoSize = Math.round(iconSize * 0.72);
  const legacyLogoBuf = await sharp(LOGO)
    .resize(legacyLogoSize, legacyLogoSize, { fit: 'contain' })
    .toBuffer();
  await (await solid(iconSize, BG))
    .composite([{ input: legacyLogoBuf, gravity: 'center' }])
    .png()
    .toFile(`${OUT}icon.png`);

  // ── Splash screen ────────────────────────────────────────────────────
  // App forzada a tema oscuro (ver main.tsx: forcedTheme="dark"), así que
  // splash y splash-dark son el mismo archivo.
  const splashSize = 2732;
  const splashLogoSize = Math.round(splashSize * 0.32);
  const splashLogoBuf = await sharp(LOGO)
    .resize(splashLogoSize, splashLogoSize, { fit: 'contain' })
    .toBuffer();
  const splash = await (await solid(splashSize, BG))
    .composite([{ input: splashLogoBuf, gravity: 'center' }])
    .png()
    .toBuffer();

  await sharp(splash).toFile(`${OUT}splash.png`);
  await sharp(splash).toFile(`${OUT}splash-dark.png`);

  console.log('Assets generados en', OUT);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
