import React from 'react';
import { View, PanResponder } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const TABS = ['Daily', 'Focus', 'Saved', 'Settings'];
const SWIPE_THRESHOLD = 50;

interface Props {
  children: React.ReactNode;
  currentIndex: number;
}

export function SwipeWrapper({ children, currentIndex }: Props) {
  const navigation = useNavigation();

  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Detect horizontal swipe: dx is large, dy is small, dx crosses minimum threshold
        const isHorizontal = Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
        const hasHorizontalMovement = Math.abs(gestureState.dx) > 20;
        return isHorizontal && hasHorizontalMovement;
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dx < -SWIPE_THRESHOLD) {
          // Swipe left -> navigate to next tab
          if (currentIndex < TABS.length - 1) {
            (navigation as any).navigate(TABS[currentIndex + 1]);
          }
        } else if (gestureState.dx > SWIPE_THRESHOLD) {
          // Swipe right -> navigate to previous tab
          if (currentIndex > 0) {
            (navigation as any).navigate(TABS[currentIndex - 1]);
          }
        }
      },
    })
  ).current;

  return (
    <View style={{ flex: 1 }} {...panResponder.panHandlers}>
      {children}
    </View>
  );
}
