/**
 * Prepara una foto de perfil en el navegador antes de subirla: la reduce a un
 * cuadrado pequeño y la comprime a JPEG. Mismo espíritu que las fotos del
 * diario (Diary.tsx) — ahí Capacitor ya se encarga del resize/quality del
 * lado nativo; aquí hacemos lo mismo a mano para cuando el picker es un
 * <input type="file"> (PC, o celular sin Capacitor).
 */

/** Lado del avatar final, en píxeles. Se muestra como máximo a 96 px, así que
 *  alcanza incluso en pantallas 2x/3x. */
export const AVATAR_SIZE = 480;

const QUALITY_STEPS = [0.82, 0.7, 0.6, 0.5, 0.4];
/** Presupuesto del data URI resultante (~60 KB de imagen). */
const MAX_DATA_URL_CHARS = 80_000;

/** Lee un File del <input type="file"> como data URI. */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('No se pudo leer la imagen'));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('El archivo no parece una imagen'));
    img.src = src;
  });
}

/**
 * Recorta al cuadrado central (como hace `object-cover` en el círculo del
 * avatar) y reescala a AVATAR_SIZE, bajando la calidad hasta entrar en el
 * presupuesto de tamaño. Cualquier foto de la galería —venga de PC o de
 * celular— sale de aquí pesando unos KB en vez de varios MB.
 */
export async function resizeToAvatar(src: string): Promise<string> {
  const img = await loadImage(src);

  const side = Math.min(img.width, img.height);
  const sx = (img.width - side) / 2;
  const sy = (img.height - side) / 2;

  const canvas = document.createElement('canvas');
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Tu navegador no pudo procesar la imagen');

  // JPEG no tiene transparencia: sin esto, un PNG transparente sale negro.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, AVATAR_SIZE, AVATAR_SIZE);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, sx, sy, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);

  let out = canvas.toDataURL('image/jpeg', QUALITY_STEPS[0]);
  for (let i = 1; i < QUALITY_STEPS.length && out.length > MAX_DATA_URL_CHARS; i++) {
    out = canvas.toDataURL('image/jpeg', QUALITY_STEPS[i]);
  }
  return out;
}
