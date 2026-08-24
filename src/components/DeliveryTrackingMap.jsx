// src/components/DeliveryTrackingMap.jsx
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { X, Navigation, Phone, MapPin, User, Clock, Route, AlertCircle, Sparkles, Building2, Moon, Sun } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatDate, formatOrderNumber, formatCurrency, formatPhoneNumber } from '../utils/formatters';
import { useTheme } from '../context/ThemeContext';
import { PUERTO_PRINCESA_LANDMARKS, detectNearestLandmark } from '../utils/landmarks';

export default function DeliveryTrackingMap({ isOpen, onClose, deliveryId, isDarkMode: isDarkModeProp }) {
  const { isDarkMode: themeDarkMode } = useTheme();
  const isDarkMode = typeof isDarkModeProp === 'boolean' ? isDarkModeProp : !!themeDarkMode;

  const [loading, setLoading] = useState(true);
  const [delivery, setDelivery] = useState(null);
  const [riderLocation, setRiderLocation] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState('');
  const [routeEtaMinutes, setRouteEtaMinutes] = useState(null);
  const [routeDistanceKm, setRouteDistanceKm] = useState(null);
  const iframeRef = useRef(null);
  const refreshInterval = useRef(null);

  useEffect(() => {
    if (!isOpen || !deliveryId) return;

    fetchDeliveryDetails();

    refreshInterval.current = setInterval(() => {
      fetchRiderLocation();
    }, 10000);

    return () => {
      if (refreshInterval.current) clearInterval(refreshInterval.current);
      setRouteEtaMinutes(null);
      setRouteDistanceKm(null);
    };
  }, [isOpen, deliveryId]);

  useEffect(() => {
    const onMessage = (event) => {
      const payload = event.data;
      if (!payload || payload.source !== 'DELIVERY_TRACKING_MAP') return;

      if (payload.type === 'ROUTE_METRICS') {
        setRouteEtaMinutes(typeof payload.etaMinutes === 'number' ? payload.etaMinutes : null);
        setRouteDistanceKm(typeof payload.distanceKm === 'number' ? payload.distanceKm : null);
      }
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const fetchDeliveryDetails = async () => {
    try {
      setLoading(true);
      setError('');

      const { data, error: queryError } = await supabase
        .from('deliveries')
        .select(`
          *,
          order:orders!deliveries_order_id_fkey (
            id,
            order_number,
            delivery_address,
            delivery_lat,
            delivery_lng,
            total_amount,
            customer_name:profiles!orders_user_id_fkey (
              full_name,
              phone_number
            )
          ),
          rider:profiles!deliveries_rider_id_fkey (
            id,
            full_name,
            phone_number,
            vehicle_type,
            vehicle_plate
          )
        `)
        .eq('id', deliveryId)
        .single();

      if (queryError) throw queryError;

      setDelivery(data);
      await fetchRiderLocation(data?.rider?.id);
    } catch (err) {
      console.error('Error fetching delivery details:', err);
      setError(err?.message || 'Failed to load delivery details');
    } finally {
      setLoading(false);
    }
  };

  const fetchRiderLocation = async (riderId = null) => {
    const targetRiderId = riderId || delivery?.rider?.id;
    if (!targetRiderId) return;

    try {
      const { data, error: queryError } = await supabase
        .from('profiles')
        .select('address_lat, address_lng, updated_at')
        .eq('id', targetRiderId)
        .single();

      if (queryError) throw queryError;
      if (!data?.address_lat || !data?.address_lng) return;

      setRiderLocation({
        lat: Number(data.address_lat),
        lng: Number(data.address_lng),
      });
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching rider location:', err);
    }
  };

  // Calculate nearest landmark for destination address
  const destinationLandmark = useMemo(() => {
    if (!delivery?.order?.delivery_lat || !delivery?.order?.delivery_lng) return null;
    return detectNearestLandmark(
      Number(delivery.order.delivery_lat),
      Number(delivery.order.delivery_lng),
      6.0
    );
  }, [delivery?.order?.delivery_lat, delivery?.order?.delivery_lng]);

  const mapHtml = useMemo(() => {
    if (!delivery || !riderLocation) return '';

    const hubPin = {
      lat: 9.7534772,
      lng: 118.7478688,
      name: 'Petron San Pedro Station Hub'
    };

    const destination = delivery?.order?.delivery_lat && delivery?.order?.delivery_lng
      ? { lat: Number(delivery.order.delivery_lat), lng: Number(delivery.order.delivery_lng) }
      : { lat: 9.7533882, lng: 118.745289 };

    const landmarksJson = JSON.stringify(PUERTO_PRINCESA_LANDMARKS);
    const orderNumber = delivery?.order?.order_number ? formatOrderNumber(delivery.order.order_number, delivery.order.id) : `#${delivery?.order_id || 'ORD'}`;

    return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #map { height: 100%; width: 100%; margin: 0; padding: 0; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: ${isDarkMode ? '#0f172a' : '#f8fafc'};
    }
    .leaflet-container {
      background: ${isDarkMode ? '#0f172a' : '#f8fafc'} !important;
    }
    .leaflet-popup-content-wrapper { 
      background: ${isDarkMode ? '#1e293b' : '#ffffff'} !important;
      color: ${isDarkMode ? '#f8fafc' : '#0f172a'} !important;
      border: ${isDarkMode ? '1px solid #334155' : '1px solid #e2e8f0'} !important;
      border-radius: 12px; 
      padding: 4px; 
      box-shadow: 0 10px 25px rgba(0,0,0,${isDarkMode ? '0.5' : '0.15'}); 
    }
    .leaflet-popup-tip {
      background: ${isDarkMode ? '#1e293b' : '#ffffff'} !important;
    }
    .leaflet-popup-close-button {
      color: ${isDarkMode ? '#94a3b8' : '#64748b'} !important;
    }
    .leaflet-control-zoom a {
      background: ${isDarkMode ? '#1e293b' : '#ffffff'} !important;
      color: ${isDarkMode ? '#f8fafc' : '#0f172a'} !important;
      border-color: ${isDarkMode ? '#334155' : '#e2e8f0'} !important;
    }
    
    /* Rider Pulse Pin */
    .rider-pin { 
      width: 32px; 
      height: 32px; 
      border-radius: 50%; 
      background: #16a34a; 
      border: 3px solid #ffffff; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      color: white; 
      font-size: 16px; 
      box-shadow: 0 0 0 6px rgba(22, 163, 74, 0.3), 0 4px 10px rgba(0,0,0,0.3);
      animation: pulse-ring 2s infinite ease-out;
    }
    @keyframes pulse-ring {
      0% { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.6), 0 4px 10px rgba(0,0,0,0.3); }
      70% { box-shadow: 0 0 0 12px rgba(22, 163, 74, 0), 0 4px 10px rgba(0,0,0,0.3); }
      100% { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0), 0 4px 10px rgba(0,0,0,0.3); }
    }

    /* Destination Pin */
    .dest-pin { 
      width: 30px; 
      height: 30px; 
      border-radius: 50%; 
      background: #dc2626; 
      border: 3px solid #ffffff; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      color: white; 
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(220, 38, 38, 0.5);
    }

    /* Store Hub Pin */
    .store-pin {
      width: 34px;
      height: 34px;
      border-radius: 10px;
      background: #0033A0;
      border: 2.5px solid #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 16px;
      box-shadow: 0 4px 12px rgba(0, 51, 160, 0.5);
    }

    /* Landmark Category Pin */
    .landmark-pin {
      width: 26px;
      height: 26px;
      border-radius: 8px;
      background: ${isDarkMode ? '#334155' : '#f1f5f9'};
      border: 2px solid ${isDarkMode ? '#64748b' : '#cbd5e1'};
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.18);
      transition: transform 0.15s ease;
    }
    .landmark-pin:hover {
      transform: scale(1.2);
      z-index: 9999 !important;
    }

    /* Layer Control Pill */
    .map-layer-control {
      position: absolute;
      top: 12px;
      right: 12px;
      z-index: 1000;
      background: ${isDarkMode ? 'rgba(15, 23, 42, 0.92)' : 'rgba(255, 255, 255, 0.95)'};
      backdrop-filter: blur(8px);
      padding: 4px;
      border-radius: 10px;
      border: 1px solid ${isDarkMode ? '#334155' : '#e2e8f0'};
      display: flex;
      align-items: center;
      gap: 3px;
      box-shadow: 0 4px 14px rgba(0,0,0,0.18);
    }
    .map-layer-btn {
      padding: 5px 9px;
      font-size: 11px;
      font-weight: 600;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      background: transparent;
      color: ${isDarkMode ? '#94a3b8' : '#64748b'};
      transition: all 0.2s ease;
    }
    .map-layer-btn:hover {
      background: ${isDarkMode ? '#334155' : '#f1f5f9'};
      color: ${isDarkMode ? '#f8fafc' : '#0f172a'};
    }
    .map-layer-btn.active {
      background: #0033A0;
      color: #ffffff;
      box-shadow: 0 2px 6px rgba(0,51,160,0.4);
    }
    .landmark-toggle-btn {
      margin-left: 4px;
      border-left: 1px solid ${isDarkMode ? '#334155' : '#e2e8f0'};
      padding-left: 8px;
    }
  </style>
</head>
<body>
  <div class="map-layer-control">
    <button class="map-layer-btn ${!isDarkMode ? 'active' : ''}" data-layer="street" onclick="setLayer('street')">🗺️ Street</button>
    <button class="map-layer-btn ${isDarkMode ? 'active' : ''}" data-layer="dark" onclick="setLayer('dark')">🌙 Dark</button>
    <button class="map-layer-btn" data-layer="satellite" onclick="setLayer('satellite')">🛰️ Satellite</button>
    <button class="map-layer-btn landmark-toggle-btn active" id="landmarkToggle" onclick="toggleLandmarks()">🏷️ Landmarks</button>
  </div>
  <div id="map"></div>
  <script>
    const isDark = ${isDarkMode};
    const rider = { lat: ${riderLocation.lat}, lng: ${riderLocation.lng} };
    const destination = { lat: ${destination.lat}, lng: ${destination.lng} };
    const store = ${JSON.stringify(hubPin)};
    const landmarks = ${landmarksJson};

    const map = L.map('map', { zoomControl: true }).setView([rider.lat, rider.lng], 14);
    let riderMarker = null;
    let destinationMarker = null;
    let storeMarker = null;
    let landmarkMarkers = [];
    let showLandmarks = true;
    let routeLine = null;
    let routeArrows = [];

    const tileLayers = {
      street: L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '©OpenStreetMap, ©CartoDB', subdomains: 'abcd', maxZoom: 19,
      }),
      dark: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '©OpenStreetMap, ©CartoDB', subdomains: 'abcd', maxZoom: 19,
      }),
      satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '©Esri', maxZoom: 19,
      })
    };

    let currentLayerKey = isDark ? 'dark' : 'street';
    let currentTileLayer = tileLayers[currentLayerKey];
    currentTileLayer.addTo(map);

    function setLayer(layerKey) {
      if (currentTileLayer) {
        map.removeLayer(currentTileLayer);
      }
      currentLayerKey = layerKey;
      currentTileLayer = tileLayers[layerKey] || (isDark ? tileLayers.dark : tileLayers.street);
      currentTileLayer.addTo(map);

      document.querySelectorAll('.map-layer-btn:not(.landmark-toggle-btn)').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.layer === layerKey);
      });
    }

    function toggleLandmarks() {
      showLandmarks = !showLandmarks;
      document.getElementById('landmarkToggle').classList.toggle('active', showLandmarks);
      
      landmarkMarkers.forEach(marker => {
        if (showLandmarks) {
          marker.addTo(map);
        } else {
          map.removeLayer(marker);
        }
      });
    }

    function publishMetrics(distanceKm, etaMinutes) {
      window.parent.postMessage({
        source: 'DELIVERY_TRACKING_MAP',
        type: 'ROUTE_METRICS',
        distanceKm,
        etaMinutes,
      }, '*');
    }

    function clearRoute() {
      if (routeLine) {
        map.removeLayer(routeLine);
        routeLine = null;
      }
      if (routeArrows.length > 0) {
        routeArrows.forEach((arrow) => map.removeLayer(arrow));
        routeArrows = [];
      }
    }

    function getBearingDeg(from, to) {
      const dLng = (to.lng - from.lng) * Math.PI / 180;
      const lat1 = from.lat * Math.PI / 180;
      const lat2 = to.lat * Math.PI / 180;
      const y = Math.sin(dLng) * Math.cos(lat2);
      const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
      return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
    }

    function drawRouteArrows(path) {
      if (!Array.isArray(path) || path.length < 3) return;

      if (routeArrows.length > 0) {
        routeArrows.forEach((arrow) => map.removeLayer(arrow));
        routeArrows = [];
      }

      const step = Math.max(10, Math.floor(path.length / 10));

      for (let i = step; i < path.length - 1; i += step) {
        const prev = path[i - 1];
        const curr = path[i];
        const next = path[i + 1];
        const bearing = getBearingDeg(
          { lat: prev[0], lng: prev[1] },
          { lat: next[0], lng: next[1] }
        );

        const arrowIcon = L.divIcon({
          className: '',
          html: '<div style="transform: rotate(' + bearing + 'deg); color:' + (isDark ? '#38bdf8' : '#0033A0') + '; font-size:14px; font-weight:bold; text-shadow:0 0 3px rgba(0,0,0,0.8);">▲</div>',
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });

        const marker = L.marker([curr[0], curr[1]], {
          icon: arrowIcon,
          interactive: false,
          keyboard: false,
          zIndexOffset: 450,
        }).addTo(map);

        routeArrows.push(marker);
      }
    }

    function initMarkers() {
      if (riderMarker) map.removeLayer(riderMarker);
      if (destinationMarker) map.removeLayer(destinationMarker);
      if (storeMarker) map.removeLayer(storeMarker);

      // Rider Marker
      riderMarker = L.marker([rider.lat, rider.lng], {
        icon: L.divIcon({ html: '<div class="rider-pin">🛵</div>', className: '', iconSize: [32, 32], iconAnchor: [16, 16] }),
        zIndexOffset: 1000,
      }).addTo(map).bindPopup('<b>🛵 Rider Live Location</b><br/>En route to customer drop-off');

      // Destination Marker
      destinationMarker = L.marker([destination.lat, destination.lng], {
        icon: L.divIcon({ html: '<div class="dest-pin">📍</div>', className: '', iconSize: [30, 30], iconAnchor: [15, 15] }),
        zIndexOffset: 900,
      }).addTo(map).bindPopup('<b>📍 Order ${orderNumber}</b><br/>Customer Drop-off Location');

      // Store Hub Marker
      storeMarker = L.marker([store.lat, store.lng], {
        icon: L.divIcon({ html: '<div class="store-pin">🏬</div>', className: '', iconSize: [34, 34], iconAnchor: [17, 17] }),
        zIndexOffset: 850,
      }).addTo(map).bindPopup('<b>🏬 ' + store.name + '</b><br/>Origin Fulfillment Hub');

      // Puerto Princesa Landmarks Markers
      landmarkMarkers.forEach(m => map.removeLayer(m));
      landmarkMarkers = [];

      landmarks.forEach(lm => {
        if (!lm.lat || !lm.lng) return;
        const icon = L.divIcon({
          className: 'landmark-pin',
          html: lm.icon || '📍',
          iconSize: [26, 26],
          iconAnchor: [13, 13]
        });

        const marker = L.marker([lm.lat, lm.lng], { icon, zIndexOffset: 300 })
          .bindPopup('<b>' + (lm.icon || '📍') + ' ' + lm.name + '</b><br/><span style="color:#64748b; font-size:11px;">' + lm.category + ' · Brgy. ' + lm.barangay + '</span>' + (lm.address ? '<br/><span style="font-size:11px;">' + lm.address + '</span>' : ''));

        if (showLandmarks) {
          marker.addTo(map);
        }
        landmarkMarkers.push(marker);
      });
    }

    function countTurns(route) {
      return (route.legs || []).reduce((sum, leg) => sum + ((leg.steps || []).length), 0);
    }

    function pickBestRoute(routes) {
      if (!routes?.length) return null;
      const baselineKm = routes[0].distance / 1000;

      const scored = routes.map((route) => {
        const durationMin = route.duration / 60;
        const turns = countTurns(route);
        const distanceKm = route.distance / 1000;
        const score = durationMin + turns * 0.08 + Math.abs(distanceKm - baselineKm) * 0.3;
        return { route, score };
      });

      scored.sort((a, b) => a.score - b.score);
      return scored[0].route;
    }

    async function drawRoadRoute() {
      clearRoute();

      try {
        const url = 'https://router.project-osrm.org/route/v1/driving/' +
          rider.lng + ',' + rider.lat + ';' + destination.lng + ',' + destination.lat +
          '?overview=full&geometries=geojson&steps=true&alternatives=true';

        const response = await fetch(url);
        const data = await response.json();
        const best = pickBestRoute(data?.routes || []);

        if (!best?.geometry?.coordinates?.length) {
          throw new Error('No route geometry from OSRM');
        }

        const routeCoords = best.geometry.coordinates.map((c) => [c[1], c[0]]);
        const startRoad = routeCoords[0];
        const endRoad = routeCoords[routeCoords.length - 1];

        const fullPath = [
          [rider.lat, rider.lng],
          startRoad,
          ...routeCoords,
          [destination.lat, destination.lng],
        ];

        routeLine = L.polyline(fullPath, {
          color: isDark ? '#38bdf8' : '#0033A0',
          weight: 5,
          opacity: 0.9,
          lineJoin: 'round',
        }).addTo(map);

        drawRouteArrows(fullPath);

        publishMetrics(Number((best.distance / 1000).toFixed(2)), Math.max(1, Math.round(best.duration / 60)));
        map.fitBounds(routeLine.getBounds(), { padding: [50, 50] });
      } catch (err) {
        const fallbackPath = [[rider.lat, rider.lng], [destination.lat, destination.lng]];

        routeLine = L.polyline([[rider.lat, rider.lng], [destination.lat, destination.lng]], {
          color: isDark ? '#38bdf8' : '#0033A0',
          weight: 4,
          opacity: 0.7,
          dashArray: '8 8',
        }).addTo(map);

        drawRouteArrows(fallbackPath);
        publishMetrics(null, null);
        map.fitBounds(routeLine.getBounds(), { padding: [50, 50] });
      }
    }

    window.addEventListener('message', (event) => {
      const payload = event.data || {};
      if (payload.type !== 'UPDATE_LOCATION') return;

      rider.lat = payload.lat;
      rider.lng = payload.lng;

      if (riderMarker) {
        riderMarker.setLatLng([rider.lat, rider.lng]);
      }

      drawRoadRoute();
    });

    initMarkers();
    drawRoadRoute();
  </script>
