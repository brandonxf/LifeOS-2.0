import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AccentKey } from '../lib/accents';

interface SettingsState {
  taskRemindersEnabled: boolean;
  habitReminderEnabled: boolean;
  habitReminderTime: string; // "HH:mm"
  /** Aviso antes de cada evento del calendario. */
  eventReminderEnabled: boolean;
  /** Minutos de anticipación del aviso de eventos. */
  eventReminderMinutes: number;
  /** Aviso al llegar al 80% (y al 100%) de un presupuesto. */
  budgetAlertEnabled: boolean;
  /** Aviso cuando una racha está en riesgo de perderse hoy. */
  streakAlertEnabled: boolean;
  streakAlertTime: string; // "HH:mm"
  biometricLockEnabled: boolean;
  accent: AccentKey;
  /** Color de acento personalizado (hex), elegido con la rueda de color.
   *  Si no es null, tiene prioridad sobre `accent` — ver AccentSync. */
  customAccentHex: string | null;
  /** Apaga desenfoques/fondos animados en toda la app (ver .perf-mode en
   *  index.css), sin importar el ancho de pantalla — para gama media/baja. */
  performanceModeEnabled: boolean;
  setTaskRemindersEnabled: (v: boolean) => void;
  setHabitReminderEnabled: (v: boolean) => void;
  setHabitReminderTime: (v: string) => void;
  setEventReminderEnabled: (v: boolean) => void;
  setEventReminderMinutes: (v: number) => void;
  setBudgetAlertEnabled: (v: boolean) => void;
  setStreakAlertEnabled: (v: boolean) => void;
  setStreakAlertTime: (v: string) => void;
  setBiometricLockEnabled: (v: boolean) => void;
  setAccent: (v: AccentKey) => void;
  setCustomAccent: (hex: string) => void;
  setPerformanceModeEnabled: (v: boolean) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      taskRemindersEnabled: true,
      habitReminderEnabled: false,
      habitReminderTime: '20:00',
      eventReminderEnabled: false,
      eventReminderMinutes: 30,
      budgetAlertEnabled: false,
      streakAlertEnabled: false,
      streakAlertTime: '21:00',
      biometricLockEnabled: false,
      accent: 'lime',
      customAccentHex: null,
      performanceModeEnabled: false,
      setTaskRemindersEnabled: (v) => set({ taskRemindersEnabled: v }),
      setHabitReminderEnabled: (v) => set({ habitReminderEnabled: v }),
      setHabitReminderTime: (v) => set({ habitReminderTime: v }),
      setEventReminderEnabled: (v) => set({ eventReminderEnabled: v }),
      setEventReminderMinutes: (v) => set({ eventReminderMinutes: v }),
      setBudgetAlertEnabled: (v) => set({ budgetAlertEnabled: v }),
      setStreakAlertEnabled: (v) => set({ streakAlertEnabled: v }),
      setStreakAlertTime: (v) => set({ streakAlertTime: v }),
      setBiometricLockEnabled: (v) => set({ biometricLockEnabled: v }),
      // Elegir un preset apaga el color personalizado.
      setAccent: (v) => set({ accent: v, customAccentHex: null }),
      setCustomAccent: (hex) => set({ customAccentHex: hex }),
      setPerformanceModeEnabled: (v) => set({ performanceModeEnabled: v }),
    }),
    { name: 'life-os-settings' },
  ),
);
