import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet } from 'react-native';
import { COLORS } from '../theme/colors';

interface Props {
  label: string;
  time: string; // HH:MM
  theme: 'light' | 'dark';
  onConfirm: (time: string) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = ['00', '15', '30', '45'];

export function TimePickerRow({ label, time, theme, onConfirm }: Props) {
  const colors = COLORS[theme];
  const [visible, setVisible] = useState(false);
  const [selectedHour, setSelectedHour] = useState(time.split(':')[0]);
  const [selectedMinute, setSelectedMinute] = useState(time.split(':')[1]);

  const handleConfirm = () => {
    onConfirm(`${selectedHour}:${selectedMinute}`);
    setVisible(false);
  };

  const handleOpen = () => {
    setSelectedHour(time.split(':')[0]);
    setSelectedMinute(time.split(':')[1]);
    setVisible(true);
  };

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
                <Text style={[styles.colHeader, { color: colors.mutedText }]}>Saat</Text>
                <ScrollView style={styles.scrollCol} showsVerticalScrollIndicator={false}>
                  {HOURS.map((h) => (
                    <TouchableOpacity
                      key={h}
                      style={[styles.pickerItem, selectedHour === h && { backgroundColor: colors.primary, borderRadius: 10 }]}
                      onPress={() => setSelectedHour(h)}
                    >
                      <Text style={[styles.pickerItemText, { color: selectedHour === h ? '#FFF' : colors.text }]}>{h}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <Text style={[styles.colon, { color: colors.primary }]}>:</Text>

              {/* Minute column */}
              <View style={styles.pickerCol}>
                <Text style={[styles.colHeader, { color: colors.mutedText }]}>Dakika</Text>
                <ScrollView style={styles.scrollCol} showsVerticalScrollIndicator={false}>
                  {MINUTES.map((m) => (
                    <TouchableOpacity
                      key={m}
                      style={[styles.pickerItem, selectedMinute === m && { backgroundColor: colors.primary, borderRadius: 10 }]}
                      onPress={() => setSelectedMinute(m)}
                    >
                      <Text style={[styles.pickerItemText, { color: selectedMinute === m ? '#FFF' : colors.text }]}>{m}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.btn, { borderColor: colors.border }]}
                onPress={() => setVisible(false)}
              >
                <Text style={[styles.btnText, { color: colors.mutedText }]}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnConfirm, { backgroundColor: colors.primary }]}
                onPress={handleConfirm}
              >
                <Text style={[styles.btnText, { color: '#FFF' }]}>Tamam</Text>
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
  pickerItem: { paddingVertical: 10, alignItems: 'center' },
  pickerItemText: { fontSize: 22, fontWeight: '500', fontVariant: ['tabular-nums'] },
  colon: { fontSize: 26, fontWeight: '700', marginTop: 24 },
  buttonRow: { flexDirection: 'row', gap: 12, marginTop: 24 },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', borderWidth: 1 },
  btnConfirm: { borderWidth: 0 },
  btnText: { fontSize: 15, fontWeight: '700' },
});
