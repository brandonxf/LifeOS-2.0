import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import toast from 'react-hot-toast';
import { Download } from 'lucide-react';
import { checkForUpdate } from '../lib/appUpdate';

/** Avisa con un toast persistente cuando hay una versión más nueva del APK
 *  publicada en GitHub Releases que la instalada. Solo aplica al APK nativo
 *  — la web en Vercel siempre está en la última versión, no necesita esto.
 *  No descarga ni instala nada: abre el link del APK en el navegador del
 *  sistema (fuera del webview de Capacitor), que lo descarga como cualquier
 *  archivo y el usuario lo abre para actualizar. No renderiza nada. */
export function UpdateCheck() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    (async () => {
      try {
        const { version } = await App.getInfo();
        const update = await checkForUpdate(version);
        if (!update) return;

        toast(
          (t) => (
            <div className="flex items-center gap-3">
              <span>Hay una nueva versión (v{update.version}) disponible.</span>
              <a
                href={update.apkUrl}
                className="flex items-center gap-1 whitespace-nowrap font-semibold text-primary"
                onClick={() => toast.dismiss(t.id)}
              >
                <Download className="h-4 w-4" /> Descargar
              </a>
            </div>
          ),
          { duration: 15000 },
        );
      } catch {
        // Sin internet, GitHub caído, lo que sea — no interrumpe el uso de la app.
      }
    })();
  }, []);

  return null;
}
