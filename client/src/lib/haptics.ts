import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

const native = Capacitor.isNativePlatform();

/** Toque ligero: selección, checkbox, cambio de pestaña. */
export function hapticTap() {
  if (!native) return;
  Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
}

/** Confirmación positiva: completar tarea/hábito, guardar con éxito. */
export function hapticSuccess() {
  if (!native) return;
  Haptics.notification({ type: NotificationType.Success }).catch(() => {});
}

/** Acción destructiva: eliminar algo. */
export function hapticWarning() {
  if (!native) return;
  Haptics.notification({ type: NotificationType.Warning }).catch(() => {});
}
