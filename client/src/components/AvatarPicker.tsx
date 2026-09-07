import { useRef, useState } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import toast from 'react-hot-toast';
import { externalPickerOpen } from './BiometricGate';
import { avatarSrc } from '../lib/avatar';
import { fileToDataUrl, resizeToAvatar } from '../lib/image';

/** Tope de lo que aceptamos leer del disco en PC: por encima de esto el
 *  navegador puede tardar mucho o quedarse sin memoria decodificándola. */
const MAX_FILE_BYTES = 25 * 1024 * 1024;

/**
 * Foto de perfil: se elige de la galería (o la cámara) exactamente como en
 * el diario (ver `addPhoto` en Diary.tsx) — mismo picker nativo, mismo
 * `externalPickerOpen` para no chocar con la huella. En celular, Capacitor ya
 * la entrega reducida; en PC (o celular sin app nativa) usamos un
 * `<input type="file">` y la recortamos/comprimimos a mano en el navegador
 * con `resizeToAvatar`. En ambos casos el resultado es una foto liviana que
 * se sube y queda visible para todos.
 */
export function AvatarPicker({
  value,
  name,
  onChange,
}: {
  value: string | null;
  name: string;
  onChange: (value: string | null) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const nativeCamera = Capacitor.isNativePlatform();

  async function pickNative() {
    // Abrir la cámara/galería manda la app a segundo plano igual que el
    // diálogo de huella, así que suprimimos el bloqueo biométrico mientras
    // dura (mismo patrón que Diary.tsx).
    externalPickerOpen.current = true;
    try {
      const photo = await Camera.getPhoto({
        resultType: CameraResultType.Base64,
        source: CameraSource.Prompt,
        quality: 70,
        width: 480,
        promptLabelHeader: 'Foto de perfil',
        promptLabelPhoto: 'Elegir de la galería',
        promptLabelPicture: 'Tomar foto',
      });
      if (photo.base64String) {
        onChange(`data:image/${photo.format};base64,${photo.base64String}`);
      }
    } catch {
      /* usuario canceló */
    } finally {
      setTimeout(() => {
        externalPickerOpen.current = false;
      }, 500);
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Limpiar el input permite volver a elegir el mismo archivo después.
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Elige un archivo de imagen');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast.error('Esa imagen es demasiado pesada (máximo 25 MB)');
      return;
    }
    setBusy(true);
    try {
      onChange(await resizeToAvatar(await fileToDataUrl(file)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo procesar la imagen');
    } finally {
      setBusy(false);
    }
  }

  const src = avatarSrc(value);

  return (
    <div className="flex items-center gap-4">
      <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-2xl font-bold text-primary ring-1 ring-primary/20">
        {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : name?.[0]?.toUpperCase() ?? '?'}
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-primary"
            disabled={busy}
            onClick={() => (nativeCamera ? pickNative() : fileRef.current?.click())}
          >
            <ImagePlus className="h-4 w-4" /> {busy ? 'Procesando…' : value ? 'Cambiar foto' : 'Subir foto'}
          </button>
          {value && !busy && (
            <button type="button" className="btn-danger" onClick={() => onChange(null)}>
              <Trash2 className="h-4 w-4" /> Quitar
            </button>
          )}
        </div>
        <p className="mt-2 text-xs text-slate-400">Desde tu galería o cámara. La ven todos tus amigos.</p>
      </div>

      {!nativeCamera && (
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
      )}
    </div>
  );
}
