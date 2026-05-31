import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ContentItem } from '@the-message/shared';
import { ColorScheme } from '../theme/colors';

type CardType = 'esma' | 'verse' | 'hadith' | 'prayer' | 'worship' | string;

export interface ContentCardProps {
  cardType: CardType;
  item: ContentItem;
  locale: 'tr' | 'en';
  colors: ColorScheme;
  isBookmarked: boolean;
  isSaving: boolean;
  onShare: () => void;
  onBookmark: () => void;
  onFeedback: () => void;
}

export function ContentCard({ cardType, item, locale, colors, isBookmarked, isSaving, onShare, onBookmark, onFeedback }: ContentCardProps) {
  const tr = item.translations[locale];

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Esma: Arapça büyük + transliterasyon */}
      {cardType === 'esma' && tr?.arabicText && (
        <View style={styles.esmaArabicWrap}>
          <Text style={[styles.esmaArabic, { color: colors.text }]}>{tr.arabicText}</Text>
          {tr.transliteration && (
            <Text style={[styles.esmaLatin, { color: colors.primary }]}>{tr.transliteration}</Text>
          )}
        </View>
      )}

      {/* İçerik kutusu */}
      <View style={[styles.contentBox, { backgroundColor: colors.border + '66' }]}>
        <Text style={[styles.contentText, { color: colors.text }]}>{tr?.content}</Text>
      </View>

      {/* Kaynak + aksiyon butonları */}
      <View style={styles.sourceRow}>
        <View style={[styles.sourceIconBox, { backgroundColor: colors.primary + '22' }]}>
          <Ionicons name="bookmark" size={11} color={colors.primary} />
        </View>
        <Text style={[styles.sourceText, { color: colors.mutedText, flex: 1 }]}>
          {tr?.source ? `(${tr.source})` : ''}
        </Text>
        <TouchableOpacity onPress={onFeedback} style={[styles.actionBtn, { backgroundColor: colors.background }]}>
          <Ionicons name="flag-outline" size={17} color={colors.mutedText} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onBookmark} style={[styles.actionBtn, { backgroundColor: colors.background }]} disabled={isSaving}>
          {isSaving
            ? <ActivityIndicator size="small" color={colors.mutedText} />
            : <Ionicons
                name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
                size={17}
                color={isBookmarked ? colors.primary : colors.mutedText}
              />
          }
        </TouchableOpacity>
        <TouchableOpacity onPress={onShare} style={[styles.actionBtn, { backgroundColor: colors.background }]}>
          <Ionicons name="share-outline" size={17} color={colors.mutedText} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20, borderWidth: 1,
    padding: 16, marginBottom: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04, shadowRadius: 10, elevation: 2,
  },
  actionBtn: {
    width: 32, height: 32, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
  },
  esmaArabicWrap: { alignItems: 'center', marginBottom: 12 },
  esmaArabic: { fontSize: 48, fontWeight: '300', textAlign: 'center', lineHeight: 68 },
  esmaLatin: { fontSize: 18, fontWeight: '600', marginTop: 4, letterSpacing: 0.5 },
  contentBox: {
    borderRadius: 14, padding: 16, marginBottom: 12,
  },
  contentText: { fontSize: 16, lineHeight: 26, fontWeight: '400' },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sourceIconBox: {
    width: 26, height: 26, borderRadius: 6,
    justifyContent: 'center', alignItems: 'center',
  },
  sourceText: { fontSize: 13 },
});
