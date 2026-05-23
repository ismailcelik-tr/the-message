import React, { useEffect } from 'react';
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

const queryClient = new QueryClient();

function Root() {
  const { isOnboarded, setOnboarded, currentTheme } = usePreferencesStore();
  const { session, isLoading, setSession } = useAuthStore();
  const colors = COLORS[currentTheme];
  usePreferencesSync();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

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
