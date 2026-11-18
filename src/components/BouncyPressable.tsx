import React, { useCallback } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { triggerLightHaptic } from '@/utils/haptics';

interface BouncyPressableProps extends Omit<PressableProps, 'style'> {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  withHaptic?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const BouncyPressable = React.memo(function BouncyPressable({
  children,
  style,
  scaleTo = 0.96,
  withHaptic = true,
  onPressIn,
  onPressOut,
  onPress,
  ...rest
}: BouncyPressableProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(
    (e: any) => {
      scale.value = withSpring(scaleTo, { damping: 14, stiffness: 320 });
      onPressIn?.(e);
    },
    [onPressIn, scale, scaleTo]
  );

  const handlePressOut = useCallback(
    (e: any) => {
      scale.value = withSpring(1, { damping: 12, stiffness: 260 });
      onPressOut?.(e);
    },
    [onPressOut, scale]
  );

  const handlePress = useCallback(
    (e: any) => {
      if (withHaptic) triggerLightHaptic();
      onPress?.(e);
    },
    [onPress, withHaptic]
  );

  return (
    <AnimatedPressable
      {...rest}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      style={[style, animatedStyle]}>
      {children}
    </AnimatedPressable>
  );
});
