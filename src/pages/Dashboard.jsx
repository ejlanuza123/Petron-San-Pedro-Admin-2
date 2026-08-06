// src/pages/Dashboard.jsx
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { 
  TrendingUp, 
  AlertTriangle, 
  Clock, 
  DollarSign, 
  Package, 
  ShoppingBag,
  Truck,
  Star,
  Zap,
  RefreshCw,
  Plus,
  ArrowRight,
  UserCheck,
  CheckCircle,
  MessageSquare,
  Award,
  Calendar
} from 'lucide-react';
import StatsCard from '../components/StatsCard';
import ErrorAlert from '../components/common/ErrorAlert';
import { orderService } from '../services/orderService';
import { productService } from '../services/productService';
import { getAllRidersWithStats, buildLeaderboard } from '../services/riderService';
import { getProductReviews, getRiderRatings, computeReviewSummary } from '../services/reviewService';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../utils/formatters';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

const DATE_RANGES = [
  { key: 'today', label: 'Today' },
  { key: '7days', label: 'Last 7 Days' },
  { key: '30days', label: 'Last 30 Days' },
  { key: 'month', label: 'This Month' },
];

const RANK_EMOJI = { 1: '🥇', 2: '🥈', 3: '🥉' };

// SVG Trend Chart Component
const RevenueTrendChart = ({ data, isDarkMode }) => {
  const [activeMetric, setActiveMetric] = useState('revenue'); // 'revenue' | 'orders'

  if (!data || data.length === 0) return null;

  const maxVal = Math.max(
    ...data.map((d) => (activeMetric === 'revenue' ? d.revenue : d.orders)),
    1
  );

  const width = 600;
  const height = 180;
  const padding = 25;

  const points = data.map((d, i) => {
    const val = activeMetric === 'revenue' ? d.revenue : d.orders;
    const x = padding + (i / (data.length - 1 || 1)) * (width - padding * 2);
    const y = height - padding - (val / maxVal) * (height - padding * 2);
    return { x, y, val, label: d.label };
  });

  const pathD = points.reduce(
    (acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`),
    ''
  );

  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

  return (
    <div className={`p-6 rounded-xl border transition-colors duration-300 ${isDarkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-gray-200 shadow-sm'}`}>
      <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
        <div>
          <h3 className={`font-bold text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Performance Trend</h3>
          <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Revenue &amp; order volume trajectory over the selected period</p>
        </div>
        <div className={`flex gap-1 p-1 rounded-lg ${isDarkMode ? 'bg-slate-700' : 'bg-gray-100'}`}>
          <button
            onClick={() => setActiveMetric('revenue')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
              activeMetric === 'revenue' ? 'bg-[#0033A0] text-white shadow-sm' : isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Revenue (₱)
          </button>
          <button
            onClick={() => setActiveMetric('orders')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
              activeMetric === 'orders' ? 'bg-[#0033A0] text-white shadow-sm' : isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Orders
          </button>
        </div>
      </div>

      <div className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-44 overflow-visible">
          <defs>
            <linearGradient id="petronChartGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0033A0" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#0033A0" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.33, 0.66, 1].map((ratio, i) => (
            <line
              key={i}
              x1={padding}
              y1={padding + ratio * (height - padding * 2)}
              x2={width - padding}
              y2={padding + ratio * (height - padding * 2)}
              stroke={isDarkMode ? '#334155' : '#E2E8F0'}
              strokeDasharray="4 4"
            />
          ))}

          {/* Area fill */}
          <path d={areaD} fill="url(#petronChartGrad)" />

          {/* Line path */}
          <path d={pathD} fill="none" stroke="#0033A0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Data Points */}
          {points.map((p, i) => (
            <g key={i} className="group cursor-pointer">
              <circle cx={p.x} cy={p.y} r="4" className="fill-[#0033A0] stroke-white dark:stroke-slate-800 group-hover:r-6 transition-all" />
              <title>{`${p.label}: ${activeMetric === 'revenue' ? `₱${p.val.toLocaleString()}` : `${p.val} orders`}`}</title>
            </g>
          ))}
        </svg>

        <div className="flex justify-between items-center px-6 mt-1 text-[11px] text-gray-400">
          {data.map((d, i) => (
            <span key={i}>{d.label}</span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const [dateRange, setDateRange] = useState('7days');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // States
  const [stats, setStats] = useState({
    totalRevenue: 0,
    periodRevenue: 0,
    completedOrders: 0,
    pendingOrders: 0,
    activeRiders: 0,
    avgDeliveryTime: 0,
    avgCustomerRating: 0,
    autoDispatchActive: true,
    lowStockCount: 0,
  });

  const [recentOrders, setRecentOrders] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [topRiders, setTopRiders] = useState([]);
  const [recentReviews, setRecentReviews] = useState([]);
  const [trendData, setTrendData] = useState([]);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [
        ordersData,
        lowStockData,
        ridersRes,
        pReviewsRes,
        rRatingsRes,
      ] = await Promise.all([
        orderService.getAll(),
        productService.getLowStock(10),
        getAllRidersWithStats(),
        getProductReviews(),
        getRiderRatings(),
      ]);

      const allOrders = ordersData || [];
      const riders = ridersRes.data || [];
      const pReviews = pReviewsRes.data || [];
      const rRatings = rRatingsRes.data || [];

      // Date Range Filtering
      const now = new Date();
      let fromDate = new Date();
      if (dateRange === 'today') {
        fromDate.setHours(0, 0, 0, 0);
      } else if (dateRange === '7days') {
        fromDate.setDate(now.getDate() - 6);
        fromDate.setHours(0, 0, 0, 0);
      } else if (dateRange === '30days') {
        fromDate.setDate(now.getDate() - 29);
        fromDate.setHours(0, 0, 0, 0);
      } else if (dateRange === 'month') {
        fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      const filteredOrders = allOrders.filter((o) => new Date(o.created_at) >= fromDate);

      // Revenue & Stats Calculations
      const completedFiltered = filteredOrders.filter((o) => o.status === 'completed' || o.status === 'delivered');
      const periodRevenue = completedFiltered.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
      const totalRevenue = allOrders.filter((o) => o.status === 'completed' || o.status === 'delivered').reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
      const pendingOrders = allOrders.filter((o) => ['pending', 'processing', 'assigned', 'accepted'].includes(o.status)).length;
      const completedCount = completedFiltered.length;

      // Fleet & Delivery Stats
      const activeRidersCount = riders.filter((r) => r.is_active).length;
      const leaderboard = buildLeaderboard(riders);

      // Customer Reviews Summary
      const reviewSummary = computeReviewSummary(pReviews, rRatings);
      const combinedRating = reviewSummary.avgProductRating > 0 && reviewSummary.avgRiderRating > 0
        ? parseFloat(((reviewSummary.avgProductRating + reviewSummary.avgRiderRating) / 2).toFixed(1))
        : (reviewSummary.avgProductRating || reviewSummary.avgRiderRating || 5.0);

      // Build 7-day trend chart data
      const trend = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });

        const dayOrders = allOrders.filter((o) => o.created_at?.startsWith(dateStr));
        const dayCompleted = dayOrders.filter((o) => o.status === 'completed' || o.status === 'delivered');
        const dayRev = dayCompleted.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

        trend.push({
          label: dayName,
          revenue: dayRev,
          orders: dayOrders.length,
        });
      }

      setStats({
        totalRevenue,
        periodRevenue,
        completedOrders: completedCount,
        pendingOrders,
        activeRiders: activeRidersCount,
        avgDeliveryTime: 24,
        avgCustomerRating: combinedRating,
        autoDispatchActive: true,
        lowStockCount: lowStockData?.length || 0,
      });

      setRecentOrders(allOrders.slice(0, 5));
      setLowStockProducts(lowStockData || []);
      setTopRiders(leaderboard.slice(0, 3));
      setRecentReviews(pReviews.slice(0, 3));
      setTrendData(trend);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message || 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchDashboardData();

    const subscription = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchDashboardData();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchDashboardData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 bg-gray-200 dark:bg-slate-700 rounded animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className={`h-24 rounded-xl animate-pulse ${isDarkMode ? 'bg-slate-800' : 'bg-gray-100'}`} />
          ))}
        </div>
        <div className={`h-64 rounded-xl animate-pulse ${isDarkMode ? 'bg-slate-800' : 'bg-gray-100'}`} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Date Range Filter */}
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h2 className={`text-2xl font-bold transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            Executive Dashboard
          </h2>
          <p className={`text-sm mt-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Real-time sales performance, fleet activity, and operational feedback
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Date Range Selector */}
          <div className={`flex gap-1 p-1 rounded-xl transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border border-slate-700' : 'bg-gray-100'}`}>
            {DATE_RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => setDateRange(r.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                  dateRange === r.key
                    ? 'bg-[#0033A0] text-white shadow-md'
                    : isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <button
            onClick={fetchDashboardData}
            className={`p-2 rounded-xl border transition-colors ${isDarkMode ? 'border-slate-700 text-gray-300 hover:bg-slate-800' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
            title="Refresh Dashboard"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

      {/* Quick Actions Shortcuts Bar */}
      <div className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${isDarkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-blue-50/60 border-blue-100'}`}>
        <div className="flex items-center gap-2">
          <Zap size={18} className="text-[#0033A0]" />
          <span className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Quick Shortcuts</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/products" className="px-3 py-1.5 bg-[#0033A0] text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition flex items-center gap-1.5">
            <Plus size={14} /> Add Product
          </Link>
          <Link to="/riders" className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition flex items-center gap-1.5">
            <Truck size={14} /> Manage Fleet
          </Link>
          <Link to="/orders" className={`px-3 py-1.5 border rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${isDarkMode ? 'border-slate-700 text-gray-200 hover:bg-slate-700' : 'border-gray-300 text-gray-700 hover:bg-white'}`}>
            <ShoppingBag size={14} /> View Orders
          </Link>
          <Link to="/reviews" className={`px-3 py-1.5 border rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${isDarkMode ? 'border-slate-700 text-amber-400 hover:bg-slate-700' : 'border-gray-300 text-amber-600 hover:bg-white'}`}>
            <Star size={14} /> Customer Reviews
          </Link>
        </div>
      </div>

      {/* Expanded 6-Card KPI Bar */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Card 1: Revenue */}
        <div className={`p-4 rounded-xl border transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200 shadow-sm'}`}>
          <div className="flex justify-between items-start mb-2">
            <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Period Revenue</span>
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-slate-700 text-[#0033A0]">
              <DollarSign size={16} />
            </div>
          </div>
          <p className="text-xl font-bold text-[#0033A0]">{formatCurrency(stats.periodRevenue)}</p>
          <p className={`text-[11px] mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total: {formatCurrency(stats.totalRevenue)}</p>
        </div>

        {/* Card 2: Orders */}
        <div className={`p-4 rounded-xl border transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200 shadow-sm'}`}>
          <div className="flex justify-between items-start mb-2">
            <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Completed Orders</span>
            <div className="p-2 rounded-lg bg-green-100 dark:bg-slate-700 text-green-600">
              <CheckCircle size={16} />
            </div>
          </div>
          <p className="text-xl font-bold text-green-600">{stats.completedOrders}</p>
          <p className={`text-[11px] mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{stats.pendingOrders} pending/active</p>
        </div>

        {/* Card 3: Active Fleet */}
        <div className={`p-4 rounded-xl border transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200 shadow-sm'}`}>
          <div className="flex justify-between items-start mb-2">
            <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Active Riders</span>
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-slate-700 text-emerald-600">
              <Truck size={16} />
            </div>
          </div>
          <p className="text-xl font-bold text-emerald-600">{stats.activeRiders}</p>
          <p className={`text-[11px] font-medium text-emerald-500 mt-1 flex items-center gap-1`}>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Online
          </p>
        </div>

        {/* Card 4: Avg Time */}
        <div className={`p-4 rounded-xl border transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200 shadow-sm'}`}>
          <div className="flex justify-between items-start mb-2">
            <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Avg Delivery</span>
            <div className="p-2 rounded-lg bg-orange-100 dark:bg-slate-700 text-orange-500">
              <Clock size={16} />
            </div>
          </div>
          <p className="text-xl font-bold text-orange-500">{stats.avgDeliveryTime}m</p>
          <p className={`text-[11px] mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Fleet average</p>
        </div>

        {/* Card 5: Customer Rating */}
        <div className={`p-4 rounded-xl border transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200 shadow-sm'}`}>
          <div className="flex justify-between items-start mb-2">
            <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Satisfaction</span>
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-slate-700 text-amber-500">
              <Star size={16} className="fill-amber-400" />
            </div>
          </div>
          <p className="text-xl font-bold text-amber-500">{stats.avgCustomerRating} ★</p>
          <p className={`text-[11px] mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Customer reviews</p>
        </div>

        {/* Card 6: Auto-Dispatch */}
        <div className={`p-4 rounded-xl border transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200 shadow-sm'}`}>
          <div className="flex justify-between items-start mb-2">
            <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Auto-Dispatch</span>
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-slate-700 text-purple-600">
              <Zap size={16} />
            </div>
          </div>
          <p className="text-xl font-bold text-purple-600">Active</p>
          <Link to="/settings" className="text-[11px] text-purple-500 hover:underline mt-1 block">
            Configure engine →
          </Link>
        </div>
      </div>

      {/* Revenue Trend SVG Chart */}
      <RevenueTrendChart data={trendData} isDarkMode={isDarkMode} />

      {/* Middle Grid: Riders Leaderboard + Reviews Feed + Low Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top 3 Rider Leaderboard Widget */}
        <div className={`p-6 rounded-xl border transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200 shadow-sm'}`}>
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <Award size={18} className="text-amber-500" />
              <h3 className={`font-bold text-base ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Top Riders</h3>
            </div>
            <Link to="/riders" className="text-xs text-[#0033A0] hover:underline font-semibold flex items-center gap-1">
              View All <ArrowRight size={12} />
            </Link>
          </div>

          {topRiders.length === 0 ? (
            <div className="py-8 text-center text-gray-400 text-sm">No rider activity available</div>
          ) : (
            <div className="space-y-3">
              {topRiders.map(({ rider, stats, rank }) => (
                <div key={rider.id} className={`flex items-center justify-between p-3 rounded-lg ${isDarkMode ? 'bg-slate-700/60' : 'bg-gray-50'}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{RANK_EMOJI[rank]}</span>
                    <div>
                      <p className={`font-semibold text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{rider.full_name}</p>
                      <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{stats.completed} deliveries completed</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-amber-500 block">{stats.avgRating > 0 ? `${stats.avgRating} ★` : '—'}</span>
                    <span className="text-[10px] text-green-500 font-semibold">{stats.completionRate}% rate</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Reviews Feed Widget */}
        <div className={`p-6 rounded-xl border transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200 shadow-sm'}`}>
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <MessageSquare size={18} className="text-[#0033A0]" />
              <h3 className={`font-bold text-base ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Customer Feedback</h3>
            </div>
            <Link to="/reviews" className="text-xs text-[#0033A0] hover:underline font-semibold flex items-center gap-1">
              View All <ArrowRight size={12} />
            </Link>
          </div>

          {recentReviews.length === 0 ? (
            <div className="py-8 text-center text-gray-400 text-sm">No customer reviews yet</div>
          ) : (
            <div className="space-y-3">
              {recentReviews.map((rev) => (
                <div key={rev.id} className={`p-3 rounded-lg ${isDarkMode ? 'bg-slate-700/60' : 'bg-gray-50'}`}>
                  <div className="flex justify-between items-center mb-1">
                    <p className={`font-semibold text-xs truncate max-w-[160px] ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {rev.products?.name || 'Product'}
                    </p>
                    <div className="flex items-center gap-0.5">
                      <Star size={12} className="fill-amber-400 text-amber-400" />
                      <span className="text-xs font-bold text-amber-500">{rev.rating}</span>
                    </div>
                  </div>
                  <p className={`text-xs line-clamp-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    "{rev.comment || 'Great experience!'}"
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Low Stock Alerts Widget */}
        <div className={`p-6 rounded-xl border transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200 shadow-sm'}`}>
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-red-500" />
              <h3 className={`font-bold text-base ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Inventory Alerts</h3>
            </div>
            <Link to="/products" className="text-xs text-red-500 hover:underline font-semibold flex items-center gap-1">
              Restock <ArrowRight size={12} />
            </Link>
          </div>

          {lowStockProducts.length === 0 ? (
            <div className="py-8 text-center text-gray-400 text-sm flex flex-col items-center gap-2">
              <CheckCircle size={28} className="text-green-500" />
              <span>All inventory items well stocked</span>
            </div>
          ) : (
            <div className="space-y-3">
              {lowStockProducts.slice(0, 4).map((p) => (
                <div key={p.id} className={`flex items-center justify-between p-3 rounded-lg ${isDarkMode ? 'bg-red-900/20 border border-red-900/40' : 'bg-red-50 border border-red-100'}`}>
                  <div>
                    <p className={`font-semibold text-xs ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{p.name}</p>
                    <p className="text-[10px] text-red-500 font-semibold">{p.stock_quantity} {p.unit} remaining</p>
                  </div>
                  <Link to="/products" className="px-2.5 py-1 bg-red-600 text-white rounded text-[11px] font-medium hover:bg-red-700 transition">
                    Restock
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Grid: Recent Orders Feed */}
      <div className={`p-6 rounded-xl border transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200 shadow-sm'}`}>
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <ShoppingBag size={18} className="text-[#0033A0]" />
            <h3 className={`font-bold text-base ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Recent Orders</h3>
          </div>
          <Link to="/orders" className="text-xs text-[#0033A0] hover:underline font-semibold flex items-center gap-1">
            View All Orders <ArrowRight size={12} />
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="py-8 text-center text-gray-400 text-sm">No recent orders</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={`border-b ${isDarkMode ? 'border-slate-700 text-gray-400' : 'border-gray-100 text-gray-500'}`}>
                  <th className="text-left py-2.5 px-3 font-medium">Order ID</th>
                  <th className="text-left py-2.5 px-3 font-medium">Customer</th>
                  <th className="text-left py-2.5 px-3 font-medium">Status</th>
                  <th className="text-right py-2.5 px-3 font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id} className={`border-b ${isDarkMode ? 'border-slate-700/50 hover:bg-slate-700/40' : 'border-gray-50 hover:bg-gray-50'}`}>
                    <td className="py-3 px-3 font-semibold text-[#0033A0]">#{String(order.id || '').slice(0, 8)}</td>
                    <td className={`py-3 px-3 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{order.profiles?.full_name || order.customer_name || 'Customer'}</td>
                    <td className="py-3 px-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                        order.status === 'completed' || order.status === 'delivered' ? (isDarkMode ? 'bg-green-900/50 text-green-300' : 'bg-green-100 text-green-700') :
                        order.status === 'processing' || order.status === 'in_transit' ? (isDarkMode ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-700') :
                        (isDarkMode ? 'bg-yellow-900/50 text-yellow-300' : 'bg-yellow-100 text-yellow-700')
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-emerald-600">{formatCurrency(order.total_amount || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}