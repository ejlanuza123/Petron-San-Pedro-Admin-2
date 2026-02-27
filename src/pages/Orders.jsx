// src/pages/Orders.jsx
import React, { useState, useMemo, useCallback } from 'react';
import { Eye, ChevronDown } from 'lucide-react';
import OrderModal from '../components/OrderModal';
import ErrorAlert from '../components/common/ErrorAlert';
import EmptyState from '../components/common/EmptyState';
import SearchBar from '../components/common/SearchBar';
import Pagination from '../components/common/Pagination';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { useOrders } from '../hooks/useOrders';
import { ORDER_STATUS, ORDER_STATUS_COLORS } from '../utils/constants';
import { formatCurrency, formatDate, formatPhoneNumber } from '../utils/formatters';

// Skeleton Components
const TableRowSkeleton = () => (
  <tr className="animate-pulse">
    <td className="px-6 py-4"><div className="h-4 w-16 bg-gray-200 rounded"></div></td>
    <td className="px-6 py-4">
      <div className="space-y-2">
        <div className="h-4 w-32 bg-gray-200 rounded"></div>
        <div className="h-3 w-24 bg-gray-200 rounded"></div>
      </div>
    </td>
    <td className="px-6 py-4"><div className="h-4 w-20 bg-gray-200 rounded"></div></td>
    <td className="px-6 py-4"><div className="h-6 w-20 bg-gray-200 rounded-full"></div></td>
    <td className="px-6 py-4"><div className="h-4 w-24 bg-gray-200 rounded"></div></td>
    <td className="px-6 py-4"><div className="h-8 w-20 bg-gray-200 rounded"></div></td>
  </tr>
);

const MobileCardSkeleton = () => (
  <div className="bg-white p-4 rounded-xl border border-gray-200 animate-pulse">
    <div className="flex justify-between items-start mb-3">
      <div className="space-y-2">
        <div className="h-5 w-20 bg-gray-200 rounded"></div>
        <div className="h-4 w-32 bg-gray-200 rounded"></div>
      </div>
      <div className="h-6 w-16 bg-gray-200 rounded-full"></div>
    </div>
    <div className="space-y-2 mb-4">
      <div className="h-4 w-40 bg-gray-200 rounded"></div>
      <div className="h-4 w-36 bg-gray-200 rounded"></div>
    </div>
    <div className="flex gap-2 pt-3 border-t">
      <div className="flex-1 h-10 bg-gray-200 rounded"></div>
      <div className="flex-1 h-10 bg-gray-200 rounded"></div>
    </div>
  </div>
);

