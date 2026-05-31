import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { usePreferencesStore } from '../store/preferences.store';
import { COLORS } from '../theme/colors';
import { DailyScreen } from '../screens/DailyScreen';
import { FocusScreen } from '../screens/FocusScreen';
import { SavedScreen } from '../screens/SavedScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { FocusFeedScreen } from '../screens/FocusFeedScreen';
import { AsmaAlHusnaScreen } from '../screens/AsmaAlHusnaScreen';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Tab = createBottomTabNavigator();
const DailyStack = createNativeStackNavigator();

function DailyStackScreen() {
  return (
    <DailyStack.Navigator screenOptions={{ headerShown: false }}>
      <DailyStack.Screen name="DailyMain" component={DailyScreen} />
      <DailyStack.Screen name="FocusFeed" component={FocusFeedScreen} />
      <DailyStack.Screen name="AsmaAlHusna" component={AsmaAlHusnaScreen} />
    </DailyStack.Navigator>
  );
}

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ICONS: Record<string, IoniconsName> = {
  Daily:    'book',
  Focus:    'heart',
  Saved:    'bookmark',
  Settings: 'settings-sharp',
};

function PillTabBar({ state, navigation }: BottomTabBarProps) {
  const { t } = useTranslation();
  const currentTheme = usePreferencesStore((s) => s.currentTheme);
  const colors = COLORS[currentTheme];
  const insets = useSafeAreaInsets();

  const TAB_LABELS: Record<string, string> = {
    Daily:    t('tabs.daily'),
    Focus:    t('tabs.focus'),
    Saved:    t('tabs.saved'),
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
        const iconName = TAB_ICONS[route.name];

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
                <Ionicons name={iconName} size={17} color="#FFF" />
                <Text style={styles.pillLabel} numberOfLines={1} adjustsFontSizeToFit>
                  {TAB_LABELS[route.name]}
                </Text>
              </View>
            ) : (
              <View style={styles.inactiveItem}>
                <Ionicons name={iconName} size={20} color={colors.mutedText} style={{ opacity: 0.55 }} />
                <Text style={[styles.inactiveLabel, { color: colors.mutedText }]} numberOfLines={1} adjustsFontSizeToFit>
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
  const locale = usePreferencesStore((s) => s.preferences.locale);

  useEffect(() => {
    if (i18n.language !== locale) {
      i18n.changeLanguage(locale);
    }
  }, [locale]);

  return (
    <NavigationContainer>
      <Tab.Navigator
        tabBar={(props) => <PillTabBar {...props} />}
        screenOptions={{ headerShown: false }}
      >
        <Tab.Screen name="Daily"    component={DailyStackScreen} />
        <Tab.Screen name="Focus"    component={FocusScreen} />
        <Tab.Screen name="Saved"    component={SavedScreen} />
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
    paddingHorizontal: 10,
    borderRadius: 24,
    gap: 3,
    maxWidth: 120,
  },
  pillLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  inactiveItem: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    gap: 2,
  },
  inactiveLabel: {
    fontSize: 9,
    fontWeight: '500',
    opacity: 0.6,
    textAlign: 'center',
  },
});
