import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserPreferences, SupportedLocale, NotificationSchedule, NotificationSlot, NotificationFrequency } from '@the-message/shared';
import { supportedLocale } from '../i18n';

interface PreferencesState {
  preferences: UserPreferences;
  currentTheme: 'light' | 'dark';
  isOnboarded: boolean;
  setPreferences: (update: Partial<UserPreferences>) => void;
  toggleTheme: () => void;
  toggleCategory: (key: keyof UserPreferences['categoryPreferences']) => void;
  setLocale: (locale: SupportedLocale) => void;
  setOnboarded: () => void;
  updateSlotTime: (frequency: NotificationFrequency, index: number, time: string) => void;
}

export const DEFAULT_SCHEDULE: NotificationSchedule = {
  low: [
    { label: 'morning', time: '07:00' },
  ],
  medium: [
    { label: 'morning', time: '07:00' },
    { label: 'noon', time: '12:30' },
    { label: 'evening', time: '20:00' },
  ],
  high: [
    { label: 'morning', time: '07:00' },
    { label: 'midMorning', time: '10:00' },
    { label: 'noon', time: '12:30' },
    { label: 'afternoon', time: '16:00' },
    { label: 'evening', time: '20:00' },
  ],
};

const defaultPreferences: UserPreferences = {
  theme: 'system',
  notificationEnabled: true,
  notificationFrequency: 'medium',
  notificationSchedule: DEFAULT_SCHEDULE,
  locale: supportedLocale as SupportedLocale,
  categoryPreferences: {
    hope: true,
    purpose: true,
    worship: true,
    prayer: true,
    dhikr: false,
  },
  silentHours: {
    start: '22:00',
    end: '06:00',
    enabled: true,
  },
};

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      preferences: defaultPreferences,
      currentTheme: 'light',
      isOnboarded: false,

      setPreferences: (update) =>
        set((state) => {
          const merged = { preferences: { ...state.preferences, ...update } };
          if (update.theme === 'light' || update.theme === 'dark') {
            return { ...merged, currentTheme: update.theme };
          }
          return merged;
        }),

      toggleTheme: () =>
        set((state) => {
          const next = state.currentTheme === 'light' ? 'dark' : 'light';
          return { currentTheme: next, preferences: { ...state.preferences, theme: next } };
        }),

      toggleCategory: (key) =>
        set((state) => ({
          preferences: {
            ...state.preferences,
            categoryPreferences: {
              ...state.preferences.categoryPreferences,
              [key]: !state.preferences.categoryPreferences[key],
            },
          },
        })),

      setLocale: (locale) =>
        set((state) => ({ preferences: { ...state.preferences, locale } })),

      setOnboarded: () => set({ isOnboarded: true }),

      updateSlotTime: (frequency, index, time) =>
        set((state) => {
          const slots = [...state.preferences.notificationSchedule[frequency]];
          slots[index] = { ...slots[index], time };
          return {
            preferences: {
              ...state.preferences,
              notificationSchedule: {
                ...state.preferences.notificationSchedule,
                [frequency]: slots,
              },
            },
          };
        }),
    }),
    {
      name: 'cagri-preferences',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
