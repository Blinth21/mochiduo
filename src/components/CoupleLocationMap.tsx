import { Crosshair, Navigation, RefreshCw, Users } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { BouncyPressable } from '@/components/BouncyPressable';
import { Pastel, RoundedFont } from '@/constants/pastelTheme';
import type { LocationSnapshot, PartnerProfile } from '@/types/couple';
import { formatDistanceId, getDistanceMeters } from '@/utils/geoCalc';

const TypedWebView = WebView as unknown as React.ComponentType<any>;

interface CoupleLocationMapProps {
  me: PartnerProfile;
  myLoc: LocationSnapshot;
  partner: PartnerProfile;
  partnerLoc: LocationSnapshot;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildLeafletHtml(params: {
  myLat: number;
  myLng: number;
  myName: string;
  myInitial: string;
  myColor: string;
  mySharing: boolean;
  partnerLat: number;
  partnerLng: number;
  partnerName: string;
  partnerInitial: string;
  partnerColor: string;
  partnerSharing: boolean;
}) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; background: #FFF9F5; font-family: sans-serif; }
    .mochi-pin {
      width: 38px; height: 38px; border-radius: 50%;
      border: 3px solid #fff;
      box-shadow: 0 4px 12px rgba(45,34,53,0.28);
      display: flex; align-items: center; justify-content: center;
      color: #fff; font-weight: 800; font-size: 15px;
      position: relative;
    }
    .mochi-pulse {
      position: absolute; inset: -7px; border-radius: 50%;
      border: 2.5px solid currentColor; opacity: 0.45;
      animation: pulse 2s ease-out infinite;
    }
    @keyframes pulse {
      0% { transform: scale(0.85); opacity: 0.7; }
      100% { transform: scale(1.45); opacity: 0; }
    }
    .mochi-label {
      position: absolute; top: 40px; left: 50%; transform: translateX(-50%);
      background: rgba(255,255,255,0.95); color: #2D2235;
      padding: 2px 7px; border-radius: 999px; font-size: 11px; font-weight: 700;
      white-space: nowrap; box-shadow: 0 2px 6px rgba(0,0,0,0.12);
      border: 1px solid #F2E4DC;
    }
    .leaflet-control-attribution { font-size: 9px !important; opacity: 0.7; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var state = ${JSON.stringify(params)};
    var map = L.map('map', { zoomControl: true, attributionControl: true }).setView([state.myLat, state.myLng], 14);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap &copy; CARTO'
    }).addTo(map);

    function makeIcon(initial, name, color) {
      return L.divIcon({
        className: '',
        iconSize: [38, 38],
        iconAnchor: [19, 19],
        html: '<div class="mochi-pin" style="background:' + color + ';color:' + color + ';"><div class="mochi-pulse"></div><span style="color:#fff;">' + initial + '</span><div class="mochi-label">' + name + '</div></div>'
      });
    }

    var myMarker = L.marker([state.myLat, state.myLng], { icon: makeIcon(state.myInitial, state.myName + ' (Kamu)', state.myColor) }).addTo(map);
    var partnerMarker = L.marker([state.partnerLat, state.partnerLng], { icon: makeIcon(state.partnerInitial, state.partnerName, state.partnerColor) });
    if (state.partnerSharing) partnerMarker.addTo(map);

    var line = L.polyline([[state.myLat, state.myLng], [state.partnerLat, state.partnerLng]], {
      color: '#FF6B8B', weight: 3, dashArray: '6, 6', opacity: 0.85
    });
    if (state.mySharing && state.partnerSharing) line.addTo(map);

    window.fitBoth = function() {
      if (state.partnerSharing) {
        var bounds = L.latLngBounds([[state.myLat, state.myLng], [state.partnerLat, state.partnerLng]]);
        map.fitBounds(bounds, { padding: [52, 52], maxZoom: 16 });
      } else {
        map.setView([state.myLat, state.myLng], 15);
      }
    };

    window.focusMe = function() { map.setView([state.myLat, state.myLng], 16, { animate: true }); };
    window.focusPartner = function() {
      if (state.partnerSharing) map.setView([state.partnerLat, state.partnerLng], 16, { animate: true });
    };

    window.updatePositions = function(next) {
      state = Object.assign({}, state, next);
      myMarker.setLatLng([state.myLat, state.myLng]);
      myMarker.setIcon(makeIcon(state.myInitial, state.myName + ' (Kamu)', state.myColor));
      partnerMarker.setLatLng([state.partnerLat, state.partnerLng]);
      partnerMarker.setIcon(makeIcon(state.partnerInitial, state.partnerName, state.partnerColor));

      if (state.partnerSharing) {
        if (!map.hasLayer(partnerMarker)) partnerMarker.addTo(map);
      } else {
        if (map.hasLayer(partnerMarker)) map.removeLayer(partnerMarker);
      }

      line.setLatLngs([[state.myLat, state.myLng], [state.partnerLat, state.partnerLng]]);
      if (state.mySharing && state.partnerSharing) {
        if (!map.hasLayer(line)) line.addTo(map);
      } else {
        if (map.hasLayer(line)) map.removeLayer(line);
      }
    };

    setTimeout(window.fitBoth, 150);
  </script>
