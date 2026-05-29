import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, View, useColorScheme } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import i18n from './src/i18n';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { ResetPasswordScreen } from './src/screens/ResetPasswordScreen';
import { AppNavigator } from './src/navigation/AppNavigator';
import { usePreferencesStore } from './src/store/preferences.store';
import { useAuthStore } from './src/store/auth.store';
import { supabase } from './src/lib/supabase';
import { COLORS } from './src/theme/colors';
import { usePreferencesSync } from './src/hooks/usePreferencesSync';
import { getExpoPushToken, rescheduleNotifications } from './src/lib/notifications';
import { registerPushToken, updatePushPreferences } from './src/api/push.api';

const queryClient = new QueryClient();
const AUTH_BOOTSTRAP_TIMEOUT_MS = 5000;
const NOTIFICATION_REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000;

function Root() {
  const { isOnboarded, setOnboarded, currentTheme, preferences, setCurrentTheme } = usePreferencesStore();
  const { session, isLoading, setSession } = useAuthStore();
  const colors = COLORS[currentTheme];
  const deviceColorScheme = useColorScheme();
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const lastNotificationRefreshRef = useRef(0);
  const lastRegisteredPushTokenRef = useRef<string | null>(null);
  usePreferencesSync();

  // Sync i18n language with stored locale preference (runs on hydration too)
  useEffect(() => {
    if (i18n.language !== preferences.locale) {
      i18n.changeLanguage(preferences.locale);
    }
  }, [preferences.locale]);

  // Sync currentTheme with device when preference is 'system'
  useEffect(() => {
    if (preferences.theme === 'system') {
      setCurrentTheme(deviceColorScheme === 'dark' ? 'dark' : 'light');
    }
  }, [deviceColorScheme, preferences.theme]);

  // Track previous prefs to detect relevant changes for rescheduling
  const prevPrefsRef = useRef(preferences);

  useEffect(() => {
    let isMounted = true;

    const bootstrapAuth = async () => {
      try {
        const timeout = new Promise<null>((resolve) => {
          setTimeout(() => resolve(null), AUTH_BOOTSTRAP_TIMEOUT_MS);
        });
        const session = await Promise.race([
          supabase.auth.getSession().then(({ data }) => data.session),
          timeout,
        ]);

        if (isMounted) {
          setSession(session);
        }
      } catch {
        if (isMounted) {
          setSession(null);
        }
      }
    };

    bootstrapAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
      } else {
        setIsPasswordRecovery(false);
      }
      setSession(session);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

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

    if (!isOnboarded) return;
    if (!notifChanged) return;

    lastNotificationRefreshRef.current = Date.now();
    rescheduleNotifications(preferences).catch(() => {
      lastNotificationRefreshRef.current = 0;
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

  // Schedule on first onboarding completion, and refresh periodically when the app
  // is opened so the rolling 14-day notification window does not expire.
  useEffect(() => {
    if (!isOnboarded) return;

    const refreshNotifications = () => {
      const now = Date.now();
      if (now - lastNotificationRefreshRef.current < NOTIFICATION_REFRESH_INTERVAL_MS) return;

      lastNotificationRefreshRef.current = now;
      rescheduleNotifications(preferences).catch(() => {
        lastNotificationRefreshRef.current = 0;
        // Network unavailable — keep existing scheduled notifications.
      });
    };

    refreshNotifications();

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshNotifications();
    });

    return () => subscription.remove();
  }, [isOnboarded, preferences]);

  useEffect(() => {
    if (!session?.access_token || !isOnboarded) return;
    if (!preferences.notificationEnabled) return;

    let isMounted = true;

    (async () => {
      try {
        const token = await getExpoPushToken();
        if (!token || !isMounted) return;

        await registerPushToken(
          session.access_token,
          token,
          preferences.locale,
          preferences.notificationEnabled,
        );
        lastRegisteredPushTokenRef.current = token;
      } catch {
        // Remote push registration is best-effort; local notifications still work.
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [session?.access_token, isOnboarded, preferences.locale, preferences.notificationEnabled]);

  useEffect(() => {
    if (!session?.access_token || !isOnboarded || !lastRegisteredPushTokenRef.current) return;

    updatePushPreferences(session.access_token, preferences.notificationEnabled).catch(() => {
      // Keep local preference as source of truth and retry on the next app open.
    });
  }, [session?.access_token, isOnboarded, preferences.notificationEnabled]);

  if (!isOnboarded) {
    return (
      <>
        <StatusBar style={currentTheme === 'dark' ? 'light' : 'dark'} backgroundColor={colors.background} />
        <OnboardingScreen onComplete={setOnboarded} />
      </>
    );
  }

  if (isLoading) {
    return (
      <>
        <StatusBar style={currentTheme === 'dark' ? 'light' : 'dark'} backgroundColor={colors.background} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </>
    );
  }

  if (isPasswordRecovery && session) {
    return (
      <>
        <StatusBar style={currentTheme === 'dark' ? 'light' : 'dark'} backgroundColor={colors.background} />
        <ResetPasswordScreen onComplete={() => setIsPasswordRecovery(false)} />
      </>
    );
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
