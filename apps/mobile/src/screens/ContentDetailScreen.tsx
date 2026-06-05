import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { updateContentItem, deleteContentItem } from '../api/admin.api';
import { COLORS } from '../theme/colors';
import { usePreferencesStore } from '../store/preferences.store';
import { Ionicons } from '@expo/vector-icons';
import { MessageCategory, ContentMood, DayTime } from '@the-message/shared';

const MOODS: ContentMood[] = ['huzunlu', 'stresli', 'yorgun', 'sukurlu', 'hasta', 'kaygili', 'yalniz', 'kararsiz', 'umutlu'];
const CATEGORIES: MessageCategory[] = ['hope', 'purpose', 'worship', 'prayer', 'dhikr'];
const DAY_TIMES: DayTime[] = ['morning', 'noon', 'evening', 'any'];
const TYPES = ['verse', 'hadith', 'prayer', 'dhikr', 'worship'];

export function ContentDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const currentTheme = usePreferencesStore((s) => s.currentTheme);
  const colors = COLORS[currentTheme];

  const { item } = route.params;

  const [type, setType] = useState(item.type);
  const [category, setCategory] = useState<MessageCategory>(item.category);
  const [recommendedTime, setRecommendedTime] = useState<DayTime>(item.recommendedTime);
  const [trContent, setTrContent] = useState(item.translations?.tr?.content || '');
  const [trSource, setTrSource] = useState(item.translations?.tr?.source || '');
  const [enContent, setEnContent] = useState(item.translations?.en?.content || '');
  const [enSource, setEnSource] = useState(item.translations?.en?.source || '');
  const [selectedMoods, setSelectedMoods] = useState<string[]>(item.moods || []);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const toggleMood = (mood: string) => {
    if (selectedMoods.includes(mood)) {
      setSelectedMoods(prev => prev.filter(m => m !== mood));
    } else {
      setSelectedMoods(prev => [...prev, mood]);
    }
  };

  const handleSave = async () => {
    if (!trContent.trim() || !enContent.trim()) {
      Alert.alert(t('login.error'), t('admin.errorEmpty'));
      return;
    }

    setSaving(true);
    try {
      const updatedBody = {
        type,
        category,
        recommendedTime,
        moods: selectedMoods,
        translations: {
          tr: {
            ...item.translations?.tr,
            content: trContent.trim(),
            source: trSource.trim(),
          },
          en: {
            ...item.translations?.en,
            content: enContent.trim(),
            source: enSource.trim(),
          }
        },
        isActive: true,
      };

      await updateContentItem(item.id, updatedBody);
      Alert.alert(t('settings.ok'), t('admin.saveSuccess'), [
        { text: t('settings.ok'), onPress: () => navigation.goBack() }
      ]);
    } catch (e: any) {
      Alert.alert(t('login.error'), t('admin.errorSave') + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      t('admin.deleteConfirmTitle'),
      t('admin.deleteConfirmDesc'),
      [
        { text: t('admin.deleteCancel'), style: 'cancel' },
        {
          text: t('admin.deleteConfirm'),
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteContentItem(item.id);
              navigation.goBack();
            } catch (e: any) {
              Alert.alert(t('login.error'), t('admin.errorDelete') + e.message);
            } finally {
              setDeleting(false);
            }
          }
        }
      ]
    );
  };

  const getTimeLabel = (time: string) => {
    if (time === 'morning') return t('settings.slotLabels.morning');
    if (time === 'noon') return t('settings.slotLabels.noon');
    if (time === 'evening') return t('settings.slotLabels.evening');
    if (time === 'any') return t('admin.any');
    return time;
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>{t('admin.editTitle')}</Text>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scroll} 
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets={true}
      >
        {/* Type Select */}
        <Text style={[styles.sectionTitle, { color: colors.secondary }]}>{t('admin.type')}</Text>
        <View style={styles.selectorRow}>
          {TYPES.map(tVal => (
            <TouchableOpacity
              key={tVal}
              style={[styles.chip, type === tVal ? { backgroundColor: colors.primary } : { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => setType(tVal)}
            >
              <Text style={[styles.chipText, { color: type === tVal ? '#FFF' : colors.text }]}>
                {t(`admin.${tVal}` as never)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Category Select */}
        <Text style={[styles.sectionTitle, { color: colors.secondary }]}>{t('admin.category')}</Text>
        <View style={styles.selectorRow}>
          {CATEGORIES.map(c => (
            <TouchableOpacity
              key={c}
              style={[styles.chip, category === c ? { backgroundColor: colors.primary } : { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => setCategory(c)}
            >
              <Text style={[styles.chipText, { color: category === c ? '#FFF' : colors.text }]}>
                {t(`admin.${c}` as never)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recommended Time Select */}
        <Text style={[styles.sectionTitle, { color: colors.secondary }]}>{t('admin.time')}</Text>
        <View style={styles.selectorRow}>
          {DAY_TIMES.map(dt => (
            <TouchableOpacity
              key={dt}
              style={[styles.chip, recommendedTime === dt ? { backgroundColor: colors.primary } : { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => setRecommendedTime(dt)}
            >
              <Text style={[styles.chipText, { color: recommendedTime === dt ? '#FFF' : colors.text }]}>
                {getTimeLabel(dt)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Moods Selector */}
        <Text style={[styles.sectionTitle, { color: colors.secondary }]}>{t('admin.moods')}</Text>
        <View style={styles.selectorRow}>
          {MOODS.map(m => {
            const isSelected = selectedMoods.includes(m);
            return (
              <TouchableOpacity
                key={m}
                style={[styles.chip, isSelected ? { backgroundColor: colors.secondary } : { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => toggleMood(m)}
              >
                <Text style={[styles.chipText, { color: isSelected ? '#FFF' : colors.text }]}>
                  {t(`moods.${m}` as never)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Translations TR */}
        <Text style={[styles.sectionTitle, { color: colors.secondary }]}>{t('admin.trContent')}</Text>
        <TextInput
          style={[styles.inputArea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
          value={trContent}
          onChangeText={setTrContent}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          placeholder={t('admin.trContentPlaceholder')}
          placeholderTextColor={colors.mutedText}
        />
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
          value={trSource}
          onChangeText={setTrSource}
          placeholder={t('admin.trSourcePlaceholder')}
          placeholderTextColor={colors.mutedText}
        />

        {/* Translations EN */}
        <Text style={[styles.sectionTitle, { color: colors.secondary }]}>{t('admin.enContent')}</Text>
        <TextInput
          style={[styles.inputArea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
          value={enContent}
          onChangeText={setEnContent}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          placeholder={t('admin.enContentPlaceholder')}
          placeholderTextColor={colors.mutedText}
        />
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
          value={enSource}
          onChangeText={setEnSource}
          placeholder={t('admin.enSourcePlaceholder')}
          placeholderTextColor={colors.mutedText}
        />

        {/* Actions Button */}
        <View style={[styles.actionRow, { paddingBottom: insets.bottom + 110 }]}>
          <TouchableOpacity
            style={[styles.deleteButton, { borderColor: '#E05252' }]}
            onPress={handleDelete}
            disabled={saving || deleting}
            activeOpacity={0.7}
          >
            {deleting ? (
              <ActivityIndicator color="#E05252" />
            ) : (
              <Text style={styles.deleteButtonText}>{t('admin.delete')}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: colors.primary }]}
            onPress={handleSave}
            disabled={saving || deleting}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.saveButtonText}>{t('admin.save')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backButton: { marginRight: 12 },
  title: { fontSize: 20, fontWeight: '700', letterSpacing: -0.5 },
  scroll: { padding: 16, paddingBottom: 160 },
  sectionTitle: { fontSize: 13, fontWeight: '700', marginTop: 14, marginBottom: 8, letterSpacing: 0.2 },
  selectorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipText: { fontSize: 12, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    marginTop: 8,
    marginBottom: 8,
  },
  inputArea: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    minHeight: 90,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  deleteButton: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 24,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#E05252',
    fontSize: 15,
    fontWeight: '700',
  },
  saveButton: {
    flex: 2,
    borderRadius: 24,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
