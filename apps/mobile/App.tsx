import React, { useEffect, useRef } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import './src/i18n';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { AppNavigator } from './src/navigation/AppNavigator';
import { usePreferencesStore } from './src/store/preferences.store';
import { useAuthStore } from './src/store/auth.store';
import { supabase } from './src/lib/supabase';
import { COLORS } from './src/theme/colors';
import { usePreferencesSync } from './src/hooks/usePreferencesSync';
import { rescheduleNotifications, requestNotificationPermission } from './src/lib/notifications';
import { fetchDailyBundle } from './src/api/content.api';

const queryClient = new QueryClient();

function Root() {
  const { isOnboarded, setOnboarded, currentTheme, preferences } = usePreferencesStore();
  const { session, isLoading, setSession } = useAuthStore();
  const colors = COLORS[currentTheme];
  usePreferencesSync();

  // Track previous prefs to detect relevant changes for rescheduling
  const prevPrefsRef = useRef(preferences);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Initial permission request + scheduling on first meaningful render
  useEffect(() => {
    if (!isOnboarded) return;
    requestNotificationPermission();
  }, [isOnboarded]);

  // Re-schedule whenever notification-related preferences change
  useEffect(() => {
    const prev = prevPrefsRef.current;
    prevPrefsRef.current = preferences;

    const notifChanged =
      prev.notificationEnabled !== preferences.notificationEnabled ||
      prev.notificationFrequency !== preferences.notificationFrequency ||
      prev.notificationSchedule !== preferences.notificationSchedule ||
      prev.silentHours !== preferences.silentHours ||
      prev.locale !== preferences.locale;

    if (!notifChanged) return;
    if (!isOnboarded) return;

    fetchDailyBundle(preferences.locale)
      .then((bundle) => rescheduleNotifications(preferences, bundle))
      .catch(() => {
        // Network unavailable — reschedule silently on next open
      });
  }, [
    preferences.notificationEnabled,
    preferences.notificationFrequency,
    preferences.notificationSchedule,
    preferences.silentHours,
    preferences.locale,
    isOnboarded,
  ]);

  if (!isOnboarded) {
    return (
      <>
        <StatusBar style={currentTheme === 'dark' ? 'light' : 'dark'} backgroundColor={colors.background} />
        <OnboardingScreen onComplete={setOnboarded} />
      </>
    );
  }

  if (isLoading) {
    return null;
  }

  if (!session) {
    return (
      <>
        <StatusBar style={currentTheme === 'dark' ? 'light' : 'dark'} backgroundColor={colors.background} />
        <LoginScreen onComplete={() => {}} />
      </>
    );
  }

  return (
    <>
      <StatusBar style={currentTheme === 'dark' ? 'light' : 'dark'} backgroundColor={colors.background} />
      <AppNavigator />
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <Root />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
