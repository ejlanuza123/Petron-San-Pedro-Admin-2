// src/pages/Reports.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  TrendingUp, 
  Calendar, 
  Download, 
  BarChart3, 
  DollarSign,
  ShoppingCart,
  Users,
  RefreshCw
} from 'lucide-react';
import ErrorAlert from '../components/common/ErrorAlert';
import { supabase } from '../lib/supabase';
import { formatCurrency, formatDate } from '../utils/formatters';

// Skeleton Components (keep as is)
const StatCardSkeleton = () => (
  <div className="bg-white p-6 rounded-xl border border-gray-200 animate-pulse">
    <div className="flex justify-between mb-2">
      <div className="h-4 w-24 bg-gray-200 rounded"></div>
      <div className="w-8 h-8 bg-gray-200 rounded"></div>
    </div>
    <div className="h-8 w-32 bg-gray-300 rounded mb-2"></div>
    <div className="h-3 w-20 bg-gray-200 rounded"></div>
  </div>
);

const CategorySkeleton = () => (
  <div className="space-y-3">
    {[1,2,3,4].map(i => (
      <div key={i} className="animate-pulse">
        <div className="flex justify-between mb-1">
          <div className="h-4 w-24 bg-gray-200 rounded"></div>
          <div className="h-4 w-20 bg-gray-200 rounded"></div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className="bg-gray-300 h-2 rounded-full" style={{ width: `${Math.random() * 100}%` }}></div>
        </div>
      </div>
    ))}
  </div>
);

const ChartSkeleton = () => (
  <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
    <div className="h-6 w-48 bg-gray-200 rounded mb-6"></div>
    <div className="space-y-4">
      {[1,2,3,4,5,6,7].map(i => (
        <div key={i} className="flex items-center gap-2">
          <div className="h-4 w-20 bg-gray-200 rounded"></div>
          <div className="flex-1 h-8 bg-gray-200 rounded"></div>
        </div>
      ))}
    </div>
  </div>
);

