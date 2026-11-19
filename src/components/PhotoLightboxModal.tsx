import { Image } from 'expo-image';
import { X } from 'lucide-react-native';
import React, { useEffect } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BouncyPressable } from '@/components/BouncyPressable';
import { BodyFontBold, BodyFontRegular, Pastel } from '@/constants/pastelTheme';

export interface PhotoLightboxData {
  uri: string;
  title?: string;
  subtitle?: string;
  caption?: string;
}

interface PhotoLightboxModalProps {
  photo: PhotoLightboxData | null;
  onClose: () => void;
}

/**
 * Smooth 120Hz-friendly fullscreen image viewer with UI-thread pinch & double-tap zoom.
 */
export const PhotoLightboxModal = React.memo(function PhotoLightboxModal({
  photo,
  onClose,
}: PhotoLightboxModalProps) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  useEffect(() => {
    if (photo) {
      scale.value = 1;
      savedScale.value = 1;
      translateX.value = 0;
      translateY.value = 0;
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
    }
  }, [photo, savedScale, savedTranslateX, savedTranslateY, scale, translateX, translateY]);

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      const next = Math.max(1, Math.min(4, savedScale.value * e.scale));
      scale.value = next;
    })
    .onEnd(() => {
      if (scale.value <= 1.05) {
        scale.value = withTiming(1, { duration: 180 });
        translateX.value = withTiming(0, { duration: 180 });
        translateY.value = withTiming(0, { duration: 180 });
        savedScale.value = 1;
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        savedScale.value = scale.value;
      }
    });

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (scale.value <= 1.02) return;
      const maxX = ((scale.value - 1) * width) / 2;
      const maxY = ((scale.value - 1) * height) / 2;
      translateX.value = Math.max(-maxX, Math.min(maxX, savedTranslateX.value + e.translationX));
      translateY.value = Math.max(-maxY, Math.min(maxY, savedTranslateY.value + e.translationY));
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1.2) {
        scale.value = withTiming(1, { duration: 200 });
        translateX.value = withTiming(0, { duration: 200 });
        translateY.value = withTiming(0, { duration: 200 });
        savedScale.value = 1;
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        scale.value = withTiming(2.4, { duration: 200 });
        savedScale.value = 2.4;
      }
    });

  const composedGesture = Gesture.Simultaneous(
    doubleTapGesture,
    pinchGesture,
    panGesture
  );

  const animatedImgStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <Modal
      visible={Boolean(photo)}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}>
      <GestureHandlerRootView style={styles.overlay}>
        {/* Top Bar */}
        <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 16) + 8 }]}>
          <View style={styles.titleCol}>
            {photo?.title ? (
              <Text style={styles.title} numberOfLines={1}>
                {photo.title}
              </Text>
            ) : null}
            {photo?.subtitle ? (
              <Text style={styles.subtitle} numberOfLines={1}>
                {photo.subtitle}
              </Text>
            ) : null}
          </View>

          <BouncyPressable
            onPress={onClose}
            style={styles.closeBtn}
            accessibilityLabel="Tutup Foto">
            <X size={20} color={Pastel.pureWhite} />
          </BouncyPressable>
        </View>

        {/* Zoomable Fullscreen Image */}
        <View style={styles.stage}>
          {photo ? (
            <GestureDetector gesture={composedGesture}>
              <Animated.View
                style={[styles.imageWrap, { width, height: height * 0.78 }, animatedImgStyle]}>
                <Image
                  source={{ uri: photo.uri }}
                  style={styles.fullImage}
                  contentFit="contain"
                  cachePolicy="memory-disk"
                />
              </Animated.View>
            </GestureDetector>
          ) : null}
        </View>

        {/* Bottom Caption / Hint */}
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) + 10 }]}>
          {photo?.caption ? (
            <Text style={styles.caption}>{photo.caption}</Text>
          ) : (
            <Text style={styles.hint}>Ketuk 2x atau cubit untuk zoom</Text>
          )}
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(12, 14, 20, 0.96)',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 12,
    gap: 12,
    zIndex: 10,
  },
  titleCol: {
    flex: 1,
  },
  title: {
    fontFamily: BodyFontBold,
    fontSize: 16,
    lineHeight: 22,
    color: Pastel.pureWhite,
  },
  subtitle: {
    fontFamily: BodyFontRegular,
    fontSize: 12.5,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.72)',
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  imageWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
  bottomBar: {
    paddingHorizontal: 22,
    paddingTop: 12,
    alignItems: 'center',
  },
  caption: {
    fontFamily: BodyFontRegular,
    fontSize: 14.5,
    lineHeight: 21,
    color: Pastel.pureWhite,
    textAlign: 'center',
  },
  hint: {
    fontFamily: BodyFontRegular,
    fontSize: 12.5,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.55)',
  },
});
