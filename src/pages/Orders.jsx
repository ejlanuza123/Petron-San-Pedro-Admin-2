// src/pages/Orders.jsx
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { 
  Eye, 
  ChevronDown, 
  Truck, 
  User, 
  MapPin, 
  Phone,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  RefreshCw,
  AlertCircle,
  UserPlus
} from 'lucide-react';
import OrderModal from '../components/OrderModal';
import AssignRiderModal from '../components/AssignRiderModal';
import RiderTrackingModal from '../components/RiderTrackingModal';
import ErrorAlert from '../components/common/ErrorAlert';
import EmptyState from '../components/common/EmptyState';
import SearchBar from '../components/common/SearchBar';
import Pagination from '../components/common/Pagination';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { useOrders } from '../hooks/useOrders';
import { ORDER_STATUS, ORDER_STATUS_COLORS, CANCELLATION_REASONS } from '../utils/constants';
import { formatCurrency, formatDate, formatPhoneNumber } from '../utils/formatters';
import { supabase } from '../lib/supabase';
import DeliveryTrackingMap from '../components/DeliveryTrackingMap';
import { useAuth } from '../hooks/useAuth';
import { useLocation, useNavigate } from 'react-router-dom';

// Skeleton Components
const TableRowSkeleton = () => (
  <tr className="animate-pulse">
    <td className="px-6 py-4"><div className="h-4 w-16 bg-gray-200 rounded"></div></td>
    <td className="px-6 py-4"><div className="h-4 w-32 bg-gray-200 rounded"></div></td>
    <td className="px-6 py-4"><div className="h-4 w-24 bg-gray-200 rounded"></div></td>
    <td className="px-6 py-4"><div className="h-6 w-20 bg-gray-200 rounded-full"></div></td>
    <td className="px-6 py-4"><div className="h-4 w-20 bg-gray-200 rounded"></div></td>
    <td className="px-6 py-4"><div className="h-4 w-24 bg-gray-200 rounded"></div></td>
    <td className="px-6 py-4"><div className="h-8 w-32 bg-gray-200 rounded"></div></td>
  </tr>
);

