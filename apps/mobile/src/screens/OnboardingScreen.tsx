import React from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { usePreferencesStore } from '../store/preferences.store';
import { COLORS } from '../theme/colors';

interface Props {
  onComplete: () => void;
}

export function OnboardingScreen({ onComplete }: Props) {
  const { t } = useTranslation();
  const currentTheme = usePreferencesStore((s) => s.currentTheme);
  const colors = COLORS[currentTheme];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar style={currentTheme === 'dark' ? 'light' : 'dark'} />
      <View style={styles.container}>
        <View style={styles.logoSection}>
          <Text style={[styles.logo, { color: colors.primary }]}>{t('onboarding.logo')}</Text>
          <Text style={[styles.subLogo, { color: colors.secondary }]}>{t('onboarding.subtitle')}</Text>
        </View>

        <View style={styles.card}>
          <Text style={[styles.title, { color: colors.text }]}>{t('onboarding.title')}</Text>
          <Text style={[styles.description, { color: colors.mutedText }]}>{t('onboarding.description1')}</Text>
          <Text style={[styles.description, { color: colors.mutedText, marginTop: 8 }]}>{t('onboarding.description2')}</Text>
        </View>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={onComplete}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>{t('onboarding.cta')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, padding: 24, justifyContent: 'space-between', alignItems: 'center' },
  logoSection: { marginTop: 80, alignItems: 'center' },
  logo: { fontSize: 54, fontWeight: '300', letterSpacing: 2 },
  subLogo: { fontSize: 12, fontWeight: '600', letterSpacing: 6, marginTop: 8 },
  card: { padding: 24, borderRadius: 24, width: '100%', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '600', marginBottom: 16 },
  description: { fontSize: 15, lineHeight: 22, textAlign: 'center' },
  button: {
    width: '100%', height: 56, borderRadius: 28,
    justifyContent: 'center', alignItems: 'center', marginBottom: 40,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 10, elevation: 3,
  },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', letterSpacing: 0.5 },
});
