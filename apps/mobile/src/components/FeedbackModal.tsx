import React, { useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ContentItem, FeedbackIssueType } from '@the-message/shared';
import { ColorScheme } from '../theme/colors';
import { submitFeedback } from '../api/feedback.api';

interface Props {
  visible: boolean;
  item: ContentItem;
  locale: 'tr' | 'en';
  colors: ColorScheme;
  userId?: string;
  onClose: () => void;
}

const ISSUE_TYPES: FeedbackIssueType[] = ['wrong_text', 'missing_text', 'wrong_source', 'other'];

export function FeedbackModal({ visible, item, locale, colors, userId, onClose }: Props) {
  const { t } = useTranslation();
  const [selectedIssue, setSelectedIssue] = useState<FeedbackIssueType | null>(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resultState, setResultState] = useState<'success' | 'error' | null>(null);

  const reset = () => {
    setSelectedIssue(null);
    setNote('');
    setSubmitting(false);
    setResultState(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!selectedIssue) return;
    setSubmitting(true);
    try {
      await submitFeedback(
        {
          contentId: item.id,
          contentType: item.type,
          issueType: selectedIssue,
          note: note.trim() || undefined,
          locale,
        },
        userId,
      );
      setSubmitting(false);
      setResultState('success');
    } catch {
      setSubmitting(false);
      setResultState('error');
    }
  };

  const translation = item.translations[locale];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>
            {t('feedback.modalTitle')}
          </Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={22} color={colors.mutedText} />
          </TouchableOpacity>
        </View>

        {/* Success / Error state */}
        {resultState && (
          <View style={styles.resultWrap}>
            <Ionicons
              name={resultState === 'success' ? 'checkmark-circle' : 'alert-circle'}
              size={52}
              color={resultState === 'success' ? colors.primary : '#E05252'}
            />
            <Text style={[styles.resultTitle, { color: colors.text }]}>
              {resultState === 'success' ? t('feedback.successTitle') : t('login.error')}
            </Text>
            <Text style={[styles.resultBody, { color: colors.mutedText }]}>
              {resultState === 'success' ? t('feedback.successMessage') : t('feedback.errorMessage')}
            </Text>
            <TouchableOpacity
              style={[styles.resultBtn, { backgroundColor: colors.primary }]}
              onPress={resultState === 'success' ? handleClose : () => setResultState(null)}
              activeOpacity={0.85}
            >
              <Text style={styles.resultBtnText}>
                {resultState === 'success' ? t('login.ok') : t('feedback.submit')}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {!resultState && <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Text style={[styles.subtitle, { color: colors.mutedText }]}>
            {t('feedback.modalSubtitle')}
          </Text>

          {/* Content preview */}
          <View style={[styles.previewBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.previewType, { color: colors.secondary }]}>
              {item.type.toUpperCase()}
            </Text>
            <Text style={[styles.previewText, { color: colors.text }]} numberOfLines={3}>
              {translation?.content}
            </Text>
            {translation?.source && (
              <Text style={[styles.previewSource, { color: colors.mutedText }]}>
                {translation.source}
              </Text>
            )}
          </View>

          {/* Issue type selector */}
          <Text style={[styles.sectionLabel, { color: colors.text }]}>
            {t('feedback.issueTypeLabel')}
          </Text>
          {ISSUE_TYPES.map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.issueRow,
                { borderColor: colors.border, backgroundColor: colors.card },
                selectedIssue === type && { borderColor: colors.primary, backgroundColor: colors.primary + '12' },
              ]}
              onPress={() => setSelectedIssue(type)}
              activeOpacity={0.75}
            >
              <View style={[
                styles.radio,
                { borderColor: selectedIssue === type ? colors.primary : colors.mutedText },
              ]}>
                {selectedIssue === type && (
                  <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />
                )}
              </View>
              <Text style={[
                styles.issueLabel,
                { color: selectedIssue === type ? colors.primary : colors.text },
              ]}>
                {t(`feedback.issueTypes.${type}` as never)}
              </Text>
            </TouchableOpacity>
          ))}

          {/* Optional note */}
          <TextInput
            style={[styles.noteInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            placeholder={t('feedback.notePlaceholder')}
            placeholderTextColor={colors.mutedText}
            value={note}
            onChangeText={setNote}
            multiline
            maxLength={500}
            textAlignVertical="top"
          />
        </ScrollView>}

        {/* Footer */}
        {!resultState && <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
          <TouchableOpacity
            style={[styles.cancelBtn, { borderColor: colors.border }]}
            onPress={handleClose}
            activeOpacity={0.7}
          >
            <Text style={[styles.cancelText, { color: colors.mutedText }]}>{t('feedback.cancel')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.submitBtn,
              { backgroundColor: colors.primary },
              !selectedIssue && styles.submitBtnDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!selectedIssue || submitting}
            activeOpacity={0.8}
          >
            {submitting
              ? <ActivityIndicator size="small" color="#FFF" />
              : <Text style={styles.submitText}>{t('feedback.submit')}</Text>
            }
          </TouchableOpacity>
        </View>}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1,
  },
  title: { fontSize: 18, fontWeight: '700' },
  closeBtn: { padding: 4 },
  body: { padding: 20, paddingBottom: 8 },
  subtitle: { fontSize: 14, lineHeight: 20, marginBottom: 16 },

  previewBox: {
    borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 20,
  },
  previewType: { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 6 },
  previewText: { fontSize: 14, lineHeight: 22 },
  previewSource: { fontSize: 12, marginTop: 6 },

  sectionLabel: { fontSize: 14, fontWeight: '600', marginBottom: 10 },
  issueRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 12, borderWidth: 1.5, padding: 14, marginBottom: 8,
  },
  radio: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2,
    justifyContent: 'center', alignItems: 'center',
  },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  issueLabel: { fontSize: 15, flex: 1 },

  noteInput: {
    borderRadius: 14, borderWidth: 1, padding: 14,
    fontSize: 14, minHeight: 90, marginTop: 8,
  },

  footer: {
    flexDirection: 'row', gap: 12,
    paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1,
  },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  cancelText: { fontSize: 15, fontWeight: '600' },
  submitBtn: {
    flex: 2, paddingVertical: 14, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

  resultWrap: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    padding: 32, gap: 16,
  },
  resultTitle: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  resultBody: { fontSize: 15, lineHeight: 24, textAlign: 'center' },
  resultBtn: {
    marginTop: 8, height: 50, borderRadius: 25, paddingHorizontal: 40,
    justifyContent: 'center', alignItems: 'center',
  },
  resultBtnText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
});
