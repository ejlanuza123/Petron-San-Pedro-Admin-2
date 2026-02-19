import React from 'react';

export default function StatsCard({ title, value, icon: Icon, color, subtext }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between h-full">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <h3 className="text-2xl font-bold mt-2 text-gray-900">{value}</h3>
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon size={24} className="text-white" />
        </div>
      </div>
      {subtext && (
        <div className="mt-4 pt-4 border-t border-gray-50">
          <p className="text-xs text-gray-400">{subtext}</p>
        </div>
      )}
    </div>
  );
}