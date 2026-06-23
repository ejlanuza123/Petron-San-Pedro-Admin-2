// src/components/AdminLogsViewer.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function AdminLogsViewer({ entityType = 'all', entityId = '', startDate = '', endDate = '', limit = 50 }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [showSystemDetails, setShowSystemDetails] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [riderNameById, setRiderNameById] = useState({});
  const [productNameById, setProductNameById] = useState({});

  const safeLimit = Math.min(Math.max(Number(limit) || 50, 10), 100);
  const totalPages = Math.max(1, Math.ceil(totalCount / safeLimit));

  useEffect(() => {
    setCurrentPage(1);
  }, [entityType, entityId, startDate, endDate, safeLimit]);

  useEffect(() => {
    let isMounted = true;

    const loadLogs = async () => {
      setLoading(true);

      try {
        const start = (currentPage - 1) * safeLimit;
        const end = start + safeLimit - 1;
        const startDateIso = startDate ? new Date(`${startDate}T00:00:00`).toISOString() : null;
        const endDateIso = endDate ? new Date(`${endDate}T23:59:59.999`).toISOString() : null;

        // Build the base query so count and rows use identical filters.
        let baseQuery = supabase.from('admin_logs').select('*', { count: 'exact', head: true });

        if (entityType && entityType !== 'all') {
          baseQuery = baseQuery.eq('entity_type', entityType);
        }

        if (entityId && entityId.trim() !== '') {
          baseQuery = baseQuery.eq('entity_id', entityId.trim());
        }

        if (startDateIso) {
          baseQuery = baseQuery.gte('created_at', startDateIso);
        }

        if (endDateIso) {
          baseQuery = baseQuery.lte('created_at', endDateIso);
        }

        const { count, error: countError } = await baseQuery;
        if (countError) throw countError;

        if (isMounted) {
          setTotalCount(count || 0);
        }

        // Build row query dynamically so both filters work together
        let rowQuery = supabase
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
          .range(start, end);

        if (entityType && entityType !== 'all') {
          rowQuery = rowQuery.eq('entity_type', entityType);
        }

        if (entityId && entityId.trim() !== '') {
          rowQuery = rowQuery.eq('entity_id', entityId.trim());
        }

        if (startDateIso) {
          rowQuery = rowQuery.gte('created_at', startDateIso);
        }

        if (endDateIso) {
          rowQuery = rowQuery.lte('created_at', endDateIso);
        }

        const { data, error } = await rowQuery;
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
  }, [entityType, entityId, startDate, endDate, safeLimit, currentPage]);

  // Resolve rider names for logs that contain rider ids in `details` OR as the entity itself
  useEffect(() => {
    let isMounted = true;

    const extractRiderIds = (log) => {
      const ids = [];

      // 1) Rider id stored inside details
      const details = log?.details || {};
      const riderId = details?.riderId;
      if (typeof riderId === 'string' && riderId.trim()) ids.push(riderId.trim());

      const riderIdObj = details?.rider_id;
      if (riderIdObj && typeof riderIdObj === 'object') {
        if (typeof riderIdObj?.to === 'string' && riderIdObj.to.trim()) ids.push(riderIdObj.to.trim());
        if (typeof riderIdObj?.from === 'string' && riderIdObj.from.trim()) ids.push(riderIdObj.from.trim());
      }

      // 2) Rider id stored as the log entity_id
      if (log?.entity_type === 'rider' && log?.entity_id) {
        const entityId = String(log.entity_id).trim();
        if (entityId) ids.push(entityId);
      }

      return ids;
    };

    const resolveRiderNames = async () => {
      try {
        const uniqueRiderIds = Array.from(
          new Set((logs || []).flatMap(extractRiderIds).filter(Boolean))
        );

        if (uniqueRiderIds.length === 0) {
          if (isMounted) setRiderNameById({});
          return;
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', uniqueRiderIds);

        if (error) throw error;

        const map = {};
        (data || []).forEach((p) => {
          map[p.id] = p.full_name || '';
        });

        if (isMounted) setRiderNameById(map);
      } catch (error) {
        console.error('Error resolving rider names:', error);
        if (isMounted) setRiderNameById({});
      }
    };

    resolveRiderNames();

    return () => {
      isMounted = false;
    };
  }, [logs]);

  // Resolve product names for logs where entity_type === 'product'
  useEffect(() => {
    let isMounted = true;

    const resolveProductNames = async () => {
      try {
        const productIds = (logs || [])
          .filter((l) => l?.entity_type === 'product' && l?.entity_id)
          .map((l) => String(l.entity_id).trim())
          .filter(Boolean);

        const uniqueProductIds = Array.from(new Set(productIds));

        if (uniqueProductIds.length === 0) {
          if (isMounted) setProductNameById({});
          return;
        }

        const { data, error } = await supabase
          .from('products')
          .select('id, name')
          .in('id', uniqueProductIds);

        if (error) throw error;

        const map = {};
        (data || []).forEach((p) => {
          map[p.id] = p.name;
        });

        if (isMounted) setProductNameById(map);
      } catch (error) {
        console.error('Error resolving product names:', error);
        if (isMounted) setProductNameById({});
      }
    };

    resolveProductNames();

    return () => {
      isMounted = false;
    };
  }, [logs]);

  // Resolve "cancelled by" (cancelled_by) ids found inside the audit diff `details`
  useEffect(() => {
    let isMounted = true;

    const extractCancelledByIds = (log) => {
      const ids = [];
      const details = log?.details || {};

      // expected diff key for orders: cancelled_by and contains { from, to }
      const cancelledBy = details?.cancelled_by;

      const collectVal = (v) => {
        if (typeof v !== 'string') return;
        const t = v.trim();
        if (t) ids.push(t);
      };

      if (cancelledBy && typeof cancelledBy === 'object') {
        collectVal(cancelledBy?.from);
        collectVal(cancelledBy?.to);
      }

      // safety for alternate keys (if backend used different label casing)
      const cancelledByAlt = details?.cancelledBy || details?.cancelledById;
      if (cancelledByAlt && typeof cancelledByAlt === 'object') {
        collectVal(cancelledByAlt?.from);
        collectVal(cancelledByAlt?.to);
      } else {
        collectVal(details?.cancelled_by);
      }

      return ids;
    };

    const resolveCancelledByNames = async () => {
      try {
        const uniqueIds = Array.from(
          new Set((logs || []).flatMap(extractCancelledByIds).filter(Boolean))
        );

        if (uniqueIds.length === 0) return;

        // `cancelled_by` can be any profile role (admin/customer/rider). Use profiles.
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', uniqueIds);

        if (error) throw error;

        // Merge into riderNameById cache so we can reuse decorateRiderIdValue
        const map = {};
        (data || []).forEach((p) => {
          map[p.id] = p.full_name || '';
        });

        if (isMounted) {
          setRiderNameById((prev) => ({ ...(prev || {}), ...(map || {}) }));
        }
      } catch (error) {
        console.error('Error resolving cancelled_by names:', error);
      }
    };

    resolveCancelledByNames();

    return () => {
      isMounted = false;
    };
  }, [logs]);

  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  const handlePrevPage = () => {
    if (canGoPrev) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const handleNextPage = () => {
    if (canGoNext) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const exportFilteredLogs = async () => {
    try {
      setExporting(true);

      const startDateIso = startDate ? new Date(`${startDate}T00:00:00`).toISOString() : null;
      const endDateIso = endDate ? new Date(`${endDate}T23:59:59.999`).toISOString() : null;

      let exportQuery = supabase
        .from('admin_logs')
        .select(`
          id,
          action,
          entity_type,
          entity_id,
          admin_id,
          details,
          created_at
        `)
        .order('created_at', { ascending: false })
        .range(0, 1999);

      if (entityType && entityType !== 'all') {
        exportQuery = exportQuery.eq('entity_type', entityType);
      }

      if (entityId && entityId.trim() !== '') {
        exportQuery = exportQuery.eq('entity_id', entityId.trim());
      }

      if (startDateIso) {
        exportQuery = exportQuery.gte('created_at', startDateIso);
      }

      if (endDateIso) {
        exportQuery = exportQuery.lte('created_at', endDateIso);
      }

      const { data, error } = await exportQuery;
      if (error) throw error;

      const rows = data || [];
      if (!rows.length) {
        return;
      }

      const headers = ['id', 'created_at', 'action', 'entity_type', 'entity_id', 'admin_id', 'details'];
      const csvBody = rows.map((row) => ([
        row.id,
        row.created_at,
        row.action,
        row.entity_type,
        row.entity_id,
        row.admin_id,
        JSON.stringify(row.details || {})
      ].map((value) => {
        const text = String(value ?? '');
        return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
      }).join(',')));

      const csvContent = [headers.join(','), ...csvBody].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateLabel = new Date().toISOString().slice(0, 10);

      link.href = url;
      link.download = `audit-logs-${dateLabel}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting logs:', error);
    } finally {
      setExporting(false);
    }
  };

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
  const renderChangesTable = (details, riderNameByIdLocal = {}) => {
    if (!details) return null;

    // Filter out system keys and find keys that have a { from, to } structure
    const changes = Object.entries(details).filter(
      ([key, value]) =>
        !SYSTEM_DETAIL_KEYS.includes(key) &&
        value &&
        typeof value === 'object' &&
        'from' in value &&
        'to' in value
    );

    if (changes.length === 0) return null;

    const decorateRiderIdValue = (rawValue) => {
      const v = typeof rawValue === 'string' ? rawValue.trim() : '';
      if (!v) return 'Empty/None';
      const name = riderNameByIdLocal?.[v];
      return name ? `${v} (${name})` : v;
    };

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
            {changes.map(([key, val]) => {
              const isRiderIdField =
                key === 'rider id' ||
                key === 'rider_id' ||
                key === 'riderId';

              const isCancelledByField =
                key === 'cancelled_by' ||
                key === 'cancelled by' ||
                key === 'cancelledBy' ||
                key === 'cancelledById';

              const shouldDecorateAsProfileId = isRiderIdField || isCancelledByField;

              return (
                <tr key={key}>
                  <td className="px-3 py-2 font-medium text-gray-800 capitalize">
                    {key.replace(/_/g, ' ')}
                  </td>
                  <td className="px-3 py-2 text-red-600 bg-red-50/50">
                    {shouldDecorateAsProfileId
                      ? decorateRiderIdValue(val.from)
                      : String(val.from || 'Empty/None')}
                  </td>
                  <td className="px-3 py-2 text-green-600 bg-green-50/50 font-medium">
                    {shouldDecorateAsProfileId
                      ? decorateRiderIdValue(val.to)
                      : String(val.to || 'Empty/None')}
                  </td>
                </tr>
              );
            })}
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
          Showing {logs.length} of {totalCount} record{totalCount === 1 ? '' : 's'}
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

      <div className="flex items-center justify-end gap-2 text-xs">
        <button
          type="button"
          onClick={exportFilteredLogs}
          disabled={exporting || loading || logs.length === 0}
          className="px-3 py-1.5 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {exporting ? 'Exporting...' : 'Export CSV'}
        </button>
        <span className="text-gray-500">Page {currentPage} of {totalPages}</span>
        <button
          type="button"
          onClick={handlePrevPage}
          disabled={!canGoPrev}
          className="px-3 py-1.5 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={handleNextPage}
          disabled={!canGoNext}
          className="px-3 py-1.5 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next
        </button>
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
                  {log.entity_type === 'rider' && riderNameById?.[log.entity_id]
                    ? ` (${riderNameById[log.entity_id]})`
                    : ''}
                  {log.entity_type === 'product' && productNameById?.[log.entity_id]
                    ? ` (${productNameById[log.entity_id]})`
                    : ''}
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
              {(() => {
                const details = log.details || {};
                const description = details?.description;

                const riderNameFromDetails =
                  details?.rider_name ||
                  details?.riderName ||
                  details?.rider_full_name ||
                  details?.riderFullName ||
                  (details?.rider && (details?.rider.full_name || details?.rider.name)) ||
                  (details?.rider && details?.rider.fullName) ||
                  '';

                // Prefer rider id found in `details` so we can resolve from `profiles` cache
                const riderIdFromDetails =
                  (typeof details?.riderId === 'string' && details.riderId.trim())
                    ? details.riderId.trim()
                    : (typeof details?.rider_id?.to === 'string' && details.rider_id.to.trim())
                      ? details.rider_id.to.trim()
                      : (typeof details?.rider_id?.from === 'string' && details.rider_id.from.trim())
                        ? details.rider_id.from.trim()
                        : (
                          // fallback for common alternate keys
                          (typeof details?.rider_uuid === 'string' && details.rider_uuid.trim())
                            ? details.rider_uuid.trim()
                            : (
                              (typeof details?.riderUuid === 'string' && details.riderUuid.trim())
                                ? details.riderUuid.trim()
                                : ''
                            )
                        );

                // Also allow rider name when the rider UUID is the entity itself
                const riderIdFromEntity =
                  log?.entity_type === 'rider' && log?.entity_id
                    ? String(log.entity_id).trim()
                    : '';

                const riderId = riderIdFromDetails || riderIdFromEntity;

                const riderNameFromDb = riderId ? (riderNameById?.[riderId] || '') : '';
                const riderName = riderNameFromDetails || riderNameFromDb;

                const riderNameSuffix = riderName ? ` (${riderName})` : '';
                const actionText = formatAction(log.action);

                if (description) {
                  // If backend already embedded the name in description, don't duplicate it.
                  if (riderName && !description.toLowerCase().includes(String(riderName).toLowerCase())) {
                    return `${description}${riderNameSuffix}`;
                  }
                  return description;
                }

                return `Admin performed ${actionText}${riderNameSuffix}`;
              })()}
            </p>

            {log.admin && (
              <p className="text-xs text-gray-500 flex items-center mb-3">
                <span className="w-5 h-5 bg-[#0033A0] text-white rounded-full flex items-center justify-center text-[10px] mr-1.5">
                  {(log.admin.full_name || log.admin.id || '?').charAt(0)}
                </span>
                {log.admin.full_name || log.admin.id} ({log.admin.email})
              </p>
            )}
            {!log.admin && (
              <p className="text-xs text-gray-500 mb-3">
                Admin: {log.admin_id || 'Unknown'}
              </p>
            )}

            {/* Render the clear Before/After table */}
            {renderChangesTable(log.details, riderNameById)}

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