import { registerPlugin, Capacitor } from '@capacitor/core';

interface WidgetBridgePlugin {
  updateWidget(options: {
    pendingTasks: number;
    habitsDone: number;
    habitsTotal: number;
    updatedAt: string;
  }): Promise<{ ok: boolean }>;
}

// Plugin nativo propio (android/.../WidgetBridgePlugin.java): no existe en
// iOS/web, por eso todas las llamadas están guardadas por isNativePlatform().
const WidgetBridge = registerPlugin<WidgetBridgePlugin>('WidgetBridge');

/** Empuja el último snapshot de tareas/hábitos al widget del home screen. */
export function updateHomeWidget(pendingTasks: number, habitsDone: number, habitsTotal: number) {
  if (!Capacitor.isNativePlatform()) return;
  const updatedAt = new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
  WidgetBridge.updateWidget({ pendingTasks, habitsDone, habitsTotal, updatedAt }).catch(() => {});
}
