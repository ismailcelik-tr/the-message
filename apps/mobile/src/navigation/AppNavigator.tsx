import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { usePreferencesStore } from '../store/preferences.store';
import { COLORS } from '../theme/colors';
import { DailyScreen } from '../screens/DailyScreen';
import { FocusScreen } from '../screens/FocusScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();

const TAB_ICONS: Record<string, string> = {
  Daily: '📖',
  Focus: '✨',
  Settings: '⚙️',
};

function PillTabBar({ state, navigation }: BottomTabBarProps) {
  const { t } = useTranslation();
  const currentTheme = usePreferencesStore((s) => s.currentTheme);
  const colors = COLORS[currentTheme];
  const insets = useSafeAreaInsets();

  const TAB_LABELS: Record<string, string> = {
    Daily: t('tabs.daily'),
    Focus: t('tabs.focus'),
    Settings: t('tabs.settings'),
  };

  return (
    <View style={[
      styles.wrapper,
      {
        bottom: insets.bottom + 12,
        backgroundColor: currentTheme === 'dark'
          ? 'rgba(37,41,40,0.96)'
          : 'rgba(255,255,255,0.96)',
        borderColor: currentTheme === 'dark'
          ? 'rgba(255,255,255,0.08)'
          : 'rgba(42,75,61,0.12)',
        shadowColor: currentTheme === 'dark' ? '#000' : '#2A4B3D',
      },
    ]}>
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            activeOpacity={0.8}
            style={styles.tabItem}
          >
            {isFocused ? (
              <View style={[styles.pill, { backgroundColor: colors.primary }]}>
                <Text style={styles.pillIcon}>{TAB_ICONS[route.name]}</Text>
                <Text style={styles.pillLabel} numberOfLines={1} adjustsFontSizeToFit>{TAB_LABELS[route.name]}</Text>
              </View>
            ) : (
              <View style={styles.inactiveItem}>
                <Text style={styles.inactiveIcon}>{TAB_ICONS[route.name]}</Text>
                <Text style={[styles.inactiveLabel, { color: colors.mutedText }]}>
                  {TAB_LABELS[route.name]}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        tabBar={(props) => <PillTabBar {...props} />}
        screenOptions={{ headerShown: false }}
      >
        <Tab.Screen name="Daily" component={DailyScreen} />
        <Tab.Screen name="Focus" component={FocusScreen} />
        <Tab.Screen name="Settings" component={SettingsScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 32,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
  },
  pill: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 24,
    gap: 3,
  },
  pillIcon: {
    fontSize: 18,
  },
  pillLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  inactiveItem: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    gap: 2,
  },
  inactiveIcon: {
    fontSize: 20,
    opacity: 0.45,
  },
  inactiveLabel: {
    fontSize: 10,
    fontWeight: '500',
    opacity: 0.6,
  },
});
