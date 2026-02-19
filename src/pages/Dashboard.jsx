// src/pages/Dashboard.jsx
import React, { useEffect, useState } from 'react';
import { TrendingUp, AlertTriangle, Clock, CheckCircle, DollarSign, Package, ShoppingBag, Users } from 'lucide-react';
import StatsCard from '../components/StatsCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorAlert from '../components/common/ErrorAlert';
import { orderService } from '../services/orderService';
import { productService } from '../services/productService';
import { formatCurrency } from '../utils/formatters';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    todayRevenue: 0,
    pendingOrders: 0,
    processingOrders: 0,
    completedOrders: 0,
    lowStock: 0
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [statsData, ordersData, lowStockData] = await Promise.all([
        orderService.getStats(),
        orderService.getAll().then(orders => orders.slice(0, 5)),
        productService.getLowStock(10)
      ]);
      
      setStats(statsData);
      setRecentOrders(ordersData);
      setLowStockProducts(lowStockData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner fullPage />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Dashboard Overview</h2>
        <button
          onClick={fetchDashboardData}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
        >
          Refresh
        </button>
      </div>

      {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard 
          title="Total Revenue" 
          value={formatCurrency(stats.totalRevenue)} 
          icon={DollarSign} 
          color="bg-gradient-to-br from-blue-600 to-blue-700"
          trend={12.5}
          trendValue="vs last month"
        />
        <StatsCard 
          title="Today's Revenue" 
          value={formatCurrency(stats.todayRevenue)} 
          icon={TrendingUp} 
          color="bg-gradient-to-br from-green-600 to-green-700"
        />
        <StatsCard 
          title="Pending Orders" 
          value={stats.pendingOrders} 
          icon={Clock} 
          color="bg-gradient-to-br from-orange-500 to-orange-600"
          subtext={`${stats.processingOrders} currently processing`}
        />
        <StatsCard 
          title="Low Stock Items" 
          value={stats.lowStock} 
          icon={AlertTriangle} 
          color="bg-gradient-to-br from-red-500 to-red-600"
          subtext="Products below 10 units"
        />
      </div>

      {/* Charts and Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Recent Orders</h3>
            <Link to="/orders" className="text-sm text-blue-600 hover:text-blue-700">
              View All
            </Link>
          </div>
          
          <div className="space-y-3">
            {recentOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">#{order.id}</p>
                  <p className="text-sm text-gray-500">{order.profiles?.full_name || 'Guest'}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-blue-600">{formatCurrency(order.total_amount)}</p>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    order.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                    order.status === 'Processing' ? 'bg-blue-100 text-blue-800' :
                    order.status === 'Completed' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Low Stock Alert */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Low Stock Alert</h3>
          
          {lowStockProducts.length > 0 ? (
            <div className="space-y-3">
              {lowStockProducts.map((product) => (
                <div key={product.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{product.name}</p>
                    <p className="text-sm text-gray-500">{product.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-red-600">{product.stock_quantity} {product.unit}</p>
                    <Link to={`/products`} className="text-xs text-blue-600 hover:underline">
                      Restock
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Package className="mx-auto text-gray-400 mb-2" size={48} />
              <p className="text-gray-500">No low stock items</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}