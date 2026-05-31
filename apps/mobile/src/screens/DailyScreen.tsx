import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Share, RefreshControl,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { ContentItem } from '@the-message/shared';
import { usePreferencesStore } from '../store/preferences.store';
import { useAuthStore } from '../store/auth.store';
import { fetchDailyBundle } from '../api/content.api';
import { addBookmark, removeBookmark, fetchBookmarks } from '../lib/bookmarks';
import { fetchTodayPushLogs, getNextNotificationTime, saveNotificationBookmark, NotificationLogItem } from '../lib/notificationLog';
import { COLORS, ColorScheme } from '../theme/colors';
import { FeedbackModal } from '../components/FeedbackModal';
import { AppModal } from '../components/AppModal';
import { ContentCard } from '../components/ContentCard';

type CardType = 'esma' | 'verse' | 'hadith' | 'prayer' | 'worship';
type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

export function DailyScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const currentTheme = usePreferencesStore((s) => s.currentTheme);
  const locale = usePreferencesStore((s) => s.preferences.locale);
  const { user, isAnonymous } = useAuthStore();
  const colors = COLORS[currentTheme];
  const insets = useSafeAreaInsets();

  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedNotifIds, setSavedNotifIds] = useState<Set<string>>(new Set());
  const [savingNotifId, setSavingNotifId] = useState<string | null>(null);
  const [feedbackItem, setFeedbackItem] = useState<ContentItem | null>(null);
  const [modal, setModal] = useState<{ title?: string; message: string } | null>(null);

  const [refreshing, setRefreshing] = useState(false);

  const preferences = usePreferencesStore((s) => s.preferences);
  const categoryPreferences = preferences.categoryPreferences;
  const todayStr = new Date().toISOString().split('T')[0];

  const { data: bundle, isLoading, isError, refetch } = useQuery({
    queryKey: ['daily-bundle', locale, categoryPreferences],
    queryFn: () => fetchDailyBundle(locale, categoryPreferences),
  });

  // Load existing bookmarks for logged-in users
  const loadBookmarks = useCallback(async () => {
    if (!user || isAnonymous) return;
    const ids = await fetchBookmarks(user.id);
    setBookmarkedIds(new Set(ids.filter((id) => !id.startsWith('notif-'))));
    setSavedNotifIds(new Set(ids.filter((id) => id.startsWith('notif-'))));
  }, [user, isAnonymous]);

  useEffect(() => { loadBookmarks().catch(() => {}); }, [loadBookmarks]);

  const { data: rawTodayNotifications, refetch: refetchNotifs } = useQuery({
    queryKey: ['push-logs', user?.id, todayStr],
    queryFn: () => user ? fetchTodayPushLogs(user.id, todayStr, preferences) : [],
    enabled: !!user && !isAnonymous,
  });

  const todayNotifications = rawTodayNotifications ?? [];

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetch(), refetchNotifs(), loadBookmarks()]);
    setRefreshing(false);
  }, [refetch, refetchNotifs, loadBookmarks]);

  const handleSaveNotification = useCallback(async (logItem: NotificationLogItem) => {
    if (!user || isAnonymous) {
      setModal({ title: t('settings.saveRequiresAccountTitle'), message: t('settings.saveRequiresAccountDesc') });
      return;
    }
    setSavingNotifId(logItem.id);
    try {
      if (savedNotifIds.has(logItem.id)) {
        const { removeBookmark: rm } = await import('../lib/bookmarks');
        await rm(user.id, logItem.id);
        setSavedNotifIds((prev) => { const s = new Set(prev); s.delete(logItem.id); return s; });
      } else {
        await saveNotificationBookmark(user.id, logItem, todayStr);
        setSavedNotifIds((prev) => new Set(prev).add(logItem.id));
      }
    } catch {
      setModal({ message: t('daily.saveError') });
    } finally {
      setSavingNotifId(null);
    }
  }, [user, isAnonymous, savedNotifIds, todayStr, t]);

  const handleShare = useCallback(async (item: ContentItem) => {
    const translation = item.translations[locale];
    const text = t('daily.shareText', {
      content: translation?.content ?? '',
      source: translation?.source ?? '',
    });
    await Share.share({ message: text });
  }, [locale, t]);

  const handleBookmark = useCallback(async (item: ContentItem) => {
    if (!user || isAnonymous) {
      setModal({ title: t('settings.saveRequiresAccountTitle'), message: t('settings.saveRequiresAccountDesc') });
      return;
    }
    setSavingId(item.id);
    try {
      if (bookmarkedIds.has(item.id)) {
        await removeBookmark(user.id, item.id);
        setBookmarkedIds((prev) => { const s = new Set(prev); s.delete(item.id); return s; });
      } else {
        await addBookmark(user.id, item);
        setBookmarkedIds((prev) => new Set(prev).add(item.id));
      }
    } catch {
      setModal({ message: t('daily.saveError') });
    } finally {
      setSavingId(null);
    }
  }, [user, isAnonymous, bookmarkedIds, t]);

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.mutedText }]}>{t('daily.loading')}</Text>
      </View>
    );
  }

  if (isError || !bundle) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <Text style={[styles.errorText, { color: colors.mutedText }]}>{t('daily.error')}</Text>
        <TouchableOpacity style={[styles.retryBtn, { backgroundColor: colors.primary }]} onPress={() => refetch()}>
          <Text style={styles.retryText}>{t('daily.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const cards: { key: CardType; item: ContentItem; titleKey: string }[] = [
    { key: 'esma',    item: bundle.esma,    titleKey: 'daily.esmaTitle'    },
    { key: 'verse',   item: bundle.verse,   titleKey: 'daily.verseTitle'   },
    { key: 'hadith',  item: bundle.hadith,  titleKey: 'daily.hadithTitle'  },
    { key: 'prayer',  item: bundle.prayer,  titleKey: 'daily.prayerTitle'  },
    { key: 'worship', item: bundle.worship, titleKey: 'daily.worshipTitle' },
  ];

  const nextNotificationTime = getNextNotificationTime(preferences, todayStr);

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16 }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      <Text style={[styles.screenTitle, { color: colors.text }]}>{t('daily.title')}</Text>

      {cards.map(({ key, item, titleKey }) => (
        <View key={key}>
          {/* Başlık kartın dışında */}
          <View style={styles.cardGroupHeader}>
            <View style={[styles.groupIconBadge, { backgroundColor: colors.primary }]}>
              {key === 'esma'    && <Text style={styles.arabicBadge}>ﷲ</Text>}
              {key === 'verse'   && <Ionicons name={'book' as IoniconsName} size={15} color="#FFF" />}
              {key === 'hadith'  && <MaterialCommunityIcons name="format-quote-open" size={18} color="#FFF" />}
              {key === 'prayer'  && <MaterialCommunityIcons name="mosque" size={15} color="#FFF" />}
              {key === 'worship' && <MaterialCommunityIcons name="star-crescent" size={15} color="#FFF" />}
            </View>
            <Text style={[styles.groupHeaderTitle, { color: colors.secondary }]}>
              {t(titleKey as never)}
            </Text>
          </View>
          <ContentCard
            cardType={key}
            item={item}
            locale={locale}
            colors={colors}
            isBookmarked={bookmarkedIds.has(item.id)}
            isSaving={savingId === item.id}
            onShare={() => handleShare(item)}
            onBookmark={() => handleBookmark(item)}
            onFeedback={() => setFeedbackItem(item)}
          >
            {key === 'esma' && (
              <TouchableOpacity
                style={[styles.allAsmaBtn, { borderColor: colors.primary }]}
                onPress={() => (navigation as any).navigate('AsmaAlHusna')}
              >
                <Text style={[styles.allAsmaText, { color: colors.primary }]}>{t('daily.allAsma')}</Text>
                <Ionicons name="arrow-forward" size={14} color={colors.primary} />
              </TouchableOpacity>
            )}
          </ContentCard>
        </View>
      ))}

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

      <TouchableOpacity
        style={[styles.readMoreBtn, { backgroundColor: colors.primary }]}
        onPress={() => (navigation as any).navigate('FocusFeed')}
        activeOpacity={0.8}
      >
        <Text style={styles.readMoreText}>{locale === 'tr' ? 'Daha Fazlasını Oku' : 'Read More'}</Text>
        <Ionicons name="arrow-forward" size={18} color="#FFF" />
      </TouchableOpacity>

      <AppModal
        visible={!!modal}
        title={modal?.title}
        message={modal?.message ?? ''}
        colors={colors}
        buttons={[{ text: t('settings.cancel'), onPress: () => setModal(null), variant: 'primary' }]}
      />

      {(todayNotifications.length > 0 || nextNotificationTime) && (
        <View>
          <View style={styles.cardGroupHeader}>
            <View style={[styles.groupIconBadge, { backgroundColor: colors.primary }]}>
              <Ionicons name={'notifications' as IoniconsName} size={15} color="#FFF" />
            </View>
            <Text style={[styles.groupHeaderTitle, { color: colors.secondary }]}>
              {t('daily.todayNotifications')}
            </Text>
          </View>
          {todayNotifications.length > 0 ? (
            <NotificationsCard
              notifications={todayNotifications}
              locale={locale}
              colors={colors}
              todayStr={todayStr}
              savedIds={savedNotifIds}
              savingId={savingNotifId}
              onSave={handleSaveNotification}
            />
          ) : null}
          {nextNotificationTime && (
            <View style={[styles.card, styles.upcomingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name={'time-outline' as IoniconsName} size={20} color={colors.primary} />
              <Text style={[styles.upcomingText, { color: colors.mutedText }]}>
                {locale === 'tr'
                  ? `Bir sonraki mesajın saat ${nextNotificationTime}'de geliyor. Merak etme, sürpriz olsun 🤍`
                  : `Your next message arrives at ${nextNotificationTime}. Stay curious 🤍`}
              </Text>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}



interface NotificationsCardProps {
  notifications: NotificationLogItem[];
  locale: 'tr' | 'en';
  colors: ColorScheme;
  todayStr: string;
  savedIds: Set<string>;
  savingId: string | null;
  onSave: (item: NotificationLogItem) => void;
}

function NotificationsCard({ notifications, locale, colors, todayStr, savedIds, savingId, onSave }: NotificationsCardProps) {
  // Format: 24 Mayıs 2026 / May 24, 2026
  const dateLabel = new Date(todayStr).toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'en-US', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.notifDate, { color: colors.mutedText, marginBottom: 8 }]}>{dateLabel}</Text>

      {notifications.map((logItem, index) => {
        const tr = logItem.content.translations[locale];
        const isSaved = savedIds.has(logItem.id);
        const isSaving = savingId === logItem.id;
        return (
          <View
            key={logItem.id}
            style={[
              styles.notifRow,
              index < notifications.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
            ]}
          >
            <View style={styles.notifTimeWrap}>
              <Text style={[styles.notifTime, { color: colors.primary }]}>{logItem.scheduledTime}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.notifText, { color: colors.text }]}>
                {tr?.content}
              </Text>
              {!!tr?.source && (
                <Text style={[styles.notifSource, { color: colors.mutedText }]}>
                  {`(${tr.source})`}
                </Text>
              )}
            </View>
            <TouchableOpacity
              onPress={() => onSave(logItem)}
              style={[styles.actionBtn, { backgroundColor: colors.background, marginTop: 0, alignSelf: 'flex-start' }]}
              disabled={isSaving}
            >
              {isSaving
                ? <ActivityIndicator size="small" color={colors.mutedText} />
                : <Ionicons
                    name={isSaved ? 'bookmark' : 'bookmark-outline'}
                    size={17}
                    color={isSaved ? colors.primary : colors.mutedText}
                  />
              }
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 12, fontSize: 14 },
  errorText: { fontSize: 15, textAlign: 'center', marginBottom: 16 },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20 },
  retryText: { color: '#FFF', fontWeight: '600' },

  scroll: { padding: 16, paddingBottom: 120 },
  screenTitle: { fontSize: 26, fontWeight: '300', marginBottom: 8, letterSpacing: -0.5 },

  cardGroupHeader: {
    flexDirection: 'row', alignItems: 'center',
    gap: 10, marginTop: 12, marginBottom: 8,
  },
  groupIconBadge: {
    width: 28, height: 28, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  groupHeaderTitle: {
    fontSize: 14, fontWeight: '700', letterSpacing: 0.3,
  },

  card: {
    borderRadius: 20, borderWidth: 1,
    padding: 16, marginBottom: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04, shadowRadius: 10, elevation: 2,
  },
  arabicBadge: { fontSize: 15, color: '#FFF', lineHeight: 20 },
  actionBtn: {
    width: 32, height: 32, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
  },

  notifDate: { fontSize: 12, marginTop: 1 },
  notifRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingVertical: 10, gap: 10,
  },
  notifTimeWrap: {
    minWidth: 46, alignItems: 'center', paddingTop: 2,
  },
  notifTime: { fontSize: 13, fontWeight: '700' },
  notifText: { fontSize: 13, lineHeight: 18 },
  notifSource: { fontSize: 11, marginTop: 3 },

  upcomingCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, marginTop: 6,
  },
  upcomingText: { flex: 1, fontSize: 13, lineHeight: 20 },

  readMoreBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 24,
    marginVertical: 16,
  },
  readMoreText: {
    color: '#FFF', fontSize: 16, fontWeight: '600', letterSpacing: 0.5,
  },

  allAsmaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 16,
    borderWidth: 1, marginTop: 12,
  },
  allAsmaText: {
    fontSize: 14, fontWeight: '600',
  },
});
