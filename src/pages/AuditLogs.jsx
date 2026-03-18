// src/pages/AuditLogs.jsx
import React, { useState } from 'react';
import AdminLogsViewer from '../components/AdminLogsViewer';
import SearchBar from '../components/common/SearchBar';

const ENTITY_OPTIONS = [
  { value: 'all', label: 'All Entities' },
  { value: 'order', label: 'Order' },
  { value: 'product', label: 'Product' },
  { value: 'rider', label: 'Rider' },
  { value: 'customer', label: 'Customer' },
  { value: 'system', label: 'System' }
];

export default function AuditLogs() {
  const [entityType, setEntityType] = useState('all');
  const [entityId, setEntityId] = useState('');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Audit Log</h2>
          <p className="text-sm text-gray-500 mt-1">View recent admin actions across the system.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Entity Type</label>
            <select
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#0033A0] outline-none"
            >
              {ENTITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Entity ID</label>
            <SearchBar
              onSearch={(value) => setEntityId(value)}
              placeholder="Search specific ID (e.g. 12)"
              className="w-full"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setEntityId('');
                setEntityType('all');
              }}
              className="w-full py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <p className="text-sm text-gray-500 mb-4 pb-4 border-b">
          {entityType === 'all' && !entityId 
            ? "Showing the most recent logs across all entities." 
            : `Filtered results for: ${entityType !== 'all' ? entityType.toUpperCase() : 'All Entities'}${entityId ? ` | ID: ${entityId}` : ''}`
          }
        </p>

        <AdminLogsViewer
          entityType={entityType}
          entityId={entityId}
          limit={100}
        />
      </div>
    </div>
  );
}