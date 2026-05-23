import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { usePreferencesStore } from '../store/preferences.store';
import { fetchDailyContent } from '../api/content.api';
import { COLORS } from '../theme/colors';

export function DailyScreen() {
  const { t } = useTranslation();
  const currentTheme = usePreferencesStore((s) => s.currentTheme);
  const locale = usePreferencesStore((s) => s.preferences.locale);
  const colors = COLORS[currentTheme];

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['daily-content', locale],
    queryFn: () => fetchDailyContent(locale),
  });

  const translation = data?.translations[locale];
  const timeLabel = data
    ? t(`daily.time${data.recommendedTime.charAt(0).toUpperCase() + data.recommendedTime.slice(1)}` as never)
    : '';

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.mutedText }]}>{t('daily.loading')}</Text>
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.mutedText }]}>{t('daily.error')}</Text>
        <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.primary }]} onPress={() => refetch()}>
          <Text style={styles.retryText}>{t('daily.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.scroll}
    >
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('daily.title')}</Text>

      <View style={[styles.messageCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.quoteMark, { color: colors.accent }]}>"</Text>
        <Text style={[styles.content, { color: colors.text }]}>{translation?.content}</Text>
        {translation?.source && (
          <Text style={[styles.source, { color: colors.secondary }]}>{translation.source}</Text>
        )}
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.footer}>
          <Text style={[styles.categoryTag, { color: colors.mutedText, backgroundColor: colors.background }]}>
            {data.category.toUpperCase()}
          </Text>
          <Text style={[styles.timeTag, { color: colors.mutedText }]}>
            {timeLabel}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 12, fontSize: 14 },
  errorText: { fontSize: 15, textAlign: 'center', marginBottom: 16 },
  retryButton: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20 },
  retryText: { color: '#FFF', fontWeight: '600' },
  scroll: { padding: 20, paddingBottom: 40 },
  sectionTitle: { fontSize: 26, fontWeight: '300', marginBottom: 16, letterSpacing: -0.5 },
  messageCard: {
    borderRadius: 24, padding: 28, borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.03, shadowRadius: 15, elevation: 2,
  },
  quoteMark: { fontSize: 80, fontFamily: 'serif', opacity: 0.15, position: 'absolute', top: 10, left: 20 },
  content: { fontSize: 20, fontWeight: '400', lineHeight: 30, marginBottom: 16, marginTop: 10, textAlign: 'center' },
  source: { fontSize: 14, fontStyle: 'italic', textAlign: 'center', marginBottom: 16 },
  divider: { height: 1, width: '100%', marginVertical: 12 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  categoryTag: { fontSize: 11, fontWeight: '700', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8, overflow: 'hidden' },
  timeTag: { fontSize: 12 },
});
