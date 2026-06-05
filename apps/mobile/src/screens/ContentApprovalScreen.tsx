import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput } from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { fetchPendingContent } from '../api/admin.api';
import { COLORS } from '../theme/colors';
import { usePreferencesStore } from '../store/preferences.store';
import { Ionicons } from '@expo/vector-icons';

const TYPE_OPTIONS = [
  { key: 'all', labelKey: 'admin.all' },
  { key: 'verse', labelKey: 'admin.verse' },
  { key: 'hadith', labelKey: 'admin.hadith' },
  { key: 'prayer', labelKey: 'admin.prayer' },
  { key: 'dhikr', labelKey: 'admin.dhikr' },
  { key: 'worship', labelKey: 'admin.worship' },
];

export function ContentApprovalScreen() {
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const { t } = useTranslation();
  const currentTheme = usePreferencesStore((s) => s.currentTheme);
  const colors = COLORS[currentTheme];
  const insets = useSafeAreaInsets();

  const [items, setItems] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);

  // Filters
  const [isActiveFilter, setIsActiveFilter] = useState(false); // false = Pending, true = Approved
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedType, setSelectedType] = useState('all');

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const loadData = async (pageNum: number, isInitial = false) => {
    if (pageNum > 1 && !hasMore && !isInitial) return;
    
    if (isInitial) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const data = await fetchPendingContent(
        pageNum, 
        15, 
        isActiveFilter, 
        debouncedSearch, 
        selectedType === 'all' ? undefined : selectedType
      );
      
      if (isInitial) {
        setItems(data.items);
        setHasMore(data.items.length < data.total);
      } else {
        setItems(prev => {
          const existingIds = new Set(prev.map((i: any) => i.id));
          const newItems = data.items.filter((i: any) => !existingIds.has(i.id));
          const merged = [...prev, ...newItems];
          return merged;
        });
        setHasMore((items.length + data.items.length) < data.total);
      }
      
      setTotal(data.total);
      setPage(pageNum);
    } catch (e) {
      console.error('Error loading pending content:', e);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (isFocused) {
      loadData(1, true);
    }
  }, [isFocused, isActiveFilter, debouncedSearch, selectedType]);

  const getTimeLabel = (time: string) => {
    if (time === 'morning') return t('settings.slotLabels.morning');
    if (time === 'noon') return t('settings.slotLabels.noon');
    if (time === 'evening') return t('settings.slotLabels.evening');
    return time;
  };

  const renderItem = ({ item }: { item: any }) => {
    const trContent = item.translations?.tr?.content || '';
    const trSource = item.translations?.tr?.source || '';
    const enContent = item.translations?.en?.content || '';
    
    return (
      <TouchableOpacity
        style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => navigation.navigate('ContentDetail', { item })}
        activeOpacity={0.8}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.badge, { backgroundColor: colors.secondary + '20' }]}>
            <Text style={[styles.badgeText, { color: colors.secondary }]}>
              {t(`admin.${item.type}` as never).toUpperCase()}
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: colors.primary + '20', marginLeft: 8 }]}>
            <Text style={[styles.badgeText, { color: colors.primary }]}>
              {t(`focus.categories.${item.category}` as never).toUpperCase()}
            </Text>
          </View>
          <View style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {item.recommendedTime && item.recommendedTime !== 'any' ? (
              <Text style={[styles.recTime, { color: colors.mutedText, marginRight: 4 }]}>
                {getTimeLabel(item.recommendedTime)}
              </Text>
            ) : null}
            <View style={[styles.badge, { backgroundColor: isActiveFilter ? '#4CAF5020' : '#FF980020' }]}>
              <Text style={[styles.badgeText, { color: isActiveFilter ? '#4CAF50' : '#FF9800', fontWeight: '700' }]}>
                {isActiveFilter ? t('admin.statusApproved') : t('admin.statusPending')}
              </Text>
            </View>
          </View>
        </View>
        
        <Text style={[styles.textSnippet, { color: colors.text }]} numberOfLines={2}>
          TR: {trContent}
        </Text>
        <Text style={[styles.textSnippet, { color: colors.mutedText, marginTop: 4 }]} numberOfLines={2}>
          EN: {enContent}
        </Text>
        
        {trSource ? (
          <Text style={[styles.sourceText, { color: colors.primary, marginTop: 6 }]}>
            {t('admin.sourcePrefix')} {trSource}
          </Text>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>{t('admin.title')}</Text>
        <Text style={[styles.countText, { color: colors.mutedText }]}>({total})</Text>
      </View>

      {/* Filter Options Area */}
      <View style={styles.filterSection}>
        {/* Toggle Switch */}
        <View style={[styles.filterSwitchRow, { backgroundColor: colors.border + '20' }]}>
          <TouchableOpacity
            style={[styles.filterSwitchBtn, !isActiveFilter && { backgroundColor: colors.primary }]}
            onPress={() => setIsActiveFilter(false)}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterSwitchLabel, { color: !isActiveFilter ? '#FFF' : colors.text }]}>
              {t('admin.pending')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterSwitchBtn, isActiveFilter && { backgroundColor: colors.primary }]}
            onPress={() => setIsActiveFilter(true)}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterSwitchLabel, { color: isActiveFilter ? '#FFF' : colors.text }]}>
              {t('admin.approved')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Text Search Input */}
        <View style={[styles.searchBarContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="search" size={18} color={colors.mutedText} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t('admin.searchPlaceholder')}
            placeholderTextColor={colors.mutedText}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </View>

        {/* Chips for Types (Flex Wrapped) */}
        <View style={styles.chipsRow}>
          {TYPE_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={[
                styles.chipButton, 
                selectedType === opt.key 
                  ? { backgroundColor: colors.secondary } 
                  : { backgroundColor: colors.card, borderColor: colors.border }
              ]}
              onPress={() => setSelectedType(opt.key)}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.chipLabel, 
                { color: selectedType === opt.key ? '#FFF' : colors.text }
              ]}>
                {t(opt.labelKey)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 20 }]}
          onEndReached={() => {
            if (!loadingMore && hasMore) {
              loadData(page + 1);
            }
          }}
          onEndReachedThreshold={0.3}
          ListFooterComponent={() => {
            if (loadingMore) {
              return (
                <View style={styles.footerLoader}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              );
            }
            return null;
          }}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Ionicons name="checkmark-circle-outline" size={48} color={colors.mutedText} />
              <Text style={[styles.emptyText, { color: colors.mutedText, marginTop: 8 }]}>
                {isActiveFilter ? t('admin.noApproved') : t('admin.noPending')}
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backButton: { marginRight: 12 },
  title: { fontSize: 20, fontWeight: '700', letterSpacing: -0.5 },
  countText: { fontSize: 14, marginLeft: 6, fontWeight: '500' },
  filterSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
  filterSwitchRow: {
    flexDirection: 'row',
    borderRadius: 24,
    padding: 4,
    marginBottom: 4,
  },
  filterSwitchBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 20,
  },
  filterSwitchLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 4,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  chipButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  chipLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  list: { padding: 16 },
  itemCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  recTime: {
    fontSize: 11,
    fontWeight: '500',
  },
  textSnippet: {
    fontSize: 14,
    lineHeight: 20,
  },
  sourceText: {
    fontSize: 12,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerLoader: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
