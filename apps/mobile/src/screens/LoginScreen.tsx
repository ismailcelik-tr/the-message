import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  SafeAreaView, StyleSheet, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform, ScrollView, Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { usePreferencesStore } from '../store/preferences.store';
import { useAuthStore } from '../store/auth.store';
import { supabase } from '../lib/supabase';
import { COLORS } from '../theme/colors';

const googleIcon = require('../../assets/icons/google.png');
const appleIcon = require('../../assets/icons/apple.png');

interface Props {
  onComplete: () => void;
}

type Mode = 'choose' | 'email';

export function LoginScreen({ onComplete }: Props) {
  const { t } = useTranslation();
  const currentTheme = usePreferencesStore((s) => s.currentTheme);
  const colors = COLORS[currentTheme];
  const signInAnonymously = useAuthStore((s) => s.signInAnonymously);

  const [mode, setMode] = useState<Mode>('choose');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const handleAnonymous = async () => {
    setLoading(true);
    try {
      await signInAnonymously();
      onComplete();
    } catch {
      Alert.alert(t('login.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleEmail = async () => {
    if (!email || !password) return;
    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        Alert.alert(t('login.checkEmail'));
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onComplete();
      }
    } catch (e: any) {
      Alert.alert(t('login.error'), e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar style={currentTheme === 'dark' ? 'light' : 'dark'} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          {/* Logo */}
          <View style={styles.logoSection}>
            <Text style={[styles.logo, { color: colors.primary }]}>{t('onboarding.logo')}</Text>
            <Text style={[styles.subLogo, { color: colors.secondary }]}>{t('onboarding.subtitle')}</Text>
          </View>

          {mode === 'choose' ? (
            <View style={styles.optionsSection}>
              <Text style={[styles.heading, { color: colors.text }]}>{t('login.title')}</Text>
              <Text style={[styles.subtitle, { color: colors.mutedText }]}>{t('login.subtitle')}</Text>

              {/* Email */}
              <TouchableOpacity
                style={[styles.socialBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => setMode('email')}
                activeOpacity={0.8}
              >
                <View style={styles.socialIconWrap}>
                  <Text style={{ fontSize: 18 }}>✉️</Text>
                </View>
                <Text style={[styles.socialLabel, { color: colors.text }]}>{t('login.continueEmail')}</Text>
              </TouchableOpacity>

              {/* Google */}
              <TouchableOpacity
                style={[styles.socialBtn, { backgroundColor: colors.card, borderColor: colors.border, opacity: 0.5 }]}
                activeOpacity={0.8}
                disabled
              >
                <Image source={googleIcon} style={styles.socialIconImg} resizeMode="contain" />
                <Text style={[styles.socialLabel, { color: colors.text }]}>{t('login.continueGoogle')}</Text>
                <Text style={[styles.comingSoon, { color: colors.mutedText }]}>{t('login.comingSoon')}</Text>
              </TouchableOpacity>

              {/* Apple */}
              <TouchableOpacity
                style={[styles.socialBtn, { backgroundColor: colors.card, borderColor: colors.border, opacity: 0.5 }]}
                activeOpacity={0.8}
                disabled
              >
                <Image
                  source={appleIcon}
                  style={[styles.socialIconImg, currentTheme === 'dark' && { tintColor: '#FFFFFF' }]}
                  resizeMode="contain"
                />
                <Text style={[styles.socialLabel, { color: colors.text }]}>{t('login.continueApple')}</Text>
                <Text style={[styles.comingSoon, { color: colors.mutedText }]}>{t('login.comingSoon')}</Text>
              </TouchableOpacity>

              {/* Anonim */}
              <TouchableOpacity onPress={handleAnonymous} disabled={loading} activeOpacity={0.7} style={styles.skipBtn}>
                {loading ? (
                  <ActivityIndicator color={colors.mutedText} />
                ) : (
                  <Text style={[styles.skipText, { color: colors.mutedText }]}>{t('login.continueAnonymous')}</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.optionsSection}>
              <Text style={[styles.heading, { color: colors.text }]}>
                {isSignUp ? t('login.signUp') : t('login.signIn')}
              </Text>

              <TextInput
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                placeholder={t('login.emailPlaceholder')}
                placeholderTextColor={colors.mutedText}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                placeholder={t('login.passwordPlaceholder')}
                placeholderTextColor={colors.mutedText}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />

              {/* Beni hatırla */}
              <TouchableOpacity
                style={styles.rememberRow}
                onPress={() => setRememberMe(!rememberMe)}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.checkbox,
                  { borderColor: colors.primary },
                  rememberMe && { backgroundColor: colors.primary },
                ]}>
                  {rememberMe && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={[styles.rememberText, { color: colors.mutedText }]}>{t('login.rememberMe')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                onPress={handleEmail}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.primaryBtnText}>
                    {isSignUp ? t('login.signUp') : t('login.signIn')}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)} style={styles.toggleBtn}>
                <Text style={[styles.toggleText, { color: colors.mutedText }]}>
                  {isSignUp ? t('login.alreadyHaveAccount') : t('login.noAccount')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setMode('choose')} style={styles.backBtn}>
                <Text style={[styles.backText, { color: colors.secondary }]}>{t('login.back')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { padding: 24, paddingBottom: 48 },
  logoSection: { marginTop: 32, marginBottom: 32, alignItems: 'center' },
  logo: { fontSize: 42, fontWeight: '300', letterSpacing: 2 },
  subLogo: { fontSize: 11, fontWeight: '600', letterSpacing: 6, marginTop: 6 },
  optionsSection: {},
  heading: { fontSize: 24, fontWeight: '600', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, textAlign: 'center', marginBottom: 32, lineHeight: 20 },
  socialBtn: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: 16,
    paddingVertical: 15, paddingHorizontal: 20,
    marginBottom: 12,
  },
  socialIconWrap: { width: 28, alignItems: 'center', marginRight: 8 },
  socialIconImg: { width: 22, height: 22, marginRight: 8 },
  socialLabel: { fontSize: 15, fontWeight: '600', flex: 1 },
  comingSoon: { fontSize: 11, fontWeight: '500' },
  skipBtn: { marginTop: 20, alignItems: 'center', paddingVertical: 12 },
  skipText: { fontSize: 14 },
  input: {
    borderWidth: 1, borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 16,
    fontSize: 15, marginBottom: 12,
  },
  rememberRow: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 20, marginTop: 4,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2,
    justifyContent: 'center', alignItems: 'center', marginRight: 10,
  },
  checkmark: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  rememberText: { fontSize: 14 },
  primaryBtn: {
    height: 54, borderRadius: 27,
    justifyContent: 'center', alignItems: 'center',
    marginTop: 4,
  },
  primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  toggleBtn: { marginTop: 16, alignItems: 'center' },
  toggleText: { fontSize: 14 },
  backBtn: { marginTop: 12, alignItems: 'center' },
  backText: { fontSize: 14, fontWeight: '600' },
});
