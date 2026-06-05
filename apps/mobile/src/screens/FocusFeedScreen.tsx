import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, TouchableOpacity, Share } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { usePreferencesStore } from '../store/preferences.store';
import { useAuthStore } from '../store/auth.store';
import { apiFetch } from '../api/client';
import { ApiResponse, ContentItem, PaginatedResponse } from '@the-message/shared';
import { COLORS } from '../theme/colors';
import { ContentCard } from '../components/ContentCard';
import { addBookmark, removeBookmark, fetchBookmarks } from '../lib/bookmarks';
import { FeedbackModal } from '../components/FeedbackModal';
import { AppModal } from '../components/AppModal';

export function FocusFeedScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute();
  const { mood } = (route.params ?? {}) as { mood?: string };

  const currentTheme = usePreferencesStore((s) => s.currentTheme);
  const locale = usePreferencesStore((s) => s.preferences.locale);
  const categoryPreferences = usePreferencesStore((s) => s.preferences.categoryPreferences);
  const { user, isAnonymous } = useAuthStore();
  const colors = COLORS[currentTheme];
  const insets = useSafeAreaInsets();

  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);
  const [feedbackItem, setFeedbackItem] = useState<ContentItem | null>(null);
  const [modal, setModal] = useState<{ title?: string; message: string } | null>(null);
  
  // Seed for shuffling the feed, changes on pull-to-refresh
  const [feedSeed, setFeedSeed] = useState(() => Math.random().toString(36).substring(7));
  const [isRefreshing, setIsRefreshing] = useState(false);

  React.useEffect(() => {
    if (!user) return;
    fetchBookmarks(user.id).then(ids => setBookmarkedIds(new Set(ids))).catch(() => {});
  }, [user]);

  const activeCategories = (Object.keys(categoryPreferences) as Array<keyof typeof categoryPreferences>)
    .filter(k => categoryPreferences[k])
    .join(',');

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['focus-feed', locale, activeCategories, feedSeed, mood],
    queryFn: async ({ pageParam = 1 }) => {
      let url = `/content?locale=${locale}&page=${pageParam}&limit=20&excludeTypes=esma&seed=${feedSeed}`;
      if (activeCategories && !mood) {
        url += `&categories=${activeCategories}`;
      }
      if (mood) {
        url += `&mood=${mood}`;
      }
      const res = await apiFetch<ApiResponse<PaginatedResponse<ContentItem>>>(url);
      return res.data;
    },
    getNextPageParam: (lastPage) => {
      const totalPages = Math.ceil(lastPage!.total / lastPage!.limit);
      return lastPage!.page < totalPages ? lastPage!.page + 1 : undefined;
    },
    initialPageParam: 1,
  });

  const handleShare = useCallback(async (item: ContentItem) => {
    const translation = item.translations[locale];
    const text = t('daily.shareText', {
      content: translation?.content ?? '',
      source: translation?.source ?? '',
    });
    await Share.share({ message: text });
  }, [locale, t]);

  const handleBookmark = useCallback(async (item: ContentItem) => {
    if (!user) return;
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

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setFeedSeed(Math.random().toString(36).substring(7));
    // The query key change will automatically trigger a fetch
    setTimeout(() => setIsRefreshing(false), 500); // UI feel
  }, []);

  const items = data?.pages.flatMap(p => p?.items ?? []) ?? [];

  const headerTitle = mood
    ? t('moods.feedTitle', { mood: t(`moods.${mood}` as never) })
    : (locale === 'tr' ? 'Daha Fazlasını Oku' : 'Read More');

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + 12, paddingBottom: 12, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{headerTitle}</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={[styles.errorText, { color: colors.mutedText }]}>{t('daily.error')}</Text>
          <TouchableOpacity style={[styles.retryBtn, { backgroundColor: colors.primary }]} onPress={() => refetch()}>
            <Text style={styles.retryText}>{t('daily.retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 20 }]}
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          renderItem={({ item }) => (
            <ContentCard
              cardType={item.type}
              item={item}
              locale={locale}
              colors={colors}
              isBookmarked={bookmarkedIds.has(item.id)}
              isSaving={savingId === item.id}
              onShare={() => handleShare(item)}
              onBookmark={() => handleBookmark(item)}
              onFeedback={() => setFeedbackItem(item)}
              showBadge={true}
            />
          )}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) {
              fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={isFetchingNextPage ? <ActivityIndicator size="small" color={colors.primary} style={{ margin: 20 }} /> : null}
        />
      )}

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

      <AppModal
        visible={!!modal}
        title={modal?.title}
        message={modal?.message ?? ''}
        colors={colors}
        buttons={[{ text: t('settings.cancel'), onPress: () => setModal(null), variant: 'primary' }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, borderBottomWidth: 1,
  },
  backBtn: {
    width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 18, fontWeight: '600',
  },
  center: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
  },
  errorText: { fontSize: 15, marginBottom: 16 },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20 },
  retryText: { color: '#FFF', fontWeight: '600' },
  list: { padding: 16 },
});
