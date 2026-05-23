import React from 'react';
import { View, Text, ScrollView, Switch, TouchableOpacity, StyleSheet, Alert, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { usePreferencesStore } from '../store/preferences.store';
import { useAuthStore } from '../store/auth.store';
import { COLORS } from '../theme/colors';
import { NotificationFrequency, SupportedLocale } from '@the-message/shared';
import { TimePickerRow } from '../components/TimePickerRow';
import { LoginScreen } from './LoginScreen';

const FREQUENCIES: Array<{ key: NotificationFrequency; labelKey: string; detailKey: string }> = [
  { key: 'low', labelKey: 'settings.frequencyLow', detailKey: 'settings.frequencyLowDetail' },
  { key: 'medium', labelKey: 'settings.frequencyMedium', detailKey: 'settings.frequencyMediumDetail' },
  { key: 'high', labelKey: 'settings.frequencyHigh', detailKey: 'settings.frequencyHighDetail' },
];

const SLOT_LABEL_KEYS: Record<string, string> = {
  morning: 'settings.slotLabels.morning',
  midMorning: 'settings.slotLabels.midMorning',
  noon: 'settings.slotLabels.noon',
  afternoon: 'settings.slotLabels.afternoon',
  evening: 'settings.slotLabels.evening',
};

export function SettingsScreen() {
  const { t } = useTranslation();
  const { currentTheme, toggleTheme, preferences, setPreferences, setLocale, updateSlotTime } = usePreferencesStore();
  const { user, isAnonymous, signOut } = useAuthStore();
  const colors = COLORS[currentTheme];
  const insets = useSafeAreaInsets();
  const [showLogin, setShowLogin] = React.useState(false);

  const changeLocale = (locale: SupportedLocale) => {
    i18n.changeLanguage(locale);
    setLocale(locale);
  };

  const handleSignOut = () => {
    Alert.alert(
      t('settings.signOutTitle'),
      t('settings.signOutMessage'),
      [
        { text: t('settings.cancel'), style: 'cancel' },
        { text: t('settings.signOut'), style: 'destructive', onPress: signOut },
      ],
    );
  };

  const currentSlots = preferences.notificationSchedule[preferences.notificationFrequency];

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16 }]}
    >
      <Text style={[styles.title, { color: colors.text }]}>{t('settings.title')}</Text>

      {/* Notifications toggle */}
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

      {preferences.notificationEnabled && (
        <>
          {/* Frequency selector */}
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

          {/* Notification times */}
          <Text style={[styles.groupHeader, { color: colors.secondary }]}>{t('settings.notificationTimes')}</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {currentSlots.map((slot, index) => (
              <TimePickerRow
                key={`${preferences.notificationFrequency}-${index}`}
                label={t(SLOT_LABEL_KEYS[slot.label] as never)}
                time={slot.time}
                theme={currentTheme}
                onConfirm={(time) => updateSlotTime(preferences.notificationFrequency, index, time)}
              />
            ))}
            {/* Remove bottom border on last row */}
            <View style={styles.cardBottomFix} />
          </View>

          {/* Silent Hours */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 8 }]}>
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
              <>
                <TimePickerRow
                  label={t('settings.silentStart')}
                  time={preferences.silentHours.start}
                  theme={currentTheme}
                  onConfirm={(time) => setPreferences({ silentHours: { ...preferences.silentHours, start: time } })}
                />
                <TimePickerRow
                  label={t('settings.silentEnd')}
                  time={preferences.silentHours.end}
                  theme={currentTheme}
                  onConfirm={(time) => setPreferences({ silentHours: { ...preferences.silentHours, end: time } })}
                />
                <View style={styles.cardBottomFix} />
              </>
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

      {/* Hesap */}
      <Text style={[styles.groupHeader, { color: colors.secondary }]}>{t('settings.account')}</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {isAnonymous || !user ? (
          <TouchableOpacity
            style={[styles.row, styles.lastRow]}
            onPress={() => setShowLogin(true)}
            activeOpacity={0.8}
          >
            <View style={styles.textContainer}>
              <Text style={[styles.label, { color: colors.primary }]}>{t('settings.createAccount')}</Text>
              <Text style={[styles.desc, { color: colors.mutedText }]}>{t('settings.createAccountDesc')}</Text>
            </View>
            <Text style={{ color: colors.primary, fontSize: 18 }}>→</Text>
          </TouchableOpacity>
        ) : (
          <>
            <View style={[styles.row, { borderBottomColor: colors.border }]}>
              <View style={styles.textContainer}>
                <Text style={[styles.label, { color: colors.text }]}>{t('settings.loggedInAs')}</Text>
                <Text style={[styles.desc, { color: colors.mutedText }]}>{user.email}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.row, styles.lastRow]}
              onPress={handleSignOut}
              activeOpacity={0.8}
            >
              <Text style={[styles.label, { color: '#E05252' }]}>{t('settings.signOut')}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Login modal (anonim kullanıcı için) */}
      <Modal visible={showLogin} animationType="slide" presentationStyle="pageSheet">
        <LoginScreen onComplete={() => setShowLogin(false)} />
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, paddingBottom: 120, paddingTop: 20 },
  title: { fontSize: 26, fontWeight: '300', marginBottom: 16, letterSpacing: -0.5 },
  card: { borderRadius: 20, borderWidth: 1, overflow: 'hidden', marginBottom: 8 },
  cardBottomFix: { height: 0 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  lastRow: { borderBottomWidth: 0 },
  textContainer: { flex: 1, paddingRight: 16 },
  label: { fontSize: 16, fontWeight: '600' },
  desc: { fontSize: 12, marginTop: 4 },
  groupHeader: { fontSize: 14, fontWeight: '700', marginTop: 16, marginBottom: 8, paddingLeft: 4, letterSpacing: 0.3 },
  frequencyRow: { flexDirection: 'row', borderRadius: 16, borderWidth: 1, overflow: 'hidden', padding: 4 },
  freqButton: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12 },
  freqLabel: { fontSize: 14, fontWeight: '700' },
  freqDetail: { fontSize: 10, marginTop: 2 },
  silentDetail: { padding: 14, borderTopWidth: 1, alignItems: 'center' },
  silentText: { fontSize: 13, fontWeight: '500' },
});
