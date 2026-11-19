import {
  CalendarHeart,
  Camera,
  Heart,
  MapPin,
  MessageCircle,
  StickyNote,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Keyboard, Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BouncyPressable } from '@/components/BouncyPressable';
import { Pastel, RoundedFont } from '@/constants/pastelTheme';
import { useCoupleStore } from '@/store/useCoupleStore';

interface TabBarProps {
  state: {
    index: number;
    routes: readonly { key: string; name: string }[];
  };
  emitter: {
    emit: (options: {
      type: 'tabPress';
      target: string;
      canPreventDefault: true;
    }) => { defaultPrevented: boolean };
  };
  navigateToTab: (routeKey: string) => void;
  insets: { bottom: number };
}

const TAB_META: Record<
  string,
  { label: string; color: string; softBg: string }
> = {
  index: { label: 'Beranda', color: Pastel.coralDark, softBg: Pastel.coralSoft },
  chat: { label: 'Chat', color: '#009E7A', softBg: Pastel.matchaSoft },
  memories: { label: 'Kenangan', color: '#1B82D6', softBg: Pastel.skySoft },
  lokasi: { label: 'Lokasi', color: '#178C68', softBg: Pastel.matchaSoft },
  dates: { label: 'Kencan', color: '#D97B00', softBg: Pastel.honeySoft },
  notes: { label: 'Catatan', color: '#6F54F5', softBg: Pastel.taroSoft },
};

function renderTabIcon(name: string, color: string, focused: boolean) {
  const strokeWidth = focused ? 2.4 : 2;
  switch (name) {
    case 'index':
      return <Heart size={18} color={color} strokeWidth={strokeWidth} fill={focused ? color : 'none'} />;
    case 'chat':
      return <MessageCircle size={18} color={color} strokeWidth={strokeWidth} fill={focused ? color + '22' : 'none'} />;
    case 'memories':
      return <Camera size={18} color={color} strokeWidth={strokeWidth} />;
    case 'lokasi':
      return <MapPin size={18} color={color} strokeWidth={strokeWidth} />;
    case 'dates':
      return <CalendarHeart size={18} color={color} strokeWidth={strokeWidth} />;
    case 'notes':
      return <StickyNote size={18} color={color} strokeWidth={strokeWidth} />;
    default:
      return <Heart size={18} color={color} strokeWidth={strokeWidth} />;
  }
}

export const PlayfulTabBar = React.memo(function PlayfulTabBar({
  state,
  emitter,
  navigateToTab,
  insets,
}: TabBarProps) {
  const safeInsets = useSafeAreaInsets();
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const activePartnerId = useCoupleStore((s) => s.activePartnerId);
  const unreadChatCount = useCoupleStore((s) =>
    s.chatMessages.reduce(
      (acc, m) => (m.senderId !== activePartnerId && m.status !== 'read' ? acc + 1 : acc),
      0
    )
  );

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const showSub = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  if (keyboardVisible) return null;

  const bottomPad = Math.max(insets?.bottom ?? safeInsets.bottom, Platform.OS === 'web' ? 14 : 10);

  return (
    <View pointerEvents="box-none" style={[styles.outerWrap, { paddingBottom: bottomPad }]}>
      <View style={styles.pillBar}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const meta = TAB_META[route.name] ?? {
            label: route.name,
            color: Pastel.coralDark,
            softBg: Pastel.coralSoft,
          };

          const onPress = () => {
            const event = emitter.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigateToTab(route.key);
            }
          };

          return (
            <BouncyPressable
              key={route.key}
              onPress={onPress}
              scaleTo={0.92}
              style={[
                styles.tabItem,
                isFocused && { backgroundColor: meta.softBg },
              ]}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}>
              <View style={styles.iconWrap}>
                {renderTabIcon(
                  route.name,
                  isFocused ? meta.color : Pastel.textSoft,
                  isFocused
                )}
                {route.name === 'chat' && unreadChatCount > 0 ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {unreadChatCount > 9 ? '9+' : unreadChatCount}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text
                numberOfLines={1}
                style={[
                  styles.tabLabel,
                  { color: isFocused ? meta.color : Pastel.textMuted },
                  isFocused && styles.tabLabelFocused,
                ]}>
                {meta.label}
              </Text>
            </BouncyPressable>
          );
        })}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  outerWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  pillBar: {
    width: '100%',
    maxWidth: 500,
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.97)',
    borderRadius: 28,
    padding: 5,
    borderWidth: 2,
    borderColor: Pastel.border,
    shadowColor: '#C592A5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 9,
    gap: 2,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: 1,
    borderRadius: 22,
    gap: 2,
  },
  iconWrap: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -9,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Pastel.coralDark,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: Pastel.white,
  },
  badgeText: {
    fontFamily: RoundedFont,
    fontSize: 9,
    fontWeight: '800',
    color: Pastel.white,
  },
  tabLabel: {
    fontFamily: RoundedFont,
    fontSize: 9.5,
    fontWeight: '600',
  },
  tabLabelFocused: {
    fontWeight: '800',
  },
});
