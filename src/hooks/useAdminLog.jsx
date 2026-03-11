// admin-web/src/hooks/useAdminLog.jsx
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export const useAdminLog = () => {
  const { user } = useAuth();

  const logAction = useCallback(async ({
    action,
    entityType,
    entityId,
    details = {},
    description = ''
  }) => {
    if (!user?.id) {
      console.warn('Cannot log action: No admin user found');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('admin_logs')
        .insert({
          admin_id: user.id,
          action,
          entity_type: entityType,
          entity_id: entityId?.toString(),
          details: {
            ...details,
            description,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
          },
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      
      console.log(`[Admin Log] ${action} - ${entityType}:${entityId}`);
      return data;
    } catch (error) {
      console.error('Error logging admin action:', error);
      // Don't throw - logging should not break the main action
      return null;
    }
  }, [user]);

  const logOrderAction = useCallback(async (orderId, action, details = {}, description = '') => {
    return logAction({
      action,
      entityType: 'order',
      entityId: orderId,
      details,
      description
    });
  }, [logAction]);

  const logProductAction = useCallback(async (productId, action, details = {}, description = '') => {
    return logAction({
      action,
      entityType: 'product',
      entityId: productId,
      details,
      description
    });
  }, [logAction]);

  const logRiderAction = useCallback(async (riderId, action, details = {}, description = '') => {
    return logAction({
      action,
      entityType: 'rider',
      entityId: riderId,
      details,
      description
    });
  }, [logAction]);

  const logCustomerAction = useCallback(async (customerId, action, details = {}, description = '') => {
    return logAction({
      action,
      entityType: 'customer',
      entityId: customerId,
      details,
      description
    });
  }, [logAction]);

  const logSystemAction = useCallback(async (action, details = {}, description = '') => {
    return logAction({
      action,
      entityType: 'system',
      entityId: 'system',
      details,
      description
    });
  }, [logAction]);

  const getLogsForEntity = useCallback(async (entityType, entityId, limit = 50) => {
    try {
      const { data, error } = await supabase
        .from('admin_logs')
        .select(`
          *,
          admin:admin_id (
            id,
            full_name,
            email
          )
        `)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId?.toString())
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching admin logs:', error);
      return [];
    }
  }, []);

  const getRecentLogs = useCallback(async (limit = 100) => {
    try {
      const { data, error } = await supabase
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

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching recent logs:', error);
      return [];
    }
  }, []);

  const getLogsByAdmin = useCallback(async (adminId, limit = 50) => {
    try {
      const { data, error } = await supabase
        .from('admin_logs')
        .select('*')
        .eq('admin_id', adminId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching admin logs:', error);
      return [];
    }
  }, []);

  return {
    logAction,
    logOrderAction,
    logProductAction,
    logRiderAction,
    logCustomerAction,
    logSystemAction,
    getLogsForEntity,
    getRecentLogs,
    getLogsByAdmin
  };
};

// Create a component to display logs (optional)
export const AdminLogsViewer = ({ entityType, entityId, limit = 50 }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const { getLogsForEntity } = useAdminLog();

  useEffect(() => {
    loadLogs();
  }, [entityType, entityId]);

  const loadLogs = async () => {
    setLoading(true);
    const data = await getLogsForEntity(entityType, entityId, limit);
    setLogs(data);
    setLoading(false);
  };

  const formatAction = (action) => {
    return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
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
};