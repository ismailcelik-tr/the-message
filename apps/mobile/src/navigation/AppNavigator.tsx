import React from 'react';
import { Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { usePreferencesStore } from '../store/preferences.store';
import { COLORS } from '../theme/colors';
import { DailyScreen } from '../screens/DailyScreen';
import { FocusScreen } from '../screens/FocusScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();

export function AppNavigator() {
  const { t } = useTranslation();
  const currentTheme = usePreferencesStore((s) => s.currentTheme);
  const colors = COLORS[currentTheme];

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border, height: 70, paddingBottom: 8 },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.mutedText,
        }}
      >
        <Tab.Screen
          name="Daily"
          component={DailyScreen}
          options={{ tabBarLabel: t('tabs.daily'), tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📖</Text> }}
        />
        <Tab.Screen
          name="Focus"
          component={FocusScreen}
          options={{ tabBarLabel: t('tabs.focus'), tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>✨</Text> }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ tabBarLabel: t('tabs.settings'), tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>⚙️</Text> }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
