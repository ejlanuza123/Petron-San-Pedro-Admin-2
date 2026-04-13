import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X, MapPin, Phone, User, Truck, AlertCircle, Navigation, Route, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { retryAsync } from '../utils/retry';
import { formatOrderNumber } from '../utils/formatters';

export default function RiderLiveTrackingModal({ isOpen, onClose, rider }) {
  const [riderLocation, setRiderLocation] = useState(null);
  const [activeDeliveries, setActiveDeliveries] = useState([]);
  const [selectedDeliveryId, setSelectedDeliveryId] = useState(null);
  const [routeEtaMinutes, setRouteEtaMinutes] = useState(null);
  const [routeDistanceKm, setRouteDistanceKm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [mapHtml, setMapHtml] = useState('');
  const [channelStatus, setChannelStatus] = useState('idle');
  const iframeRef = useRef(null);
  const subscriptionRef = useRef(null);
  const reconnectTimerRef = useRef(null);

  useEffect(() => {
    const handleMapMessage = (event) => {
      const data = event.data;
      if (!data || data.source !== 'RIDER_LIVE_MAP') return;

      if (data.type === 'ROUTE_METRICS') {
        setRouteEtaMinutes(typeof data.etaMinutes === 'number' ? data.etaMinutes : null);
        setRouteDistanceKm(typeof data.distanceKm === 'number' ? data.distanceKm : null);
      }
    };

    window.addEventListener('message', handleMapMessage);
    return () => window.removeEventListener('message', handleMapMessage);
  }, []);

  useEffect(() => {
    if (!riderLocation || !rider) return;
    setMapHtml(generateMapHtml(riderLocation, activeDeliveries, rider, selectedDeliveryId));
  }, [riderLocation, activeDeliveries, rider, selectedDeliveryId]);

  useEffect(() => {
    if (!iframeRef.current?.contentWindow) return;

    if (selectedDeliveryId) {
      iframeRef.current.contentWindow.postMessage({ type: 'FOCUS_DELIVERY', deliveryId: selectedDeliveryId }, '*');
    } else {
      iframeRef.current.contentWindow.postMessage({ type: 'SHOW_ALL_DELIVERIES' }, '*');
      setRouteEtaMinutes(null);
      setRouteDistanceKm(null);
    }
  }, [selectedDeliveryId, mapHtml]);

  const fetchInitialData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      if (!rider?.id) {
        setError('No rider selected');
        return;
      }

      const profileData = await retryAsync(async () => {
        const { data, error: profileError } = await supabase
          .from('profiles')
          .select('id, full_name, phone_number, address_lat, address_lng, vehicle_type, vehicle_plate, is_online')
          .eq('id', rider.id)
          .single();

        if (profileError) throw profileError;
        return data;
      }, {
        maxRetries: 2,
        initialDelayMs: 400
      });

      if (!profileData) throw new Error('Rider profile not found');

      setRiderLocation({
        lat: profileData.address_lat || 9.7534772,
        lng: profileData.address_lng || 118.7478688,
        isOnline: profileData.is_online,
      });

      const deliveriesData = await retryAsync(async () => {
        const { data, error: deliveriesError } = await supabase
          .from('deliveries')
          .select(`
            id,
            status,
            assigned_at,
            order:orders!deliveries_order_id_fkey (
              id,
              order_number,
              delivery_address,
              delivery_lat,
              delivery_lng
            )
          `)
          .eq('rider_id', rider.id)
          .in('status', ['assigned', 'accepted', 'picked_up', 'out_for_delivery'])
          .order('assigned_at', { ascending: false });

        if (deliveriesError) throw deliveriesError;
        return data;
      }, {
        maxRetries: 2,
        initialDelayMs: 400
      });

      const items = deliveriesData || [];
      setActiveDeliveries(items);
      setSelectedDeliveryId((prev) => {
        if (prev && items.some((item) => String(item.id) === String(prev))) {
          return prev;
        }
        return items.length > 0 ? items[0].id : null;
      });
      setLastUpdated(new Date());
    } catch (err) {
      setError(err?.message || 'Failed to load rider data');
      console.error('Error fetching rider tracking data:', err);
    } finally {
      setLoading(false);
    }
  }, [rider]);

  const subscribeToRiderLocation = useCallback(() => {
    if (!rider?.id) return;

    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }

    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    setChannelStatus('connecting');

    subscriptionRef.current = supabase
      .channel(`rider-tracking-${rider.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${rider.id}` },
        (payload) => {
          const updated = payload.new;
          if (!updated?.address_lat || !updated?.address_lng) return;

          setRiderLocation({
            lat: updated.address_lat,
            lng: updated.address_lng,
            isOnline: updated.is_online,
          });
          setLastUpdated(new Date());

          if (iframeRef.current?.contentWindow) {
            iframeRef.current.contentWindow.postMessage({
              type: 'UPDATE_LOCATION',
              lat: updated.address_lat,
              lng: updated.address_lng,
            }, '*');
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setChannelStatus('connected');
          if (reconnectTimerRef.current) {
            clearTimeout(reconnectTimerRef.current);
            reconnectTimerRef.current = null;
          }
        }

        if (['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(status) && isOpen) {
          setChannelStatus('reconnecting');
          reconnectTimerRef.current = setTimeout(() => {
            subscribeToRiderLocation();
          }, 1500);
        }
      });
  }, [isOpen, rider?.id]);

  useEffect(() => {
    if (isOpen && rider) {
      fetchInitialData();
      subscribeToRiderLocation();
    }

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      setRouteEtaMinutes(null);
      setRouteDistanceKm(null);
      setChannelStatus('idle');
    };
  }, [isOpen, rider, fetchInitialData, subscribeToRiderLocation]);

  const generateMapHtml = (location, deliveries, riderInfo, focusedDeliveryId) => {
    const deliveryLocations = (deliveries || [])
      .filter((d) => d.order?.delivery_lat && d.order?.delivery_lng)
      .map((d) => ({
        deliveryId: d.id,
        orderId: d.order.id,
        orderNumberShort: formatOrderNumber(d.order.order_number, d.order.id),
        lat: Number(d.order.delivery_lat),
        lng: Number(d.order.delivery_lng),
        address: d.order.delivery_address || 'Delivery Address',
        status: d.status,
      }));

    const mode = focusedDeliveryId ? 'focused' : 'all';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #map { height: 100%; width: 100%; margin: 0; }
    body { font-family: 'Segoe UI', sans-serif; }
    .rider-marker { width: 16px; height: 16px; border-radius: 999px; background: #16a34a; border: 3px solid #fff; box-shadow: 0 0 0 6px rgba(22, 163, 74, 0.2); }
    .delivery-pin { width: 14px; height: 14px; border-radius: 999px; background: #dc2626; border: 3px solid #fff; }
    .delivery-label { background: #fff; border: 1px solid #e5e7eb; border-radius: 999px; font-size: 11px; font-weight: 600; padding: 2px 8px; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const riderInfo = ${JSON.stringify({
      name: riderInfo?.full_name || 'Rider',
      vehicleType: riderInfo?.vehicle_type || 'N/A',
      vehiclePlate: riderInfo?.vehicle_plate || 'N/A',
    })};

    const riderLocation = { lat: ${location.lat}, lng: ${location.lng} };
    const deliveries = ${JSON.stringify(deliveryLocations)};

    let map = L.map('map').setView([riderLocation.lat, riderLocation.lng], 14);
    let riderMarker = null;
    let deliveryMarkers = [];
    let routeLayer = null;
    let mapMode = '${mode}';
    let selectedDeliveryId = ${focusedDeliveryId ? `'${focusedDeliveryId}'` : 'null'};

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '©OpenStreetMap, ©CartoDB', subdomains: 'abcd', maxZoom: 19,
    }).addTo(map);

    function clearRoute() {
      if (routeLayer) {
        map.removeLayer(routeLayer);
        routeLayer = null;
      }
    }

    function getFocusedDelivery() {
      return deliveries.find((d) => String(d.deliveryId) === String(selectedDeliveryId)) || null;
    }

    function fitAll() {
      const points = [L.latLng(riderLocation.lat, riderLocation.lng), ...deliveryMarkers.map((m) => m.getLatLng())];
      if (points.length > 1) {
        map.fitBounds(L.latLngBounds(points), { padding: [50, 50] });
      } else {
        map.setView([riderLocation.lat, riderLocation.lng], 15);
      }
    }

    function publishRouteMetrics(distanceKm, etaMinutes) {
      window.parent.postMessage({
        source: 'RIDER_LIVE_MAP',
        type: 'ROUTE_METRICS',
        distanceKm,
        etaMinutes,
      }, '*');
    }

    function addMarkers() {
      if (riderMarker) map.removeLayer(riderMarker);
      deliveryMarkers.forEach((m) => map.removeLayer(m));
      deliveryMarkers = [];

      riderMarker = L.marker([riderLocation.lat, riderLocation.lng], {
        icon: L.divIcon({ html: '<div class="rider-marker"></div>', className: '', iconSize: [22, 22], iconAnchor: [11, 11] }),
        zIndexOffset: 1000,
      }).addTo(map).bindPopup('<b>' + riderInfo.name + '</b><br>' + riderInfo.vehicleType + ' (' + riderInfo.vehiclePlate + ')');

      deliveries.forEach((d, i) => {
        if (mapMode === 'focused' && String(d.deliveryId) !== String(selectedDeliveryId)) return;

        const marker = L.marker([d.lat, d.lng], {
          icon: L.divIcon({
            html: '<div style="position:relative"><div class="delivery-pin"></div><div class="delivery-label" style="position:absolute;left:10px;top:-6px">' + (d.orderNumberShort || ('#' + (d.orderId || i + 1))) + '</div></div>',
            className: '',
            iconSize: [30, 20],
            iconAnchor: [7, 7],
          }),
        }).addTo(map).bindPopup('<b>Order ' + (d.orderNumberShort || ('#' + d.orderId)) + '</b><br>' + d.address + '<br>Status: ' + d.status);

        deliveryMarkers.push(marker);
      });
    }

    async function fetchBestRoute(start, end) {
      const url = 'https://router.project-osrm.org/route/v1/driving/' +
        start.lng + ',' + start.lat + ';' + end.lng + ',' + end.lat +
        '?overview=full&geometries=geojson&steps=true&alternatives=true';

      const response = await fetch(url);
      const data = await response.json();
      const routes = data?.routes || [];
      if (!routes.length) return null;

      // Mobile-like best route: prioritize faster duration, penalize many maneuvers.
      const scored = routes.map((route) => {
        const maneuvers = (route.legs || []).reduce((sum, leg) => sum + ((leg.steps || []).length), 0);
        const distanceKm = route.distance / 1000;
        const durationMin = route.duration / 60;
        const score = durationMin + maneuvers * 0.08 + Math.abs(distanceKm - routes[0].distance / 1000) * 0.3;
        return { route, score };
      });

      scored.sort((a, b) => a.score - b.score);
      return scored[0].route;
    }

    async function drawFocusedRoute() {
      clearRoute();

      if (mapMode !== 'focused') {
        publishRouteMetrics(null, null);
        return;
      }

      const target = getFocusedDelivery();
      if (!target) {
        publishRouteMetrics(null, null);
        return;
      }

      try {
        const bestRoute = await fetchBestRoute(
          { lat: riderLocation.lat, lng: riderLocation.lng },
          { lat: target.lat, lng: target.lng }
        );

        if (!bestRoute?.geometry?.coordinates?.length) {
          throw new Error('No road geometry');
        }

        const routeCoords = bestRoute.geometry.coordinates.map((c) => [c[1], c[0]]);
        const firstRoadPoint = routeCoords[0];
        const lastRoadPoint = routeCoords[routeCoords.length - 1];

        const fullRoute = [
          [riderLocation.lat, riderLocation.lng],
          firstRoadPoint,
          ...routeCoords,
          [target.lat, target.lng],
        ];

        routeLayer = L.polyline(fullRoute, {
          color: '#0033A0',
          weight: 5,
          opacity: 0.9,
          lineJoin: 'round',
        }).addTo(map);

        publishRouteMetrics(Number((bestRoute.distance / 1000).toFixed(2)), Math.max(1, Math.round(bestRoute.duration / 60)));
        map.fitBounds(routeLayer.getBounds(), { padding: [50, 50] });
      } catch (err) {
        // Fallback to straight line so admin still sees a route.
        routeLayer = L.polyline([[riderLocation.lat, riderLocation.lng], [target.lat, target.lng]], {
          color: '#0033A0', weight: 4, opacity: 0.7, dashArray: '8 8',
        }).addTo(map);
        publishRouteMetrics(null, null);
        map.fitBounds(routeLayer.getBounds(), { padding: [50, 50] });
      }
    }

    function refreshMap() {
      addMarkers();
      if (mapMode === 'focused') {
        drawFocusedRoute();
      } else {
        clearRoute();
        fitAll();
      }
    }

    window.addEventListener('message', (event) => {
      const payload = event.data || {};

      if (payload.type === 'UPDATE_LOCATION') {
        riderLocation.lat = payload.lat;
        riderLocation.lng = payload.lng;
        if (riderMarker) riderMarker.setLatLng([payload.lat, payload.lng]);
        if (mapMode === 'focused') {
          drawFocusedRoute();
        } else {
          fitAll();
        }
      }

      if (payload.type === 'FOCUS_DELIVERY') {
        selectedDeliveryId = payload.deliveryId;
        mapMode = 'focused';
        refreshMap();
      }

      if (payload.type === 'SHOW_ALL_DELIVERIES') {
        selectedDeliveryId = null;
        mapMode = 'all';
        refreshMap();
      }
    });

    refreshMap();
  </script>
