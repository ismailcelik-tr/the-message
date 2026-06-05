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

// Spacers so that valid items can be scrolled to the center (2 empty items at top/bottom)
const HOUR_DATA = ['', '', ...HOURS, '', ''];
const MINUTE_DATA = ['', '', ...MINUTES, '', ''];

export function TimePickerRow({ label, time, theme, minTime, maxTime, onConfirm }: Props) {
  const { t } = useTranslation();
  const colors = COLORS[theme];
  const [visible, setVisible] = useState(false);
  const [selectedHour, setSelectedHour] = useState(time.split(':')[0]);
  const [selectedMinute, setSelectedMinute] = useState(time.split(':')[1]);

  const hourRef = useRef<FlatList>(null);
  const minuteRef = useRef<FlatList>(null);

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

  // Scroll to initial values when modal opens
  useEffect(() => {
    if (visible) {
      setTimeout(() => {
        const hIndex = HOURS.indexOf(selectedHour);
        if (hIndex !== -1 && hourRef.current) {
          hourRef.current.scrollToOffset({ offset: hIndex * ITEM_HEIGHT, animated: false });
        }
        const mIndex = MINUTES.indexOf(selectedMinute);
        if (mIndex !== -1 && minuteRef.current) {
          minuteRef.current.scrollToOffset({ offset: mIndex * ITEM_HEIGHT, animated: false });
        }
      }, 100);
    }
  }, [visible]);

  // When selectedHour changes, if the current minute is no longer valid, auto-select a valid minute
  useEffect(() => {
    if (visible && !isMinuteValid(selectedMinute)) {
      const validMin = MINUTES.find(m => isValidTime(selectedHour, m));
      if (validMin) {
        setSelectedMinute(validMin);
        const mIndex = MINUTES.indexOf(validMin);
        if (mIndex !== -1 && minuteRef.current) {
          minuteRef.current.scrollToOffset({ offset: mIndex * ITEM_HEIGHT, animated: true });
        }
      }
    }
  }, [selectedHour, visible]);

  const handleHourScrollEnd = (e: any) => {
    const y = e.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_HEIGHT);
    const hour = HOURS[index];
    if (hour && hour !== selectedHour) {
      setSelectedHour(hour);
    }
  };

  const handleMinuteScrollEnd = (e: any) => {
    const y = e.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_HEIGHT);
    const minute = MINUTES[index];
    if (minute && minute !== selectedMinute) {
      setSelectedMinute(minute);
    }
  };

  const confirmDisabled = !isValidTime(selectedHour, selectedMinute);

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

            {/* Headers Row */}
            <View style={styles.headersRow}>
              <View style={styles.pickerCol}>
                <Text style={[styles.colHeader, { color: colors.mutedText }]}>{t('settings.hour', 'Saat')}</Text>
              </View>
              <Text style={[styles.colon, { color: 'transparent' }]}>:</Text>
              <View style={styles.pickerCol}>
                <Text style={[styles.colHeader, { color: colors.mutedText }]}>{t('settings.minute', 'Dakika')}</Text>
              </View>
            </View>

            <View style={styles.pickerContainer}>
              {/* Highlight bar behind selected center item */}
              <View style={[styles.highlightBar, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '33' }]} />

              <View style={styles.pickerRow}>
                {/* Hour Column */}
                <View style={styles.pickerCol}>
                  <FlatList
                    ref={hourRef}
                    data={HOUR_DATA}
                    keyExtractor={(_, index) => `h-${index}`}
                    showsVerticalScrollIndicator={false}
                    style={styles.scrollCol}
                    snapToInterval={ITEM_HEIGHT}
                    snapToAlignment="center"
                    decelerationRate="fast"
                    getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
                    onMomentumScrollEnd={handleHourHourScrollEndShim}
                    onScrollEndDrag={handleHourHourScrollEndShim}
                    renderItem={({ item: h, index }) => {
                      if (h === '') return <View style={{ height: ITEM_HEIGHT }} />;
                      const disabled = !isHourValid(h);
                      const isSelected = selectedHour === h;
                      return (
                        <TouchableOpacity
                          style={styles.pickerItem}
                          disabled={disabled}
                          onPress={() => {
                            const dataIndex = index - 2;
                            hourRef.current?.scrollToOffset({ offset: dataIndex * ITEM_HEIGHT, animated: true });
                            setSelectedHour(h);
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={[
                            styles.pickerItemText,
                            {
                              color: isSelected ? colors.primary : disabled ? colors.mutedText + '44' : colors.text,
                              fontWeight: isSelected ? '700' : '400',
                              opacity: isSelected ? 1 : 0.6
                            }
                          ]}>
                            {h}
                          </Text>
                        </TouchableOpacity>
                      );
                    }}
                  />
                </View>

                <Text style={[styles.colon, { color: colors.primary }]}>:</Text>

                {/* Minute Column */}
                <View style={styles.pickerCol}>
                  <FlatList
                    ref={minuteRef}
                    data={MINUTE_DATA}
                    keyExtractor={(_, index) => `m-${index}`}
                    showsVerticalScrollIndicator={false}
                    style={styles.scrollCol}
                    snapToInterval={ITEM_HEIGHT}
                    snapToAlignment="center"
                    decelerationRate="fast"
                    getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
                    onMomentumScrollEnd={handleMinuteMinuteScrollEndShim}
                    onScrollEndDrag={handleMinuteMinuteScrollEndShim}
                    renderItem={({ item: m, index }) => {
                      if (m === '') return <View style={{ height: ITEM_HEIGHT }} />;
                      const disabled = !isMinuteValid(m);
                      const isSelected = selectedMinute === m;
                      return (
                        <TouchableOpacity
                          style={styles.pickerItem}
                          disabled={disabled}
                          onPress={() => {
                            const dataIndex = index - 2;
                            minuteRef.current?.scrollToOffset({ offset: dataIndex * ITEM_HEIGHT, animated: true });
                            setSelectedMinute(m);
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={[
                            styles.pickerItemText,
                            {
                              color: isSelected ? colors.primary : disabled ? colors.mutedText + '44' : colors.text,
                              fontWeight: isSelected ? '700' : '400',
                              opacity: isSelected ? 1 : 0.6
                            }
                          ]}>
                            {m}
                          </Text>
                        </TouchableOpacity>
                      );
                    }}
                  />
                </View>
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
                style={[styles.btn, styles.btnConfirm, { backgroundColor: confirmDisabled ? colors.border : colors.primary }]}
                disabled={confirmDisabled}
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

  function handleHourHourScrollEndShim(e: any) {
    handleHourScrollEnd(e);
  }

  function handleMinuteMinuteScrollEndShim(e: any) {
    handleMinuteScrollEnd(e);
  }
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
    alignItems: 'center',
  },
  sheetTitle: { fontSize: 17, fontWeight: '700', textAlign: 'center', marginBottom: 20 },
  pickerContainer: {
    height: ITEM_HEIGHT * 5,
    width: '100%',
    position: 'relative',
    justifyContent: 'center',
  },
  highlightBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    borderRadius: 12,
    borderWidth: 1,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    width: '100%',
  },
  pickerCol: { flex: 1, alignItems: 'center' },
  colHeader: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },
  scrollCol: { height: ITEM_HEIGHT * 5, width: '100%' },
  pickerItem: { height: ITEM_HEIGHT, justifyContent: 'center', alignItems: 'center', width: '100%' },
  pickerItemText: { fontSize: 22, fontVariant: ['tabular-nums'] },
  colon: { fontSize: 26, fontWeight: '700', marginHorizontal: 8 },
  headersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 8,
  },
  buttonRow: { flexDirection: 'row', gap: 12, marginTop: 24, width: '100%' },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', borderWidth: 1 },
  btnConfirm: { borderWidth: 0 },
  btnText: { fontSize: 15, fontWeight: '700' },
});
