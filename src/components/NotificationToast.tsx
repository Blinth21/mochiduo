import { useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BouncyPressable } from '@/components/BouncyPressable';
import { BodyFontBold, Pastel, RoundedFont } from '@/constants/pastelTheme';
import { useCoupleStore } from '@/store/useCoupleStore';

export const NotificationToast = React.memo(function NotificationToast() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const activeToast = useCoupleStore((s) => s.activeToast);
  const dismissToast = useCoupleStore((s) => s.dismissToast);

  useEffect(() => {
    if (!activeToast) return;
    const timer = setTimeout(() => {
      dismissToast();
    }, 4200);
    return () => clearTimeout(timer);
  }, [activeToast, dismissToast]);

  if (!activeToast) return null;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { top: Math.max(insets.top, 10) + 6 }]}>
      <BouncyPressable
        onPress={() => {
          const targetRoute = activeToast.route;
          dismissToast();
          if (targetRoute) {
            router.push(targetRoute as any);
          }
        }}
        style={styles.toast}>
        <View style={styles.accentRule} />
        <View style={styles.emojiBubble}>
          <Text style={styles.emoji}>{activeToast.emoji}</Text>
        </View>
        <View style={styles.copy}>
          <Text style={styles.title} numberOfLines={1}>
            {activeToast.title}
          </Text>
          <Text style={styles.body} numberOfLines={2}>
            {activeToast.body}
          </Text>
        </View>
        <BouncyPressable onPress={dismissToast} style={styles.closeBtn}>
          <X size={14} color={Pastel.textMuted} />
        </BouncyPressable>
      </BouncyPressable>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 14,
    right: 14,
    zIndex: 999,
    alignItems: 'center',
  },
  toast: {
    width: '100%',
    maxWidth: 500,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Pastel.bgElevated,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: Pastel.borderStrong,
    shadowColor: '#1F1B18',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 9,
  },
  accentRule: {
    width: 3,
    alignSelf: 'stretch',
    borderRadius: 999,
    backgroundColor: Pastel.coral,
  },
  emojiBubble: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Pastel.bgMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 17,
  },
  copy: {
    flex: 1,
    gap: 1,
  },
  title: {
    fontFamily: BodyFontBold,
    fontSize: 13,
    color: Pastel.text,
  },
  body: {
    fontFamily: RoundedFont,
    fontSize: 12,
    color: Pastel.textMuted,
    lineHeight: 16,
  },
  closeBtn: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: Pastel.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
