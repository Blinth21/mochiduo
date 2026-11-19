import React, { useCallback } from 'react';
import {
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { triggerLightHaptic } from '@/utils/haptics';

interface BouncyPressableProps extends Omit<PressableProps, 'style'> {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  withHaptic?: boolean;
}

/**
 * Lightweight pressable without per-instance Reanimated worklets,
 * keeping list rows and chips snappy with minimal memory overhead.
 */
export const BouncyPressable = React.memo(function BouncyPressable({
  children,
  style,
  scaleTo = 0.96,
  withHaptic = true,
  onPress,
  ...rest
}: BouncyPressableProps) {
  const handlePress = useCallback(
    (e: any) => {
      if (withHaptic) triggerLightHaptic();
      onPress?.(e);
    },
    [onPress, withHaptic]
  );

  return (
    <Pressable
      {...rest}
      onPress={handlePress}
      style={({ pressed }) => [
        style,
        pressed && !rest.disabled
          ? { transform: [{ scale: scaleTo }], opacity: 0.9 }
          : undefined,
      ]}>
      {children}
    </Pressable>
  );
});
