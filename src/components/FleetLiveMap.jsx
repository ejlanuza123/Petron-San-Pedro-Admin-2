// src/components/FleetLiveMap.jsx
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Truck, MapPin, Navigation, Phone, User, RefreshCw, Layers, CheckCircle, Clock, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatCurrency, formatPhoneNumber } from '../utils/formatters';

export default function FleetLiveMap({ isDarkMode, onSelectOrder }) {
  const [loading, setLoading] = useState(true);
  const [riders, setRiders] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]);
  const [selectedRiderId, setSelectedRiderId] = useState(null);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [filterRiderStatus, setFilterRiderStatus] = useState('all');
  const iframeRef = useRef(null);

  // Fetch store, riders, and active orders
  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch active riders with location
      const { data: ridersData, error: ridersError } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          phone_number,
          vehicle_type,
          vehicle_plate,
          is_active,
          address_lat,
          address_lng,
          updated_at,
          deliveries!deliveries_rider_id_fkey (
            id,
            status,
            order_id,
            orders (
              id,
              order_number,
              delivery_address,
              delivery_lat,
              delivery_lng,
              total_amount,
              status
            )
          )
        `)
        .eq('role', 'rider')
        .eq('is_active', true);

      if (ridersError) throw ridersError;

      // Fetch in-progress orders
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          delivery_address,
          delivery_lat,
          delivery_lng,
          total_amount,
          status,
          created_at,
          profiles!orders_user_id_fkey (
            full_name,
            phone_number
          )
        `)
        .in('status', ['Pending', 'Processing', 'Accepted', 'Picked Up', 'Out for Delivery', 'in_transit'])
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      setRiders(ridersData || []);
      setActiveOrders(ordersData || []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching fleet live map data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Subscribe to realtime updates on profiles (rider GPS coordinates)
    const channel = supabase
      .channel('fleet-live-locations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: 'role=eq.rider' }, () => {
        fetchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const filteredRiders = useMemo(() => {
    if (filterRiderStatus === 'on_delivery') {
      return riders.filter(r => (r.deliveries || []).some(d => ['assigned', 'accepted', 'picked_up', 'in_transit'].includes(d.status)));
    }
    if (filterRiderStatus === 'idle') {
      return riders.filter(r => !(r.deliveries || []).some(d => ['assigned', 'accepted', 'picked_up', 'in_transit'].includes(d.status)));
    }
    return riders;
  }, [riders, filterRiderStatus]);

  // Generate Leaflet HTML String for iframe map rendering
  const mapHtml = useMemo(() => {
    const defaultCenter = { lat: 9.7534245, lng: 118.7478136 }; // Petron San Pedro Station, Puerto Princesa

    // Store origin
    const storePin = { lat: 9.7534245, lng: 118.7478136, name: 'Petron San Pedro Station' };

    // Format riders data for Leaflet
    const riderMarkers = filteredRiders
      .filter(r => r.address_lat && r.address_lng)
      .map(r => ({
        id: r.id,
        name: r.full_name,
        lat: Number(r.address_lat),
        lng: Number(r.address_lng),
        vehicle: `${r.vehicle_type || 'Rider'} (${r.vehicle_plate || 'N/A'})`,
        isOnDelivery: (r.deliveries || []).some(d => ['assigned', 'accepted', 'picked_up', 'in_transit'].includes(d.status)),
      }));

    // Format order destinations for Leaflet
    const orderMarkers = activeOrders
      .filter(o => o.delivery_lat && o.delivery_lng)
      .map(o => ({
        id: o.id,
        number: o.order_number || `#${o.id}`,
        lat: Number(o.delivery_lat),
        lng: Number(o.delivery_lng),
        address: o.delivery_address || 'Customer Location',
        amount: formatCurrency(o.total_amount || 0),
        status: o.status,
      }));

    return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #map { height: 100%; width: 100%; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', sans-serif; background: #0f172a; }
    .leaflet-popup-content-wrapper { border-radius: 12px; padding: 4px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); }
    .rider-pin { width: 34px; height: 34px; border-radius: 50%; background: #0033A0; border: 3px solid #fff; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; box-shadow: 0 4px 12px rgba(0,51,160,0.4); font-size: 16px; }
    .rider-pin.busy { background: #eab308; box-shadow: 0 4px 12px rgba(234,179,8,0.4); }
    .order-pin { width: 28px; height: 28px; border-radius: 50%; background: #ef4444; border: 2px solid #fff; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 12px; box-shadow: 0 3px 8px rgba(239,68,68,0.4); }
    .store-pin { width: 38px; height: 38px; border-radius: 12px; background: #16a34a; border: 3px solid #fff; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 18px; box-shadow: 0 4px 14px rgba(22,163,74,0.5); }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const store = ${JSON.stringify(storePin)};
    const riders = ${JSON.stringify(riderMarkers)};
    const orders = ${JSON.stringify(orderMarkers)};

    const centerLat = riders.length > 0 ? riders[0].lat : store.lat;
    const centerLng = riders.length > 0 ? riders[0].lng : store.lng;

    const map = L.map('map').setView([centerLat, centerLng], 13);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '©OpenStreetMap ©CartoDB',
      maxZoom: 19
    }).addTo(map);

    // Store marker
    L.marker([store.lat, store.lng], {
      icon: L.divIcon({ className: 'store-pin', html: '🏬' })
    }).addTo(map).bindPopup('<b>' + store.name + '</b><br/>Central Hub Dispatch');

    // Rider markers
    riders.forEach(r => {
      const pinClass = r.isOnDelivery ? 'rider-pin busy' : 'rider-pin';
      const icon = L.divIcon({ className: pinClass, html: '🛵' });
      L.marker([r.lat, r.lng], { icon })
        .addTo(map)
        .bindPopup('<b>🛵 ' + r.name + '</b><br/>' + r.vehicle + '<br/>Status: ' + (r.isOnDelivery ? 'On Delivery 🟡' : 'Available 🟢'));
    });

    // Customer order markers
    orders.forEach(o => {
      const icon = L.divIcon({ className: 'order-pin', html: '📍' });
      L.marker([o.lat, o.lng], { icon })
        .addTo(map)
        .bindPopup('<b>📍 Order ' + o.number + '</b><br/>' + o.address + '<br/>Total: ' + o.amount);
    });

    if (riders.length > 0 || orders.length > 0) {
      const bounds = [];
      bounds.push([store.lat, store.lng]);
      riders.forEach(r => bounds.push([r.lat, r.lng]));
      orders.forEach(o => bounds.push([o.lat, o.lng]));
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  </script>
</body>
</html>
    `;
  }, [filteredRiders, activeOrders]);

  return (
    <div className="space-y-4">
      {/* Top Controls Header */}
      <div className={`p-4 rounded-xl border flex flex-wrap justify-between items-center gap-3 transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center gap-2">
          <Truck className="text-blue-500" size={20} />
          <div>
            <h3 className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Full Fleet Live Tracking Map</h3>
            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Real-time GPS locations of riders on duty & active delivery drop-offs
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-medium">
            <span className={`px-2.5 py-1 rounded-full ${isDarkMode ? 'bg-slate-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
              🛵 Riders: <strong>{riders.length}</strong>
            </span>
            <span className={`px-2.5 py-1 rounded-full ${isDarkMode ? 'bg-slate-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
              📍 Active Deliveries: <strong>{activeOrders.length}</strong>
            </span>
          </div>

          <button
            onClick={fetchData}
            disabled={loading}
            className={`p-2 border rounded-lg transition ${isDarkMode ? 'border-slate-600 hover:bg-slate-700 text-gray-300' : 'border-gray-300 hover:bg-gray-50 text-gray-700'}`}
            title="Refresh Fleet Map"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Main Grid: Live Map + Rider Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[600px]">
        {/* Interactive Leaflet Map iframe */}
        <div className={`lg:col-span-2 rounded-xl border overflow-hidden relative shadow-sm transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
          <iframe
            ref={iframeRef}
            srcDoc={mapHtml}
            className="w-full h-full border-none"
            title="Fleet Real-Time Tracking Map"
          />
        </div>

        {/* Fleet Sidebar */}
        <div className={`rounded-xl border p-4 flex flex-col h-full overflow-hidden transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
          <div className="flex justify-between items-center mb-3">
            <h4 className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Active Riders</h4>
            <select
              value={filterRiderStatus}
              onChange={(e) => setFilterRiderStatus(e.target.value)}
              className={`text-xs border rounded-lg px-2 py-1 outline-none ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-800'}`}
            >
              <option value="all">All Riders</option>
              <option value="on_delivery">On Delivery 🟡</option>
              <option value="idle">Available 🟢</option>
            </select>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
            {filteredRiders.length === 0 ? (
              <div className="text-center py-8 text-xs text-gray-500">
                No riders match current filter criteria
              </div>
            ) : (
              filteredRiders.map((rider) => {
                const activeDeliveries = (rider.deliveries || []).filter(d => ['assigned', 'accepted', 'picked_up', 'in_transit'].includes(d.status));
                const isOnDelivery = activeDeliveries.length > 0;

                return (
                  <div
                    key={rider.id}
                    onClick={() => setSelectedRiderId(rider.id)}
                    className={`p-3 rounded-lg border transition cursor-pointer ${selectedRiderId === rider.id
                      ? 'border-blue-500 bg-blue-50/40 dark:bg-slate-700/60'
                      : (isDarkMode ? 'border-slate-700 hover:bg-slate-700/30' : 'border-gray-100 hover:bg-gray-50')
                      }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-md flex items-center justify-center font-bold text-xs ${isOnDelivery ? 'bg-amber-500 text-white' : 'bg-emerald-600 text-white'}`}>
                          🛵
                        </div>
                        <div>
                          <p className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{rider.full_name}</p>
                          <p className={`text-[11px] ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{rider.vehicle_type || 'Rider'} ({rider.vehicle_plate || 'N/A'})</p>
                        </div>
                      </div>

                      {isOnDelivery ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                          On Delivery
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                          Available
                        </span>
                      )}
                    </div>

                    {rider.phone_number && (
                      <p className={`text-[11px] flex items-center gap-1 mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        <Phone size={10} /> {formatPhoneNumber(rider.phone_number)}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