export default function Orders() {
  const location = useLocation();
  const navigate = useNavigate();
  const handledFocusNonceRef = useRef(null);
  const { user } = useAuth();
  const { orders, loading, error, clearError, selectedOrder, setSelectedOrder, updateStatus, updateDeliveryFee, viewOrderDetails } = useOrders();
  const [filter, setFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingStatusUpdate, setPendingStatusUpdate] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [selectedOrderForAction, setSelectedOrderForAction] = useState(null);
  const [deliveryDetails, setDeliveryDetails] = useState(null);
  const [availableRiders, setAvailableRiders] = useState([]);
  const [showRiderFilter, setShowRiderFilter] = useState(false);
  const [selectedRider, setSelectedRider] = useState('all');
  const [deliveryInfoMap, setDeliveryInfoMap] = useState({});
  const [deliveryInfoLoading, setDeliveryInfoLoading] = useState(true);
  const [showTrackingMap, setShowTrackingMap] = useState(false);
  const [selectedDeliveryForMap, setSelectedDeliveryForMap] = useState(null);
  const [showCancellationDialog, setShowCancellationDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState(CANCELLATION_REASONS[0]);
  const [cancelNote, setCancelNote] = useState('');
  const [statusActionError, setStatusActionError] = useState('');

  useEffect(() => {
    const focusOrderId = Number(location.state?.focusOrderId);
    const focusNonce = location.state?.focusNonce;
    if (!Number.isFinite(focusOrderId) || !focusNonce) return;
    if (handledFocusNonceRef.current === focusNonce) return;

    handledFocusNonceRef.current = focusNonce;
    viewOrderDetails(focusOrderId);

    navigate(location.pathname, { replace: true, state: {} });
  }, [location.pathname, location.state?.focusNonce, location.state?.focusOrderId, navigate, viewOrderDetails]);

  // Fetch available riders
  useEffect(() => {
    fetchAvailableRiders();
  }, []);

  const handleOpenTrackingMap = (order) => {
    // Find the delivery ID for this order
    const deliveryInfo = deliveryInfoMap[order.id];
    if (deliveryInfo) {
      setSelectedDeliveryForMap({
        deliveryId: deliveryInfo.id,
        orderId: order.id
      });
      setShowTrackingMap(true);
    }
  };

  const fetchAvailableRiders = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, phone_number, vehicle_type, vehicle_plate, is_active')
        .eq('role', 'rider')
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;
      setAvailableRiders(data || []);
    } catch (err) {
      console.error('Error fetching riders:', err);
    }
  };

  const fetchDeliveryInfoForOrders = useCallback(async (orderIds) => {
    if (!orderIds?.length) return {};

    try {
      const { data, error } = await supabase
        .from('deliveries')
        .select('id, order_id, rider_id, status, assigned_at')
        .in('order_id', orderIds)
        .order('assigned_at', { ascending: false });

      if (error) throw error;

      const latestByOrder = {};
      for (const delivery of data || []) {
        if (!latestByOrder[delivery.order_id]) {
          latestByOrder[delivery.order_id] = delivery;
        }
      }

      return latestByOrder;
    } catch (err) {
      console.error('Error fetching delivery info:', err);
      return {};
    }
  }, []);

  useEffect(() => {
    const subscription = supabase
      .channel('deliveries-channel')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'deliveries' },
        async (payload) => {
          const orderId = payload.new?.order_id || payload.old?.order_id;
          if (!orderId) return;

          const latestInfo = await fetchDeliveryInfoForOrders([orderId]);
          setDeliveryInfoMap(prev => ({
            ...prev,
            [orderId]: latestInfo[orderId] || null
          }));
        }
      )
      .subscribe();

    return () => subscription.unsubscribe();
}, [fetchDeliveryInfoForOrders]);

  // Handle assign rider click
  const handleAssignRider = (order) => {
    setSelectedOrderForAction(order);
    setShowAssignModal(true);
  };

  // Get delivery status color
  const getDeliveryStatusColor = (status) => {
    switch(status) {
      case 'assigned': return 'bg-yellow-100 text-yellow-800';
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'picked_up': return 'bg-blue-100 text-blue-800';
      case 'out_for_delivery': return 'bg-indigo-100 text-indigo-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'declined': return 'bg-red-100 text-red-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Memoized filtered orders
  const filteredOrders = useMemo(() => {
    let filtered = orders;
    
    if (filter !== 'All') {
      filtered = filtered.filter(o => o.status === filter);
    }
    
    if (selectedRider !== 'all') {
      // Filter by rider - we'll need to check deliveries
      // This is simplified - in production you'd want to join in the query
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(o => 
        o.id.toString().includes(query) ||
        o.profiles?.full_name?.toLowerCase().includes(query) ||
        o.delivery_address?.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [orders, filter, searchQuery, selectedRider]);

  // Memoized pagination
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredOrders.slice(start, start + itemsPerPage);
  }, [filteredOrders, currentPage, itemsPerPage]);

  // whenever the current page of orders changes, prefetch their delivery info
  useEffect(() => {
    const fetchAllDeliveryInfo = async () => {
      setDeliveryInfoLoading(true);
      const orderIds = paginatedOrders.map(order => order.id);
      const latestByOrder = await fetchDeliveryInfoForOrders(orderIds);

      const infoMap = {};
      for (const orderId of orderIds) {
        infoMap[orderId] = latestByOrder[orderId] || null;
      }

      setDeliveryInfoMap(infoMap);
      setDeliveryInfoLoading(false);
    };

    if (paginatedOrders.length > 0) {
      fetchAllDeliveryInfo();
    } else {
      setDeliveryInfoLoading(false);
    }
  }, [paginatedOrders, fetchDeliveryInfoForOrders]);

  // Handle rider assigned
  const handleRiderAssigned = useCallback(() => {
    setShowAssignModal(false);
    setSelectedOrderForAction(null);
    
    // Refresh the delivery info for all orders
    const refreshDeliveryInfo = async () => {
      const orderIds = paginatedOrders.map(order => order.id);
      const latestByOrder = await fetchDeliveryInfoForOrders(orderIds);
      const infoMap = {};
      for (const orderId of orderIds) {
        infoMap[orderId] = latestByOrder[orderId] || null;
      }
      setDeliveryInfoMap(infoMap);
    };
    
    refreshDeliveryInfo();
  }, [paginatedOrders, fetchDeliveryInfoForOrders]);

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);

  // Memoized stats
  const stats = useMemo(() => ({
    total: orders.length,
    pending: orders.filter(o => o.status === ORDER_STATUS.PENDING).length,
    processing: orders.filter(o => o.status === ORDER_STATUS.PROCESSING).length,
    riderPickedUp: orders.filter(o => o.status === ORDER_STATUS.RIDER_PICKED_UP).length,
    outForDelivery: orders.filter(o => o.status === ORDER_STATUS.OUT_FOR_DELIVERY).length,
    completed: orders.filter(o => o.status === ORDER_STATUS.COMPLETED).length,
    cancelled: orders.filter(o => o.status === ORDER_STATUS.CANCELLED).length
  }), [orders]);

  const handleStatusUpdate = useCallback((orderId, newStatus) => {
    setStatusActionError('');

    if (newStatus === ORDER_STATUS.CANCELLED) {
      setPendingStatusUpdate({ orderId, newStatus });
      setShowCancellationDialog(true);
      return;
    }

    setPendingStatusUpdate({ orderId, newStatus });
    setShowConfirmDialog(true);
  }, []);

  const checkOrderHasProof = useCallback(async (orderId) => {
    const { data: deliveries, error: deliveryError } = await supabase
      .from('deliveries')
      .select('id')
      .eq('order_id', orderId);

    if (deliveryError) throw deliveryError;
    const deliveryIds = (deliveries || []).map((d) => d.id);
    if (!deliveryIds.length) return false;

    const { count, error: proofError } = await supabase
      .from('delivery_proofs')
      .select('*', { count: 'exact', head: true })
      .in('delivery_id', deliveryIds);

    if (proofError) throw proofError;
    return (count || 0) > 0;
  }, []);

  const handleDeliveryFeeChange = useCallback(async (orderId, newFee) => {
    try {
      await updateDeliveryFee(orderId, newFee);
      // Refresh selected order details if currently viewed
      if (selectedOrder?.id === orderId) {
        viewOrderDetails(orderId);
      }
    } catch {
      // Error is handled by hook
    }
  }, [updateDeliveryFee, selectedOrder, viewOrderDetails]);

  const confirmStatusUpdate = useCallback(async () => {
    if (pendingStatusUpdate) {
      try {
        if (pendingStatusUpdate.newStatus === ORDER_STATUS.COMPLETED) {
          const hasProof = await checkOrderHasProof(pendingStatusUpdate.orderId);
          if (!hasProof) {
            setStatusActionError('Cannot mark as Completed without at least one delivery proof photo. Ask rider to upload proof first.');
            setShowConfirmDialog(false);
            setPendingStatusUpdate(null);
            return;
          }
        }

        await updateStatus(pendingStatusUpdate.orderId, pendingStatusUpdate.newStatus);
        setShowConfirmDialog(false);
        setPendingStatusUpdate(null);
      } catch {
        // Error is handled by hook
      }
    }
  }, [pendingStatusUpdate, updateStatus, checkOrderHasProof]);

  const confirmCancellation = useCallback(async () => {
    if (!pendingStatusUpdate) return;

    try {
      await updateStatus(pendingStatusUpdate.orderId, ORDER_STATUS.CANCELLED, {
        cancellationReason: cancelReason,
        cancellationNote: cancelNote,
        cancelledBy: user?.id || null
      });

      setShowCancellationDialog(false);
      setPendingStatusUpdate(null);
      setCancelReason(CANCELLATION_REASONS[0]);
      setCancelNote('');
    } catch {
      // Error is handled by hook
    }
  }, [pendingStatusUpdate, updateStatus, cancelReason, cancelNote, user?.id]);

  const handleSearch = useCallback((query) => {
    setSearchQuery(query);
    setCurrentPage(1);
  }, []);

  const handleFilterChange = useCallback((e) => {
    setFilter(e.target.value);
    setCurrentPage(1);
  }, []);

  const handleRiderFilterChange = useCallback((e) => {
    setSelectedRider(e.target.value);
    setCurrentPage(1);
  }, []);

  const handlePageChange = useCallback((page) => {
    setCurrentPage(page);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setCurrentPage(1);
  }, []);

  const closeDialogs = useCallback(() => {
    setShowConfirmDialog(false);
    setShowCancellationDialog(false);
    setPendingStatusUpdate(null);
    setCancelReason(CANCELLATION_REASONS[0]);
    setCancelNote('');
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse"></div>
          <div className="flex gap-4">
            <div className="h-10 w-20 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-10 w-20 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="bg-white p-4 rounded-lg border border-gray-200 animate-pulse">
              <div className="h-4 w-20 bg-gray-200 rounded mb-2"></div>
              <div className="h-8 w-16 bg-gray-300 rounded"></div>
            </div>
          ))}
        </div>

        {/* Filters Skeleton */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 h-12 bg-gray-200 rounded animate-pulse"></div>
          <div className="w-48 h-12 bg-gray-200 rounded animate-pulse"></div>
          <div className="w-48 h-12 bg-gray-200 rounded animate-pulse"></div>
        </div>

        {/* Table Skeleton */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {[1,2,3,4,5,6,7].map(i => (
                  <th key={i} className="px-6 py-4"><div className="h-4 w-20 bg-gray-200 rounded"></div></th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {[1,2,3,4,5].map(i => <TableRowSkeleton key={i} />)}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Order Management</h2>
        
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <RefreshCw size={18} />
          Refresh
        </button>
      </div>

      {(error || statusActionError) && <ErrorAlert message={error || statusActionError} onDismiss={() => { clearError(); setStatusActionError(''); }} />}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-500">Total Orders</p>
          <p className="text-2xl font-bold text-[#0033A0]">{stats.total}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-500">Pending</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-500">Processing</p>
          <p className="text-2xl font-bold text-blue-600">{stats.processing}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-500">Rider Picked Up</p>
          <p className="text-2xl font-bold text-sky-600">{stats.riderPickedUp}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-500">Out for Delivery</p>
          <p className="text-2xl font-bold text-purple-600">{stats.outForDelivery}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-500">Completed</p>
          <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <SearchBar 
          onSearch={handleSearch}
          placeholder="Search orders by ID, customer, or address..."
          className="flex-1"
        />
        
        <select
          value={filter}
          onChange={handleFilterChange}
          className="bg-white border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#0033A0] outline-none"
        >
          <option value="All">All Status</option>
          {Object.values(ORDER_STATUS).map(status => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>

        <button
          onClick={() => setShowRiderFilter(!showRiderFilter)}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <Filter size={18} />
          Filter by Rider
        </button>
      </div>

      {/* Rider Filter Dropdown */}
      {showRiderFilter && (
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <select
            value={selectedRider}
            onChange={handleRiderFilterChange}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#0033A0] outline-none"
          >
            <option value="all">All Riders</option>
            {availableRiders.map(rider => (
              <option key={rider.id} value={rider.id}>
                {rider.full_name} - {rider.vehicle_type}
              </option>
            ))}
          </select>
        </div>
      )}

      {filteredOrders.length === 0 ? (
        <EmptyState 
          type="orders"
          message={searchQuery ? "No orders match your search" : "No orders found"}
          action={searchQuery ? {
            label: "Clear Search",
            onClick: clearSearch
          } : undefined}
        />
      ) : (
        <>
          {/* Orders Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Order #</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Rider</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedOrders.map((order) => {
                  const deliveryInfo = deliveryInfoMap[order.id];

                  return (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-medium text-gray-900">#{order.id}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{order.profiles?.full_name || 'Guest'}</p>
                          <p className="text-sm text-gray-500">{formatPhoneNumber(order.profiles?.phone_number)}</p>
                          <p className="text-xs text-gray-400 truncate max-w-xs">{order.delivery_address}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-[#0033A0]">{formatCurrency(order.total_amount)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${ORDER_STATUS_COLORS[order.status]}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {deliveryInfo ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <Truck size={16} className="text-gray-400" />
                            <span className={`text-xs px-2 py-1 rounded-full ${getDeliveryStatusColor(deliveryInfo.status)}`}>
                              {deliveryInfo.status === 'assigned' ? 'Ready to Pick Up' :
                               deliveryInfo.status === 'accepted' ? 'Accepted' :
                               deliveryInfo.status === 'picked_up' ? 'Picked Up' :
                               deliveryInfo.status === 'out_for_delivery' ? 'Out for Delivery' :
                               deliveryInfo.status === 'delivered' ? 'Delivered' :
                               deliveryInfo.status === 'declined' ? 'Declined' :
                               deliveryInfo.status === 'failed' ? 'Failed' :
                               deliveryInfo.status}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">Not assigned</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatDate(order.created_at)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {/* View Details Button - Always shown */}
                          <button 
                            onClick={() => viewOrderDetails(order.id)}
                            className="p-2 text-[#0033A0] hover:bg-[#E5EEFF] rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye size={18} />
                          </button>
                          
                          {/* Assign rider when processing and rider is not yet assigned, or reassignment is needed */}
                          {order.status === 'Processing' && (
                            !deliveryInfo ||
                            !deliveryInfo.rider_id ||
                            ['declined', 'failed'].includes(deliveryInfo.status)
                          ) && (
                            <button
                              onClick={() => handleAssignRider(order)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Assign Rider"
                            >
                              <UserPlus size={18} />
                            </button>
                          )}

                          {!deliveryInfoLoading && deliveryInfo && ['assigned', 'accepted', 'picked_up', 'out_for_delivery'].includes(deliveryInfo.status) && (
                            <button
                              onClick={() => handleOpenTrackingMap(order)}
                              className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                              title="Track Specific Order"
                            >
                              <MapPin size={18} />
                            </button>
                          )}
                          
                          {/* Status Update Buttons */}
                          {order.status === 'Pending' && (
                            <>
                              <button
                                onClick={() => handleStatusUpdate(order.id, ORDER_STATUS.PROCESSING)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Process Order"
                              >
                                <Clock size={18} />
                              </button>
                              <button
                                onClick={() => handleStatusUpdate(order.id, ORDER_STATUS.CANCELLED)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Cancel Order"
                              >
                                <XCircle size={18} />
                              </button>
                            </>
                          )}
                          
                          {order.status === 'Processing' && (
                            <>
                              <button
                                onClick={() => handleStatusUpdate(order.id, ORDER_STATUS.CANCELLED)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Cancel Order"
                              >
                                <XCircle size={18} />
                              </button>
                            </>
                          )}
                          
                          {order.status === 'Out for Delivery' && (
                            <>
                              <button
                                onClick={() => handleStatusUpdate(order.id, ORDER_STATUS.COMPLETED)}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="Mark as Completed"
                              >
                                <CheckCircle size={18} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination 
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          )}
        </>
      )}

      {/* Modals */}
      <OrderModal 
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        order={selectedOrder}
        onStatusChange={handleStatusUpdate}
        onDeliveryFeeChange={handleDeliveryFeeChange}
      />

      <AssignRiderModal
        isOpen={showAssignModal}
        onClose={() => {
          setShowAssignModal(false);
          setSelectedOrderForAction(null);
        }}
        order={selectedOrderForAction}
        onAssigned={handleRiderAssigned}
        availableRiders={availableRiders}
      />

      <RiderTrackingModal
        isOpen={showTrackingModal}
        onClose={() => {
          setShowTrackingModal(false);
          setSelectedOrderForAction(null);
          setDeliveryDetails(null);
        }}
        order={selectedOrderForAction}
        delivery={deliveryDetails}
      />

      <DeliveryTrackingMap
        isOpen={showTrackingMap}
        onClose={() => {
          setShowTrackingMap(false);
          setSelectedDeliveryForMap(null);
        }}
        deliveryId={selectedDeliveryForMap?.deliveryId}
        orderId={selectedDeliveryForMap?.orderId}
      />

      <ConfirmDialog
        isOpen={showConfirmDialog}
        onClose={closeDialogs}
        onConfirm={confirmStatusUpdate}
        title="Update Order Status"
        message={`Are you sure you want to change this order status to "${pendingStatusUpdate?.newStatus}"?`}
        confirmText="Update"
      />

      {showCancellationDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl">
            <div className="p-6 border-b bg-red-600 text-white">
              <h3 className="text-lg font-bold">Cancel Order</h3>
              <p className="text-sm text-red-100 mt-1">Provide reason for cancellation to keep audit trail complete.</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cancellation Reason</label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-red-500 outline-none"
                >
                  {CANCELLATION_REASONS.map((reason) => (
                    <option key={reason} value={reason}>{reason}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes {cancelReason === 'Other' ? '(required)' : '(optional)'}</label>
                <textarea
                  value={cancelNote}
                  onChange={(e) => setCancelNote(e.target.value)}
                  rows={3}
                  className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-red-500 outline-none"
                  placeholder="Add context for the cancellation"
                />
              </div>
            </div>
            <div className="p-6 border-t bg-gray-50 flex gap-3 justify-end">
              <button
                onClick={closeDialogs}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
              >
                Back
              </button>
              <button
                onClick={confirmCancellation}
                disabled={cancelReason === 'Other' && !cancelNote.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}