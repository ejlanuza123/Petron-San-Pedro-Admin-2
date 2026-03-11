import React, { useState, useEffect } from 'react';
import { useAdminLog } from '../hooks/useAdminLog';
import { supabase } from '../lib/supabase';

export default function AdminLogsViewer({ entityType = 'all', entityId, limit = 50 }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const { getLogsForEntity, getRecentLogs } = useAdminLog();

  useEffect(() => {
    let isMounted = true;

    const loadLogs = async () => {
      setLoading(true);

      let data = [];
      if (entityType === 'all') {
        data = await getRecentLogs(limit);
      } else {
        data = await getLogsForEntity(entityType, entityId, limit);
      }

      if (!isMounted) return;

      setLogs(data);
      setLoading(false);
    };

    loadLogs();

    const channel = supabase
      .channel('admin-logs-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_logs' }, () => {
        loadLogs();
      })
      .subscribe();

    return () => {
      isMounted = false;
      channel.unsubscribe();
    };
  }, [entityType, entityId, limit, getLogsForEntity, getRecentLogs]);

  const formatAction = (action) => {
    return action.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const [showSystemDetails, setShowSystemDetails] = useState(false);

  const SYSTEM_DETAIL_KEYS = ['url', 'userAgent', 'timestamp'];

  const getVisibleDetails = (details) => {
    if (!details) return {};
    if (showSystemDetails) return details;
    return Object.fromEntries(
      Object.entries(details).filter(([key]) => !SYSTEM_DETAIL_KEYS.includes(key))
    );
  };

  const getActionColor = (action) => {
    if (action.includes('create')) return 'text-green-600 bg-green-50';
    if (action.includes('update')) return 'text-blue-600 bg-blue-50';
    if (action.includes('delete')) return 'text-red-600 bg-red-50';
    if (action.includes('assign')) return 'text-purple-600 bg-purple-50';
    return 'text-gray-600 bg-gray-50';
  };

  const renderDetailValue = (value) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      if (Object.prototype.hasOwnProperty.call(value, 'from') && Object.prototype.hasOwnProperty.call(value, 'to')) {
        return (
          <span className="text-gray-700">
            {String(value.from)}
            <span className="mx-1">→</span>
            {String(value.to)}
          </span>
        );
      }
      return <pre className="whitespace-pre-wrap">{JSON.stringify(value, null, 2)}</pre>;
    }
    return String(value);
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-gray-500">
            Showing {logs.length} log{logs.length === 1 ? '' : 's'}
          </div>
          <label className="flex items-center gap-2 text-xs text-gray-500">
            <input
              type="checkbox"
              checked={showSystemDetails}
              onChange={(e) => setShowSystemDetails(e.target.checked)}
              className="h-4 w-4 text-[#0033A0] border-gray-300 rounded"
            />
            Show system metadata
          </label>
        </div>

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
              <>
                {(log.details?.changes && Object.keys(log.details.changes).length > 0) && (
                  <p className="text-xs text-gray-500 mb-2">
                    <span className="font-medium">Changed:</span> {Object.keys(log.details.changes).join(', ')}
                  </p>
                )}

                <details className="mt-2">
                  <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">
                    View details
                  </summary>
                  <div className="mt-2 text-xs bg-gray-50 p-2 rounded space-y-3">
                    {Object.entries(getVisibleDetails(log.details)).map(([key, value]) => (
                      <div key={key} className="space-y-1">
                        <div className="text-xs font-semibold text-gray-500">{key.replace(/_/g, ' ')}</div>
                        <div className="text-sm text-gray-700">
                          {renderDetailValue(value)}
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              </>
            )}
          </div>
        ))}
      </div>
  );
}
