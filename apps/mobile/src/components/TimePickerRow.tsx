import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../theme/colors';

interface Props {
  label: string;
  time: string; // HH:MM
  theme: 'light' | 'dark';
  minTime?: string; // HH:MM
  maxTime?: string; // HH:MM
  onConfirm: (time: string) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = ['00', '15', '30', '45'];
const ITEM_HEIGHT = 44;

export function TimePickerRow({ label, time, theme, minTime, maxTime, onConfirm }: Props) {
  const { t } = useTranslation();
  const colors = COLORS[theme];
  const [visible, setVisible] = useState(false);
  const [selectedHour, setSelectedHour] = useState(time.split(':')[0]);
  const [selectedMinute, setSelectedMinute] = useState(time.split(':')[1]);

  const isValidTime = (h: string, m: string) => {
    const tVal = parseInt(h, 10) * 60 + parseInt(m, 10);
    let min = 0;
    let max = 24 * 60;
    if (minTime) {
      const [minH, minM] = minTime.split(':').map(Number);
      min = minH * 60 + minM;
    }
    if (maxTime) {
      const [maxH, maxM] = maxTime.split(':').map(Number);
      max = maxH * 60 + maxM;
    }
    return tVal >= min && tVal <= max;
  };

  const isHourValid = (h: string) => {
    return MINUTES.some(m => isValidTime(h, m));
  };

  const isMinuteValid = (m: string) => {
    return isValidTime(selectedHour, m);
  };

  const handleConfirm = () => {
    onConfirm(`${selectedHour}:${selectedMinute}`);
    setVisible(false);
  };

  const handleOpen = () => {
    let h = time.split(':')[0];
    let m = time.split(':')[1];
    
    if (!isValidTime(h, m)) {
      let closest = { h, m, diff: Infinity };
      const currentMins = parseInt(h, 10) * 60 + parseInt(m, 10);
      
      HOURS.forEach(hh => {
        MINUTES.forEach(mm => {
          if (isValidTime(hh, mm)) {
            const mins = parseInt(hh, 10) * 60 + parseInt(mm, 10);
            const diff = Math.abs(mins - currentMins);
            if (diff < closest.diff) {
              closest = { h: hh, m: mm, diff };
            }
          }
        });
      });
      if (closest.diff !== Infinity) {
        h = closest.h;
        m = closest.m;
      }
    }

    setSelectedHour(h);
    setSelectedMinute(m);
    setVisible(true);
  };

  // When selectedHour changes, if the current minute is no longer valid, auto-select a valid minute
  useEffect(() => {
    if (visible && !isMinuteValid(selectedMinute)) {
      const validMin = MINUTES.find(m => isValidTime(selectedHour, m));
      if (validMin) setSelectedMinute(validMin);
    }
  }, [selectedHour, visible]);

  return (
    <>
      <TouchableOpacity
        style={[styles.row, { borderBottomColor: colors.border }]}
        onPress={handleOpen}
        activeOpacity={0.7}
      >
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
        <View style={[styles.timeBadge, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Text style={[styles.timeText, { color: colors.primary }]}>{time}</Text>
        </View>
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sheetTitle, { color: colors.text }]}>{label}</Text>

            <View style={styles.pickerRow}>
              {/* Hour column */}
              <View style={styles.pickerCol}>
                <Text style={[styles.colHeader, { color: colors.mutedText }]}>{t('settings.hour', 'Saat')}</Text>
                <FlatList
                  data={HOURS}
                  keyExtractor={(item) => item}
                  showsVerticalScrollIndicator={false}
                  style={styles.scrollCol}
                  getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
                  initialScrollIndex={Math.max(0, HOURS.indexOf(selectedHour) - 1)}
                  renderItem={({ item: h }) => {
                    const disabled = !isHourValid(h);
                    return (
                      <TouchableOpacity
                        style={[styles.pickerItem, selectedHour === h && { backgroundColor: colors.primary, borderRadius: 10 }]}
                        disabled={disabled}
                        onPress={() => setSelectedHour(h)}
                      >
                        <Text style={[styles.pickerItemText, { color: selectedHour === h ? '#FFF' : disabled ? colors.mutedText + '66' : colors.text }]}>{h}</Text>
                      </TouchableOpacity>
                    );
                  }}
                />
              </View>

              <Text style={[styles.colon, { color: colors.primary }]}>:</Text>

              {/* Minute column */}
              <View style={styles.pickerCol}>
                <Text style={[styles.colHeader, { color: colors.mutedText }]}>{t('settings.minute', 'Dakika')}</Text>
                <FlatList
                  data={MINUTES}
                  keyExtractor={(item) => item}
                  showsVerticalScrollIndicator={false}
                  style={styles.scrollCol}
                  getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
                  initialScrollIndex={0}
                  renderItem={({ item: m }) => {
                    const disabled = !isMinuteValid(m);
                    return (
                      <TouchableOpacity
                        style={[styles.pickerItem, selectedMinute === m && { backgroundColor: colors.primary, borderRadius: 10 }]}
                        disabled={disabled}
                        onPress={() => setSelectedMinute(m)}
                      >
                        <Text style={[styles.pickerItemText, { color: selectedMinute === m ? '#FFF' : disabled ? colors.mutedText + '66' : colors.text }]}>{m}</Text>
                      </TouchableOpacity>
                    );
                  }}
                />
              </View>
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.btn, { borderColor: colors.border }]}
                onPress={() => setVisible(false)}
              >
                <Text style={[styles.btnText, { color: colors.mutedText }]}>{t('settings.cancel', 'İptal')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnConfirm, { backgroundColor: colors.primary }]}
                onPress={handleConfirm}
              >
                <Text style={[styles.btnText, { color: '#FFF' }]}>{t('settings.ok', 'Tamam')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  label: { fontSize: 15, fontWeight: '500' },
  timeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  timeText: { fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  sheet: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
  },
  sheetTitle: { fontSize: 17, fontWeight: '700', textAlign: 'center', marginBottom: 20 },
  pickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  pickerCol: { flex: 1, alignItems: 'center' },
  colHeader: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  scrollCol: { height: 180, width: '100%' },
  pickerItem: { height: ITEM_HEIGHT, justifyContent: 'center', alignItems: 'center' },
  pickerItemText: { fontSize: 22, fontWeight: '500', fontVariant: ['tabular-nums'] },
  colon: { fontSize: 26, fontWeight: '700', marginTop: 24 },
  buttonRow: { flexDirection: 'row', gap: 12, marginTop: 24 },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', borderWidth: 1 },
  btnConfirm: { borderWidth: 0 },
  btnText: { fontSize: 15, fontWeight: '700' },
});
