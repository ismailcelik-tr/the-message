import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  SafeAreaView, StyleSheet, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView, Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import * as WebBrowser from 'expo-web-browser';
import * as AppleAuthentication from 'expo-apple-authentication';
import { usePreferencesStore } from '../store/preferences.store';
import { useAuthStore } from '../store/auth.store';
import { supabase } from '../lib/supabase';
import { COLORS } from '../theme/colors';
import { AppModal } from '../components/AppModal';

WebBrowser.maybeCompleteAuthSession();

const googleIcon = require('../../assets/icons/google.png');
const appleIcon = require('../../assets/icons/apple.png');

interface Props {
  onComplete: () => void;
}

type Mode = 'choose' | 'email' | 'forgotPassword' | 'confirmEmail';

export function LoginScreen({ onComplete }: Props) {
  const { t } = useTranslation();
  const currentTheme = usePreferencesStore((s) => s.currentTheme);
  const locale = usePreferencesStore((s) => s.preferences.locale);
  const colors = COLORS[currentTheme];
  const signInAnonymously = useAuthStore((s) => s.signInAnonymously);

  const [mode, setMode] = useState<Mode>('choose');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [anonLoading, setAnonLoading] = useState(false);
  const [showResetSentModal, setShowResetSentModal] = useState(false);
  const [otp, setOtp] = useState('');
  const [modal, setModal] = useState<{ title?: string; message: string } | null>(null);

  const handleGoogle = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'cagri://login-callback',
          skipBrowserRedirect: true,
          queryParams: { prompt: 'select_account' },
        },
      });
      if (error) throw error;
      if (!data.url) throw new Error('No OAuth URL');

      const result = await WebBrowser.openAuthSessionAsync(data.url, 'cagri://login-callback');
      if (result.type === 'success' && result.url) {
        // Supabase returns tokens in the hash fragment: #access_token=...&refresh_token=...
        const rawUrl = result.url;
        const hashIndex = rawUrl.indexOf('#');
        const fragment = hashIndex >= 0 ? rawUrl.slice(hashIndex + 1) : '';
        const params = new URLSearchParams(fragment);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          if (sessionError) throw sessionError;
          onComplete();
        }
      }
    } catch (e: any) {
      setModal({ title: t('login.error'), message: e.message });
    } finally {
      setLoading(false);
    }
  };

  const handleApple = async () => {
    if (Platform.OS !== 'ios') return;
    setLoading(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) throw new Error('No identity token from Apple');

      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });
      if (error) throw error;
      onComplete();
    } catch (e: any) {
      if ((e as any).code === 'ERR_REQUEST_CANCELED') return;
      setModal({ title: t('login.error'), message: e.message });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'signup' });
      if (error) throw error;
      onComplete();
    } catch (e: any) {
      setModal({ title: t('login.error'), message: e.message });
    } finally {
      setLoading(false);
    }
  };

  const handleAnonymous = async () => {
    setAnonLoading(true);
    try {
      await signInAnonymously();
      onComplete();
    } catch (e: any) {
      setModal({ title: t('login.error'), message: e.message ?? '' });
    } finally {
      setAnonLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'cagri://reset-password',
      });
      if (error) throw error;
      setShowResetSentModal(true);
    } catch (e: any) {
      setModal({ title: t('login.error'), message: e.message });
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
        setMode('confirmEmail');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onComplete();
      }
    } catch (e: any) {
      setModal({ title: t('login.error'), message: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <AppModal
        visible={showResetSentModal}
        title={t('login.resetPasswordSentTitle' as never)}
        message={t('login.resetPasswordSentBody' as never)}
        colors={colors}
        buttons={[{
          text: t('login.ok' as never),
          onPress: () => { setShowResetSentModal(false); setMode('choose'); },
          variant: 'primary',
        }]}
      />
      <AppModal
        visible={!!modal}
        title={modal?.title}
        message={modal?.message ?? ''}
        colors={colors}
        buttons={[{
          text: t('login.ok' as never),
          onPress: () => setModal(null),
          variant: 'primary',
        }]}
      />
      <StatusBar style={currentTheme === 'dark' ? 'light' : 'dark'} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          {/* Logo */}
          <View style={styles.logoSection}>
            {locale === 'en' ? (
              <>
                <Text style={[styles.logo, { color: colors.primary }]}>{t('onboarding.subtitle')}</Text>
                <Text style={[styles.subLogo, { color: colors.secondary }]}>{t('onboarding.logo')}</Text>
              </>
            ) : (
              <>
                <Text style={[styles.logo, { color: colors.primary }]}>{t('onboarding.logo')}</Text>
                <Text style={[styles.subLogo, { color: colors.secondary }]}>{t('onboarding.subtitle')}</Text>
              </>
            )}
          </View>

          {mode === 'choose' && (
            <View style={styles.optionsSection}>
              <Text style={[styles.heading, { color: colors.text }]}>{t('login.title')}</Text>
              <Text style={[styles.subtitle, { color: colors.mutedText }]}>{t('login.subtitle')}</Text>

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

              <TouchableOpacity
                style={[styles.socialBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                activeOpacity={0.8}
                onPress={handleGoogle}
                disabled={loading}
              >
                <View style={styles.socialIconWrap}>
                  <Image source={googleIcon} style={styles.socialIconImg} resizeMode="contain" />
                </View>
                <Text style={[styles.socialLabel, { color: colors.text }]}>{t('login.continueGoogle')}</Text>
              </TouchableOpacity>

              {Platform.OS === 'ios' && (
                <TouchableOpacity
                  style={[styles.socialBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                  activeOpacity={0.8}
                  onPress={handleApple}
                  disabled={loading}
                >
                  <View style={styles.socialIconWrap}>
                    <Image
                      source={appleIcon}
                      style={[styles.socialIconImg, { width: 34, height: 34 }, currentTheme === 'dark' && { tintColor: '#FFFFFF' }]}
                      resizeMode="contain"
                    />
                  </View>
                  <Text style={[styles.socialLabel, { color: colors.text }]}>{t('login.continueApple')}</Text>
                </TouchableOpacity>
              )}

              <View style={[styles.anonDivider, { borderTopColor: colors.border }]} />

              <TouchableOpacity
                style={[styles.socialBtn, styles.anonBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={handleAnonymous}
                disabled={loading || anonLoading}
                activeOpacity={0.8}
              >
                <View style={styles.socialIconWrap}>
                  <Text style={{ fontSize: 18 }}>👤</Text>
                </View>
                {anonLoading ? (
                  <ActivityIndicator color={colors.mutedText} style={{ flex: 1 }} />
                ) : (
                  <Text style={[styles.socialLabel, { color: colors.mutedText }]}>{t('login.continueAnonymous')}</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {mode === 'email' && (
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

              {!isSignUp && (
                <TouchableOpacity onPress={() => setMode('forgotPassword')} style={styles.toggleBtn}>
                  <Text style={[styles.toggleText, { color: colors.secondary }]}>{t('login.forgotPassword')}</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity onPress={() => setMode('choose')} style={styles.backBtn}>
                <Text style={[styles.backText, { color: colors.secondary }]}>{t('login.back')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {mode === 'confirmEmail' && (
            <View style={styles.optionsSection}>
              <Text style={[styles.heading, { color: colors.text }]}>{t('login.confirmEmail')}</Text>
              <Text style={[styles.subtitle, { color: colors.mutedText }]}>{t('login.confirmEmailSubtitle', { email })}</Text>

              <TextInput
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text, textAlign: 'center', fontSize: 28, fontWeight: '700', letterSpacing: 8 }]}
                placeholder="______"
                placeholderTextColor={colors.mutedText}
                value={otp}
                onChangeText={(v) => setOtp(v.replace(/[^0-9]/g, '').slice(0, 6))}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
              />

              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: otp.length === 6 ? colors.primary : colors.border, marginTop: 16 }]}
                onPress={handleVerifyOtp}
                disabled={loading || otp.length !== 6}
                activeOpacity={0.8}
              >
                {loading
                  ? <ActivityIndicator color="#FFF" />
                  : <Text style={styles.primaryBtnText}>{t('login.confirmEmailBtn')}</Text>
                }
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setMode('email')} style={[styles.backBtn, { marginTop: 24 }]}>
                <Text style={[styles.backText, { color: colors.secondary }]}>{t('login.back')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {mode === 'forgotPassword' && (
            <View style={styles.optionsSection}>
              <Text style={[styles.heading, { color: colors.text }]}>{t('login.resetPassword')}</Text>
              <Text style={[styles.subtitle, { color: colors.mutedText }]}>{t('login.resetPasswordSubtitle')}</Text>

              <TextInput
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                placeholder={t('login.emailPlaceholder')}
                placeholderTextColor={colors.mutedText}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
              />

              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                onPress={handleForgotPassword}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.primaryBtnText}>{t('login.resetPassword')}</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setMode('email')} style={[styles.backBtn, { marginTop: 32 }]}>
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
  socialIconWrap: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  socialIconImg: { width: 28, height: 28, marginRight: 8 },
  socialLabel: { fontSize: 15, fontWeight: '600', flex: 1 },
  comingSoon: { fontSize: 11, fontWeight: '500' },
  anonDivider: { borderTopWidth: StyleSheet.hairlineWidth, marginVertical: 12, marginHorizontal: 4 },
  anonBtn: { opacity: 0.85 },
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
