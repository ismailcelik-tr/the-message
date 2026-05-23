import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import './src/i18n';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { AppNavigator } from './src/navigation/AppNavigator';
import { usePreferencesStore } from './src/store/preferences.store';

const queryClient = new QueryClient();

function Root() {
  const { isOnboarded, setOnboarded } = usePreferencesStore();

  return isOnboarded ? (
    <AppNavigator />
  ) : (
    <OnboardingScreen onComplete={setOnboarded} />
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
