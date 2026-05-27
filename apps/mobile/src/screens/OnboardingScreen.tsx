import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { usePreferencesStore } from '../store/preferences.store';
import { COLORS } from '../theme/colors';
import { UserPreferences } from '@the-message/shared';

const { width: SCREEN_W } = Dimensions.get('window');

// ─── Category / frequency data ─────────────────────────────────────────────────

const CATEGORIES: Array<{
  key: keyof UserPreferences['categoryPreferences'];
  emoji: string;
  labelKey: string;
  descKey: string;
}> = [
  { key: 'hope',    emoji: '🌿', labelKey: 'focus.categories.hope',    descKey: 'focus.categories.hopeDesc'    },
  { key: 'purpose', emoji: '✨', labelKey: 'focus.categories.purpose', descKey: 'focus.categories.purposeDesc' },
  { key: 'worship', emoji: '🕌', labelKey: 'focus.categories.worship', descKey: 'focus.categories.worshipDesc' },
  { key: 'prayer',  emoji: '🤲', labelKey: 'focus.categories.prayer',  descKey: 'focus.categories.prayerDesc'  },
  { key: 'dhikr',   emoji: '📿', labelKey: 'focus.categories.dhikr',  descKey: 'focus.categories.dhikrDesc'   },
];

const FREQUENCY_OPTIONS: Array<{
  key: 'low' | 'medium' | 'high';
  emoji: string;
  labelKey: string;
  detailKey: string;
}> = [
  { key: 'low',    emoji: '🌙', labelKey: 'settings.frequencyLow',    detailKey: 'settings.frequencyLowDetail'    },
  { key: 'medium', emoji: '☀️', labelKey: 'settings.frequencyMedium', detailKey: 'settings.frequencyMediumDetail' },
  { key: 'high',   emoji: '⚡', labelKey: 'settings.frequencyHigh',   detailKey: 'settings.frequencyHighDetail'   },
];

// ─── Fade-in wrapper ───────────────────────────────────────────────────────────

function FadeSlideIn({ delay = 0, children }: { delay?: number; children: React.ReactNode }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 420,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  const style = {
    opacity: anim,
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
  };

  return <Animated.View style={style}>{children}</Animated.View>;
}

// ─── Step dots ─────────────────────────────────────────────────────────────────

function StepDots({ step, total }: { step: number; total: number }) {
  return (
    <View style={styles.dotsRow}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={[styles.dot, i === step ? styles.dotActive : styles.dotInactive]} />
      ))}
    </View>
  );
}

// ─── Category card ─────────────────────────────────────────────────────────────

function CategoryCard({
  item,
  selected,
  onToggle,
  delay,
}: {
  item: (typeof CATEGORIES)[0];
  selected: boolean;
  onToggle: () => void;
  delay: number;
}) {
  const { t } = useTranslation();
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = useCallback(() => {
    Animated.sequence([
      Animated.spring(scale, { toValue: 0.94, useNativeDriver: true, speed: 50, bounciness: 0 }),
      Animated.spring(scale, { toValue: 1,    useNativeDriver: true, speed: 20, bounciness: 8 }),
    ]).start();
    onToggle();
  }, [onToggle]);

  return (
    <FadeSlideIn delay={delay}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Pressable
          onPress={handlePress}
          style={[styles.categoryCard, selected && styles.categoryCardSelected]}
        >
          <Text style={styles.categoryEmoji}>{item.emoji}</Text>
          <View style={styles.categoryText}>
            <Text style={[styles.categoryLabel, selected && styles.categoryLabelSelected]}>
              {t(item.labelKey as never)}
            </Text>
            <Text style={[styles.categoryDesc, selected && styles.categoryDescSelected]}>
              {t(item.descKey as never)}
            </Text>
          </View>
          <View style={[styles.checkCircle, selected && styles.checkCircleSelected]}>
            {selected && <Text style={styles.checkMark}>✓</Text>}
          </View>
        </Pressable>
      </Animated.View>
    </FadeSlideIn>
  );
}

// ─── Frequency card ────────────────────────────────────────────────────────────

