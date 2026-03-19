// admin-web/src/components/DeliveryTrackingMap.jsx
import React, { useState, useEffect, useRef } from 'react';
import { X, Navigation, Phone, MapPin, User, Clock, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatDate } from '../utils/formatters';

export default function DeliveryTrackingMap({ isOpen, onClose, deliveryId, orderId }) {
  const [loading, setLoading] = useState(true);
  const [delivery, setDelivery] = useState(null);
  const [riderLocation, setRiderLocation] = useState(null);
  const [mapHtml, setMapHtml] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const webViewRef = useRef(null);
  const refreshInterval = useRef(null);

  // Fetch delivery details
  useEffect(() => {
    if (isOpen && deliveryId) {
      fetchDeliveryDetails();
    }
    
    return () => {
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
      }
    };
  }, [isOpen, deliveryId]);

  // Set up auto-refresh
  useEffect(() => {
    if (autoRefresh && isOpen && deliveryId) {
      refreshInterval.current = setInterval(() => {
        fetchRiderLocation();
      }, 10000); // Refresh every 10 seconds
    }
    
    return () => {
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
      }
    };
  }, [autoRefresh, isOpen, deliveryId]);

  const fetchDeliveryDetails = async () => {
    try {
      setLoading(true);
      setError('');
      
      const { data, error } = await supabase
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

      if (error) throw error;
      
      setDelivery(data);
      
      // Fetch rider's last known location
      await fetchRiderLocation(data.rider?.id);
      
    } catch (err) {
      console.error('Error fetching delivery:', err);
      setError(err.message || 'Failed to load delivery details');
    } finally {
      setLoading(false);
    }
  };

  const fetchRiderLocation = async (riderId = null) => {
    const targetRiderId = riderId || delivery?.rider?.id;
    if (!targetRiderId) return;

    try {
      // In a real app, you'd have a rider_locations table
      // For now, we'll use the rider's profile address as fallback
      const { data, error } = await supabase
        .from('profiles')
        .select('address_lat, address_lng, updated_at')
        .eq('id', targetRiderId)
        .single();

      if (error) throw error;
      
      if (data?.address_lat && data?.address_lng) {
        setRiderLocation({
          lat: data.address_lat,
          lng: data.address_lng,
          lastUpdate: data.updated_at
        });
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Error fetching rider location:', err);
    }
  };

  // Generate map HTML when data is available
  useEffect(() => {
    if (delivery && (riderLocation || delivery.order?.delivery_lat)) {
      generateMapHtml();
    }
  }, [delivery, riderLocation]);

  const generateMapHtml = () => {
    const order = delivery.order;
    const rider = delivery.rider;
    
    // Default to Petron San Pedro if no coordinates
    const DEFAULT_LOCATION = { lat: 9.7534772, lng: 118.7478688 };
    
    const destination = order?.delivery_lat && order?.delivery_lng 
      ? { lat: parseFloat(order.delivery_lat), lng: parseFloat(order.delivery_lng) }
      : DEFAULT_LOCATION;
    
    const currentLocation = riderLocation || DEFAULT_LOCATION;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
          #map { height: 100vh; width: 100vw; }
          
          /* Rider marker with animation */
          .rider-marker {
            background: #10B981;
            border: 4px solid white;
            border-radius: 50%;
            width: 24px;
            height: 24px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            position: relative;
          }
          
          .rider-marker::before {
            content: '';
            position: absolute;
            top: -8px;
            left: -8px;
            right: -8px;
            bottom: -8px;
            border-radius: 50%;
            background: rgba(16, 185, 129, 0.3);
            animation: pulse 2s infinite;
          }
          
          @keyframes pulse {
            0% { transform: scale(0.5); opacity: 1; }
            100% { transform: scale(1.5); opacity: 0; }
          }
          
          /* Destination marker */
          .destination-marker {
            background: #ED1C24;
            border: 4px solid white;
            border-radius: 50%;
            width: 24px;
            height: 24px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            position: relative;
          }
          
          .destination-marker::after {
            content: '📍';
            position: absolute;
            top: -30px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 20px;
            white-space: nowrap;
          }
          
          /* Labels */
          .marker-label {
            position: absolute;
            top: -30px;
            left: 50%;
            transform: translateX(-50%);
            background: white;
            padding: 4px 8px;
            border-radius: 16px;
            font-size: 11px;
            font-weight: 600;
            white-space: nowrap;
            box-shadow: 0 2px 6px rgba(0,0,0,0.15);
            border: 1px solid #eee;
          }
          
          /* Route line */
          .route-line {
            stroke: #0033A0;
            stroke-width: 4;
            stroke-dasharray: 8, 8;
            animation: dash 30s linear infinite;
          }
          
          @keyframes dash {
            to { stroke-dashoffset: -100; }
          }
          
          /* Controls */
          .map-controls {
            position: absolute;
            top: 10px;
            right: 10px;
            z-index: 1000;
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          
          .control-button {
            background: white;
            border: none;
            border-radius: 8px;
            padding: 10px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            cursor: pointer;
            font-size: 13px;
            font-weight: 600;
            color: #333;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: all 0.2s;
          }
          
          .control-button:hover {
            transform: scale(1.05);
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          }
          
          .attribution {
            position: absolute;
            bottom: 5px;
            right: 5px;
            background: rgba(255,255,255,0.9);
            padding: 2px 5px;
            border-radius: 3px;
            font-size: 9px;
            z-index: 1000;
          }
        </style>
      </head>
      <body>
        <div class="map-controls">
          <button class="control-button" onclick="window.fitBounds()">
            <span>📍</span> Fit All
          </button>
          <button class="control-button" onclick="window.centerOnRider()">
            <span>🎯</span> Track Rider
          </button>
        </div>
        
        <div id="map"></div>
        <div class="attribution">© OpenStreetMap contributors</div>
        
        <script>
          window.map = null;
          window.riderMarker = null;
          window.destinationMarker = null;
          window.routeLine = null;
          
          const riderLocation = { lat: ${currentLocation.lat}, lng: ${currentLocation.lng} };
          const destination = { lat: ${destination.lat}, lng: ${destination.lng} };
          
          function initMap() {
            window.map = L.map('map').setView([riderLocation.lat, riderLocation.lng], 14);
            
            L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
              attribution: '©OpenStreetMap, ©CartoDB',
              subdomains: 'abcd',
              maxZoom: 19
            }).addTo(window.map);
            
            // Add rider marker
            const riderIcon = L.divIcon({
              html: \`
                <div style="position: relative;">
                  <div class="rider-marker"></div>
                  <div class="marker-label">Rider</div>
                </div>
              \`,
              className: '',
              iconSize: [40, 60],
              iconAnchor: [20, 30],
              popupAnchor: [0, -30]
            });
            
            window.riderMarker = L.marker([riderLocation.lat, riderLocation.lng], {
              icon: riderIcon,
              zIndexOffset: 1000
            }).addTo(window.map);
            
            window.riderMarker.bindPopup(\`
              <b>${rider?.full_name || 'Rider'}</b><br>
              ${rider?.vehicle_type || ''} ${rider?.vehicle_plate ? '(' + rider.vehicle_plate + ')' : ''}
            \`);
            
            // Add destination marker
            const destIcon = L.divIcon({
              html: \`
                <div style="position: relative;">
                  <div class="destination-marker"></div>
                  <div class="marker-label">Destination</div>
                </div>
              \`,
              className: '',
              iconSize: [40, 60],
              iconAnchor: [20, 30],
              popupAnchor: [0, -30]
            });
            
            window.destinationMarker = L.marker([destination.lat, destination.lng], {
              icon: destIcon
            }).addTo(window.map);
            
            window.destinationMarker.bindPopup(\`
              <b>Delivery Address</b><br>
              ${order?.delivery_address || ''}
            \`);
            
            // Draw route line
            window.routeLine = L.polyline(
              [[riderLocation.lat, riderLocation.lng], [destination.lat, destination.lng]],
              {
                color: '#0033A0',
                weight: 4,
                opacity: 0.6,
                dashArray: '8, 8',
                lineJoin: 'round'
              }
            ).addTo(window.map);
            
            // Fit bounds to show both markers
            window.fitBounds();
          }
          
          window.fitBounds = function() {
            if (!window.map) return;
            const bounds = L.latLngBounds([
              [riderLocation.lat, riderLocation.lng],
              [destination.lat, destination.lng]
            ]);
            window.map.flyToBounds(bounds, { padding: [50, 50], duration: 1 });
          };
          
          window.centerOnRider = function() {
            if (!window.map) return;
            window.map.flyTo([riderLocation.lat, riderLocation.lng], 16, { duration: 1 });
          };
          
          // Listen for location updates
          window.addEventListener('message', function(event) {
            try {
              const data = JSON.parse(event.data);
              if (data.type === 'UPDATE_LOCATION' && window.riderMarker && window.routeLine) {
                const newLat = data.lat;
                const newLng = data.lon;
                
                // Update rider marker
                window.riderMarker.setLatLng([newLat, newLng]);
                
                // Update route line
                window.routeLine.setLatLngs([[newLat, newLng], [destination.lat, destination.lng]]);
                
                // Update rider location variable
                riderLocation.lat = newLat;
                riderLocation.lng = newLng;
              }
            } catch (error) {
              console.error('Error updating location:', error);
            }
          });
          
          // Initialize map when DOM is ready
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initMap);
          } else {
            initMap();
          }
        </script>
      </body>
      </html>
    `;

    setMapHtml(html);
  };

  const handleManualRefresh = () => {
    fetchRiderLocation();
  };

  const openGoogleMaps = () => {
    if (delivery?.order?.delivery_lat && delivery?.order?.delivery_lng) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${delivery.order.delivery_lat},${delivery.order.delivery_lng}`;
      window.open(url, '_blank');
    }
  };

  const callRider = () => {
    if (delivery?.rider?.phone_number) {
      window.location.href = `tel:${delivery.rider.phone_number}`;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
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
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X size={20} className="text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col md:flex-row h-[calc(90vh-80px)]">
          {/* Map Section */}
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
                  <div className="text-red-500 mb-2">⚠️</div>
                  <p className="text-red-600 mb-4">{error}</p>
                  <button
                    onClick={fetchDeliveryDetails}
                    className="px-4 py-2 bg-[#0033A0] text-white rounded-lg hover:bg-[#002277]"
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : mapHtml ? (
              <>
                <iframe
                  srcDoc={mapHtml}
                  className="w-full h-full border-0"
                  title="Delivery Tracking Map"
                  sandbox="allow-scripts allow-same-origin"
                />
                
                {/* Map Controls Overlay */}
                <div className="absolute top-4 left-4 z-10 flex gap-2">
                  <button
                    onClick={handleManualRefresh}
                    disabled={!autoRefresh}
                    className="bg-white p-2 rounded-lg shadow-md hover:bg-gray-50 transition-colors disabled:opacity-50"
                    title="Refresh location"
                  >
                    <RefreshCw size={18} className={autoRefresh ? 'animate-spin-slow' : ''} />
                  </button>
                  <button
                    onClick={() => setAutoRefresh(!autoRefresh)}
                    className={`bg-white p-2 rounded-lg shadow-md hover:bg-gray-50 transition-colors ${
                      autoRefresh ? 'text-green-600' : 'text-gray-400'
                    }`}
                    title={autoRefresh ? 'Auto-refresh on' : 'Auto-refresh off'}
                  >
                    <Clock size={18} />
                  </button>
                </div>
              </>
            ) : null}
          </div>

          {/* Info Panel */}
          <div className="w-full md:w-80 bg-white border-t md:border-t-0 md:border-l border-gray-200 overflow-y-auto">
            <div className="p-4 space-y-4">
              {/* Last Updated */}
              {lastUpdated && (
                <div className="text-xs text-gray-500 text-center bg-gray-50 p-2 rounded">
                  Last updated: {lastUpdated.toLocaleTimeString()}
                  {autoRefresh && ' (auto-refresh)'}
                </div>
              )}

              {/* Rider Info */}
              {delivery?.rider && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <User size={16} className="mr-2 text-[#0033A0]" />
                    Rider Information
                  </h4>
                  <div className="space-y-2">
                    <p className="text-sm">
                      <span className="font-medium">Name:</span> {delivery.rider.full_name}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Contact:</span> {delivery.rider.phone_number}
                    </p>
                    {delivery.rider.vehicle_type && (
                      <p className="text-sm">
                        <span className="font-medium">Vehicle:</span> {delivery.rider.vehicle_type}
                        {delivery.rider.vehicle_plate && ` (${delivery.rider.vehicle_plate})`}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Delivery Info */}
              {delivery?.order && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <MapPin size={16} className="mr-2 text-[#ED1C24]" />
                    Delivery Details
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Address</p>
                      <p className="text-sm">{delivery.order.delivery_address}</p>
                    </div>
                    
                    {delivery.order.customer_name && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Customer</p>
                        <p className="text-sm">
                          {typeof delivery.order.customer_name === 'string'
                            ? delivery.order.customer_name
                            : delivery.order.customer_name.full_name}
                        </p>
                        {typeof delivery.order.customer_name !== 'string' && delivery.order.customer_name.phone_number && (
                          <p className="text-xs text-gray-500 mt-1">
                            {delivery.order.customer_name.phone_number}
                          </p>
                        )}
                      </div>
                    )}
                    
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Total Amount</p>
                      <p className="font-bold text-[#0033A0]">
                        ₱{parseFloat(delivery.order.total_amount).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Delivery Status */}
              {delivery && (
                <div className="bg-white border border-gray-200 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-3">Delivery Status</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Status:</span>
                      <span className={`font-medium ${
                        delivery.status === 'delivered' ? 'text-green-600' :
                        delivery.status === 'picked_up' ? 'text-blue-600' :
                        delivery.status === 'assigned' ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {delivery.status === 'assigned' ? 'Ready to Pick Up' :
                         delivery.status === 'picked_up' ? 'Out for Delivery' :
                         delivery.status === 'delivered' ? 'Delivered' :
                         delivery.status === 'failed' ? 'Failed' : delivery.status}
                      </span>
                    </div>
                    
                    {delivery.assigned_at && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Assigned:</span>
                        <span>{formatDate(delivery.assigned_at)}</span>
                      </div>
                    )}
                    
                    {delivery.picked_up_at && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Picked Up:</span>
                        <span>{formatDate(delivery.picked_up_at)}</span>
                      </div>
                    )}
                    
                    {delivery.delivered_at && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Delivered:</span>
                        <span>{formatDate(delivery.delivered_at)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2">
                <button
                  onClick={openGoogleMaps}
                  disabled={!delivery?.order?.delivery_lat}
                  className="w-full py-2.5 bg-[#0033A0] text-white rounded-lg hover:bg-[#002277] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Navigation size={18} />
                  Open in Google Maps
                </button>
                
                <button
                  onClick={callRider}
                  disabled={!delivery?.rider?.phone_number}
                  className="w-full py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Phone size={18} />
                  Call Rider
                </button>
              </div>

              {/* Notes */}
              {delivery?.notes && (
                <div className="bg-yellow-50 p-3 rounded-lg text-sm">
                  <p className="font-medium text-yellow-800 mb-1">Notes:</p>
                  <p className="text-yellow-700">{delivery.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}