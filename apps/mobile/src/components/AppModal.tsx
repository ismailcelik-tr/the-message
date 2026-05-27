import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ColorScheme } from '../theme/colors';

export interface AppModalButton {
  text: string;
  onPress: () => void;
  variant?: 'primary' | 'destructive' | 'ghost';
}

interface Props {
  visible: boolean;
  title?: string;
  message: string;
  buttons: AppModalButton[];
  colors: ColorScheme;
}

export function AppModal({ visible, title, message, buttons, colors }: Props) {
  const twoButtons = buttons.length === 2;
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.box, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {!!title && <Text style={[styles.title, { color: colors.text }]}>{title}</Text>}
          <Text style={[styles.body, { color: colors.mutedText, marginBottom: title ? 24 : 20 }]}>{message}</Text>
          <View style={[styles.btnRow, twoButtons && styles.btnRowDouble]}>
            {buttons.map((btn, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  styles.btn,
                  btn.variant === 'destructive' && { backgroundColor: '#E05252' },
                  btn.variant === 'ghost' && { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border },
                  btn.variant !== 'destructive' && btn.variant !== 'ghost' && { backgroundColor: colors.primary },
                ]}
                onPress={btn.onPress}
                activeOpacity={0.85}
              >
                <Text style={[styles.btnText, { color: btn.variant === 'ghost' ? colors.mutedText : '#FFF' }]}>
                  {btn.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  box: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 28,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  body: {
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'center',
  },
  btnRow: { width: '100%' },
  btnRowDouble: { flexDirection: 'row', gap: 10 },
  btn: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnText: { fontSize: 15, fontWeight: '600' },
});