function FreqCard({
  item,
  selected,
  onSelect,
  delay,
}: {
  item: (typeof FREQUENCY_OPTIONS)[0];
  selected: boolean;
  onSelect: () => void;
  delay: number;
}) {
  const { t } = useTranslation();
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = useCallback(() => {
    Animated.sequence([
      Animated.spring(scale, { toValue: 0.95, useNativeDriver: true, speed: 50, bounciness: 0 }),
      Animated.spring(scale, { toValue: 1,    useNativeDriver: true, speed: 20, bounciness: 8 }),
    ]).start();
    onSelect();
  }, [onSelect]);

  return (
    <FadeSlideIn delay={delay}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Pressable
          onPress={handlePress}
          style={[styles.freqCard, selected && styles.freqCardSelected]}
        >
          <Text style={styles.freqEmoji}>{item.emoji}</Text>
          <View style={styles.freqText}>
            <Text style={[styles.freqLabel, selected && styles.freqLabelSelected]}>
              {t(item.labelKey as never)}
            </Text>
            <Text style={[styles.freqDetail, selected && styles.freqDetailSelected]}>
              {t(item.detailKey as never)}
            </Text>
          </View>
          {selected && (
            <View style={styles.freqCheck}>
              <Text style={styles.freqCheckText}>✓</Text>
            </View>
          )}
        </Pressable>
      </Animated.View>
    </FadeSlideIn>
  );
}

// ─── Main screen ───────────────────────────────────────────────────────────────

interface Props {
  onComplete: () => void;
}

type Step = 0 | 1 | 2;

