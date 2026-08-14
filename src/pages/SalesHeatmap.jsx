// src/pages/SalesHeatmap.jsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Flame, 
  MapPin, 
  DollarSign, 
  ShoppingBag, 
  TrendingUp, 
  Layers, 
  Filter, 
  Calendar, 
  Download, 
  RefreshCw, 
  ZoomIn, 
  ChevronDown, 
  Sliders, 
  Sparkles, 
  Eye, 
  FileSpreadsheet, 
  FileText,
  AlertCircle,
  Building,
  BarChart3,
  Award
} from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import ErrorAlert from '../components/common/ErrorAlert';

// Comprehensive official list of Barangays in Puerto Princesa City, Palawan with centroid coordinates
const PUERTO_PRINCESA_BARANGAYS = [
  // Core Urban / Commercial & High-Density Hubs
  { name: 'San Pedro', aliases: ['san pedro', 'petron san pedro', 'san pedro national highway'], lat: 9.7535, lng: 118.7479 },
  { name: 'San Miguel', aliases: ['san miguel', 'airport', 'rizal ave', 'miguel'], lat: 9.7460, lng: 118.7520 },
  { name: 'San Jose', aliases: ['san jose', 'new market', 'terminal', 'san jose terminal'], lat: 9.7750, lng: 118.7480 },
  { name: 'Tiniguiban', aliases: ['tiniguiban', 'psu', 'coliseum', 'palawan state'], lat: 9.7680, lng: 118.7420 },
  { name: 'San Manuel', aliases: ['san manuel', 'manuel', 'bm road'], lat: 9.7610, lng: 118.7620 },
  { name: 'Santa Monica', aliases: ['santa monica', 'sta. monica', 'sta monica', 'mitra', 'city hall'], lat: 9.7890, lng: 118.7360 },
  { name: 'Bancao-Bancao', aliases: ['bancao-bancao', 'bancao bancao', 'bancao', 'pristine beach'], lat: 9.7320, lng: 118.7450 },
  { name: 'Mandaragat', aliases: ['mandaragat', 'lacao', 'manalo'], lat: 9.7430, lng: 118.7370 },
  { name: 'Sicsican', aliases: ['sicsican', 'fariñas'], lat: 9.8050, lng: 118.7200 },
  { name: 'Irawan', aliases: ['irawan', 'chattoc', 'flora and fauna'], lat: 9.8150, lng: 118.6850 },
  { name: 'Tagburos', aliases: ['tagburos', 'fisheries'], lat: 9.8250, lng: 118.7480 },
  { name: 'Santa Lourdes', aliases: ['santa lourdes', 'sta. lourdes', 'sta lourdes', 'honda bay', 'honda bay wharf'], lat: 9.8450, lng: 118.7350 },

  // Poblacion / Downtown Districts
  { name: 'Bagong Silang', aliases: ['bagong silang'], lat: 9.7400, lng: 118.7380 },
  { name: 'Bagong Sikat', aliases: ['bagong sikat'], lat: 9.7390, lng: 118.7320 },
  { name: 'Bagong Pag-asa', aliases: ['bagong pag-asa', 'bagong pagasa'], lat: 9.7420, lng: 118.7350 },
  { name: 'Pagkakaisa', aliases: ['pagkakaisa', 'baywalk', 'port'], lat: 9.7410, lng: 118.7300 },
  { name: 'Mabuhay', aliases: ['mabuhay'], lat: 9.7440, lng: 118.7340 },
  { name: 'Model', aliases: ['model', 'barracks'], lat: 9.7450, lng: 118.7390 },
  { name: 'Milagrosa', aliases: ['milagrosa'], lat: 9.7470, lng: 118.7430 },
  { name: 'Maningning', aliases: ['maningning'], lat: 9.7450, lng: 118.7410 },
  { name: 'Maunlad', aliases: ['maunlad'], lat: 9.7460, lng: 118.7370 },
  { name: 'Manggahan', aliases: ['manggahan'], lat: 9.7480, lng: 118.7380 },
  { name: 'Masipag', aliases: ['masipag'], lat: 9.7490, lng: 118.7390 },
  { name: 'Matiyaga', aliases: ['matiyaga'], lat: 9.7470, lng: 118.7360 },
  { name: 'Princesa', aliases: ['princesa', 'cathedral'], lat: 9.7430, lng: 118.7290 },
  { name: 'Tagumpay', aliases: ['tagumpay'], lat: 9.7440, lng: 118.7310 },
  { name: 'Liwanag', aliases: ['liwanag'], lat: 9.7400, lng: 118.7330 },
  { name: 'Tanglaw', aliases: ['tanglaw'], lat: 9.7390, lng: 118.7350 },
  { name: 'Maligaya', aliases: ['maligaya'], lat: 9.7430, lng: 118.7360 },

  // South & North City Corridors
  { name: 'Iwahig', aliases: ['iwahig', 'penal colony'], lat: 9.7420, lng: 118.6700 },
  { name: 'Montible', aliases: ['montible'], lat: 9.7150, lng: 118.6400 },
  { name: 'Luzviminda', aliases: ['luzviminda'], lat: 9.6650, lng: 118.6780 },
  { name: 'Mangingisda', aliases: ['mangingisda'], lat: 9.7020, lng: 118.7180 },
  { name: 'Santa Cruz', aliases: ['santa cruz', 'sta. cruz', 'sta cruz'], lat: 9.6350, lng: 118.6650 },
  { name: 'Bacungan', aliases: ['bacungan', 'nagtabon'], lat: 9.9050, lng: 118.7050 },
  { name: 'San Rafael', aliases: ['san rafael', 'rafael'], lat: 9.9650, lng: 118.7800 },
  { name: 'Cabayugan', aliases: ['cabayugan', 'sabang', 'underground river'], lat: 10.1950, lng: 118.8950 },
  { name: 'Inagawan', aliases: ['inagawan'], lat: 9.5500, lng: 118.6200 },
  { name: 'Other / Puerto Princesa Proper', aliases: ['puerto princesa', 'palawan', 'ppc'], lat: 9.7535, lng: 118.7479 }
];

