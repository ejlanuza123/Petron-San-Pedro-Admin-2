import React, { useState, useEffect } from 'react';
import { useAdminLog } from '../hooks/useAdminLog';

export default function AdminLogsViewer({ entityType = 'all', entityId, limit = 50 }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const { getLogsForEntity, getRecentLogs } = useAdminLog();

  useEffect(() => {
    loadLogs();
  }, [entityType, entityId]);

  const loadLogs = async () => {
    setLoading(true);

    let data = [];
    if (entityType === 'all') {
      data = await getRecentLogs(limit);
    } else {
      data = await getLogsForEntity(entityType, entityId, limit);
    }

    setLogs(data);
    setLoading(false);
  };

  const formatAction = (action) => {
    return action.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const getActionColor = (action) => {
    if (action.includes('create')) return 'text-green-600 bg-green-50';
    if (action.includes('update')) return 'text-blue-600 bg-blue-50';
    if (action.includes('delete')) return 'text-red-600 bg-red-50';
    if (action.includes('assign')) return 'text-purple-600 bg-purple-50';
    return 'text-gray-600 bg-gray-50';
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#0033A0] mx-auto"></div>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No logs found for this entity
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
      {logs.map((log) => (
        <div key={log.id} className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="flex justify-between items-start mb-2">
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${getActionColor(log.action)}`}>
              {formatAction(log.action)}
            </span>
            <span className="text-xs text-gray-400">
              {new Date(log.created_at).toLocaleString()}
            </span>
          </div>

          <p className="text-sm text-gray-700 mb-2">
            {log.details?.description || `${formatAction(log.action)} performed on ${log.entity_type}`}
          </p>

          {log.admin && (
            <p className="text-xs text-gray-500 flex items-center">
              <span className="font-medium mr-1">By:</span> {log.admin.full_name}
            </p>
          )}

          {log.details && Object.keys(log.details).length > 0 && (
            <details className="mt-2">
              <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">
                View details
              </summary>
              <pre className="mt-2 text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                {JSON.stringify(log.details, null, 2)}
              </pre>
            </details>
          )}
        </div>
      ))}
    </div>
  );
}
