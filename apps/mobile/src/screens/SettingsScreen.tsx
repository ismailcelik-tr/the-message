import React from 'react';
import { View, Text, ScrollView, Switch, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { usePreferencesStore } from '../store/preferences.store';
import { COLORS } from '../theme/colors';
import { NotificationFrequency, SupportedLocale } from '@the-message/shared';

const FREQUENCIES: Array<{ key: NotificationFrequency; labelKey: string; detailKey: string }> = [
  { key: 'low', labelKey: 'settings.frequencyLow', detailKey: 'settings.frequencyLowDetail' },
  { key: 'medium', labelKey: 'settings.frequencyMedium', detailKey: 'settings.frequencyMediumDetail' },
  { key: 'high', labelKey: 'settings.frequencyHigh', detailKey: 'settings.frequencyHighDetail' },
];

export function SettingsScreen() {
  const { t } = useTranslation();
  const { currentTheme, toggleTheme, preferences, setPreferences, setLocale } = usePreferencesStore();
  const colors = COLORS[currentTheme];
  const insets = useSafeAreaInsets();

  const changeLocale = (locale: SupportedLocale) => {
    i18n.changeLanguage(locale);
    setLocale(locale);
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16 }]}
    >
      <Text style={[styles.title, { color: colors.text }]}>{t('settings.title')}</Text>

      {/* Notifications */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: 16 }]}>
        <View style={[styles.row, styles.lastRow]}>
          <View style={styles.textContainer}>
            <Text style={[styles.label, { color: colors.text }]}>{t('settings.notifications')}</Text>
            <Text style={[styles.desc, { color: colors.mutedText }]}>{t('settings.notificationsDesc')}</Text>
          </View>
          <Switch
            trackColor={{ false: '#767577', true: colors.secondary }}
            thumbColor={preferences.notificationEnabled ? colors.primary : '#f4f3f4'}
            onValueChange={(val) => setPreferences({ notificationEnabled: val })}
            value={preferences.notificationEnabled}
          />
        </View>
      </View>

      {/* Frequency */}
      {preferences.notificationEnabled && (
        <>
          <Text style={[styles.groupHeader, { color: colors.secondary }]}>{t('settings.frequency')}</Text>
          <View style={[styles.frequencyRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {FREQUENCIES.map((freq) => (
              <TouchableOpacity
                key={freq.key}
                style={[styles.freqButton, preferences.notificationFrequency === freq.key && { backgroundColor: colors.primary }]}
                onPress={() => setPreferences({ notificationFrequency: freq.key })}
                activeOpacity={0.8}
              >
                <Text style={[styles.freqLabel, { color: preferences.notificationFrequency === freq.key ? '#FFF' : colors.text }]}>
                  {t(freq.labelKey as never)}
                </Text>
                <Text style={[styles.freqDetail, { color: preferences.notificationFrequency === freq.key ? '#E8F0EC' : colors.mutedText }]}>
                  {t(freq.detailKey as never)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Silent Hours */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 16 }]}>
            <View style={[styles.row, { borderBottomColor: colors.border }, !preferences.silentHours.enabled && styles.lastRow]}>
              <View style={styles.textContainer}>
                <Text style={[styles.label, { color: colors.text }]}>{t('settings.silentHours')}</Text>
                <Text style={[styles.desc, { color: colors.mutedText }]}>{t('settings.silentHoursDesc')}</Text>
              </View>
              <Switch
                trackColor={{ false: '#767577', true: colors.secondary }}
                thumbColor={preferences.silentHours.enabled ? colors.primary : '#f4f3f4'}
                onValueChange={(val) => setPreferences({ silentHours: { ...preferences.silentHours, enabled: val } })}
                value={preferences.silentHours.enabled}
              />
            </View>
            {preferences.silentHours.enabled && (
              <View style={[styles.silentDetail, { borderTopColor: colors.border }]}>
                <Text style={[styles.silentText, { color: colors.mutedText }]}>
                  {t('settings.silentRange')}: {preferences.silentHours.start} - {preferences.silentHours.end}
                </Text>
              </View>
            )}
          </View>
        </>
      )}

      {/* Theme */}
      <Text style={[styles.groupHeader, { color: colors.secondary }]}>{t('settings.theme')}</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.row, styles.lastRow]}>
          <Text style={[styles.label, { color: colors.text }]}>{currentTheme === 'dark' ? t('settings.themeDark') : t('settings.themeLight')}</Text>
          <Switch
            trackColor={{ false: '#767577', true: colors.secondary }}
            thumbColor={currentTheme === 'dark' ? colors.primary : '#f4f3f4'}
            onValueChange={toggleTheme}
            value={currentTheme === 'dark'}
          />
        </View>
      </View>

      {/* Language */}
      <Text style={[styles.groupHeader, { color: colors.secondary }]}>{t('settings.language')}</Text>
      <View style={[styles.frequencyRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {(['tr', 'en'] as SupportedLocale[]).map((lang) => (
          <TouchableOpacity
            key={lang}
            style={[styles.freqButton, preferences.locale === lang && { backgroundColor: colors.primary }]}
            onPress={() => changeLocale(lang)}
            activeOpacity={0.8}
          >
            <Text style={[styles.freqLabel, { color: preferences.locale === lang ? '#FFF' : colors.text }]}>
              {lang === 'tr' ? 'Türkçe' : 'English'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, paddingBottom: 120, paddingTop: 20 },
  title: { fontSize: 26, fontWeight: '300', marginBottom: 16, letterSpacing: -0.5 },
  card: { borderRadius: 20, borderWidth: 1, overflow: 'hidden', marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  lastRow: { borderBottomWidth: 0 },
  textContainer: { flex: 1, paddingRight: 16 },
  label: { fontSize: 16, fontWeight: '600' },
  desc: { fontSize: 12, marginTop: 4 },
  groupHeader: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginTop: 16, marginBottom: 8, paddingLeft: 4, letterSpacing: 1 },
  frequencyRow: { flexDirection: 'row', borderRadius: 16, borderWidth: 1, overflow: 'hidden', padding: 4 },
  freqButton: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12 },
  freqLabel: { fontSize: 14, fontWeight: '700' },
  freqDetail: { fontSize: 10, marginTop: 2 },
  silentDetail: { padding: 14, borderTopWidth: 1, alignItems: 'center' },
  silentText: { fontSize: 13, fontWeight: '500' },
});
