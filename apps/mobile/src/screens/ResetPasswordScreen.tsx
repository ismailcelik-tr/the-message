import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  SafeAreaView, StyleSheet, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { usePreferencesStore } from '../store/preferences.store';
import { supabase } from '../lib/supabase';
import { COLORS } from '../theme/colors';

interface Props {
  onComplete: () => void;
}

export function ResetPasswordScreen({ onComplete }: Props) {
  const { t } = useTranslation();
  const currentTheme = usePreferencesStore((s) => s.currentTheme);
  const colors = COLORS[currentTheme];

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (password !== confirm) {
      Alert.alert(t('login.passwordMismatch'));
      return;
    }
    if (password.length < 6) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      Alert.alert(t('login.passwordSuccess'));
      onComplete();
    } catch (e: any) {
      Alert.alert(t('login.error'), e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar style={currentTheme === 'dark' ? 'light' : 'dark'} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.logoSection}>
            <Text style={[styles.logo, { color: colors.primary }]}>Çağrı</Text>
            <Text style={[styles.subLogo, { color: colors.secondary }]}>THE MESSAGE</Text>
          </View>

          <Text style={[styles.heading, { color: colors.text }]}>{t('login.newPassword')}</Text>

          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            placeholder={t('login.newPasswordPlaceholder')}
            placeholderTextColor={colors.mutedText}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoFocus
          />
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            placeholder={t('login.newPasswordConfirm')}
            placeholderTextColor={colors.mutedText}
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: password.length >= 6 ? colors.primary : colors.border }]}
            onPress={handleSubmit}
            disabled={loading || password.length < 6}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.primaryBtnText}>{t('login.resetPassword')}</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { padding: 24, paddingBottom: 48 },
  logoSection: { marginTop: 32, marginBottom: 40, alignItems: 'center' },
  logo: { fontSize: 42, fontWeight: '300', letterSpacing: 2 },
  subLogo: { fontSize: 11, fontWeight: '600', letterSpacing: 6, marginTop: 6 },
  heading: { fontSize: 24, fontWeight: '600', marginBottom: 24, textAlign: 'center' },
  input: {
    borderWidth: 1, borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 16,
    fontSize: 15, marginBottom: 12,
  },
  primaryBtn: {
    height: 54, borderRadius: 27,
    justifyContent: 'center', alignItems: 'center',
    marginTop: 8,
  },
  primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
});
