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
  const setPlaySectionTab = useCoupleStore((s) => s.setPlaySectionTab);

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
            if (targetRoute.startsWith('/play')) {
              const match = targetRoute.match(/tab=(suit|ttt|qa|shop)/);
              if (match) {
                setPlaySectionTab(match[1] as 'suit' | 'ttt' | 'qa' | 'shop');
              }
              router.push('/play');
            } else {
              router.push(targetRoute as any);
            }
          }
        }}
        style={styles.toast}>
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
    left: 16,
    right: 16,
    zIndex: 999,
    alignItems: 'center',
  },
  toast: {
    width: '100%',
    maxWidth: 500,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    backgroundColor: Pastel.white,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 9,
  },
  emojiBubble: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Pastel.coralSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 18,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: BodyFontBold,
    fontSize: 13.5,
    lineHeight: 19,
    color: Pastel.text,
  },
  body: {
    fontFamily: RoundedFont,
    fontSize: 12.5,
    lineHeight: 17,
    color: Pastel.textMuted,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Pastel.bgMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
