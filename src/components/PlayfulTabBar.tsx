import {
  Calendar,
  Camera,
  Gamepad2,
  Heart,
  MapPin,
  MessageCircle,
  StickyNote,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Keyboard, Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BouncyPressable } from '@/components/BouncyPressable';
import { BodyFontBold, BodyFontSemi, Pastel } from '@/constants/pastelTheme';
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

const TAB_LABELS: Record<string, string> = {
  index: 'Home',
  play: 'Main',
  chat: 'Chat',
  memories: 'Album',
  lokasi: 'Lokasi',
  dates: 'Kencan',
  notes: 'Notes',
};

function renderTabIcon(name: string, color: string, focused: boolean) {
  const strokeWidth = focused ? 2.2 : 1.8;
  switch (name) {
    case 'index':
      return (
        <Heart
          size={18}
          color={color}
          strokeWidth={strokeWidth}
          fill={focused ? color : 'none'}
        />
      );
    case 'play':
      return <Gamepad2 size={18} color={color} strokeWidth={strokeWidth} />;
    case 'chat':
      return <MessageCircle size={18} color={color} strokeWidth={strokeWidth} />;
    case 'memories':
      return <Camera size={18} color={color} strokeWidth={strokeWidth} />;
    case 'lokasi':
      return <MapPin size={18} color={color} strokeWidth={strokeWidth} />;
    case 'dates':
      return <Calendar size={18} color={color} strokeWidth={strokeWidth} />;
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

  const bottomPad = Math.max(insets?.bottom ?? safeInsets.bottom, Platform.OS === 'web' ? 12 : 8);

  const visibleRoutes = state.routes.filter((r) => Boolean(TAB_LABELS[r.name]));
  const currentRouteKey = state.routes[state.index]?.key;

  return (
    <View style={[styles.dockOuter, { paddingBottom: bottomPad }]}>
      <View style={styles.dockInner}>
        {visibleRoutes.map((route) => {
          const isFocused = currentRouteKey === route.key;
          const label = TAB_LABELS[route.name] ?? route.name;
          const iconColor = isFocused ? Pastel.coral : Pastel.textSoft;

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
              scaleTo={0.93}
              style={styles.tabItem}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}>
              <View style={[styles.iconPill, isFocused && styles.iconPillActive]}>
                {renderTabIcon(route.name, iconColor, isFocused)}
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
                adjustsFontSizeToFit
                minimumFontScale={0.78}
                maxFontSizeMultiplier={1.15}
                style={[
                  styles.tabLabel,
                  isFocused ? styles.tabLabelFocused : styles.tabLabelMuted,
                ]}>
                {label}
              </Text>
            </BouncyPressable>
          );
        })}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  dockOuter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Pastel.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    alignItems: 'center',
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 10,
  },
  dockInner: {
    width: '100%',
    maxWidth: 540,
    flexDirection: 'row',
    paddingHorizontal: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    paddingHorizontal: 1,
    gap: 3,
  },
  iconPill: {
    width: 38,
    height: 29,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconPillActive: {
    backgroundColor: Pastel.coralSoft,
  },
  badge: {
    position: 'absolute',
    top: -1,
    right: 1,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Pastel.coral,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    fontFamily: BodyFontBold,
    fontSize: 9.5,
    lineHeight: 13,
    color: Pastel.pureWhite,
  },
  tabLabel: {
    width: '100%',
    fontSize: 10,
    lineHeight: 14,
    textAlign: 'center',
    paddingRight: 1,
  },
  tabLabelFocused: {
    fontFamily: BodyFontBold,
    color: Pastel.coralDark,
  },
  tabLabelMuted: {
    fontFamily: BodyFontSemi,
    color: Pastel.textSoft,
  },
});
