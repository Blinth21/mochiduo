import React, { useEffect, useState } from 'react';
import {
  Keyboard,
  Modal,
  Platform,
  StyleSheet,
  View,
  useWindowDimensions,
  type ModalProps,
} from 'react-native';

import { Pastel } from '@/constants/pastelTheme';

interface KeyboardModalSheetProps {
  visible: boolean;
  onRequestClose: () => void;
  children: React.ReactNode;
  animationType?: ModalProps['animationType'];
  maxHeightRatio?: number;
}

/**
 * Bottom-sheet modal wrapper that reliably lifts above the soft keyboard
 * on both Android (including edge-to-edge Android 15+) and iOS.
 */
export const KeyboardModalSheet = React.memo(function KeyboardModalSheet({
  visible,
  onRequestClose,
  children,
  animationType = 'slide',
  maxHeightRatio = 0.88,
}: KeyboardModalSheetProps) {
  const { height: windowHeight } = useWindowDimensions();
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (!visible) {
      setKeyboardHeight(0);
      return;
    }

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates?.height ?? 0);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [visible]);

  const availableHeight = Math.max(260, windowHeight - keyboardHeight - 28);
  const cardMaxHeight = Math.min(windowHeight * maxHeightRatio, availableHeight);

  return (
    <Modal
      visible={visible}
      animationType={animationType}
      transparent
      statusBarTranslucent
      onRequestClose={onRequestClose}>
      <View
        style={[
          styles.overlay,
          keyboardHeight > 0 && { paddingBottom: keyboardHeight },
        ]}>
        <View style={[styles.card, { maxHeight: cardMaxHeight }]}>
          {children}
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(45, 34, 53, 0.45)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: Pastel.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 20,
    borderTopWidth: 2,
    borderColor: Pastel.border,
  },
});
