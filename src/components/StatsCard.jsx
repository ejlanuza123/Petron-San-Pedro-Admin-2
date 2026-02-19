// src/components/StatsCard.jsx
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function StatsCard({ title, value, icon: Icon, color, trend, trendValue, subtext }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <h3 className="text-2xl font-bold mt-1 text-gray-900">{value}</h3>
        </div>
        <div className={`p-3 rounded-lg ${color} shadow-lg`}>
          <Icon size={24} className="text-white" />
        </div>
      </div>
      
      {(trend || subtext) && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          {trend && (
            <div className="flex items-center mb-1">
              {trend > 0 ? (
                <TrendingUp size={16} className="text-green-500 mr-1" />
              ) : (
                <TrendingDown size={16} className="text-red-500 mr-1" />
              )}
              <span className={`text-sm font-medium ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {trend > 0 ? '+' : ''}{trend}%
              </span>
              {trendValue && (
                <span className="text-xs text-gray-500 ml-2">{trendValue}</span>
              )}
            </div>
          )}
          {subtext && (
            <p className="text-xs text-gray-400">{subtext}</p>
          )}
        </div>
      )}
    </div>
  );
}