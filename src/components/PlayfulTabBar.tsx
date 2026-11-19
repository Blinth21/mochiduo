import {
  Calendar,
  Camera,
  Heart,
  MapPin,
  MessageCircle,
  NotebookPen,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Keyboard, Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BouncyPressable } from '@/components/BouncyPressable';
import {
  BodyFontBold,
  MonoFontBold,
  Pastel,
  RoundedFont,
} from '@/constants/pastelTheme';
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
  index: 'Beranda',
  chat: 'Chat',
  memories: 'Kenangan',
  lokasi: 'Lokasi',
  dates: 'Kencan',
  notes: 'Catatan',
};

function renderTabIcon(name: string, color: string, focused: boolean) {
  const strokeWidth = focused ? 2.1 : 1.7;
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
    case 'chat':
      return <MessageCircle size={18} color={color} strokeWidth={strokeWidth} />;
    case 'memories':
      return <Camera size={18} color={color} strokeWidth={strokeWidth} />;
    case 'lokasi':
      return <MapPin size={18} color={color} strokeWidth={strokeWidth} />;
    case 'dates':
      return <Calendar size={18} color={color} strokeWidth={strokeWidth} />;
    case 'notes':
      return <NotebookPen size={18} color={color} strokeWidth={strokeWidth} />;
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

  return (
    <View style={[styles.dockOuter, { paddingBottom: bottomPad }]}>
      <View style={styles.dockInner}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
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
              scaleTo={0.94}
              style={styles.tabItem}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}>
              <View style={styles.activeMarkerSlot}>
                {isFocused ? <View style={styles.activeBar} /> : null}
              </View>

              <View style={styles.iconWrap}>
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
    backgroundColor: 'rgba(252, 251, 248, 0.96)',
    borderTopWidth: 1,
    borderTopColor: Pastel.borderStrong,
    alignItems: 'center',
  },
  dockInner: {
    width: '100%',
    maxWidth: 540,
    flexDirection: 'row',
    paddingHorizontal: 6,
    paddingTop: 2,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 6,
    gap: 3,
  },
  activeMarkerSlot: {
    height: 4,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginBottom: 4,
  },
  activeBar: {
    width: 22,
    height: 2.5,
    borderRadius: 999,
    backgroundColor: Pastel.coral,
  },
  iconWrap: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -9,
    minWidth: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: Pastel.coral,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: Pastel.white,
  },
  badgeText: {
    fontFamily: MonoFontBold,
    fontSize: 8.5,
    color: Pastel.pureWhite,
  },
  tabLabel: {
    fontSize: 10,
  },
  tabLabelFocused: {
    fontFamily: BodyFontBold,
    color: Pastel.text,
  },
  tabLabelMuted: {
    fontFamily: RoundedFont,
    color: Pastel.textSoft,
  },
});
