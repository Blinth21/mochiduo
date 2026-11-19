import { Crosshair, Globe, Map as MapIcon, Navigation, RefreshCw, Users } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { BouncyPressable } from '@/components/BouncyPressable';
import {
  BodyFontBold,
  BodyFontSemi,
  MonoFont,
  MonoFontBold,
  Pastel,
  SerifFontSemi,
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
  if (upper === '#FF6B8B' || upper === '#E64D70') return Pastel.coral;
  if (upper === '#8B74FF') return Pastel.matcha;
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
    html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; background: #F7F3EB; font-family: system-ui, -apple-system, sans-serif; }
    .mochi-pin {
      width: 36px; height: 36px; border-radius: 50%;
      border: 2.5px solid #FCFBF8;
      box-shadow: 0 3px 10px rgba(31,27,24,0.24);
      display: flex; align-items: center; justify-content: center;
      color: #FFFFFF; font-weight: 700; font-size: 14px;
      position: relative;
    }
    .mochi-pulse {
      position: absolute; inset: -6px; border-radius: 50%;
      border: 2px solid currentColor; opacity: 0.45;
      animation: pulse 2.2s ease-out infinite;
    }
    @keyframes pulse {
      0% { transform: scale(0.85); opacity: 0.65; }
      100% { transform: scale(1.45); opacity: 0; }
    }
    .mochi-label {
      position: absolute; top: 39px; left: 50%; transform: translateX(-50%);
      background: #FCFBF8; color: #1F1B18;
      padding: 2px 7px; border-radius: 6px; font-size: 10.5px; font-weight: 700;
      letter-spacing: 0.2px;
      white-space: nowrap; box-shadow: 0 2px 6px rgba(31,27,24,0.12);
      border: 1px solid #C9BDA7;
    }
    .leaflet-control-attribution { font-size: 9px !important; opacity: 0.65; background: rgba(252,251,248,0.85) !important; }
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
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        html: '<div class="mochi-pin" style="background:' + color + ';color:' + color + ';"><div class="mochi-pulse"></div><span style="color:#FFFFFF;">' + initial + '</span><div class="mochi-label">' + name + '</div></div>'
      });
    }

    var myMarker = L.marker([state.myLat, state.myLng], { icon: makeIcon(state.myInitial, state.myName + ' (Kamu)', state.myColor) }).addTo(map);
    var partnerMarker = L.marker([state.partnerLat, state.partnerLng], { icon: makeIcon(state.partnerInitial, state.partnerName, state.partnerColor) });
    if (state.partnerSharing) partnerMarker.addTo(map);

    var line = L.polyline([[state.myLat, state.myLng], [state.partnerLat, state.partnerLng]], {
      color: '#C84B31', weight: 2.5, dashArray: '5, 6', opacity: 0.88
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
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.distancePill}>
          <Navigation size={12} color={Pastel.coralDark} />
          <Text style={styles.distancePillText}>
            {bothSharing ? `JARAK ${distanceText.toUpperCase()}` : 'MODE PRIVASI'}
          </Text>
        </View>

        <View style={styles.topRightRow}>
          <BouncyPressable onPress={handleToggleStyle} style={styles.styleTogglePill}>
            {mapStyle === 'street' ? (
              <Globe size={12} color={Pastel.text} />
            ) : (
              <MapIcon size={12} color={Pastel.text} />
            )}
            <Text style={styles.styleToggleText}>
              {mapStyle === 'street' ? 'Satelit' : 'Peta'}
            </Text>
          </BouncyPressable>

          <View style={styles.liveTag}>
            <View style={styles.liveDot} />
            <Text style={styles.liveTagText}>LIVE</Text>
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
              Cek koneksi atau beralih ke tab Radar Kompas di atas.
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
          <Users size={13} color={Pastel.text} />
          <Text style={styles.mapCtrlText}>Berdua</Text>
        </BouncyPressable>
        <BouncyPressable onPress={handleFocusMe} style={styles.mapCtrlBtn}>
          <Crosshair size={13} color={myPinColor} />
          <Text style={[styles.mapCtrlText, { color: myPinColor }]}>{me.name}</Text>
        </BouncyPressable>
        {partnerLoc.isSharing ? (
          <BouncyPressable onPress={handleFocusPartner} style={styles.mapCtrlBtn}>
            <Crosshair size={13} color={partnerPinColor} />
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
    backgroundColor: Pastel.bgElevated,
    borderRadius: 12,
    padding: 13,
    borderWidth: 1,
    borderColor: Pastel.borderStrong,
    gap: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  topRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  distancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Pastel.coralSoft,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E8C5BB',
  },
  distancePillText: {
    fontFamily: MonoFontBold,
    fontSize: 10.5,
    color: Pastel.coralDark,
    letterSpacing: 0.4,
  },
  liveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Pastel.matchaSoft,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#C2D5C7',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Pastel.matcha,
  },
  liveTagText: {
    fontFamily: MonoFontBold,
    fontSize: 10,
    color: Pastel.matcha,
    letterSpacing: 0.6,
  },
  styleTogglePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Pastel.bg,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Pastel.borderStrong,
  },
  styleToggleText: {
    fontFamily: BodyFontSemi,
    fontSize: 11.5,
    color: Pastel.text,
  },
  mapFrame: {
    width: '100%',
    height: 292,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Pastel.borderStrong,
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
    fontFamily: SerifFontSemi,
    fontSize: 16,
    color: Pastel.text,
    textAlign: 'center',
  },
  fallbackSub: {
    fontFamily: MonoFont,
    fontSize: 11.5,
    color: Pastel.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Pastel.text,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  retryText: {
    fontFamily: BodyFontBold,
    fontSize: 12.5,
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
    backgroundColor: Pastel.bg,
    borderWidth: 1,
    borderColor: Pastel.borderStrong,
    paddingVertical: 8,
    borderRadius: 8,
  },
  mapCtrlText: {
    fontFamily: BodyFontSemi,
    fontSize: 12,
    color: Pastel.text,
  },
});
