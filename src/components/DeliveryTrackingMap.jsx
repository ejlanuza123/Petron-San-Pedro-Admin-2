import React, { useEffect, useRef, useState } from 'react';
import { X, Navigation, Phone, MapPin, User, Clock, Route } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatDate } from '../utils/formatters';

export default function DeliveryTrackingMap({ isOpen, onClose, deliveryId }) {
  const [loading, setLoading] = useState(true);
  const [delivery, setDelivery] = useState(null);
  const [riderLocation, setRiderLocation] = useState(null);
  const [mapHtml, setMapHtml] = useState('');
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

  useEffect(() => {
    if (!delivery || !riderLocation) return;
    setMapHtml(generateMapHtml(delivery, riderLocation));
  }, [delivery, riderLocation]);

  useEffect(() => {
    if (!iframeRef.current?.contentWindow || !riderLocation) return;

    iframeRef.current.contentWindow.postMessage(
      { type: 'UPDATE_LOCATION', lat: riderLocation.lat, lng: riderLocation.lng },
      '*'
    );
  }, [riderLocation, mapHtml]);

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

  const generateMapHtml = (deliveryData, currentLocation) => {
    const destination = deliveryData?.order?.delivery_lat && deliveryData?.order?.delivery_lng
      ? { lat: Number(deliveryData.order.delivery_lat), lng: Number(deliveryData.order.delivery_lng) }
      : { lat: 9.7534772, lng: 118.7478688 };

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
    .rider { width: 16px; height: 16px; border-radius: 999px; background: #16a34a; border: 3px solid #fff; box-shadow: 0 0 0 7px rgba(22, 163, 74, 0.22); }
    .dest { width: 16px; height: 16px; border-radius: 999px; background: #dc2626; border: 3px solid #fff; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const rider = { lat: ${currentLocation.lat}, lng: ${currentLocation.lng} };
    const destination = { lat: ${destination.lat}, lng: ${destination.lng} };

    let map = L.map('map').setView([rider.lat, rider.lng], 14);
    let riderMarker = null;
    let destinationMarker = null;
    let routeLine = null;
    let routeArrows = [];

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '©OpenStreetMap, ©CartoDB', subdomains: 'abcd', maxZoom: 19,
    }).addTo(map);

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
      const y = to.lng - from.lng;
      const x = to.lat - from.lat;
      return (Math.atan2(y, x) * 180 / Math.PI) + 90;
    }

    function drawRouteArrows(path) {
      if (!Array.isArray(path) || path.length < 3) {
        return;
      }

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
          html:
            '<div style="' +
            'transform: rotate(' + bearing + 'deg);' +
            'color:#0033A0;' +
            'font-size:14px;' +
            'font-weight:700;' +
            'text-shadow:0 0 2px rgba(255,255,255,0.9);' +
            '">➤</div>',
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

      riderMarker = L.marker([rider.lat, rider.lng], {
        icon: L.divIcon({ html: '<div class="rider"></div>', className: '', iconSize: [22, 22], iconAnchor: [11, 11] }),
        zIndexOffset: 1000,
      }).addTo(map).bindPopup('<b>Rider current location</b>');

      destinationMarker = L.marker([destination.lat, destination.lng], {
        icon: L.divIcon({ html: '<div class="dest"></div>', className: '', iconSize: [22, 22], iconAnchor: [11, 11] }),
      }).addTo(map).bindPopup('<b>Delivery destination</b>');
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
          color: '#0033A0',
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
          color: '#0033A0', weight: 4, opacity: 0.7, dashArray: '8 8',
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
  };

  const callRider = () => {
    if (delivery?.rider?.phone_number) {
      window.location.href = `tel:${delivery.rider.phone_number}`;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl">
        <div className="bg-petron-blue p-4 flex justify-between items-center">
          <div className="flex items-center">
            <Navigation className="text-white mr-2" size={24} />
            <div>
              <h3 className="text-lg font-bold text-white">Live Delivery Tracking</h3>
              {delivery?.order?.order_number && (
                <p className="text-sm text-white/80">Order #{delivery.order.order_number}</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
            <X size={20} className="text-white" />
          </button>
        </div>

        <div className="flex flex-col md:flex-row h-[calc(90vh-80px)]">
          <div className="flex-1 bg-gray-100 relative">
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0033A0] mx-auto mb-4"></div>
                  <p className="text-gray-500">Loading map...</p>
                </div>
              </div>
            ) : error ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center p-6">
                  <AlertCircle size={44} className="mx-auto text-red-500 mb-2" />
                  <p className="text-red-600 mb-4">{error}</p>
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

          <div className="w-full md:w-96 bg-white border-t md:border-t-0 md:border-l border-gray-200 overflow-y-auto">
            <div className="p-4 space-y-4">
              {lastUpdated && (
                <div className="text-xs text-gray-500 text-center bg-gray-50 p-2 rounded">Last updated: {lastUpdated.toLocaleTimeString()}</div>
              )}

              <div className="bg-indigo-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center"><Route size={16} className="mr-2 text-[#0033A0]" />Road Route Metrics</h4>
                <div className="text-sm text-gray-700 space-y-1">
                  <p>ETA: <span className="font-semibold">{routeEtaMinutes ? `${routeEtaMinutes} min` : 'Calculating...'}</span></p>
                  <p>Distance: <span className="font-semibold">{routeDistanceKm ? `${routeDistanceKm} km` : 'Calculating...'}</span></p>
                </div>
              </div>

              {delivery?.rider && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center"><User size={16} className="mr-2 text-[#0033A0]" />Rider Information</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Name:</span> {delivery.rider.full_name}</p>
                    <p><span className="font-medium">Contact:</span> {delivery.rider.phone_number}</p>
                    {delivery.rider.vehicle_type && (
                      <p><span className="font-medium">Vehicle:</span> {delivery.rider.vehicle_type} {delivery.rider.vehicle_plate ? `(${delivery.rider.vehicle_plate})` : ''}</p>
                    )}
                  </div>
                </div>
              )}

              {delivery?.order && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center"><MapPin size={16} className="mr-2 text-[#ED1C24]" />Delivery Details</h4>
                  <p className="text-sm mb-2">{delivery.order.delivery_address}</p>
                  <p className="text-sm"><span className="font-medium">Amount:</span> ₱{parseFloat(delivery.order.total_amount || 0).toFixed(2)}</p>
                </div>
              )}

              {delivery && (
                <div className="bg-white border border-gray-200 p-4 rounded-lg text-sm space-y-2">
                  <h4 className="font-semibold text-gray-900">Delivery Status</h4>
                  <p><span className="text-gray-500">Status:</span> <span className="font-medium">{delivery.status}</span></p>
                  {delivery.assigned_at && <p><span className="text-gray-500">Assigned:</span> {formatDate(delivery.assigned_at)}</p>}
                  {delivery.picked_up_at && <p><span className="text-gray-500">Picked Up:</span> {formatDate(delivery.picked_up_at)}</p>}
                  {delivery.delivered_at && <p><span className="text-gray-500">Delivered:</span> {formatDate(delivery.delivered_at)}</p>}
                </div>
              )}

              <button
                onClick={callRider}
                disabled={!delivery?.rider?.phone_number}
                className="w-full py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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
