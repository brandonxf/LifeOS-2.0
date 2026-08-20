import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  taskRemindersEnabled: boolean;
  habitReminderEnabled: boolean;
  habitReminderTime: string; // "HH:mm"
  biometricLockEnabled: boolean;
  setTaskRemindersEnabled: (v: boolean) => void;
  setHabitReminderEnabled: (v: boolean) => void;
  setHabitReminderTime: (v: string) => void;
  setBiometricLockEnabled: (v: boolean) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      taskRemindersEnabled: true,
      habitReminderEnabled: false,
      habitReminderTime: '20:00',
      biometricLockEnabled: false,
      setTaskRemindersEnabled: (v) => set({ taskRemindersEnabled: v }),
      setHabitReminderEnabled: (v) => set({ habitReminderEnabled: v }),
      setHabitReminderTime: (v) => set({ habitReminderTime: v }),
      setBiometricLockEnabled: (v) => set({ biometricLockEnabled: v }),
    }),
    { name: 'life-os-settings' },
  ),
);
