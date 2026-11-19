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
          <View style={styles.handleBar} />
          {children}
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(28, 30, 38, 0.38)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: Pastel.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 22,
  },
  handleBar: {
    width: 38,
    height: 4,
    borderRadius: 999,
    backgroundColor: Pastel.borderStrong,
    alignSelf: 'center',
    marginBottom: 14,
  },
});