export default function Reports() {
  const [dateRange, setDateRange] = useState('month');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Memoized date range calculation
  const dateRangeLabel = useMemo(() => {
    const endDate = new Date();
    const startDate = new Date();
    
    switch(dateRange) {
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        return `${formatDate(startDate)} - ${formatDate(endDate)}`;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        return `${formatDate(startDate)} - ${formatDate(endDate)}`;
      case 'quarter':
        startDate.setMonth(startDate.getMonth() - 3);
        return `${formatDate(startDate)} - ${formatDate(endDate)}`;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        return `${formatDate(startDate)} - ${formatDate(endDate)}`;
      default:
        return 'Custom Range';
    }
  }, [dateRange]);

  const fetchReportData = useCallback(async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      
      switch(dateRange) {
        case 'week':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case 'quarter':
          startDate.setMonth(startDate.getMonth() - 3);
          break;
        case 'year':
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
        default:
          startDate.setMonth(startDate.getMonth() - 1);
      }

      // Fetch orders in date range with customer data
      // Note: profiles doesn't have email, so we'll just get the name
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          profiles!orders_user_id_fkey (
            full_name
          ),
          order_items (
            quantity,
            price_at_order,
            products (
              name,
              category
            )
          )
        `)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: true });

      if (ordersError) throw ordersError;

      // Calculate metrics
      const completedOrders = orders?.filter(o => o.status === 'Completed') || [];
      const totalRevenue = completedOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
      const totalOrders = orders?.length || 0;

      // Status breakdown
      const statusCounts = (orders || []).reduce((acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, {});

      // Category breakdown
      const categorySales = (orders || []).reduce((acc, order) => {
        order.order_items?.forEach(item => {
          const category = item.products?.category || 'Other';
          if (!acc[category]) {
            acc[category] = { 
              revenue: 0, 
              quantity: 0, 
              orders: new Set() 
            };
          }
          acc[category].revenue += (item.quantity * item.price_at_order) || 0;
          acc[category].quantity += item.quantity || 0;
          acc[category].orders.add(order.id);
        });
        return acc;
      }, {});

      // Convert Sets to counts
      Object.keys(categorySales).forEach(category => {
        categorySales[category].orderCount = categorySales[category].orders.size;
        delete categorySales[category].orders;
      });

      // Daily/Monthly sales for chart
      const timeSeriesData = {};
      (orders || []).forEach(order => {
        if (order.status === 'Completed') {
          const date = dateRange === 'year' 
            ? new Date(order.created_at).toLocaleString('default', { month: 'short', year: 'numeric' })
            : formatDate(order.created_at);
          timeSeriesData[date] = (timeSeriesData[date] || 0) + (order.total_amount || 0);
        }
      });

      // Top customers (without email)
      const customerSpending = (orders || []).reduce((acc, order) => {
        if (order.status === 'Completed' && order.profiles) {
          const customerId = order.user_id;
          if (!acc[customerId]) {
            acc[customerId] = {
              name: order.profiles.full_name || 'Unknown Customer',
              totalSpent: 0,
              orderCount: 0
            };
          }
          acc[customerId].totalSpent += order.total_amount || 0;
          acc[customerId].orderCount += 1;
        }
        return acc;
      }, {});

      const topCustomers = Object.values(customerSpending)
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 5);

      setReportData({
        summary: {
          totalRevenue,
          totalOrders,
          completedOrders: completedOrders.length,
          pendingOrders: statusCounts['Pending'] || 0,
          processingOrders: statusCounts['Processing'] || 0,
          cancelledOrders: statusCounts['Cancelled'] || 0,
          averageOrderValue: completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0,
          uniqueCustomers: new Set((orders || []).map(o => o.user_id)).size
        },
        categorySales,
        timeSeriesData: Object.entries(timeSeriesData).map(([date, amount]) => ({ date, amount })),
        topCustomers,
        dateRange: {
          start: startDate,
          end: endDate,
          label: dateRangeLabel
        }
      });
    } catch (err) {
      console.error('Error fetching report data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateRange, dateRangeLabel]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  const handleRefresh = useCallback(() => {
    fetchReportData(true);
  }, [fetchReportData]);

  const handleDateRangeChange = useCallback((e) => {
    setDateRange(e.target.value);
  }, []);

  const exportToCSV = useCallback(() => {
    if (!reportData) return;

    const headers = ['Date', 'Revenue', 'Category', 'Category Revenue', 'Category Quantity'];
    const rows = [];

    // Add daily sales
    reportData.timeSeriesData.forEach(({ date, amount }) => {
      rows.push([date, amount, '', '', '']);
    });

    // Add category breakdown
    Object.entries(reportData.categorySales).forEach(([category, data]) => {
      rows.push(['', '', category, data.revenue, data.quantity]);
    });

    // Add summary
    rows.push(['', '', 'SUMMARY', '', '']);
    rows.push(['Total Revenue', reportData.summary.totalRevenue, '', '', '']);
    rows.push(['Total Orders', reportData.summary.totalOrders, '', '', '']);
    rows.push(['Completed Orders', reportData.summary.completedOrders, '', '', '']);
    rows.push(['Avg Order Value', reportData.summary.averageOrderValue, '', '', '']);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `petron-report-${dateRange}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }, [reportData, dateRange]);

  const getPercentage = useCallback((value, total) => {
    return total > 0 ? (value / total) * 100 : 0;
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse"></div>
          <div className="flex gap-3">
            <div className="w-40 h-10 bg-gray-200 rounded animate-pulse"></div>
            <div className="w-24 h-10 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>

        {/* Date Range Label Skeleton */}
        <div className="h-4 w-64 bg-gray-200 rounded animate-pulse"></div>

        {/* Summary Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <StatCardSkeleton key={i} />)}
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartSkeleton />
          <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
            <div className="h-6 w-48 bg-gray-200 rounded mb-6"></div>
            <CategorySkeleton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Reports & Analytics</h2>
          {reportData && (
            <p className="text-sm text-gray-500 mt-1">
              <Calendar size={14} className="inline mr-1" />
              {reportData.dateRange.label}
            </p>
          )}
        </div>
        
        <div className="flex gap-3">
          <select
            value={dateRange}
            onChange={handleDateRangeChange}
            className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#0033A0] outline-none bg-white"
            disabled={refreshing}
          >
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
            <option value="quarter">Last 3 Months</option>
            <option value="year">Last 12 Months</option>
          </select>
          
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
          </button>
          
          <button
            onClick={exportToCSV}
            disabled={!reportData || refreshing}
            className="bg-gradient-to-r from-[#0033A0] to-[#ED1C24] text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Download size={18} />
            Export
          </button>
        </div>
      </div>

      {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

      {reportData && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-500">Total Revenue</p>
                <div className="p-2 bg-blue-100 rounded-lg">
                  <DollarSign className="text-[#0033A0]" size={18} />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(reportData.summary.totalRevenue)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {reportData.summary.completedOrders} completed orders
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-500">Total Orders</p>
                <div className="p-2 bg-red-100 rounded-lg">
                  <ShoppingCart className="text-[#ED1C24]" size={18} />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">{reportData.summary.totalOrders}</p>
              <div className="flex gap-2 mt-1 text-xs">
                <span className="text-green-600">{reportData.summary.completedOrders} completed</span>
                <span className="text-yellow-600">{reportData.summary.pendingOrders} pending</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-500">Avg Order Value</p>
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrendingUp className="text-green-600" size={18} />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(reportData.summary.averageOrderValue)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                per completed order
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-500">Success Rate</p>
                <div className="p-2 bg-purple-100 rounded-lg">
                  <BarChart3 className="text-purple-600" size={18} />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {reportData.summary.totalOrders > 0 
                  ? Math.round((reportData.summary.completedOrders / reportData.summary.totalOrders) * 100) 
                  : 0}%
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {reportData.summary.uniqueCustomers} unique customers
              </p>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sales Timeline */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Sales Timeline</h3>
              {reportData.timeSeriesData.length > 0 ? (
                <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                  {reportData.timeSeriesData.map((item, index) => {
                    const maxAmount = Math.max(...reportData.timeSeriesData.map(d => d.amount));
                    const percentage = (item.amount / maxAmount) * 100;
                    
                    return (
                      <div key={index} className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 w-24">{item.date}</span>
                        <div className="flex-1">
                          <div className="h-8 bg-gray-100 rounded-lg relative group">
                            <div 
                              className="h-full bg-gradient-to-r from-[#0033A0] to-[#ED1C24] rounded-lg transition-all duration-300"
                              style={{ width: `${percentage}%` }}
                            >
                              <div className="opacity-0 group-hover:opacity-100 absolute right-0 -top-8 bg-gray-800 text-white text-xs px-2 py-1 rounded transition-opacity">
                                {formatCurrency(item.amount)}
                              </div>
                            </div>
                          </div>
                        </div>
                        <span className="text-sm font-medium text-gray-700 w-24 text-right">
                          {formatCurrency(item.amount)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  No sales data available for this period
                </div>
              )}
            </div>

            {/* Category Breakdown */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Sales by Category</h3>
              {Object.keys(reportData.categorySales).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(reportData.categorySales)
                    .sort(([,a], [,b]) => b.revenue - a.revenue)
                    .map(([category, data]) => (
                      <div key={category}>
                        <div className="flex justify-between items-center mb-1">
                          <div>
                            <span className="font-medium text-gray-700">{category}</span>
                            <span className="text-xs text-gray-500 ml-2">
                              ({data.quantity} units)
                            </span>
                          </div>
                          <span className="text-[#0033A0] font-bold">
                            {formatCurrency(data.revenue)}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div 
                            className="bg-gradient-to-r from-[#0033A0] to-[#ED1C24] h-2.5 rounded-full transition-all duration-300"
                            style={{ 
                              width: `${getPercentage(data.revenue, reportData.summary.totalRevenue)}%` 
                            }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          {data.orderCount} orders
                        </p>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  No category data available
                </div>
              )}
            </div>
          </div>

          {/* Top Customers (without email) */}
          {reportData.topCustomers.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Customers</h3>
              <div className="space-y-3">
                {reportData.topCustomers.map((customer, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-[#0033A0] to-[#ED1C24] rounded-lg flex items-center justify-center text-white font-bold text-sm">
                        {customer.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{customer.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-[#0033A0]">{formatCurrency(customer.totalSpent)}</p>
                      <p className="text-xs text-gray-500">{customer.orderCount} orders</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}