</body>
</html>`;
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'assigned': return 'bg-yellow-100 text-yellow-800';
      case 'accepted': return 'bg-cyan-100 text-cyan-800';
      case 'picked_up': return 'bg-blue-100 text-blue-800';
      case 'out_for_delivery': return 'bg-orange-100 text-orange-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getChannelBadge = () => {
    switch (channelStatus) {
      case 'connected':
        return { label: 'Connected', dot: 'bg-green-500' };
      case 'reconnecting':
        return { label: 'Reconnecting...', dot: 'bg-yellow-500 animate-pulse' };
      case 'connecting':
        return { label: 'Connecting...', dot: 'bg-blue-500 animate-pulse' };
      default:
        return { label: 'Idle', dot: 'bg-gray-400' };
    }
  };

  if (!isOpen || !rider) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl w-full max-w-6xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-petron-blue p-6 flex justify-between items-center">
          <h3 className="text-xl font-bold text-white flex items-center">
            <Navigation className="mr-2" size={24} />
            Live Rider Tracking - {rider?.full_name || 'Rider'}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
            <X size={20} className="text-white" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 bg-gray-100 relative">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin p-4 mb-4">⏳</div>
                  <p className="text-gray-600">Loading map...</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center p-6">
                  <AlertCircle size={48} className="mx-auto text-red-500 mb-2" />
                  <p className="text-red-600">{error}</p>
                </div>
              </div>
            ) : (
              <iframe
                ref={iframeRef}
                className="w-full h-full border-0"
                title="Rider Location Map"
                srcDoc={mapHtml}
                sandbox="allow-scripts allow-same-origin"
              />
            )}
          </div>

          <div className="w-96 bg-white border-l border-gray-200 overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                <User size={18} className="mr-2 text-petron-blue" />
                Rider Information
              </h4>
              <div className="space-y-3 text-sm">
                <p><span className="text-gray-500">Name:</span> <span className="font-medium text-gray-900">{rider?.full_name || 'N/A'}</span></p>
                <p className="flex items-center"><Phone size={14} className="mr-1 text-gray-500" />{rider?.phone_number || 'N/A'}</p>
                {rider?.vehicle_type && (
                  <p><span className="text-gray-500">Vehicle:</span> <span className="font-medium">{rider.vehicle_type} {rider?.vehicle_plate ? `(${rider.vehicle_plate})` : ''}</span></p>
                )}
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${riderLocation?.isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                  <span className="font-medium text-gray-900">{riderLocation?.isOnline ? 'Online' : 'Offline'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${getChannelBadge().dot}`}></span>
                  <span className="text-xs text-gray-600">Realtime: {getChannelBadge().label}</span>
                </div>
                {lastUpdated && <p className="text-xs text-gray-500">Last updated: {lastUpdated.toLocaleTimeString()}</p>}
                <button
                  onClick={fetchInitialData}
                  className="mt-2 inline-flex items-center px-3 py-1.5 text-xs border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  <RefreshCw size={12} className="mr-1" />
                  Refresh Data
                </button>
              </div>
            </div>

            <div className="p-6 border-b border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                <Route size={18} className="mr-2 text-petron-blue" />
                Focused Route
              </h4>
              {selectedDeliveryId ? (
                <div className="space-y-1 text-sm">
                  <p className="text-gray-700">Mode: <span className="font-semibold">Specific order</span></p>
                  <p className="text-gray-700">ETA: <span className="font-semibold">{routeEtaMinutes ? `${routeEtaMinutes} min` : 'Calculating...'}</span></p>
                  <p className="text-gray-700">Distance: <span className="font-semibold">{routeDistanceKm ? `${routeDistanceKm} km` : 'Calculating...'}</span></p>
                </div>
              ) : (
                <p className="text-sm text-gray-600">All deliveries mode. Pick an order below to get road routing + ETA.</p>
              )}
              <button
                onClick={() => setSelectedDeliveryId(null)}
                className="mt-3 w-full py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
              >
                Show All Deliveries
              </button>
            </div>

            <div className="p-6">
              <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                <Truck size={18} className="mr-2 text-petron-blue" />
                Active Deliveries ({activeDeliveries?.length || 0})
              </h4>

              {!activeDeliveries?.length ? (
                <div className="p-4 bg-gray-50 rounded-lg text-center">
                  <Truck size={24} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500">No active deliveries</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeDeliveries.map((delivery) => {
                    const isFocused = String(selectedDeliveryId) === String(delivery.id);
                    return (
                      <button
                        key={delivery.id}
                        onClick={() => setSelectedDeliveryId(delivery.id)}
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${isFocused ? 'border-[#0033A0] bg-blue-50' : 'border-gray-200 bg-gray-50 hover:bg-gray-100'}`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <p className="font-medium text-gray-900">Order {formatOrderNumber(delivery.order?.order_number, delivery.order?.id)}</p>
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusBadgeColor(delivery.status)}`}>{delivery.status}</span>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2 flex items-start">
                          <MapPin size={14} className="mr-1 mt-0.5 flex-shrink-0" />
                          {delivery.order?.delivery_address}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
