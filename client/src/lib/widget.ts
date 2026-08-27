import { registerPlugin, Capacitor } from '@capacitor/core';

interface WidgetBridgePlugin {
  updateWidget(options: {
    pendingTasks: number;
    habitsDone: number;
    habitsTotal: number;
    bestStreak: number;
    activeStreakHabits: number;
    nextTaskText: string;
    balanceText: string;
    balancePositive: boolean;
    updatedAt: string;
    notesJson: string;
  }): Promise<{ ok: boolean }>;
  consumeWidgetRefreshFlag(): Promise<{ isRefresh: boolean }>;
  finishRefresh(): Promise<void>;
}

interface WidgetNote {
  title: string;
  snippet: string;
  color: string;
}

// Plugin nativo propio (android/.../WidgetBridgePlugin.java): no existe en
// iOS/web, por eso todas las llamadas están guardadas por isNativePlatform().
const WidgetBridge = registerPlugin<WidgetBridgePlugin>('WidgetBridge');

interface WidgetSnapshot {
  pendingTasks: number;
  habitsDone: number;
  habitsTotal: number;
  bestStreak: number;
  activeStreakHabits: number;
  nextTaskText: string;
  balanceText: string;
  balancePositive: boolean;
  notes: WidgetNote[];
}

/** Empuja el último snapshot de tareas/hábitos/finanzas/notas a los widgets
 *  del home screen (el principal, el de racha y el de notas). */
export function updateHomeWidget(snapshot: WidgetSnapshot) {
  if (!Capacitor.isNativePlatform()) return;
  const updatedAt = new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
  const { notes, ...rest } = snapshot;
  return WidgetBridge.updateWidget({ ...rest, updatedAt, notesJson: JSON.stringify(notes) }).catch(() => {});
}

/** true si la app se abrió por el botón de recarga de un widget (se
 *  consume una sola vez: el lado nativo resetea la bandera al leerla). */
export async function consumeWidgetRefreshFlag(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const { isRefresh } = await WidgetBridge.consumeWidgetRefreshFlag();
    return isRefresh;
  } catch {
    return false;
  }
}

/** Manda la app de vuelta al home screen tras sincronizar el widget desde
 *  su botón de recarga (le da el efecto de "recargar sin abrir la app"). */
export function finishWidgetRefresh() {
  if (!Capacitor.isNativePlatform()) return;
  WidgetBridge.finishRefresh().catch(() => {});
}
