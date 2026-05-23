import React from 'react';
import { View, Text, ScrollView, Switch, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { usePreferencesStore } from '../store/preferences.store';
import { COLORS } from '../theme/colors';
import { UserPreferences } from '@the-message/shared';

const CATEGORIES: Array<{ key: keyof UserPreferences['categoryPreferences']; labelKey: string; descKey: string }> = [
  { key: 'hope', labelKey: 'focus.categories.hope', descKey: 'focus.categories.hopeDesc' },
  { key: 'purpose', labelKey: 'focus.categories.purpose', descKey: 'focus.categories.purposeDesc' },
  { key: 'worship', labelKey: 'focus.categories.worship', descKey: 'focus.categories.worshipDesc' },
  { key: 'prayer', labelKey: 'focus.categories.prayer', descKey: 'focus.categories.prayerDesc' },
  { key: 'dhikr', labelKey: 'focus.categories.dhikr', descKey: 'focus.categories.dhikrDesc' },
];

export function FocusScreen() {
  const { t } = useTranslation();
  const { currentTheme, preferences, toggleCategory } = usePreferencesStore();
  const colors = COLORS[currentTheme];
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16 }]}
    >
      <Text style={[styles.title, { color: colors.text }]}>{t('focus.title')}</Text>
      <Text style={[styles.subtitle, { color: colors.mutedText }]}>{t('focus.subtitle')}</Text>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {CATEGORIES.map((item, index) => (
          <View
            key={item.key}
            style={[
              styles.row,
              { borderBottomColor: colors.border },
              index === CATEGORIES.length - 1 && styles.lastRow,
            ]}
          >
            <View style={styles.textContainer}>
              <Text style={[styles.label, { color: colors.text }]}>{t(item.labelKey as never)}</Text>
              <Text style={[styles.desc, { color: colors.mutedText }]}>{t(item.descKey as never)}</Text>
            </View>
            <Switch
              trackColor={{ false: '#767577', true: colors.secondary }}
              thumbColor={preferences.categoryPreferences[item.key] ? colors.primary : '#f4f3f4'}
              onValueChange={() => toggleCategory(item.key)}
              value={preferences.categoryPreferences[item.key]}
            />
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, paddingBottom: 120, paddingTop: 20 },
  title: { fontSize: 26, fontWeight: '300', marginBottom: 6, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, marginBottom: 20 },
  card: { borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  lastRow: { borderBottomWidth: 0 },
  textContainer: { flex: 1, paddingRight: 16 },
  label: { fontSize: 16, fontWeight: '600' },
  desc: { fontSize: 12, marginTop: 4 },
});