export default function Orders() {
  const { orders, loading, error, selectedOrder, setSelectedOrder, updateStatus, viewOrderDetails } = useOrders();
  const [filter, setFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingStatusUpdate, setPendingStatusUpdate] = useState(null);

  // Memoized filtered orders
  const filteredOrders = useMemo(() => {
    let filtered = orders;
    
    if (filter !== 'All') {
      filtered = filtered.filter(o => o.status === filter);
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
  }, [orders, filter, searchQuery]);

  // Memoized pagination
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredOrders.slice(start, start + itemsPerPage);
  }, [filteredOrders, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);

  // Memoized stats
  const stats = useMemo(() => ({
    total: orders.length,
    pending: orders.filter(o => o.status === ORDER_STATUS.PENDING).length
  }), [orders]);

  const handleStatusUpdate = useCallback((orderId, newStatus) => {
    setPendingStatusUpdate({ orderId, newStatus });
    setShowConfirmDialog(true);
  }, []);

  const confirmStatusUpdate = useCallback(async () => {
    if (pendingStatusUpdate) {
      try {
        await updateStatus(pendingStatusUpdate.orderId, pendingStatusUpdate.newStatus);
        setShowConfirmDialog(false);
        setPendingStatusUpdate(null);
      } catch (err) {
        // Error is handled by hook
      }
    }
  }, [pendingStatusUpdate, updateStatus]);

  const handleSearch = useCallback((query) => {
    setSearchQuery(query);
    setCurrentPage(1); // Reset to first page on search
  }, []);

  const handleFilterChange = useCallback((e) => {
    setFilter(e.target.value);
    setCurrentPage(1); // Reset to first page on filter change
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
    setPendingStatusUpdate(null);
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

        {/* Filters Skeleton */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 h-12 bg-gray-200 rounded animate-pulse"></div>
          <div className="w-48 h-12 bg-gray-200 rounded animate-pulse"></div>
        </div>

        {/* Desktop Table Skeleton */}
        <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {[1,2,3,4,5,6].map(i => (
                  <th key={i} className="px-6 py-4"><div className="h-4 w-20 bg-gray-200 rounded"></div></th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {[1,2,3,4,5,6,7,8,9,10].map(i => <TableRowSkeleton key={i} />)}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards Skeleton */}
        <div className="md:hidden space-y-4">
          {[1,2,3,4,5].map(i => <MobileCardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Order Management</h2>
        
        {/* Stats Summary */}
        <div className="flex gap-4 text-sm">
          <div className="text-center">
            <span className="block text-2xl font-bold text-[#0033A0]">{stats.total}</span>
            <span className="text-gray-500">Total</span>
          </div>
          <div className="text-center">
            <span className="block text-2xl font-bold text-[#ED1C24]">{stats.pending}</span>
            <span className="text-gray-500">Pending</span>
          </div>
        </div>
      </div>

      {error && <ErrorAlert message={error} />}

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <SearchBar 
          onSearch={handleSearch}
          placeholder="Search orders by ID, customer, or address..."
          className="flex-1"
        />
        
        <div className="relative">
          <select
            value={filter}
            onChange={handleFilterChange}
            className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 focus:ring-2 focus:ring-[#0033A0] outline-none"
          >
            <option value="All">All Status</option>
            {Object.values(ORDER_STATUS).map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
        </div>
      </div>

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
          {/* Desktop Table */}
          <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors duration-150">
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
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(order.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => viewOrderDetails(order.id)}
                          className="p-2 text-[#0033A0] hover:bg-[#E5EEFF] rounded-lg transition-colors duration-150"
                          title="View Details"
                        >
                          <Eye size={18} />
                        </button>
                        <select 
                          value={order.status}
                          onChange={(e) => handleStatusUpdate(order.id, e.target.value)}
                          className="bg-gray-50 border border-gray-300 text-sm rounded-lg p-2 focus:ring-2 focus:ring-[#0033A0] outline-none"
                        >
                          {Object.values(ORDER_STATUS).map(status => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                        </select>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {paginatedOrders.map((order) => (
              <div 
                key={order.id} 
                className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-150"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="font-bold text-gray-900">#{order.id}</span>
                    <p className="text-sm text-gray-600 mt-1">{order.profiles?.full_name || 'Guest'}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${ORDER_STATUS_COLORS[order.status]}`}>
                    {order.status}
                  </span>
                </div>
                
                <div className="space-y-2 mb-4">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Amount:</span> {formatCurrency(order.total_amount)}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Date:</span> {formatDate(order.created_at)}
                  </p>
                  <p className="text-sm text-gray-600 truncate">
                    <span className="font-medium">Address:</span> {order.delivery_address}
                  </p>
                </div>

                <div className="flex gap-2 pt-3 border-t">
                  <button
                    onClick={() => viewOrderDetails(order.id)}
                    className="flex-1 bg-[#E5EEFF] text-[#0033A0] py-2 rounded-lg text-sm font-medium hover:bg-[#0033A0] hover:text-white transition-colors duration-150"
                  >
                    View Details
                  </button>
                  <select
                    value={order.status}
                    onChange={(e) => handleStatusUpdate(order.id, e.target.value)}
                    className="flex-1 bg-gray-50 border border-gray-300 text-sm rounded-lg p-2 focus:ring-2 focus:ring-[#0033A0] outline-none"
                  >
                    {Object.values(ORDER_STATUS).map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
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

      {/* Order Details Modal */}
      <OrderModal 
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        order={selectedOrder}
        onStatusChange={handleStatusUpdate}
      />

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        onClose={closeDialogs}
        onConfirm={confirmStatusUpdate}
        title="Update Order Status"
        message={`Are you sure you want to change this order status to "${pendingStatusUpdate?.newStatus}"?`}
        confirmText="Update"
      />
    </div>
  );
}