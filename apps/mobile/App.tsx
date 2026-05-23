import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '../src/i18n';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { AppNavigator } from './src/navigation/AppNavigator';

const queryClient = new QueryClient();

export default function App() {
  const [isOnboarded, setIsOnboarded] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      {isOnboarded ? (
        <AppNavigator />
      ) : (
        <OnboardingScreen onComplete={() => setIsOnboarded(true)} />
      )}
    </QueryClientProvider>
  );
}
