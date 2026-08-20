import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

const native = Capacitor.isNativePlatform();

/** Convierte un uuid (id de tarea) en un entero de 32 bits: Local
 *  Notifications solo acepta ids numéricos. */
function hashId(uuid: string): number {
  let h = 0;
  for (let i = 0; i < uuid.length; i++) {
    h = (h * 31 + uuid.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % 2147483647;
}

/** Id fijo para el recordatorio diario de hábitos (no depende de datos). */
const HABIT_REMINDER_ID = 900000001;

export async function ensureNotificationPermission(): Promise<boolean> {
  if (!native) return false;
  const current = await LocalNotifications.checkPermissions();
  if (current.display === 'granted') return true;
  const req = await LocalNotifications.requestPermissions();
  return req.display === 'granted';
}

export async function hasNotificationPermission(): Promise<boolean> {
  if (!native) return false;
  const current = await LocalNotifications.checkPermissions();
  return current.display === 'granted';
}

/** Programa un recordatorio a las 9am del día de vencimiento de una tarea.
 *  Si la tarea ya venció o no tiene fecha, no hace nada. */
export async function scheduleTaskReminder(task: { id: string; title: string; dueDate: string | null }) {
  if (!native || !task.dueDate) return;
  const at = new Date(task.dueDate);
  at.setHours(9, 0, 0, 0);
  if (at.getTime() <= Date.now()) return;

  await cancelTaskReminder(task.id);
  await LocalNotifications.schedule({
    notifications: [
      {
        id: hashId(task.id),
        title: 'Tarea pendiente hoy',
        body: task.title,
        schedule: { at },
      },
    ],
  });
}

export async function cancelTaskReminder(taskId: string) {
  if (!native) return;
  await LocalNotifications.cancel({ notifications: [{ id: hashId(taskId) }] });
}

/** Recordatorio diario repetido para revisar hábitos, a la hora indicada
 *  (formato "HH:mm"). */
export async function scheduleDailyHabitReminder(time: string) {
  if (!native) return;
  const [hour, minute] = time.split(':').map(Number);
  await LocalNotifications.cancel({ notifications: [{ id: HABIT_REMINDER_ID }] });
  await LocalNotifications.schedule({
    notifications: [
      {
        id: HABIT_REMINDER_ID,
        title: 'Life OS',
        body: '¿Ya registraste tus hábitos de hoy?',
        schedule: { on: { hour, minute }, allowWhileIdle: true },
      },
    ],
  });
}

export async function cancelDailyHabitReminder() {
  if (!native) return;
  await LocalNotifications.cancel({ notifications: [{ id: HABIT_REMINDER_ID }] });
}
