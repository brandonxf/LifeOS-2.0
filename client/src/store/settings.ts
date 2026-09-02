import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AccentKey } from '../lib/accents';

interface SettingsState {
  taskRemindersEnabled: boolean;
  habitReminderEnabled: boolean;
  habitReminderTime: string; // "HH:mm"
  biometricLockEnabled: boolean;
  accent: AccentKey;
  /** Color de acento personalizado (hex), elegido con la rueda de color.
   *  Si no es null, tiene prioridad sobre `accent` — ver AccentSync. */
  customAccentHex: string | null;
  setTaskRemindersEnabled: (v: boolean) => void;
  setHabitReminderEnabled: (v: boolean) => void;
  setHabitReminderTime: (v: string) => void;
  setBiometricLockEnabled: (v: boolean) => void;
  setAccent: (v: AccentKey) => void;
  setCustomAccent: (hex: string) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      taskRemindersEnabled: true,
      habitReminderEnabled: false,
      habitReminderTime: '20:00',
      biometricLockEnabled: false,
      accent: 'lime',
      customAccentHex: null,
      setTaskRemindersEnabled: (v) => set({ taskRemindersEnabled: v }),
      setHabitReminderEnabled: (v) => set({ habitReminderEnabled: v }),
      setHabitReminderTime: (v) => set({ habitReminderTime: v }),
      setBiometricLockEnabled: (v) => set({ biometricLockEnabled: v }),
      // Elegir un preset apaga el color personalizado.
      setAccent: (v) => set({ accent: v, customAccentHex: null }),
      setCustomAccent: (hex) => set({ customAccentHex: hex }),
    }),
    { name: 'life-os-settings' },
  ),
);
