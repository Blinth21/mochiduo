import { Crosshair, Globe, Map as MapIcon, Navigation, RefreshCw, Users } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { BouncyPressable } from '@/components/BouncyPressable';
import {
  BodyFontBold,
  BodyFontSemi,
  Pastel,
  RoundedFont,
  SoftShadow,
} from '@/constants/pastelTheme';
import type { LocationSnapshot, PartnerProfile } from '@/types/couple';
import { formatDistanceId, getDistanceMeters } from '@/utils/geoCalc';

const TypedWebView = WebView as unknown as React.ComponentType<any>;

interface CoupleLocationMapProps {
  me: PartnerProfile;
  myLoc: LocationSnapshot;
  partner: PartnerProfile;
  partnerLoc: LocationSnapshot;
}

function normalizePinColor(hex: string): string {
  const upper = hex.toUpperCase();
  if (upper === '#C84B31' || upper === '#FF6B8B' || upper === '#E64D70') return Pastel.coral;
  if (upper === '#3A6B54' || upper === '#8B74FF') return Pastel.matcha;
  return hex;
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
    html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; background: #F5F6FA; font-family: system-ui, -apple-system, sans-serif; }
    .mochi-pin {
      width: 38px; height: 38px; border-radius: 50%;
      border: 3px solid #FFFFFF;
      box-shadow: 0 4px 12px rgba(28,30,38,0.22);
      display: flex; align-items: center; justify-content: center;
      color: #FFFFFF; font-weight: 700; font-size: 14px;
      position: relative;
    }
    .mochi-pulse {
      position: absolute; inset: -7px; border-radius: 50%;
      border: 2px solid currentColor; opacity: 0.45;
      animation: pulse 2.2s ease-out infinite;
    }
    @keyframes pulse {
      0% { transform: scale(0.85); opacity: 0.65; }
      100% { transform: scale(1.45); opacity: 0; }
    }
    .mochi-label {
      position: absolute; top: 41px; left: 50%; transform: translateX(-50%);
      background: #FFFFFF; color: #1C1E26;
      padding: 3px 9px; border-radius: 999px; font-size: 11px; font-weight: 700;
      white-space: nowrap; box-shadow: 0 3px 10px rgba(28,30,38,0.14);
    }
    .leaflet-control-attribution { font-size: 9px !important; opacity: 0.65; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var state = ${JSON.stringify(params)};
    var map = L.map('map', { zoomControl: true, attributionControl: true }).setView([state.myLat, state.myLng], 15);

    var streetLayer = L.tileLayer('https://mt{s}.google.com/vt/lyrs=m&hl=id&x={x}&y={y}&z={z}', {
      subdomains: ['0', '1', '2', '3'],
      maxZoom: 20,
      attribution: '&copy; Maps'
    });

    var satLayer = L.tileLayer('https://mt{s}.google.com/vt/lyrs=y&hl=id&x={x}&y={y}&z={z}', {
      subdomains: ['0', '1', '2', '3'],
      maxZoom: 20,
      attribution: '&copy; Satellite'
    });

    var fallbackLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      attribution: '&copy; Esri'
    });

    var activeLayer = streetLayer.addTo(map);
    var tileErrorCount = 0;
    streetLayer.on('tileerror', function() {
      tileErrorCount += 1;
      if (tileErrorCount >= 3 && activeLayer === streetLayer) {
        map.removeLayer(streetLayer);
        activeLayer = fallbackLayer.addTo(map);
      }
    });

    window.setMapStyle = function(mode) {
      if (activeLayer) map.removeLayer(activeLayer);
      if (mode === 'sat') {
        activeLayer = satLayer.addTo(map);
      } else if (mode === 'esri') {
        activeLayer = fallbackLayer.addTo(map);
      } else {
        activeLayer = streetLayer.addTo(map);
      }
    };

    function makeIcon(initial, name, color) {
      return L.divIcon({
        className: '',
        iconSize: [38, 38],
        iconAnchor: [19, 19],
        html: '<div class="mochi-pin" style="background:' + color + ';color:' + color + ';"><div class="mochi-pulse"></div><span style="color:#FFFFFF;">' + initial + '</span><div class="mochi-label">' + name + '</div></div>'
      });
    }

    var myMarker = L.marker([state.myLat, state.myLng], { icon: makeIcon(state.myInitial, state.myName + ' (Kamu)', state.myColor) }).addTo(map);
    var partnerMarker = L.marker([state.partnerLat, state.partnerLng], { icon: makeIcon(state.partnerInitial, state.partnerName, state.partnerColor) });
    if (state.partnerSharing) partnerMarker.addTo(map);

    var line = L.polyline([[state.myLat, state.myLng], [state.partnerLat, state.partnerLng]], {
      color: '#FF5C7A', weight: 3, dashArray: '6, 6', opacity: 0.85
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
  const [mapStyle, setMapStyle] = useState<'street' | 'sat'>('street');

  const myPinColor = normalizePinColor(me.auraColor);
  const partnerPinColor = normalizePinColor(partner.auraColor);

  const initialHtml = useMemo(
    () =>
      buildLeafletHtml({
        myLat: myLoc.latitude,
        myLng: myLoc.longitude,
        myName: escapeHtml(me.name),
        myInitial: escapeHtml(me.name.slice(0, 1).toUpperCase()),
        myColor: myPinColor,
        mySharing: myLoc.isSharing,
        partnerLat: partnerLoc.latitude,
        partnerLng: partnerLoc.longitude,
        partnerName: escapeHtml(partner.name),
        partnerInitial: escapeHtml(partner.name.slice(0, 1).toUpperCase()),
        partnerColor: partnerPinColor,
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
      myColor: myPinColor,
      mySharing: myLoc.isSharing,
      partnerLat: partnerLoc.latitude,
      partnerLng: partnerLoc.longitude,
      partnerName: escapeHtml(partner.name),
      partnerInitial: escapeHtml(partner.name.slice(0, 1).toUpperCase()),
      partnerColor: partnerPinColor,
      partnerSharing: partnerLoc.isSharing,
    });
    webViewRef.current.injectJavaScript(`window.updatePositions(${payload}); true;`);
  }, [
    mapReady,
    me.name,
    myLoc.isSharing,
    myLoc.latitude,
    myLoc.longitude,
    myPinColor,
    partner.name,
    partnerLoc.isSharing,
    partnerLoc.latitude,
    partnerLoc.longitude,
    partnerPinColor,
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

  const handleToggleStyle = useCallback(() => {
    setMapStyle((prev) => {
      const next = prev === 'street' ? 'sat' : 'street';
      webViewRef.current?.injectJavaScript(`window.setMapStyle("${next}"); true;`);
      return next;
    });
  }, []);

  return (
    <View style={[styles.card, SoftShadow]}>
      <View style={styles.topRow}>
        <View style={styles.distancePill}>
          <Navigation size={13} color={Pastel.coralDark} />
          <Text style={styles.distancePillText} numberOfLines={1}>
            {bothSharing ? `Jarak ${distanceText}` : 'Mode Privasi'}
          </Text>
        </View>

        <View style={styles.topRightRow}>
          <BouncyPressable onPress={handleToggleStyle} style={styles.styleTogglePill}>
            {mapStyle === 'street' ? (
              <Globe size={13} color={Pastel.text} />
            ) : (
              <MapIcon size={13} color={Pastel.text} />
            )}
            <Text style={styles.styleToggleText}>
              {mapStyle === 'street' ? 'Satelit' : 'Peta'}
            </Text>
          </BouncyPressable>

          <View style={styles.liveTag}>
            <View style={styles.liveDot} />
            <Text style={styles.liveTagText}>Live</Text>
          </View>
        </View>
      </View>

      <View style={styles.mapFrame}>
        {Platform.OS === 'web' ? (
          <View style={styles.webFallback}>
            <Text style={styles.fallbackTitle}>Peta Interaktif Tersedia di Android</Text>
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
              Cek koneksi atau beralih ke tab Radar di atas.
            </Text>
            <BouncyPressable
              onPress={() => {
                setMapError(false);
                setReloadKey((k) => k + 1);
              }}
              style={styles.retryBtn}>
              <RefreshCw size={14} color={Pastel.pureWhite} />
              <Text style={styles.retryText}>Muat Ulang</Text>
            </BouncyPressable>
          </View>
        ) : (
          <TypedWebView
            key={reloadKey}
            ref={webViewRef}
            source={{ html: initialHtml, baseUrl: 'https://mochiduo.app/' }}
            style={styles.webview}
            originWhitelist={['*']}
            javaScriptEnabled
            domStorageEnabled
            nestedScrollEnabled
            mixedContentMode="compatibility"
            onLoadEnd={() => setMapReady(true)}
            onError={() => setMapError(true)}
          />
        )}
      </View>

      <View style={styles.controlsRow}>
        <BouncyPressable onPress={handleFitBoth} style={styles.mapCtrlBtn}>
          <Users size={14} color={Pastel.text} />
          <Text style={styles.mapCtrlText}>Berdua</Text>
        </BouncyPressable>
        <BouncyPressable onPress={handleFocusMe} style={styles.mapCtrlBtn}>
          <Crosshair size={14} color={myPinColor} />
          <Text style={[styles.mapCtrlText, { color: myPinColor }]}>{me.name}</Text>
        </BouncyPressable>
        {partnerLoc.isSharing ? (
          <BouncyPressable onPress={handleFocusPartner} style={styles.mapCtrlBtn}>
            <Crosshair size={14} color={partnerPinColor} />
            <Text style={[styles.mapCtrlText, { color: partnerPinColor }]}>
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
    borderRadius: 24,
    padding: 14,
    gap: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    flexWrap: 'wrap',
  },
  topRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  distancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Pastel.coralSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    flexShrink: 1,
  },
  distancePillText: {
    fontFamily: BodyFontBold,
    fontSize: 12.5,
    lineHeight: 17,
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
    borderRadius: 3.5,
    backgroundColor: Pastel.matcha,
  },
  liveTagText: {
    fontFamily: BodyFontBold,
    fontSize: 11.5,
    lineHeight: 16,
    color: Pastel.matcha,
  },
  styleTogglePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Pastel.bgMuted,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
  },
  styleToggleText: {
    fontFamily: BodyFontSemi,
    fontSize: 12,
    lineHeight: 16,
    color: Pastel.text,
  },
  mapFrame: {
    width: '100%',
    height: 292,
    borderRadius: 18,
    overflow: 'hidden',
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
    fontFamily: BodyFontBold,
    fontSize: 15,
    lineHeight: 21,
    color: Pastel.text,
    textAlign: 'center',
  },
  fallbackSub: {
    fontFamily: RoundedFont,
    fontSize: 12.5,
    lineHeight: 18,
    color: Pastel.textMuted,
    textAlign: 'center',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Pastel.coral,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
    marginTop: 4,
  },
  retryText: {
    fontFamily: BodyFontBold,
    fontSize: 13,
    lineHeight: 18,
    color: Pastel.pureWhite,
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
    backgroundColor: Pastel.bgMuted,
    paddingVertical: 10,
    borderRadius: 14,
  },
  mapCtrlText: {
    fontFamily: BodyFontSemi,
    fontSize: 12.5,
    lineHeight: 17,
    color: Pastel.text,
  },
});
