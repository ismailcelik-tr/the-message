import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserPreferences, SupportedLocale } from '@the-message/shared';
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
}

const defaultPreferences: UserPreferences = {
  theme: 'system',
  notificationEnabled: true,
  notificationFrequency: 'medium',
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
        set((state) => ({ preferences: { ...state.preferences, ...update } })),

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
    }),
    {
      name: 'cagri-preferences',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