</body>
</html>`;
}

export const CoupleLocationMap = React.memo(function CoupleLocationMap({
  me,
  myLoc,
  partner,
  partnerLoc,
}: CoupleLocationMapProps) {
  const webViewRef = useRef<WebView>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const initialHtml = useMemo(
    () =>
      buildLeafletHtml({
        myLat: myLoc.latitude,
        myLng: myLoc.longitude,
        myName: escapeHtml(me.name),
        myInitial: escapeHtml(me.name.slice(0, 1).toUpperCase()),
        myColor: me.auraColor,
        mySharing: myLoc.isSharing,
        partnerLat: partnerLoc.latitude,
        partnerLng: partnerLoc.longitude,
        partnerName: escapeHtml(partner.name),
        partnerInitial: escapeHtml(partner.name.slice(0, 1).toUpperCase()),
        partnerColor: partner.auraColor,
        partnerSharing: partnerLoc.isSharing,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reloadKey]
  );

  useEffect(() => {
    if (!mapReady || !webViewRef.current) return;
    const payload = JSON.stringify({
      myLat: myLoc.latitude,
      myLng: myLoc.longitude,
      myName: escapeHtml(me.name),
      myInitial: escapeHtml(me.name.slice(0, 1).toUpperCase()),
      myColor: me.auraColor,
      mySharing: myLoc.isSharing,
      partnerLat: partnerLoc.latitude,
      partnerLng: partnerLoc.longitude,
      partnerName: escapeHtml(partner.name),
      partnerInitial: escapeHtml(partner.name.slice(0, 1).toUpperCase()),
      partnerColor: partner.auraColor,
      partnerSharing: partnerLoc.isSharing,
    });
    webViewRef.current.injectJavaScript(`window.updatePositions(${payload}); true;`);
  }, [
    mapReady,
    me.auraColor,
    me.name,
    myLoc.isSharing,
    myLoc.latitude,
    myLoc.longitude,
    partner.auraColor,
    partner.name,
    partnerLoc.isSharing,
    partnerLoc.latitude,
    partnerLoc.longitude,
  ]);

  const distanceText = formatDistanceId(
    getDistanceMeters(myLoc.latitude, myLoc.longitude, partnerLoc.latitude, partnerLoc.longitude)
  );
  const bothSharing = myLoc.isSharing && partnerLoc.isSharing;

  const handleFitBoth = useCallback(() => {
    webViewRef.current?.injectJavaScript('window.fitBoth(); true;');
  }, []);

  const handleFocusMe = useCallback(() => {
    webViewRef.current?.injectJavaScript('window.focusMe(); true;');
  }, []);

  const handleFocusPartner = useCallback(() => {
    webViewRef.current?.injectJavaScript('window.focusPartner(); true;');
  }, []);

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.distancePill}>
          <Navigation size={13} color={Pastel.coralDark} />
          <Text style={styles.distancePillText}>
            {bothSharing ? `Jarak kalian: ${distanceText}` : 'Mode Privasi Aktif'}
          </Text>
        </View>

        <View style={styles.liveTag}>
          <View style={styles.liveDot} />
          <Text style={styles.liveTagText}>Peta Live</Text>
        </View>
      </View>

      <View style={styles.mapFrame}>
        {Platform.OS === 'web' ? (
          <View style={styles.webFallback}>
            <Text style={styles.fallbackTitle}>Peta Interaktif Tersedia di Aplikasi Android</Text>
            <Text style={styles.fallbackSub}>
              {me.name}: {myLoc.latitude.toFixed(4)}, {myLoc.longitude.toFixed(4)}
              {'\n'}
              {partner.name}: {partnerLoc.latitude.toFixed(4)}, {partnerLoc.longitude.toFixed(4)}
            </Text>
          </View>
        ) : mapError ? (
          <View style={styles.webFallback}>
            <Text style={styles.fallbackTitle}>Peta butuh koneksi internet</Text>
            <Text style={styles.fallbackSub}>
              Cek koneksi internet atau beralih ke tab Radar Mochi di atas.
            </Text>
            <BouncyPressable
              onPress={() => {
                setMapError(false);
                setReloadKey((k) => k + 1);
              }}
              style={styles.retryBtn}>
              <RefreshCw size={14} color={Pastel.white} />
              <Text style={styles.retryText}>Muat Ulang Peta</Text>
            </BouncyPressable>
          </View>
        ) : (
          <TypedWebView
            key={reloadKey}
            ref={webViewRef}
            source={{ html: initialHtml }}
            style={styles.webview}
            originWhitelist={['*']}
            javaScriptEnabled
            domStorageEnabled
            nestedScrollEnabled
            onLoadEnd={() => setMapReady(true)}
            onError={() => setMapError(true)}
          />
        )}
      </View>

      <View style={styles.controlsRow}>
        <BouncyPressable onPress={handleFitBoth} style={styles.mapCtrlBtn}>
          <Users size={13} color="#5B43D6" />
          <Text style={styles.mapCtrlText}>Lihat Berdua</Text>
        </BouncyPressable>
        <BouncyPressable onPress={handleFocusMe} style={styles.mapCtrlBtn}>
          <Crosshair size={13} color="#178C68" />
          <Text style={[styles.mapCtrlText, { color: '#178C68' }]}>{me.name}</Text>
        </BouncyPressable>
        {partnerLoc.isSharing ? (
          <BouncyPressable onPress={handleFocusPartner} style={styles.mapCtrlBtn}>
            <Crosshair size={13} color={Pastel.coralDark} />
            <Text style={[styles.mapCtrlText, { color: Pastel.coralDark }]}>
              {partner.name}
            </Text>
          </BouncyPressable>
        ) : null}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: Pastel.white,
    borderRadius: 28,
    padding: 14,
    borderWidth: 2,
    borderColor: Pastel.border,
    shadowColor: '#D9A7B8',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
    gap: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  distancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Pastel.coralSoft,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
  },
  distancePillText: {
    fontFamily: RoundedFont,
    fontSize: 12.5,
    fontWeight: '800',
    color: Pastel.coralDark,
  },
  liveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Pastel.matchaSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#178C68',
  },
  liveTagText: {
    fontFamily: RoundedFont,
    fontSize: 11.5,
    fontWeight: '800',
    color: '#178C68',
  },
  mapFrame: {
    width: '100%',
    height: 290,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: Pastel.border,
    backgroundColor: Pastel.bg,
  },
  webview: {
    flex: 1,
    backgroundColor: Pastel.bg,
  },
  webFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 8,
  },
  fallbackTitle: {
    fontFamily: RoundedFont,
    fontSize: 14.5,
    fontWeight: '800',
    color: Pastel.text,
    textAlign: 'center',
  },
  fallbackSub: {
    fontFamily: RoundedFont,
    fontSize: 12,
    fontWeight: '600',
    color: Pastel.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Pastel.sky,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    marginTop: 4,
  },
  retryText: {
    fontFamily: RoundedFont,
    fontSize: 12.5,
    fontWeight: '800',
    color: Pastel.white,
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  mapCtrlBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: Pastel.bg,
    borderWidth: 1.5,
    borderColor: Pastel.border,
    paddingVertical: 8,
    borderRadius: 14,
  },
  mapCtrlText: {
    fontFamily: RoundedFont,
    fontSize: 12,
    fontWeight: '800',
    color: '#5B43D6',
  },
});
