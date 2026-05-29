import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { ContentItem } from '@the-message/shared';
import { usePreferencesStore } from '../store/preferences.store';
import { useAuthStore } from '../store/auth.store';
import { supabase } from '../lib/supabase';
import { removeBookmark } from '../lib/bookmarks';
import { COLORS, ColorScheme } from '../theme/colors';
import { FeedbackModal } from '../components/FeedbackModal';
import { AppModal, AppModalButton } from '../components/AppModal';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

// Grupların sıralama ve başlık key'leri
const GROUP_ORDER = ['esma', 'verse', 'hadith', 'prayer', 'worship', 'dhikr', 'notification'] as const;
type GroupType = typeof GROUP_ORDER[number];

const GROUP_TITLE_KEYS: Record<GroupType, string> = {
  esma:         'daily.esmaTitlePlural',
  verse:        'daily.verseTitlePlural',
  hadith:       'daily.hadithTitlePlural',
  prayer:       'daily.prayerTitlePlural',
  worship:      'daily.worshipTitlePlural',
  dhikr:        'daily.dhikrTitlePlural',
  notification: 'daily.notificationTitlePlural',
};

function renderBadgeIcon(type: string) {
  if (type === 'esma')         return <Text style={styles.arabicBadge}>ﷲ</Text>;
  if (type === 'verse')        return <Ionicons name={'book' as IoniconsName} size={16} color="#FFF" />;
  if (type === 'hadith')       return <MaterialCommunityIcons name="format-quote-open" size={20} color="#FFF" />;
  if (type === 'prayer')       return <MaterialCommunityIcons name="mosque" size={16} color="#FFF" />;
  if (type === 'worship')      return <MaterialCommunityIcons name="star-crescent" size={16} color="#FFF" />;
  if (type === 'notification') return <Ionicons name={'notifications' as IoniconsName} size={16} color="#FFF" />;
  return <Ionicons name={'bookmark' as IoniconsName} size={16} color="#FFF" />;
}

interface SavedCardProps {
  item: ContentItem;
  locale: 'tr' | 'en';
  colors: ColorScheme;
  onRemove: (item: ContentItem) => void;
  onFeedback: (item: ContentItem) => void;
}

