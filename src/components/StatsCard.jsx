// src/components/StatsCard.jsx
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function StatsCard({ title, value, icon: Icon, color, trend, trendValue, subtext }) {
  const { isDarkMode } = useTheme();
  
  return (
    <div className={`p-6 rounded-xl shadow-sm border hover:shadow-md transition-all duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'}`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{title}</p>
          <h3 className={`text-2xl font-bold mt-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{value}</h3>
        </div>
        <div className={`p-3 rounded-lg ${color} shadow-lg`}>
          <Icon size={24} className="text-white" />
        </div>
      </div>
      
      {(trend || subtext) && (
          <div className={`mt-4 pt-4 border-t ${isDarkMode ? 'border-slate-700' : 'border-gray-100'}`}>
          {trend && (
            <div className="flex items-center mb-1">
              {trend > 0 ? (
                <TrendingUp size={16} className={`${isDarkMode ? 'text-emerald-400' : 'text-emerald-500'} mr-1`} />
              ) : (
                <TrendingDown size={16} className={`${isDarkMode ? 'text-rose-400' : 'text-red-500'} mr-1`} />
              )}
              <span className={`text-sm font-semibold ${
                trend > 0 
                  ? (isDarkMode ? 'text-emerald-400' : 'text-emerald-600') 
                  : (isDarkMode ? 'text-rose-400' : 'text-rose-600')
              }`}>
                {trend > 0 ? '+' : ''}{trend}%
              </span>
              {trendValue && (
                <span className={`text-xs ml-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{trendValue}</span>
              )}
            </div>
          )}
          {subtext && (
            <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{subtext}</p>
          )}
        </div>
      )}
    </div>
  );
}