// src/components/AdminLogsViewer.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function AdminLogsViewer({ entityType = 'all', entityId = '', limit = 50 }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSystemDetails, setShowSystemDetails] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadLogs = async () => {
      setLoading(true);

      try {
        // Build the query dynamically so both filters work together
        let query = supabase
          .from('admin_logs')
          .select(`
            *,
            admin:admin_id (
              id,
              full_name,
              email
            )
          `)
          .order('created_at', { ascending: false })
          .limit(limit);

        // Apply Entity Type filter if it's not 'all'
        if (entityType && entityType !== 'all') {
          query = query.eq('entity_type', entityType);
        }

        // Apply Entity ID filter if the user typed one
        if (entityId && entityId.trim() !== '') {
          query = query.eq('entity_id', entityId.trim());
        }

        const { data, error } = await query;
        if (error) throw error;

        if (isMounted) {
          setLogs(data || []);
        }
      } catch (error) {
        console.error('Error fetching logs:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadLogs();

    // Subscribe to real-time log updates
    const channel = supabase
      .channel('admin-logs-channel')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'admin_logs' }, () => {
        loadLogs();
      })
      .subscribe();

    return () => {
      isMounted = false;
      channel.unsubscribe();
    };
  }, [entityType, entityId, limit]);

  const formatAction = (action) => {
    return action.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const getActionColor = (action) => {
    if (action.includes('create')) return 'text-green-600 bg-green-50 border-green-200';
    if (action.includes('update')) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (action.includes('delete')) return 'text-red-600 bg-red-50 border-red-200';
    if (action.includes('assign')) return 'text-purple-600 bg-purple-50 border-purple-200';
    return 'text-gray-600 bg-gray-50 border-gray-200';
  };

  const SYSTEM_DETAIL_KEYS = ['description', 'timestamp', 'userAgent', 'url', 'riderId', 'deliveryId'];

  // Helper to render the Before & After table
  const renderChangesTable = (details) => {
    if (!details) return null;

    // Filter out system keys and find keys that have a { from, to } structure
    const changes = Object.entries(details).filter(([key, value]) => 
      !SYSTEM_DETAIL_KEYS.includes(key) && 
      value && typeof value === 'object' && 
      'from' in value && 'to' in value
    );

    if (changes.length === 0) return null;

    return (
      <div className="mt-3 border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-xs text-left">
          <thead className="bg-gray-50 text-gray-600 uppercase">
            <tr>
              <th className="px-3 py-2 font-medium">Field Updated</th>
              <th className="px-3 py-2 font-medium">Previous Value</th>
              <th className="px-3 py-2 font-medium">New Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {changes.map(([key, val]) => (
              <tr key={key}>
                <td className="px-3 py-2 font-medium text-gray-800 capitalize">
                  {key.replace(/_/g, ' ')}
                </td>
                <td className="px-3 py-2 text-red-600 bg-red-50/50">
                  {String(val.from || 'Empty/None')}
                </td>
                <td className="px-3 py-2 text-green-600 bg-green-50/50 font-medium">
                  {String(val.to || 'Empty/None')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0033A0] mx-auto"></div>
        <p className="text-sm text-gray-500 mt-2">Loading audit logs...</p>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200 dashed">
        <p className="text-gray-500 font-medium">No audit logs found for these filters.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sticky top-0 bg-white pb-2 z-10">
        <div className="text-xs font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
          Showing {logs.length} record{logs.length === 1 ? '' : 's'}
        </div>
        <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer hover:text-gray-900 transition-colors">
          <input
            type="checkbox"
            checked={showSystemDetails}
            onChange={(e) => setShowSystemDetails(e.target.checked)}
            className="h-4 w-4 text-[#0033A0] border-gray-300 rounded focus:ring-[#0033A0]"
          />
          Show raw system metadata
        </label>
      </div>

      <div className="space-y-4">
        {logs.map((log) => (
          <div key={log.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex flex-wrap justify-between items-start gap-2 mb-3">
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2.5 py-1 rounded-full border font-bold ${getActionColor(log.action)}`}>
                  {formatAction(log.action)}
                </span>
                <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  {log.entity_type.toUpperCase()} #{log.entity_id}
                </span>
              </div>
              <span className="text-xs text-gray-400 font-medium">
                {new Date(log.created_at).toLocaleString(undefined, {
                  dateStyle: 'medium',
                  timeStyle: 'short'
                })}
              </span>
            </div>

            <p className="text-sm text-gray-800 font-medium mb-1">
              {log.details?.description || `Admin performed ${formatAction(log.action)}`}
            </p>

            {log.admin && (
              <p className="text-xs text-gray-500 flex items-center mb-3">
                <span className="w-5 h-5 bg-[#0033A0] text-white rounded-full flex items-center justify-center text-[10px] mr-1.5">
                  {log.admin.full_name?.charAt(0)}
                </span>
                {log.admin.full_name} ({log.admin.email})
              </p>
            )}

            {/* Render the clear Before/After table */}
            {renderChangesTable(log.details)}

            {/* Raw Metadata Details Dropdown */}
            {showSystemDetails && log.details && (
              <div className="mt-3 text-xs bg-slate-50 border border-slate-200 p-3 rounded-lg overflow-x-auto">
                <p className="font-semibold text-slate-500 mb-2 uppercase tracking-wider text-[10px]">Raw System Payload</p>
                <pre className="text-slate-700 whitespace-pre-wrap">
                  {JSON.stringify(log.details, null, 2)}
                </pre>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}