function SavedCard({ item, locale, colors, onRemove, onFeedback }: SavedCardProps) {
  const tr = item.translations[locale];
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {item.type === 'esma' && tr?.arabicText && (
        <View style={styles.esmaWrap}>
          <Text style={[styles.esmaArabic, { color: colors.text }]}>{tr.arabicText}</Text>
          {tr.transliteration && (
            <Text style={[styles.esmaLatin, { color: colors.primary }]}>{tr.transliteration}</Text>
          )}
        </View>
      )}

      <View style={[styles.contentBox, { backgroundColor: colors.border + '66' }]}>
        <Text style={[styles.contentText, { color: colors.text }]}>{tr?.content}</Text>
      </View>

      {/* Kaynak + kaydet ikonu aynı satırda */}
      <View style={styles.sourceRow}>
        <View style={[styles.sourceIconBox, { backgroundColor: colors.primary + '22' }]}>
          {item.type === 'notification'
            ? <Ionicons name="time-outline" size={11} color={colors.primary} />
            : <Ionicons name="bookmark" size={11} color={colors.primary} />
          }
        </View>
        <Text style={[styles.sourceText, { color: colors.mutedText, flex: 1 }]}>
          {item.type === 'notification'
            ? (() => {
                const d = new Date(item.date);
                return d.toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' });
              })()
            : tr?.source ? `(${tr.source})` : ''
          }
        </Text>
        <TouchableOpacity
          onPress={() => onFeedback(item)}
          style={[styles.actionBtn, { backgroundColor: colors.background }]}
        >
          <Ionicons name="flag-outline" size={15} color={colors.mutedText} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onRemove(item)}
          style={[styles.bookmarkBtn, { backgroundColor: colors.background }]}
        >
          <Ionicons name="bookmark" size={17} color={colors.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function SavedEmptyDescription({ colors }: { colors: ColorScheme }) {
  const { t } = useTranslation();

  return (
    <Text style={[styles.emptyDesc, { color: colors.mutedText }]}>
      {t('saved.emptyDescBeforeIcon' as never)}{' '}
      <Ionicons name="bookmark-outline" size={17} color={colors.mutedText} />{' '}
      {t('saved.emptyDescAfterIcon' as never)}
    </Text>
  );
}

export function SavedScreen() {
  const { t } = useTranslation();
  const currentTheme = usePreferencesStore((s) => s.currentTheme);
  const locale = usePreferencesStore((s) => s.preferences.locale);
  const { user, isAnonymous } = useAuthStore();
  const colors = COLORS[currentTheme];
  const insets = useSafeAreaInsets();

  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feedbackItem, setFeedbackItem] = useState<ContentItem | null>(null);
  const [modal, setModal] = useState<{ title?: string; message: string; buttons: AppModalButton[] } | null>(null);

  const load = useCallback(async () => {
    if (!user || isAnonymous) { setLoading(false); return; }
    const { data, error } = await supabase
      .from('bookmarks')
      .select('snapshot, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (!error && data) {
      setItems(data.map((r: { snapshot: ContentItem }) => r.snapshot));
    }
    setLoading(false);
  }, [user, isAnonymous]);

  useEffect(() => { load(); }, [load]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const handleRemove = useCallback((item: ContentItem) => {
    if (!user) return;
    setModal({
      title: t('saved.removeTitle'),
      message: t('saved.removeMessage'),
      buttons: [
        { text: t('settings.cancel'), onPress: () => setModal(null), variant: 'ghost' },
        {
          text: t('saved.remove'),
          variant: 'destructive',
          onPress: async () => {
            setModal(null);
            await removeBookmark(user.id, item.id);
            setItems((prev) => prev.filter((i) => i.id !== item.id));
          },
        },
      ],
    });
  }, [user, t]);

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!user || isAnonymous) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <Ionicons name="bookmark-outline" size={48} color={colors.mutedText} style={{ marginBottom: 16 }} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('saved.loginRequired')}</Text>
        <Text style={[styles.emptyDesc, { color: colors.mutedText }]}>{t('saved.loginRequiredDesc')}</Text>
      </View>
    );
  }

  // Tiplere göre grupla, GROUP_ORDER sırasına göre
  const grouped = GROUP_ORDER.reduce<Record<string, ContentItem[]>>((acc, type) => {
    const group = items.filter((i) => i.type === type);
    if (group.length > 0) acc[type] = group;
    return acc;
  }, {});

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {feedbackItem && (
        <FeedbackModal
          visible={!!feedbackItem}
          item={feedbackItem}
          locale={locale}
          colors={colors}
          userId={user?.id}
          onClose={() => setFeedbackItem(null)}
        />
      )}

      {modal && (
        <AppModal
          visible
          title={modal.title}
          message={modal.message}
          buttons={modal.buttons}
          colors={colors}
        />
      )}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={items.length === 0
          ? [styles.centered, { paddingTop: insets.top + 32, flexGrow: 1 }]
          : [styles.scroll, { paddingTop: insets.top + 16 }]
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
      {items.length === 0 ? (
        <>
          <Ionicons name="bookmark-outline" size={48} color={colors.mutedText} style={{ marginBottom: 16 }} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('saved.empty')}</Text>
          <SavedEmptyDescription colors={colors} />
        </>
      ) : (
        <>
      <Text style={[styles.screenTitle, { color: colors.text }]}>{t('saved.title')}</Text>

      {Object.entries(grouped).map(([type, groupItems]) => (
        <View key={type}>
          {/* Grup başlığı */}
          <View style={styles.groupHeader}>
            <View style={[styles.groupIconBadge, { backgroundColor: colors.primary }]}>
              {renderBadgeIcon(type)}
            </View>
            <Text style={[styles.groupTitle, { color: colors.secondary }]}>
              {t(GROUP_TITLE_KEYS[type as GroupType] as never)}
            </Text>
          </View>

          {type === 'notification'
            ? (() => {
                // Aynı tarihteki bildirimleri tek kart altında grupla
                const byDate = groupItems.reduce<Record<string, ContentItem[]>>((acc, item) => {
                  const d = item.date ?? 'unknown';
                  if (!acc[d]) acc[d] = [];
                  acc[d].push(item);
                  return acc;
                }, {});
                return Object.entries(byDate)
                  .sort(([a], [b]) => b.localeCompare(a))
                  .map(([date, dateItems]) => {
                    const dateLabel = new Date(date).toLocaleDateString(
                      locale === 'tr' ? 'tr-TR' : 'en-US',
                      { day: 'numeric', month: 'long', year: 'numeric' },
                    );
                    return (
                      <View key={date} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Text style={[styles.notifDateLabel, { color: colors.mutedText }]}>{dateLabel}</Text>
                        {dateItems.map((item, index) => {
                          const tr = item.translations[locale];
                          return (
                            <View
                              key={item.id}
                              style={[
                                styles.notifRow,
                                index < dateItems.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                              ]}
                            >
                              <View style={{ flex: 1 }}>
                                <View style={[styles.contentBox, { backgroundColor: colors.border + '66' }]}>
                                  <Text style={[styles.contentText, { color: colors.text }]}>{tr?.content}</Text>
                                </View>
                                {tr?.source ? (
                                  <Text style={[styles.notifSource, { color: colors.mutedText }]}>({tr.source})</Text>
                                ) : null}
                              </View>
                              <View style={{ gap: 8 }}>
                                <TouchableOpacity
                                  onPress={() => setFeedbackItem(item)}
                                  style={[styles.actionBtn, { backgroundColor: colors.background }]}
                                >
                                  <Ionicons name="flag-outline" size={15} color={colors.mutedText} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                  onPress={() => handleRemove(item)}
                                  style={[styles.bookmarkBtn, { backgroundColor: colors.background }]}
                                >
                                  <Ionicons name="bookmark" size={17} color={colors.primary} />
                                </TouchableOpacity>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    );
                  });
              })()
            : groupItems.map((item) => (
                <SavedCard
                  key={item.id}
                  item={item}
                  locale={locale}
                  colors={colors}
                  onRemove={handleRemove}
                  onFeedback={setFeedbackItem}
                />
              ))
          }
        </View>
      ))}
        </>
      )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyTitle: { fontSize: 18, fontWeight: '600', textAlign: 'center', marginBottom: 8 },
  emptyDesc: { fontSize: 14, textAlign: 'center', lineHeight: 20 },

  scroll: { padding: 16, paddingBottom: 120 },
  screenTitle: { fontSize: 26, fontWeight: '300', marginBottom: 8, letterSpacing: -0.5 },

  groupHeader: {
    flexDirection: 'row', alignItems: 'center',
    gap: 10, marginTop: 16, marginBottom: 10,
  },
  groupIconBadge: {
    width: 30, height: 30, borderRadius: 15,
    justifyContent: 'center', alignItems: 'center',
  },
  groupTitle: {
    fontSize: 14, fontWeight: '700', letterSpacing: 0.3,
  },

  card: {
    borderRadius: 20, borderWidth: 1,
    padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04, shadowRadius: 10, elevation: 2,
  },
  arabicBadge: { fontSize: 14, color: '#FFF', lineHeight: 20 },
  bookmarkBtn: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  actionBtn: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },

  esmaWrap: { alignItems: 'center', marginBottom: 12 },
  esmaArabic: { fontSize: 40, fontWeight: '300', textAlign: 'center', lineHeight: 56 },
  esmaLatin: { fontSize: 16, fontWeight: '600', marginTop: 4 },

  notifDateLabel: { fontSize: 12, fontWeight: '600', marginBottom: 8 },
  notifRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, gap: 10,
  },
  notifText: { fontSize: 14, lineHeight: 20 },
  notifSource: { fontSize: 12, marginTop: 4, fontStyle: 'italic' },

  contentBox: { borderRadius: 14, padding: 14, marginBottom: 12 },
  contentText: { fontSize: 15, lineHeight: 24 },

  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sourceIconBox: {
    width: 24, height: 24, borderRadius: 6,
    justifyContent: 'center', alignItems: 'center',
  },
  sourceText: { fontSize: 13 },
});
