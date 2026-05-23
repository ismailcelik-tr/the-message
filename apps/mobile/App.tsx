import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Switch,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  UserPreferences,
  DailyMessage,
  ThemeType,
  NotificationFrequency,
} from '@the-message/shared';

// Harmonious Design Color Palettes
const COLORS = {
  light: {
    background: '#F4F7F6', // Soft Light Greenish/Gray
    card: '#FFFFFF',
    primary: '#2A4B3D',    // Deep Forest Green
    secondary: '#7FA899',  // Muted Sage Green
    accent: '#D4AF37',     // Soft Gold
    text: '#2E3033',       // Charcoal
    mutedText: '#6E7370',  // Soft Gray
    border: '#E3E8E6',
  },
  dark: {
    background: '#1A1D1C', // Dark Slate Green
    card: '#252928',
    primary: '#A0C4B6',    // Soft Jade Green
    secondary: '#5C7E71',  // Deep Sage
    accent: '#ECCB6A',     // Amber Gold
    text: '#E1E6E4',       // Soft white/gray
    mutedText: '#9AA19E',  // Silver gray
    border: '#323937',
  },
};

export default function App() {
  const [isOnboarded, setIsOnboarded] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'message' | 'notifications' | 'settings'>('message');
  
  // App states linked with shared interfaces
  const [preferences, setPreferences] = useState<UserPreferences>({
    theme: 'system',
    notificationEnabled: true,
    notificationFrequency: 'medium',
    categoryPreferences: {
      hope: true,
      purpose: true,
      worship: true,
      prayer: true,
      dhikr: false,
    },
    silentHours: {
      start: '22:00',
      end: '06:00',
      enabled: true,
    },
  });

  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>('light');

  const [dailyMessage] = useState<DailyMessage>({
    id: 'msg-101',
    content: 'Allah, hiç kimseye gücünün yettiğinden fazlasını yüklemez.',
    source: 'Bakara Suresi, 286. Ayet',
    category: 'hope',
    recommendedTime: 'morning',
    date: new Date().toISOString().split('T')[0],
  });

  const activeColors = currentTheme === 'dark' ? COLORS.dark : COLORS.light;

  const toggleTheme = () => {
    const nextTheme = currentTheme === 'light' ? 'dark' : 'light';
    setCurrentTheme(nextTheme);
    setPreferences(prev => ({
      ...prev,
      theme: nextTheme as ThemeType,
    }));
  };

  const toggleCategory = (key: keyof typeof preferences.categoryPreferences) => {
    setPreferences(prev => ({
      ...prev,
      categoryPreferences: {
        ...prev.categoryPreferences,
        [key]: !prev.categoryPreferences[key],
      },
    }));
  };

  const setFrequency = (freq: NotificationFrequency) => {
    setPreferences(prev => ({
      ...prev,
      notificationFrequency: freq,
    }));
  };

  // Onboarding Screen Render
  if (!isOnboarded) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: activeColors.background }]}>
        <StatusBar style={currentTheme === 'dark' ? 'light' : 'dark'} />
        <View style={styles.onboardingContainer}>
          <View style={styles.logoSection}>
            <Text style={[styles.onboardingLogo, { color: activeColors.primary }]}>Çağrı</Text>
            <Text style={[styles.onboardingSubLogo, { color: activeColors.secondary }]}>THE MESSAGE</Text>
          </View>

          <View style={styles.onboardingCard}>
            <Text style={[styles.onboardingTitle, { color: activeColors.text }]}>Huzura Davet</Text>
            <Text style={[styles.onboardingText, { color: activeColors.mutedText }]}>
              Gün boyu kalbini dinlendirecek, sana umut, amaç, kulluk bilinci ve manevi farkındalık kazandıracak küçük hatırlatıcılar.
            </Text>
            <Text style={[styles.onboardingText, { color: activeColors.mutedText, marginTop: 8 }]}>
              Yargılamayan, bunaltmayan, modern ve sakin bir yol arkadaşlığı.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: activeColors.primary }]}
            onPress={() => setIsOnboarded(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Huzurla Başla</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Main Layout Render
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: activeColors.background }]}>
      <StatusBar style={currentTheme === 'dark' ? 'light' : 'dark'} />
      
      {/* Top Header */}
      <View style={[styles.header, { borderBottomColor: activeColors.border }]}>
        <Text style={[styles.headerTitle, { color: activeColors.primary }]}>Çağrı</Text>
        <TouchableOpacity style={styles.themeToggle} onPress={toggleTheme} activeOpacity={0.7}>
          <Text style={{ fontSize: 20 }}>{currentTheme === 'dark' ? '☀️' : '🌙'}</Text>
        </TouchableOpacity>
      </View>

      {/* Main Content Area */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {activeTab === 'message' && (
          <View style={styles.tabContent}>
            <Text style={[styles.sectionTitle, { color: activeColors.text }]}>Günün Mesajı</Text>
            <View style={[styles.messageCard, { backgroundColor: activeColors.card, borderColor: activeColors.border }]}>
              <View style={styles.quoteMarkContainer}>
                <Text style={[styles.quoteMark, { color: activeColors.accent }]}>“</Text>
              </View>
              <Text style={[styles.messageText, { color: activeColors.text }]}>
                {dailyMessage.content}
              </Text>
              <Text style={[styles.messageSource, { color: activeColors.secondary }]}>
                {dailyMessage.source}
              </Text>
              <View style={[styles.divider, { backgroundColor: activeColors.border }]} />
              <View style={styles.messageFooter}>
                <Text style={[styles.messageCategoryTag, { color: activeColors.mutedText, backgroundColor: activeColors.background }]}>
                  ✨ {dailyMessage.category.toUpperCase()}
                </Text>
                <Text style={[styles.messageTimeTag, { color: activeColors.mutedText }]}>
                  🕒 {dailyMessage.recommendedTime === 'any' ? 'Günün Her Saati' : 'Sabah/Gündüz'}
                </Text>
              </View>
            </View>

            <View style={styles.tipCard}>
              <Text style={[styles.tipTitle, { color: activeColors.primary }]}>Günün Manevi Alışkanlığı</Text>
              <Text style={[styles.tipText, { color: activeColors.mutedText }]}>
                Bu ayeti okuduktan sonra derin bir nefes alıp omuzlarındaki gereksiz yükleri teslim etmeyi dene.
              </Text>
            </View>
          </View>
        )}

        {activeTab === 'notifications' && (
          <View style={styles.tabContent}>
            <Text style={[styles.sectionTitle, { color: activeColors.text }]}>Manevi Odaklar</Text>
            <Text style={[styles.sectionSubTitle, { color: activeColors.mutedText }]}>
              Hangi kategorilerde bildirim almak istediğini seç.
            </Text>

            <View style={[styles.settingsCard, { backgroundColor: activeColors.card, borderColor: activeColors.border }]}>
              {[
                { key: 'hope' as const, label: 'Umut ve Teselli', desc: 'Zor zamanlarda ferahlık verici ayet ve sözler.' },
                { key: 'purpose' as const, label: 'Hayatın Amacı', desc: 'Kulluk ve varoluş bilincini hatırlatan mesajlar.' },
                { key: 'worship' as const, label: 'İbadet ve Kulluk', desc: 'Namaz ve küçük sürdürülebilir ameller.' },
                { key: 'prayer' as const, label: 'Dua ve Münacat', desc: 'Güne ve geceye başlarken okunacak sığınma duaları.' },
                { key: 'dhikr' as const, label: 'Zikir ve Tefekkür', desc: 'Kalbi diri tutan zikir ve düşünceler.' },
              ].map((item) => (
                <View key={item.key} style={[styles.settingRow, { borderBottomColor: activeColors.border }]}>
                  <View style={styles.settingTextContainer}>
                    <Text style={[styles.settingLabel, { color: activeColors.text }]}>{item.label}</Text>
                    <Text style={[styles.settingDesc, { color: activeColors.mutedText }]}>{item.desc}</Text>
                  </View>
                  <Switch
                    trackColor={{ false: '#767577', true: activeColors.secondary }}
                    thumbColor={preferences.categoryPreferences[item.key] ? activeColors.primary : '#f4f3f4'}
                    onValueChange={() => toggleCategory(item.key)}
                    value={preferences.categoryPreferences[item.key]}
                  />
                </View>
              ))}
            </View>
          </View>
        )}

        {activeTab === 'settings' && (
          <View style={styles.tabContent}>
            <Text style={[styles.sectionTitle, { color: activeColors.text }]}>Ayarlar</Text>

            {/* Notification Switch */}
            <View style={[styles.settingsCard, { backgroundColor: activeColors.card, borderColor: activeColors.border, marginBottom: 16 }]}>
              <View style={styles.settingRow}>
                <View style={styles.settingTextContainer}>
                  <Text style={[styles.settingLabel, { color: activeColors.text }]}>Günlük Hatırlatıcılar</Text>
                  <Text style={[styles.settingDesc, { color: activeColors.mutedText }]}>Bildirimleri aç veya kapat</Text>
                </View>
                <Switch
                  trackColor={{ false: '#767577', true: activeColors.secondary }}
                  thumbColor={preferences.notificationEnabled ? activeColors.primary : '#f4f3f4'}
                  onValueChange={(val) => setPreferences(prev => ({ ...prev, notificationEnabled: val }))}
                  value={preferences.notificationEnabled}
                />
              </View>
            </View>

            {/* Frequency Selector */}
            {preferences.notificationEnabled && (
              <>
                <Text style={[styles.settingGroupHeader, { color: activeColors.secondary }]}>Bildirim Sıklığı</Text>
                <View style={[styles.frequencyRow, { backgroundColor: activeColors.card, borderColor: activeColors.border }]}>
                  {[
                    { key: 'low' as const, label: 'Sakin', detail: 'Günde 1 kez' },
                    { key: 'medium' as const, label: 'Dengeli', detail: 'Günde 3 kez' },
                    { key: 'high' as const, label: 'Derin', detail: 'Günde 5 kez' },
                  ].map((freq) => (
                    <TouchableOpacity
                      key={freq.key}
                      style={[
                        styles.frequencyButton,
                        preferences.notificationFrequency === freq.key && { backgroundColor: activeColors.primary }
                      ]}
                      onPress={() => setFrequency(freq.key)}
                      activeOpacity={0.8}
                    >
                      <Text style={[
                        styles.frequencyLabelText,
                        { color: preferences.notificationFrequency === freq.key ? '#FFFFFF' : activeColors.text }
                      ]}>
                        {freq.label}
                      </Text>
                      <Text style={[
                        styles.frequencyDetailText,
                        { color: preferences.notificationFrequency === freq.key ? '#E8F0EC' : activeColors.mutedText }
                      ]}>
                        {freq.detail}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Silent Hours Card */}
                <View style={[styles.settingsCard, { backgroundColor: activeColors.card, borderColor: activeColors.border, marginTop: 16 }]}>
                  <View style={styles.settingRow}>
                    <View style={styles.settingTextContainer}>
                      <Text style={[styles.settingLabel, { color: activeColors.text }]}>Rahatsız Etme Saatleri</Text>
                      <Text style={[styles.settingDesc, { color: activeColors.mutedText }]}>Gece boyunca bildirimleri sessize al</Text>
                    </View>
                    <Switch
                      trackColor={{ false: '#767577', true: activeColors.secondary }}
                      thumbColor={preferences.silentHours.enabled ? activeColors.primary : '#f4f3f4'}
                      onValueChange={(val) => setPreferences(prev => ({
                        ...prev,
                        silentHours: { ...prev.silentHours, enabled: val }
                      }))}
                      value={preferences.silentHours.enabled}
                    />
                  </View>
                  {preferences.silentHours.enabled && (
                    <View style={[styles.silentHoursDetail, { borderTopColor: activeColors.border }]}>
                      <Text style={[styles.silentText, { color: activeColors.mutedText }]}>
                        Sessiz Aralık: {preferences.silentHours.start} - {preferences.silentHours.end}
                      </Text>
                    </View>
                  )}
                </View>
              </>
            )}
          </View>
        )}
      </ScrollView>

      {/* Navigation Tab Bar */}
      <View style={[styles.tabBar, { backgroundColor: activeColors.card, borderTopColor: activeColors.border }]}>
        {[
          { tab: 'message' as const, label: 'Günün Sözü', icon: '📖' },
          { tab: 'notifications' as const, label: 'Manevi Odak', icon: '🔔' },
          { tab: 'settings' as const, label: 'Ayarlar', icon: '⚙️' },
        ].map((item) => (
          <TouchableOpacity
            key={item.tab}
            style={styles.tabItem}
            onPress={() => setActiveTab(item.tab)}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.tabIcon,
              activeTab === item.tab ? { color: activeColors.primary } : { color: activeColors.mutedText }
            ]}>
              {item.icon}
            </Text>
            <Text style={[
              styles.tabLabel,
              activeTab === item.tab
                ? { color: activeColors.primary, fontWeight: '700' }
                : { color: activeColors.mutedText, fontWeight: '500' }
            ]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  onboardingContainer: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoSection: {
    marginTop: 80,
    alignItems: 'center',
  },
  onboardingLogo: {
    fontSize: 54,
    fontWeight: '300',
    letterSpacing: 2,
  },
  onboardingSubLogo: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 6,
    marginTop: 8,
  },
  onboardingCard: {
    padding: 24,
    borderRadius: 24,
    width: '100%',
    alignItems: 'center',
  },
  onboardingTitle: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 16,
  },
  onboardingText: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  primaryButton: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  header: {
    height: 60,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '300',
    letterSpacing: 1,
  },
  themeToggle: {
    padding: 8,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  tabContent: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 26,
    fontWeight: '300',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  sectionSubTitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  messageCard: {
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.03,
    shadowRadius: 15,
    elevation: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  quoteMarkContainer: {
    position: 'absolute',
    top: 10,
    left: 20,
  },
  quoteMark: {
    fontSize: 80,
    fontFamily: 'serif',
    opacity: 0.15,
  },
  messageText: {
    fontSize: 20,
    fontWeight: '400',
    lineHeight: 30,
    marginBottom: 16,
    marginTop: 10,
    textAlign: 'center',
  },
  messageSource: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 16,
  },
  divider: {
    height: 1,
    width: '100%',
    marginVertical: 12,
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  messageCategoryTag: {
    fontSize: 11,
    fontWeight: '700',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    overflow: 'hidden',
  },
  messageTimeTag: {
    fontSize: 12,
  },
  tipCard: {
    marginTop: 20,
    backgroundColor: '#E8F0EC',
    borderRadius: 16,
    padding: 18,
  },
  tipTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  tipText: {
    fontSize: 13,
    lineHeight: 18,
  },
  settingsCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  settingTextContainer: {
    flex: 1,
    paddingRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  settingDesc: {
    fontSize: 12,
    marginTop: 4,
  },
  settingGroupHeader: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 24,
    marginBottom: 8,
    paddingLeft: 4,
    letterSpacing: 1,
  },
  frequencyRow: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 4,
  },
  frequencyButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
  },
  frequencyLabelText: {
    fontSize: 14,
    fontWeight: '700',
  },
  frequencyDetailText: {
    fontSize: 10,
    marginTop: 2,
  },
  silentHoursDetail: {
    padding: 14,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  silentText: {
    fontSize: 13,
    fontWeight: '500',
  },
  tabBar: {
    height: 70,
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingBottom: 8,
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  tabLabel: {
    fontSize: 11,
  },
});
