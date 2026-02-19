import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { TrendingUp, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import StatsCard from '../components/StatsCard';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    pendingOrders: 0,
    lowStock: 0,
    completedToday: 0
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    // 1. Calculate Revenue (Completed orders)
    const { data: revenueData } = await supabase
      .from('orders')
      .select('total_amount')
      .eq('status', 'Completed');
    
    const revenue = revenueData?.reduce((acc, curr) => acc + (curr.total_amount || 0), 0) || 0;

    // 2. Pending Orders
    const { count: pendingCount } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Pending');

    // 3. Low Stock Items (< 10)
    const { count: stockCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .lt('stock_quantity', 10);

    setStats({
      totalRevenue: revenue,
      pendingOrders: pendingCount || 0,
      lowStock: stockCount || 0,
      completedToday: revenueData?.length || 0 // Simplified for demo
    });
  };

  const StatCard = ({ title, value, icon: Icon, color, subtext }) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <h3 className="text-2xl font-bold mt-2 text-gray-900">{value}</h3>
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon size={24} className="text-white" />
        </div>
      </div>
      {subtext && <p className="text-xs text-gray-400 mt-4">{subtext}</p>}
    </div>
  );

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Dashboard Overview</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard 
            title="Total Revenue" 
            value={`₱${stats.totalRevenue.toLocaleString()}`} 
            icon={TrendingUp} 
            color="bg-blue-600"
        />
        <StatsCard 
          title="Pending Orders" 
          value={stats.pendingOrders} 
          icon={Clock} 
          color="bg-orange-500"
          subtext="Requires immediate attention"
        />
        <StatsCard 
          title="Low Stock Items" 
          value={stats.lowStock} 
          icon={AlertTriangle} 
          color="bg-red-500"
          subtext="Products below 10 units"
        />
        <StatsCard 
          title="Completed Orders" 
          value={stats.completedToday} 
          icon={CheckCircle} 
          color="bg-green-500"
        />
      </div>
    </div>
  );
}