// Helper to detect barangay from delivery address string and coordinates in Puerto Princesa City
function detectBarangay(address, lat, lng) {
  const addrStr = (address || '').toLowerCase();
  
  // 1. Check direct address string keyword aliases
  for (const b of PUERTO_PRINCESA_BARANGAYS) {
    if (b.aliases.some(alias => addrStr.includes(alias))) {
      return b.name;
    }
  }

  // 2. If valid coordinates, find nearest centroid
  if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
    let nearest = PUERTO_PRINCESA_BARANGAYS[0];
    let minDistance = Infinity;
    
    for (const b of PUERTO_PRINCESA_BARANGAYS) {
      const d = Math.hypot(b.lat - lat, b.lng - lng);
      if (d < minDistance) {
        minDistance = d;
        nearest = b;
      }
    }
    // If within ~10km proximity
    if (minDistance < 0.1) {
      return nearest.name;
    }
  }

  return 'Other / Puerto Princesa Proper';
}

// Generate Leaflet Heatmap HTML for the iframe canvas
function generateHeatmapHtml({ points, markers, isDarkMode, heatMode, heatRadius, heatBlur, focusLocation }) {
  const isDark = isDarkMode;
  const tileUrl = isDark 
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

  const defaultCenter = focusLocation || { lat: 9.7535, lng: 118.7479, zoom: 14 };

  const pointsJson = JSON.stringify(points || []);
  const markersJson = JSON.stringify(markers || []);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js"></script>
  <style>
    html, body, #map { height: 100%; width: 100%; margin: 0; padding: 0; background: ${isDark ? '#0f172a' : '#f8fafc'}; }
    .store-pin {
      width: 32px;
      height: 32px;
      background: #0033A0;
      border: 3px solid #ffffff;
      border-radius: 50%;
      box-shadow: 0 4px 12px rgba(0,51,160,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 800;
      font-size: 14px;
      font-family: sans-serif;
    }
    .custom-popup .leaflet-popup-content-wrapper {
      background: ${isDark ? '#1e293b' : '#ffffff'};
      color: ${isDark ? '#f8fafc' : '#0f172a'};
      border-radius: 12px;
      padding: 4px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.3);
      border: 1px solid ${isDark ? '#334155' : '#e2e8f0'};
      font-family: system-ui, -apple-system, sans-serif;
    }
    .custom-popup .leaflet-popup-tip {
      background: ${isDark ? '#1e293b' : '#ffffff'};
    }
    .order-pin {
      width: 14px;
      height: 14px;
      background: #ED1C24;
      border: 2px solid #ffffff;
      border-radius: 50%;
      box-shadow: 0 2px 6px rgba(237,28,36,0.6);
      cursor: pointer;
      transition: transform 0.2s;
    }
    .order-pin:hover {
      transform: scale(1.4);
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const points = ${pointsJson};
    const markers = ${markersJson};
    const defaultCenter = ${JSON.stringify(defaultCenter)};

    const map = L.map('map', { zoomControl: true }).setView([defaultCenter.lat, defaultCenter.lng], defaultCenter.zoom || 14);

    L.tileLayer('${tileUrl}', {
      attribution: '© OpenStreetMap, © CartoDB',
      maxZoom: 19,
      subdomains: 'abcd'
    }).addTo(map);

    // Add Petron Hub Marker (Barangay San Pedro, Puerto Princesa City)
    const storeIcon = L.divIcon({
      html: '<div class="store-pin">⛽</div>',
      className: '',
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    L.marker([9.7535, 118.7479], { icon: storeIcon, zIndexOffset: 2000 })
      .addTo(map)
      .bindPopup('<div class="custom-popup" style="font-size:13px;line-height:1.4"><b>📍 Petron San Pedro Hub</b><br/><span style="color:#64748b">Barangay San Pedro, Puerto Princesa City</span></div>');

    // Heatmap Layer
    let heatLayer = null;
    if (points.length > 0) {
      heatLayer = L.heatLayer(points, {
        radius: ${heatRadius},
        blur: ${heatBlur},
        maxZoom: 17,
        max: 1.0,
        gradient: {
          0.15: '#0033A0',
          0.35: '#00A86B',
          0.60: '#FFD700',
          0.80: '#FF8C00',
          1.00: '#ED1C24'
        }
      }).addTo(map);
    }

    // Interactive Markers Layer
    const markersGroup = L.layerGroup();
    markers.forEach(m => {
      const pin = L.divIcon({
        html: '<div class="order-pin" title="' + m.title + '"></div>',
        className: '',
        iconSize: [14, 14],
        iconAnchor: [7, 7]
      });

      const popupContent = '<div class="custom-popup" style="font-size:13px;line-height:1.5">' +
        '<div style="font-weight:700;color:#0033A0;margin-bottom:2px">Order ' + m.orderNumber + '</div>' +
        '<div style="font-weight:600">' + m.customerName + '</div>' +
        '<div style="color:#64748b;font-size:11px;margin-bottom:4px">' + m.address + '</div>' +
        '<div style="display:flex;justify-content:space-between;border-top:1px solid #e2e8f0;padding-top:4px;font-size:12px">' +
          '<span style="font-weight:700;color:#00A86B">₱' + Number(m.amount).toLocaleString('en-US', {minimumFractionDigits: 2}) + '</span>' +
          '<span style="color:#64748b">' + m.date + '</span>' +
        '</div>' +
      '</div>';

      L.marker([m.lat, m.lng], { icon: pin })
        .bindPopup(popupContent)
        .addTo(markersGroup);
    });

    markersGroup.addTo(map);

    // Fit bounds if we have points
    if (points.length > 0 && !defaultCenter.forced) {
      const latLngs = points.map(p => [p[0], p[1]]);
      map.fitBounds(L.latLngBounds(latLngs), { padding: [40, 40], maxZoom: 16 });
    }

    // Message listener for external pan/zoom actions
    window.addEventListener('message', (event) => {
      const data = event.data;
      if (!data) return;
      if (data.type === 'PAN_TO') {
        map.flyTo([data.lat, data.lng], data.zoom || 16, { duration: 1.2 });
      } else if (data.type === 'FIT_ALL') {
        if (points.length > 0) {
          const latLngs = points.map(p => [p[0], p[1]]);
          map.fitBounds(L.latLngBounds(latLngs), { padding: [40, 40], maxZoom: 16 });
        }
      }
    });
  </script>
</body>
</html>
  `;
}

export default function SalesHeatmap() {
  const { isDarkMode } = useTheme();
  const iframeRef = useRef(null);

  // States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [orders, setOrders] = useState([]);
  const [categories, setCategories] = useState([]);
  
  // Filters
  const [dateRange, setDateRange] = useState('30days');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [statusFilter, setStatusFilter] = useState('completed'); // 'completed' | 'all'
  
  // Heatmap configuration
  const [heatMode, setHeatMode] = useState('revenue'); // 'revenue' | 'density'
  const [heatRadius, setHeatRadius] = useState(30);
  const [heatBlur, setHeatBlur] = useState(22);
  const [showOrderPins, setShowOrderPins] = useState(true);
  const [selectedBarangay, setSelectedBarangay] = useState(null);
  const [exporting, setExporting] = useState(false);

  // Fetch orders with geolocation and items
  const fetchHeatmapData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      let startDate;
      const now = new Date();

      if (dateRange === 'today') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (dateRange === '7days') {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (dateRange === '30days') {
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      } else if (dateRange === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      } else if (dateRange === '90days') {
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      } else if (dateRange === 'custom' && customStart) {
        startDate = new Date(customStart);
      } else {
        startDate = new Date(2020, 0, 1);
      }

      let query = supabase
        .from('orders')
        .select(`
          id,
          order_number,
          total_amount,
          status,
          created_at,
          delivery_address,
          delivery_lat,
          delivery_lng,
          user_id,
          profiles!orders_user_id_fkey (
            full_name,
            phone_number,
            address_lat,
            address_lng
          ),
          order_items (
            quantity,
            price_at_order,
            products (id, name, category)
          )
        `)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (dateRange === 'custom' && customEnd) {
        const endDate = new Date(customEnd);
        endDate.setHours(23, 59, 59, 999);
        query = query.lte('created_at', endDate.toISOString());
      }

      if (statusFilter === 'completed') {
        query = query.in('status', ['Completed', 'delivered']);
      }

      const { data, error: ordersErr } = await query;
      if (ordersErr) throw ordersErr;

      // Extract unique categories
      const categorySet = new Set();
      (data || []).forEach(o => {
        (o.order_items || []).forEach(item => {
          if (item.products?.category) {
            categorySet.add(item.products.category);
          }
        });
      });
      setCategories(Array.from(categorySet));

      setOrders(data || []);
    } catch (err) {
      console.error('Error fetching heatmap data:', err);
      setError(err.message || 'Failed to load heatmap data');
    } finally {
      setLoading(false);
    }
  }, [dateRange, customStart, customEnd, statusFilter]);

  useEffect(() => {
    fetchHeatmapData();
  }, [fetchHeatmapData]);

  // Filter orders by category if selected
  const filteredOrders = useMemo(() => {
    if (selectedCategory === 'all') return orders;

    return orders.filter(order => {
      const items = order.order_items || [];
      return items.some(it => it.products?.category === selectedCategory);
    });
  }, [orders, selectedCategory]);

  // Geocode points and aggregate by Barangay
  const { heatmapPoints, markerPoints, barangayStats, summaryKpis } = useMemo(() => {
    const rawPoints = [];
    const markers = [];
    const bMap = {};

    // Initialize all known Puerto Princesa City barangays
    PUERTO_PRINCESA_BARANGAYS.forEach(b => {
      bMap[b.name] = {
        name: b.name,
        orderCount: 0,
        totalRevenue: 0,
        customerIds: new Set(),
        categories: {},
        lat: b.lat,
        lng: b.lng
      };
    });

    let maxOrderRevenue = 1;
    filteredOrders.forEach(o => {
      const amt = Number(o.total_amount || 0);
      if (amt > maxOrderRevenue) maxOrderRevenue = amt;
    });

    filteredOrders.forEach(o => {
      const address = o.delivery_address || '';
      // Resolve lat/lng from order or profile or fallback to detected barangay centroid
      let lat = o.delivery_lat || o.profiles?.address_lat;
      let lng = o.delivery_lng || o.profiles?.address_lng;

      const detectedName = detectBarangay(address, lat, lng);
      const bObj = PUERTO_PRINCESA_BARANGAYS.find(b => b.name === detectedName) || PUERTO_PRINCESA_BARANGAYS[PUERTO_PRINCESA_BARANGAYS.length - 1];

      // If no GPS coordinates in DB, add slight random jitter around barangay centroid for visual realism
      if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
        const jitterLat = (Math.random() - 0.5) * 0.006;
        const jitterLng = (Math.random() - 0.5) * 0.006;
        lat = bObj.lat + jitterLat;
        lng = bObj.lng + jitterLng;
      }

      const revenue = Number(o.total_amount || 0);

      // Weight calculation
      // For density: normalized 0.5 - 1.0
      // For revenue: weighted by transaction amount
      const weight = heatMode === 'revenue' 
        ? Math.max(0.2, Math.min(1.0, revenue / (maxOrderRevenue || 1))) 
        : 0.8;

      rawPoints.push([lat, lng, weight]);

      markers.push({
        lat,
        lng,
        orderNumber: o.order_number || ('#' + o.id),
        customerName: o.profiles?.full_name || 'Customer',
        address: address || detectedName,
        amount: revenue,
        date: formatDate(o.created_at)
      });

      // Update barangay analytics
      if (!bMap[detectedName]) {
        bMap[detectedName] = {
          name: detectedName,
          orderCount: 0,
          totalRevenue: 0,
          customerIds: new Set(),
          categories: {},
          lat: bObj.lat,
          lng: bObj.lng
        };
      }

      bMap[detectedName].orderCount += 1;
      bMap[detectedName].totalRevenue += revenue;
      if (o.user_id) bMap[detectedName].customerIds.add(o.user_id);

      (o.order_items || []).forEach(it => {
        const cat = it.products?.category || 'General';
        bMap[detectedName].categories[cat] = (bMap[detectedName].categories[cat] || 0) + (it.quantity || 1);
      });
    });

    const bList = Object.values(bMap).map(b => {
      // Calculate top category
      let topCat = 'None';
      let topCatQty = 0;
      Object.entries(b.categories).forEach(([c, q]) => {
        if (q > topCatQty) {
          topCat = c;
          topCatQty = q;
        }
      });

      const avgOrder = b.orderCount > 0 ? b.totalRevenue / b.orderCount : 0;
      return {
        ...b,
        uniqueCustomers: b.customerIds.size,
        avgOrderValue: avgOrder,
        topCategory: topCat
      };
    }).sort((a, b) => b.totalRevenue - a.totalRevenue);

    // Calculate Platform KPIs
    const totalRev = filteredOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
    const topRevenueZone = bList.length > 0 && bList[0].totalRevenue > 0 ? bList[0] : null;
    const topVolumeZone = [...bList].sort((a, b) => b.orderCount - a.orderCount)[0] || null;
    const highestTicketZone = [...bList].filter(b => b.orderCount >= 2).sort((a, b) => b.avgOrderValue - a.avgOrderValue)[0] || topRevenueZone;
    const coldZone = [...bList].filter(b => b.orderCount === 0 || b.orderCount <= 1)[0] || null;

    return {
      heatmapPoints: rawPoints,
      markerPoints: showOrderPins ? markers : [],
      barangayStats: bList,
      summaryKpis: {
        totalRevenue: totalRev,
        totalOrdersCount: filteredOrders.length,
        topRevenueZone,
        topVolumeZone,
        highestTicketZone,
        coldZone
      }
    };
  }, [filteredOrders, heatMode, showOrderPins]);

  // Generate Map HTML
  const mapHtml = useMemo(() => {
    return generateHeatmapHtml({
      points: heatmapPoints,
      markers: markerPoints,
      isDarkMode,
      heatMode,
      heatRadius,
      heatBlur,
      focusLocation: selectedBarangay ? { lat: selectedBarangay.lat, lng: selectedBarangay.lng, zoom: 16, forced: true } : null
    });
  }, [heatmapPoints, markerPoints, isDarkMode, heatMode, heatRadius, heatBlur, selectedBarangay]);

  // Focus Map on Barangay click
  const handleFocusBarangay = (b) => {
    setSelectedBarangay(b);
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({
        type: 'PAN_TO',
        lat: b.lat,
        lng: b.lng,
        zoom: 16
      }, '*');
    }
  };

  const handleResetMapView = () => {
    setSelectedBarangay(null);
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: 'FIT_ALL' }, '*');
    }
  };

  // Export Zone Analytics
  const handleExport = async (format) => {
    if (!barangayStats.length) return;
    setExporting(true);

    try {
      if (format === 'csv') {
        const headers = ['Barangay / Zone', 'Total Revenue (PHP)', 'Total Orders', 'Unique Customers', 'Avg Order Value (PHP)', 'Top Category', 'Market Share (%)'];
        const rows = barangayStats.map(b => {
          const share = summaryKpis.totalRevenue > 0 ? ((b.totalRevenue / summaryKpis.totalRevenue) * 100).toFixed(1) : '0.0';
          return [
            `"${b.name}"`,
            b.totalRevenue,
            b.orderCount,
            b.uniqueCustomers,
            Math.round(b.avgOrderValue),
            `"${b.topCategory}"`,
            `"${share}%"`
          ];
        });

        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        saveAs(blob, `sales-density-heatmap-${dateRange}-${new Date().toISOString().split('T')[0]}.csv`);
      } else if (format === 'excel') {
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Sales Density Heatmap');

        sheet.addRow(['PETRON SAN PEDRO - PUERTO PRINCESA CITY GEOGRAPHIC SALES DENSITY REPORT']);
        sheet.addRow([`Period: ${dateRange.toUpperCase()} | Generated: ${new Date().toLocaleString()}`]);
        sheet.addRow([]);

        const headerRow = sheet.addRow(['Barangay / Zone', 'Total Revenue (PHP)', 'Total Orders', 'Unique Customers', 'Avg Order Value (PHP)', 'Top Category', 'Market Share (%)']);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0033A0' } };

        barangayStats.forEach(b => {
          const share = summaryKpis.totalRevenue > 0 ? ((b.totalRevenue / summaryKpis.totalRevenue) * 100).toFixed(1) : '0.0';
          const row = sheet.addRow([
            b.name,
            b.totalRevenue,
            b.orderCount,
            b.uniqueCustomers,
            Math.round(b.avgOrderValue),
            b.topCategory,
            `${share}%`
          ]);
          row.getCell(2).numFmt = '"Php"#,##0.00';
          row.getCell(5).numFmt = '"Php"#,##0.00';
        });

        sheet.getColumn(1).width = 30;
        sheet.getColumn(2).width = 22;
        sheet.getColumn(3).width = 15;
        sheet.getColumn(4).width = 18;
        sheet.getColumn(5).width = 22;
        sheet.getColumn(6).width = 20;
        sheet.getColumn(7).width = 18;

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, `sales-density-heatmap-${dateRange}-${new Date().toISOString().split('T')[0]}.xlsx`);
      }
    } catch (err) {
      console.error('Export error:', err);
      setError('Failed to export report: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className={`text-2xl font-bold flex items-center gap-2.5 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            <Flame className="text-[#ED1C24] animate-pulse" size={28} />
            Geographic Sales Density Heatmap
          </h2>
          <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Thermographic visualizer of order density, high-revenue corridors, and barangay market penetration in Puerto Princesa City.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => handleExport('excel')}
            disabled={exporting || loading}
            className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-sm disabled:opacity-50"
            title="Export Excel Report"
          >
            <FileSpreadsheet size={15} />
            Excel Export
          </button>

          <button
            onClick={() => handleExport('csv')}
            disabled={exporting || loading}
            className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-sm disabled:opacity-50"
            title="Export CSV Dataset"
          >
            <FileText size={15} />
            CSV Export
          </button>

          <button
            onClick={fetchHeatmapData}
            disabled={loading}
            className={`p-2 rounded-lg border transition ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} ${isDarkMode ? 'text-gray-300 hover:bg-slate-700' : 'text-gray-700 hover:bg-gray-50'}`}
            title="Refresh Data"
          >
            <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {error && <ErrorAlert message={error} onDismiss={() => setError('')} />}

      {/* Filter Bar */}
      <div className={`p-4 rounded-xl border transition-colors ${isDarkMode ? 'bg-slate-800/90 border-slate-700' : 'bg-white border-gray-200 shadow-sm'}`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Time Range */}
          <div>
            <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Time Period
            </label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className={`w-full px-3 py-2 text-xs rounded-lg border outline-none font-medium ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
            >
              <option value="today">Today</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="month">This Month</option>
              <option value="90days">Last 90 Days</option>
              <option value="all">All Time</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {/* Product Category Filter */}
          <div>
            <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Product Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className={`w-full px-3 py-2 text-xs rounded-lg border outline-none font-medium ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
            >
              <option value="all">All Categories ({categories.length})</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Order Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`w-full px-3 py-2 text-xs rounded-lg border outline-none font-medium ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
            >
              <option value="completed">Completed / Delivered Only</option>
              <option value="all">All Statuses (Including In-Transit)</option>
            </select>
          </div>

          {/* Heatmap Weighting Mode */}
          <div>
            <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Heatmap Mode
            </label>
            <div className="flex rounded-lg overflow-hidden border p-0.5 bg-slate-100 dark:bg-slate-700/50 dark:border-slate-600">
              <button
                type="button"
                onClick={() => setHeatMode('revenue')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition ${heatMode === 'revenue' ? 'bg-[#0033A0] text-white shadow-sm' : 'text-gray-600 dark:text-gray-300'}`}
              >
                ₱ Sales Volume
              </button>
              <button
                type="button"
                onClick={() => setHeatMode('density')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition ${heatMode === 'density' ? 'bg-[#0033A0] text-white shadow-sm' : 'text-gray-600 dark:text-gray-300'}`}
              >
                📦 Order Density
              </button>
            </div>
          </div>
        </div>

        {/* Custom Date Pickers */}
        {dateRange === 'custom' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Start Date</label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className={`w-full px-3 py-1.5 text-xs rounded-lg border outline-none ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">End Date</label>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className={`w-full px-3 py-1.5 text-xs rounded-lg border outline-none ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
              />
            </div>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Hottest Zone */}
        <div className={`p-4 rounded-xl border transition ${isDarkMode ? 'bg-slate-800/90 border-slate-700' : 'bg-white border-gray-200 shadow-sm'}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">🏆 Top Revenue Zone</span>
            <span className="text-lg">🔥</span>
          </div>
          <p className={`text-lg font-extrabold mt-1 truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {summaryKpis.topRevenueZone?.name || 'No Data'}
          </p>
          <p className="text-xs text-emerald-600 font-bold mt-0.5">
            {formatCurrency(summaryKpis.topRevenueZone?.totalRevenue || 0)} ({summaryKpis.topRevenueZone?.orderCount || 0} orders)
          </p>
        </div>

        {/* Highest Volume Zone */}
        <div className={`p-4 rounded-xl border transition ${isDarkMode ? 'bg-slate-800/90 border-slate-700' : 'bg-white border-gray-200 shadow-sm'}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-500 uppercase tracking-wider">📦 Top Volume Zone</span>
            <span className="text-lg">📈</span>
          </div>
          <p className={`text-lg font-extrabold mt-1 truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {summaryKpis.topVolumeZone?.name || 'No Data'}
          </p>
          <p className="text-xs text-blue-600 font-bold mt-0.5">
            {summaryKpis.topVolumeZone?.orderCount || 0} Deliveries Completed
          </p>
        </div>

        {/* Highest Average Ticket */}
        <div className={`p-4 rounded-xl border transition ${isDarkMode ? 'bg-slate-800/90 border-slate-700' : 'bg-white border-gray-200 shadow-sm'}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-500 uppercase tracking-wider">💰 Highest Avg Basket</span>
            <span className="text-lg">💎</span>
          </div>
          <p className={`text-lg font-extrabold mt-1 truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {summaryKpis.highestTicketZone?.name || 'No Data'}
          </p>
          <p className="text-xs text-purple-600 font-bold mt-0.5">
            {formatCurrency(summaryKpis.highestTicketZone?.avgOrderValue || 0)} / order
          </p>
        </div>

        {/* Emerging / Cold Zone */}
        <div className={`p-4 rounded-xl border transition ${isDarkMode ? 'bg-slate-800/90 border-slate-700' : 'bg-white border-gray-200 shadow-sm'}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-cyan-500 uppercase tracking-wider">❄️ Growth Opportunity</span>
            <span className="text-lg">🎯</span>
          </div>
          <p className={`text-lg font-extrabold mt-1 truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {summaryKpis.coldZone?.name || 'San Pedro Outskirts'}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">
            Low Penetration Zone ({summaryKpis.coldZone?.orderCount || 0} orders)
          </p>
        </div>
      </div>

      {/* Main Map & Interactive Visualizer Container */}
      <div className={`rounded-xl border overflow-hidden transition-colors ${isDarkMode ? 'bg-slate-800/90 border-slate-700' : 'bg-white border-gray-200 shadow-sm'}`}>
        {/* Map Toolbar */}
        <div className={`px-4 py-3 border-b flex flex-wrap justify-between items-center gap-3 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
          <div className="flex items-center gap-2">
            <Layers size={18} className="text-[#0033A0]" />
            <span className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
              Interactive Thermographic Canvas ({heatmapPoints.length} Data Points)
            </span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Radius Slider */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-gray-500 font-medium">Radius:</span>
              <input
                type="range"
                min="15"
                max="50"
                value={heatRadius}
                onChange={(e) => setHeatRadius(Number(e.target.value))}
                className="w-20 accent-[#0033A0] cursor-pointer"
              />
              <span className="text-[11px] font-mono text-gray-500">{heatRadius}px</span>
            </div>

            {/* Pin Toggle */}
            <button
              type="button"
              onClick={() => setShowOrderPins(!showOrderPins)}
              className={`px-2.5 py-1 text-xs rounded-md font-medium border transition ${showOrderPins ? 'bg-[#0033A0] text-white border-blue-700' : (isDarkMode ? 'bg-slate-700 text-gray-300 border-slate-600' : 'bg-white text-gray-700 border-gray-300')}`}
            >
              📍 {showOrderPins ? 'Hide Order Pins' : 'Show Order Pins'}
            </button>

            {/* Fit All Button */}
            <button
              type="button"
              onClick={handleResetMapView}
              className={`px-2.5 py-1 text-xs rounded-md font-medium border transition ${isDarkMode ? 'bg-slate-700 hover:bg-slate-600 text-gray-300 border-slate-600' : 'bg-white hover:bg-gray-100 text-gray-700 border-gray-300'}`}
            >
              🔍 Fit All Map
            </button>
          </div>
        </div>

        {/* Heatmap Iframe */}
        <div className="h-[480px] w-full relative">
          <iframe
            ref={iframeRef}
            srcDoc={mapHtml}
            title="Sales Density Heatmap"
            className="w-full h-full border-0"
          />

          {/* Thermographic Color Legend Overlay */}
          <div className={`absolute bottom-4 left-4 p-2.5 rounded-xl border backdrop-blur-md z-10 shadow-lg ${isDarkMode ? 'bg-slate-900/90 border-slate-700 text-gray-200' : 'bg-white/95 border-gray-200 text-gray-800'}`}>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5">Density Intensity</p>
            <div className="w-36 h-3 rounded-full overflow-hidden shadow-inner" style={{
              background: 'linear-gradient(to right, #0033A0, #00A86B, #FFD700, #FF8C00, #ED1C24)'
            }}></div>
            <div className="flex justify-between text-[9px] text-gray-400 font-bold mt-1">
              <span>Low</span>
              <span>Moderate</span>
              <span>Hot 🔥</span>
            </div>
          </div>
        </div>
      </div>

      {/* Barangay Market Penetration Table */}
      <div className={`rounded-xl border overflow-hidden transition-colors ${isDarkMode ? 'bg-slate-800/90 border-slate-700' : 'bg-white border-gray-200 shadow-sm'}`}>
        <div className={`px-6 py-4 border-b flex justify-between items-center ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
          <div>
            <h3 className={`font-bold text-base ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Barangay &amp; District Sales Breakdown
            </h3>
            <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Click any barangay to focus and fly the thermographic camera directly onto that zone.
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1 bg-blue-100 dark:bg-blue-950/80 text-[#0033A0] dark:text-blue-300 rounded-full">
            {barangayStats.length} Zones Analyzed
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className={`border-b uppercase font-semibold ${isDarkMode ? 'bg-slate-700/60 border-slate-600 text-gray-300' : 'bg-gray-100 border-gray-200 text-gray-600'}`}>
              <tr>
                <th className="px-6 py-3.5">Rank &amp; Barangay</th>
                <th className="px-6 py-3.5">Total Revenue</th>
                <th className="px-6 py-3.5">Completed Orders</th>
                <th className="px-6 py-3.5">Avg Order Value</th>
                <th className="px-6 py-3.5">Unique Customers</th>
                <th className="px-6 py-3.5">Top Selling Category</th>
                <th className="px-6 py-3.5">Market Share</th>
                <th className="px-6 py-3.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? 'divide-slate-700' : 'divide-gray-100'}`}>
              {barangayStats.map((b, index) => {
                const sharePercent = summaryKpis.totalRevenue > 0 
                  ? ((b.totalRevenue / summaryKpis.totalRevenue) * 100).toFixed(1) 
                  : '0.0';
                const isSelected = selectedBarangay?.name === b.name;

                return (
                  <tr 
                    key={b.name}
                    onClick={() => handleFocusBarangay(b)}
                    className={`cursor-pointer transition-colors duration-150 ${
                      isSelected 
                        ? (isDarkMode ? 'bg-blue-950/60' : 'bg-blue-50/80') 
                        : (isDarkMode ? 'hover:bg-slate-700/50' : 'hover:bg-gray-50')
                    }`}
                  >
                    <td className="px-6 py-3.5 font-medium flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        index === 0 ? 'bg-amber-400 text-slate-900 font-extrabold' : 
                        index === 1 ? 'bg-gray-300 text-slate-900' : 
                        index === 2 ? 'bg-amber-700 text-white' : 
                        'bg-slate-200 dark:bg-slate-700 text-gray-600 dark:text-gray-300'
                      }`}>
                        {index + 1}
                      </span>
                      <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{b.name}</span>
                    </td>
                    <td className="px-6 py-3.5 font-bold text-[#00A86B]">
                      {formatCurrency(b.totalRevenue)}
                    </td>
                    <td className="px-6 py-3.5 font-medium">
                      <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-[#0033A0] dark:text-blue-300 font-bold">
                        {b.orderCount} orders
                      </span>
                    </td>
                    <td className="px-6 py-3.5 font-medium text-gray-700 dark:text-gray-300">
                      {formatCurrency(b.avgOrderValue)}
                    </td>
                    <td className="px-6 py-3.5 text-gray-600 dark:text-gray-400">
                      {b.uniqueCustomers} customers
                    </td>
                    <td className="px-6 py-3.5 font-medium text-purple-600 dark:text-purple-400">
                      {b.topCategory}
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                          <div 
                            className="bg-[#0033A0] h-full rounded-full" 
                            style={{ width: `${Math.min(100, Math.max(0, Number(sharePercent)))}%` }}
                          ></div>
                        </div>
                        <span className="font-mono text-[11px] font-bold text-gray-600 dark:text-gray-400">{sharePercent}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFocusBarangay(b);
                        }}
                        className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-950 text-[#0033A0] dark:text-blue-300 hover:bg-blue-200 transition"
                        title="Focus on Map"
                      >
                        <ZoomIn size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