</body>
</html>`;
  }, [delivery, riderLocation, isDarkMode]);

  useEffect(() => {
    if (!iframeRef.current?.contentWindow || !riderLocation) return;
    iframeRef.current.contentWindow.postMessage(
      { type: 'UPDATE_LOCATION', lat: riderLocation.lat, lng: riderLocation.lng },
      '*'
    );
  }, [riderLocation, mapHtml]);

  const callRider = () => {
    if (delivery?.rider?.phone_number) {
      window.location.href = `tel:${delivery.rider.phone_number}`;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className={`rounded-xl w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl transition-colors duration-300 ${
        isDarkMode ? 'bg-slate-900 border border-slate-700' : 'bg-white'
      }`}>
        {/* Header */}
        <div className="bg-petron-blue p-4 flex justify-between items-center">
          <div className="flex items-center">
            <Navigation className="text-white mr-2" size={24} />
            <div>
              <h3 className="text-lg font-bold text-white">Live Delivery Tracking</h3>
              {delivery?.order?.order_number && (
                <p className="text-sm text-white/80">Order {formatOrderNumber(delivery.order.order_number, delivery.order.id)}</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
            <X size={20} className="text-white" />
          </button>
        </div>

        <div className="flex flex-col md:flex-row h-[calc(90vh-80px)]">
          {/* Map Frame Area */}
          <div className={`flex-1 relative ${isDarkMode ? 'bg-slate-950' : 'bg-gray-100'}`}>
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0033A0] dark:border-blue-400 mx-auto mb-4"></div>
                  <p className={isDarkMode ? 'text-slate-400' : 'text-gray-500'}>Loading live delivery map...</p>
                </div>
              </div>
            ) : error ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center p-6">
                  <AlertCircle size={44} className="mx-auto text-red-500 mb-2" />
                  <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
                  <button onClick={fetchDeliveryDetails} className="px-4 py-2 bg-[#0033A0] text-white rounded-lg hover:bg-[#002277]">
                    Retry
                  </button>
                </div>
              </div>
            ) : (
              <iframe
                ref={iframeRef}
                srcDoc={mapHtml}
                className="w-full h-full border-0"
                title="Delivery Tracking Map"
                sandbox="allow-scripts allow-same-origin"
              />
            )}
          </div>

          {/* Details Sidebar */}
          <div className={`w-full md:w-96 border-t md:border-t-0 md:border-l overflow-y-auto custom-scrollbar transition-colors duration-300 ${
            isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'
          }`}>
            <div className="p-4 space-y-4">
              {lastUpdated && (
                <div className={`text-xs text-center p-2 rounded transition-colors duration-300 ${
                  isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-gray-50 text-gray-500'
                }`}>
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </div>
              )}

              {/* ETA and Road Metrics Card */}
              <div className={`p-4 rounded-lg border transition-colors duration-300 ${
                isDarkMode ? 'bg-indigo-950/40 border-indigo-900/50' : 'bg-indigo-50 border-indigo-100'
              }`}>
                <h4 className={`font-semibold mb-2 flex items-center ${
                  isDarkMode ? 'text-indigo-200' : 'text-gray-900'
                }`}>
                  <Route size={16} className="mr-2 text-[#0033A0] dark:text-indigo-400" />
                  Live Route Metrics
                </h4>
                <div className={`text-sm space-y-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                  <p>ETA: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{routeEtaMinutes ? `${routeEtaMinutes} min` : 'Calculating...'}</span></p>
                  <p>Distance: <span className="font-semibold">{routeDistanceKm ? `${routeDistanceKm} km` : 'Calculating...'}</span></p>
                </div>
              </div>

              {/* Rider Info Card */}
              {delivery?.rider && (
                <div className={`p-4 rounded-lg border transition-colors duration-300 ${
                  isDarkMode ? 'bg-blue-950/30 border-blue-900/40' : 'bg-blue-50 border-blue-100'
                }`}>
                  <h4 className={`font-semibold mb-3 flex items-center ${
                    isDarkMode ? 'text-blue-200' : 'text-gray-900'
                  }`}>
                    <User size={16} className="mr-2 text-[#0033A0] dark:text-blue-400" />
                    Assigned Rider
                  </h4>
                  <div className={`space-y-2 text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                    <p><span className="font-medium">Name:</span> {delivery.rider.full_name}</p>
                    <p><span className="font-medium">Contact:</span> {formatPhoneNumber(delivery.rider.phone_number)}</p>
                    {delivery.rider.vehicle_type && (
                      <p><span className="font-medium">Vehicle:</span> {delivery.rider.vehicle_type} {delivery.rider.vehicle_plate ? `(${delivery.rider.vehicle_plate})` : ''}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Destination Details & Landmark Proximity */}
              {delivery?.order && (
                <div className={`p-4 rounded-lg border transition-colors duration-300 ${
                  isDarkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-gray-50 border-gray-200'
                }`}>
                  <h4 className={`font-semibold mb-3 flex items-center ${
                    isDarkMode ? 'text-slate-100' : 'text-gray-900'
                  }`}>
                    <MapPin size={16} className="mr-2 text-[#ED1C24]" />
                    Delivery Destination
                  </h4>
                  <p className={`text-sm mb-2 ${isDarkMode ? 'text-slate-300' : 'text-gray-800'}`}>
                    {delivery.order.delivery_address}
                  </p>
                  
                  {/* Nearest Landmark Badge */}
                  {destinationLandmark && (
                    <div className={`mt-2 p-2.5 rounded-lg border flex items-start gap-2 text-xs transition-colors duration-300 ${
                      isDarkMode ? 'bg-slate-800 border-slate-600 text-slate-200' : 'bg-white border-blue-100 text-slate-700 shadow-sm'
                    }`}>
                      <span className="text-base">{destinationLandmark.icon || '📍'}</span>
                      <div>
                        <p className="font-bold">{destinationLandmark.name}</p>
                        <p className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                          {destinationLandmark.formattedDistance} away · Brgy. {destinationLandmark.barangay}
                        </p>
                      </div>
                    </div>
                  )}

                  <p className={`text-sm mt-3 ${isDarkMode ? 'text-slate-300' : 'text-gray-800'}`}>
                    <span className="font-medium">Amount:</span> {formatCurrency(delivery.order.total_amount || 0)}
                  </p>
                </div>
              )}

              {/* Delivery Status Timeline */}
              {delivery && (
                <div className={`p-4 rounded-lg border text-sm space-y-2 transition-colors duration-300 ${
                  isDarkMode ? 'bg-slate-800/80 border-slate-700 text-slate-300' : 'bg-white border-gray-200 text-gray-700'
                }`}>
                  <h4 className={`font-semibold ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>Delivery Status</h4>
                  <p><span className={isDarkMode ? 'text-slate-400' : 'text-gray-500'}>Status:</span> <span className="font-semibold text-blue-600 dark:text-blue-400">{delivery.status}</span></p>
                  {delivery.assigned_at && <p><span className={isDarkMode ? 'text-slate-400' : 'text-gray-500'}>Assigned:</span> {formatDate(delivery.assigned_at)}</p>}
                  {delivery.picked_up_at && <p><span className={isDarkMode ? 'text-slate-400' : 'text-gray-500'}>Picked Up:</span> {formatDate(delivery.picked_up_at)}</p>}
                  {delivery.delivered_at && <p><span className={isDarkMode ? 'text-slate-400' : 'text-gray-500'}>Delivered:</span> {formatDate(delivery.delivered_at)}</p>}
                </div>
              )}

              <button
                onClick={callRider}
                disabled={!delivery?.rider?.phone_number}
                className={`w-full py-2.5 rounded-lg border font-medium transition-colors duration-300 disabled:opacity-50 flex items-center justify-center gap-2 ${
                  isDarkMode ? 'border-slate-600 text-slate-200 hover:bg-slate-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Phone size={18} />
                Call Rider
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
