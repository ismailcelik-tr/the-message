import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
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

function GlassTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
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
    <View style={[styles.tabBarWrapper, { bottom: insets.bottom + 12 }]}>
      <BlurView
        intensity={currentTheme === 'dark' ? 60 : 80}
        tint={currentTheme === 'dark' ? 'dark' : 'light'}
        style={styles.blurContainer}
      >
        <View style={[
          styles.tabBarInner,
          {
            borderColor: currentTheme === 'dark'
              ? 'rgba(255,255,255,0.12)'
              : 'rgba(42,75,61,0.15)',
            backgroundColor: currentTheme === 'dark'
              ? 'rgba(37,41,40,0.55)'
              : 'rgba(255,255,255,0.55)',
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
                activeOpacity={0.7}
                style={styles.tabItem}
              >
                {isFocused && (
                  <View style={[styles.activeIndicator, { backgroundColor: colors.primary }]} />
                )}
                <Text style={[styles.tabIcon, { opacity: isFocused ? 1 : 0.5 }]}>
                  {TAB_ICONS[route.name]}
                </Text>
                <Text style={[
                  styles.tabLabel,
                  { color: isFocused ? colors.primary : colors.mutedText },
                  isFocused && styles.tabLabelActive,
                ]}>
                  {TAB_LABELS[route.name]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}

export function AppNavigator() {
  const currentTheme = usePreferencesStore((s) => s.currentTheme);

  return (
    <NavigationContainer>
      <Tab.Navigator
        tabBar={(props) => <GlassTabBar {...props} />}
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
  tabBarWrapper: {
    position: 'absolute',
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  blurContainer: {
    width: '100%',
    borderRadius: 28,
    overflow: 'hidden',
  },
  tabBarInner: {
    flexDirection: 'row',
    borderRadius: 28,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    position: 'relative',
  },
  activeIndicator: {
    position: 'absolute',
    top: -10,
    width: 28,
    height: 3,
    borderRadius: 2,
  },
  tabIcon: {
    fontSize: 20,
    marginBottom: 3,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  tabLabelActive: {
    fontWeight: '700',
  },
});