export function OnboardingScreen({ onComplete }: Props) {
  const { t } = useTranslation();
  const { currentTheme, preferences, toggleCategory, setPreferences } = usePreferencesStore();
  const colors = COLORS[currentTheme];
  const isDark = currentTheme === 'dark';

  const [step, setStep] = useState<Step>(0);
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Pick a random verse + hadith once on mount
  const quoteVerses = t('onboarding.quoteVerses', { returnObjects: true }) as Array<{ text: string; source: string }>;
  const quoteHadiths = t('onboarding.quoteHadiths', { returnObjects: true }) as Array<{ text: string; source: string }>;
  const quoteIdx = useRef(Math.floor(Math.random() * 5)).current;
  const verse = quoteVerses[quoteIdx] ?? quoteVerses[0];
  const hadith = quoteHadiths[quoteIdx] ?? quoteHadiths[0];

  const goTo = useCallback(
    (next: Step) => {
      const dir = next > step ? -1 : 1;
      Animated.timing(slideAnim, {
        toValue: SCREEN_W * dir,
        duration: 200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        setStep(next);
        slideAnim.setValue(SCREEN_W * -dir);
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
      });
    },
    [step, slideAnim],
  );

  const selectedCount = Object.values(preferences.categoryPreferences).filter(Boolean).length;

  // ── Step 0: Welcome ────────────────────────────────────────────────────────

  const WelcomeStep = (
    <View style={styles.stepContainer}>
      <FadeSlideIn delay={40}>
        <View style={styles.logoWrap}>
          <Text style={[styles.logo, { color: colors.primary }]}>{t('onboarding.logo')}</Text>
          <Text style={[styles.subLogo, { color: colors.secondary }]}>{t('onboarding.subtitle')}</Text>
        </View>
      </FadeSlideIn>

      <FadeSlideIn delay={140}>
        <View style={[styles.quoteCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.quoteText, { color: colors.text }]}>{verse.text}</Text>
          <Text style={[styles.quoteSource, { color: colors.secondary }]}>{verse.source}</Text>
        </View>
      </FadeSlideIn>

      <FadeSlideIn delay={240}>
        <View style={[styles.quoteCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.quoteText, { color: colors.text }]}>{hadith.text}</Text>
          <Text style={[styles.quoteSource, { color: colors.secondary }]}>{hadith.source}</Text>
        </View>
      </FadeSlideIn>

      <FadeSlideIn delay={340}>
        <View style={[styles.welcomeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.welcomeTitle, { color: colors.text }]}>{t('onboarding.title')}</Text>
          <Text style={[styles.welcomeDesc, { color: colors.mutedText }]}>{t('onboarding.description1')}</Text>
          <Text style={[styles.welcomeDesc, { color: colors.mutedText, marginTop: 8 }]}>{t('onboarding.description2')}</Text>
        </View>
      </FadeSlideIn>

      <FadeSlideIn delay={440}>
        <View style={styles.badgeRow}>
          <View style={[styles.badge, { backgroundColor: isDark ? '#1E3A2F' : '#E8F5ED' }]}>
            <Text style={styles.badgeEmoji}>🎁</Text>
            <Text style={[styles.badgeText, { color: isDark ? '#7ECBA0' : '#2A7A4F' }]}>{t('onboarding.free')}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: isDark ? '#2A2A1E' : '#FFF8E1' }]}>
            <Text style={styles.badgeEmoji}>🚫</Text>
            <Text style={[styles.badgeText, { color: isDark ? '#C8B56A' : '#8A6F00' }]}>{t('onboarding.noAds')}</Text>
          </View>
        </View>
      </FadeSlideIn>

      <View style={{ height: 32 }} />

      <FadeSlideIn delay={540}>
        <View style={styles.ctaWrap}>
          <TouchableOpacity
            style={[styles.ctaBtn, { backgroundColor: colors.primary }]}
            onPress={() => goTo(1)}
            activeOpacity={0.85}
          >
            <Text style={styles.ctaBtnText}>{t('onboarding.cta')}</Text>
          </TouchableOpacity>
        </View>
      </FadeSlideIn>
    </View>
  );

  // ── Step 1: Focus ──────────────────────────────────────────────────────────

  const FocusStep = (
    <View style={styles.stepContainer}>
      <FadeSlideIn delay={60}>
        <Text style={[styles.stepTitle, { color: colors.text }]}>{t('onboarding.focusTitle')}</Text>
        <Text style={[styles.stepSubtitle, { color: colors.mutedText }]}>{t('onboarding.focusSubtitle')}</Text>
      </FadeSlideIn>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.cardsScroll} contentContainerStyle={{ paddingBottom: 16 }}>
        {CATEGORIES.map((item, i) => (
          <CategoryCard
            key={item.key}
            item={item}
            selected={preferences.categoryPreferences[item.key]}
            onToggle={() => toggleCategory(item.key)}
            delay={80 + i * 60}
          />
        ))}
      </ScrollView>

      <View style={styles.navRow}>
        <TouchableOpacity onPress={() => goTo(0)} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={[styles.backText, { color: colors.mutedText }]}>← Geri</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.nextBtn, { backgroundColor: selectedCount > 0 ? colors.primary : colors.border }]}
          onPress={() => selectedCount > 0 && goTo(2)}
          activeOpacity={0.85}
        >
          <Text style={styles.nextBtnText}>{t('onboarding.next')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ── Step 2: Notifications ──────────────────────────────────────────────────

  const NotifStep = (
    <View style={styles.stepContainer}>
      <FadeSlideIn delay={60}>
        <Text style={[styles.stepTitle, { color: colors.text }]}>{t('onboarding.notifTitle')}</Text>
        <Text style={[styles.stepSubtitle, { color: colors.mutedText }]}>{t('onboarding.notifSubtitle')}</Text>
      </FadeSlideIn>

      <View style={styles.freqList}>
        {FREQUENCY_OPTIONS.map((item, i) => (
          <FreqCard
            key={item.key}
            item={item}
            selected={preferences.notificationFrequency === item.key}
            onSelect={() => setPreferences({ notificationFrequency: item.key })}
            delay={80 + i * 80}
          />
        ))}
      </View>

      <FadeSlideIn delay={320}>
        <View style={[styles.notifNote, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={styles.notifNoteEmoji}>💡</Text>
          <Text style={[styles.notifNoteText, { color: colors.mutedText }]}>{t('onboarding.notifNote')}</Text>
        </View>
      </FadeSlideIn>

      <View style={[styles.navRow, { marginTop: 'auto' as any }]}>
        <TouchableOpacity onPress={() => goTo(1)} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={[styles.backText, { color: colors.mutedText }]}>← Geri</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.nextBtn, { backgroundColor: colors.primary }]}
          onPress={onComplete}
          activeOpacity={0.85}
        >
          <Text style={styles.nextBtnText}>{t('onboarding.finish')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const STEPS = [WelcomeStep, FocusStep, NotifStep];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <StepDots step={step} total={3} />
      <Animated.View style={[{ flex: 1 }, { transform: [{ translateX: slideAnim }] }]}>
        {STEPS[step]}
      </Animated.View>
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const PRIMARY = '#2A4B3D';

const styles = StyleSheet.create({
  safe: { flex: 1 },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', paddingTop: 16, paddingBottom: 4, gap: 6 },
  dot: { height: 6, borderRadius: 3 },
  dotActive: { width: 24, backgroundColor: PRIMARY },
  dotInactive: { width: 6, backgroundColor: '#C8D0CC' },

  stepContainer: { flex: 1, paddingHorizontal: 24 },

  quoteCard: {
    borderRadius: 18, borderWidth: 1, padding: 16, marginBottom: 12,
  },
  quoteText: { fontSize: 14, lineHeight: 22, fontStyle: 'italic', textAlign: 'center', marginBottom: 6 },
  quoteSource: { fontSize: 11, fontWeight: '600', textAlign: 'center', letterSpacing: 0.3 },

  logoWrap: { alignItems: 'center', marginTop: 20, marginBottom: 36 },
  logo: { fontSize: 38, fontWeight: '300', letterSpacing: 2 },
  subLogo: { fontSize: 10, fontWeight: '600', letterSpacing: 6, marginTop: 4 },

  welcomeCard: { borderRadius: 20, borderWidth: 1, padding: 18, marginBottom: 12 },
  welcomeTitle: { fontSize: 20, fontWeight: '600', marginBottom: 10, textAlign: 'center' },
  welcomeDesc: { fontSize: 14, lineHeight: 21, textAlign: 'center' },

  badgeRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 0, flexWrap: 'wrap' },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, gap: 5 },
  badgeEmoji: { fontSize: 14 },
  badgeText: { fontSize: 12, fontWeight: '600' },

  ctaWrap: { paddingBottom: 28 },
  ctaBtn: {
    height: 56, borderRadius: 28,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 10, elevation: 4,
  },
  ctaBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600', letterSpacing: 0.3 },

  stepTitle: { fontSize: 24, fontWeight: '600', marginTop: 16, marginBottom: 6 },
  stepSubtitle: { fontSize: 14, lineHeight: 20, marginBottom: 20 },

  cardsScroll: { flex: 1 },
  categoryCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 16, borderWidth: 1.5,
    borderColor: '#DDE5E0', backgroundColor: '#FAFCFB',
    padding: 14, marginBottom: 10,
  },
  categoryCardSelected: { borderColor: PRIMARY, backgroundColor: '#EDF5F1' },
  categoryEmoji: { fontSize: 24, marginRight: 12 },
  categoryText: { flex: 1 },
  categoryLabel: { fontSize: 15, fontWeight: '600', color: '#2C3E35', marginBottom: 2 },
  categoryLabelSelected: { color: PRIMARY },
  categoryDesc: { fontSize: 12, color: '#7A8F87', lineHeight: 16 },
  categoryDescSelected: { color: '#4A7060' },
  checkCircle: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 2,
    borderColor: '#CDD8D2', alignItems: 'center', justifyContent: 'center',
  },
  checkCircleSelected: { borderColor: PRIMARY, backgroundColor: PRIMARY },
  checkMark: { color: '#FFF', fontSize: 13, fontWeight: '700' },

  freqList: { gap: 12, marginBottom: 16 },
  freqCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 18, borderWidth: 1.5,
    borderColor: '#DDE5E0', backgroundColor: '#FAFCFB',
    padding: 16,
  },
  freqCardSelected: { borderColor: PRIMARY, backgroundColor: '#EDF5F1' },
  freqEmoji: { fontSize: 26, marginRight: 14 },
  freqText: { flex: 1 },
  freqLabel: { fontSize: 16, fontWeight: '600', color: '#2C3E35', marginBottom: 2 },
  freqLabelSelected: { color: PRIMARY },
  freqDetail: { fontSize: 13, color: '#7A8F87' },
  freqDetailSelected: { color: '#4A7060' },
  freqCheck: { width: 28, height: 28, borderRadius: 14, backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center' },
  freqCheckText: { color: '#FFF', fontSize: 14, fontWeight: '700' },

  notifNote: { flexDirection: 'row', alignItems: 'flex-start', borderRadius: 14, borderWidth: 1, padding: 14, gap: 10, marginBottom: 16 },
  notifNoteEmoji: { fontSize: 16, marginTop: 1 },
  notifNoteText: { flex: 1, fontSize: 13, lineHeight: 18 },

  navRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 24, paddingTop: 8 },
  backBtn: { paddingVertical: 10, paddingHorizontal: 4 },
  backText: { fontSize: 14 },
  nextBtn: { paddingHorizontal: 28, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  nextBtnText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
});
