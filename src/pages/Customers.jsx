// src/pages/Customers.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Users, Mail, Phone, MapPin, Calendar, Eye, Edit2, X, Package, DollarSign, Clock, Save } from 'lucide-react';
import ErrorAlert from '../components/common/ErrorAlert';
import SearchBar from '../components/common/SearchBar';
import Pagination from '../components/common/Pagination';
import { supabase } from '../lib/supabase';
import { formatCurrency, formatDate } from '../utils/formatters';

// Skeleton Components (keep as is)
const TableRowSkeleton = () => (
  <tr className="animate-pulse">
    <td className="px-6 py-4">
      <div className="flex items-center">
        <div className="w-10 h-10 bg-gray-200 rounded-lg mr-3"></div>
        <div className="space-y-2">
          <div className="h-4 w-32 bg-gray-200 rounded"></div>
          <div className="h-3 w-24 bg-gray-200 rounded"></div>
        </div>
      </div>
    </td>
    <td className="px-6 py-4">
      <div className="space-y-2">
        <div className="h-4 w-28 bg-gray-200 rounded"></div>
        <div className="h-3 w-36 bg-gray-200 rounded"></div>
      </div>
    </td>
    <td className="px-6 py-4">
      <div className="space-y-2">
        <div className="h-4 w-16 bg-gray-200 rounded"></div>
        <div className="h-3 w-20 bg-gray-200 rounded"></div>
      </div>
    </td>
    <td className="px-6 py-4">
      <div className="h-5 w-24 bg-gray-200 rounded"></div>
    </td>
    <td className="px-6 py-4">
      <div className="space-y-2">
        <div className="h-4 w-20 bg-gray-200 rounded"></div>
        <div className="h-3 w-16 bg-gray-200 rounded"></div>
      </div>
    </td>
    <td className="px-6 py-4">
      <div className="flex gap-2">
        <div className="w-8 h-8 bg-gray-200 rounded"></div>
        <div className="w-8 h-8 bg-gray-200 rounded"></div>
      </div>
    </td>
  </tr>
);

const StatCardSkeleton = () => (
  <div className="bg-white p-4 rounded-lg border border-gray-200 animate-pulse">
    <div className="h-4 w-20 bg-gray-200 rounded mb-2"></div>
    <div className="h-8 w-16 bg-gray-300 rounded"></div>
  </div>
);

// Edit Customer Modal Component
const EditCustomerModal = React.memo(({ isOpen, onClose, customer, onUpdate }) => {
  const [formData, setFormData] = useState({
    full_name: '',
    phone_number: '',
    address: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (customer) {
      setFormData({
        full_name: customer.full_name || '',
        phone_number: customer.phone_number || '',
        address: customer.address || ''
      });
    }
  }, [customer]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          phone_number: formData.phone_number,
          address: formData.address
        })
        .eq('id', customer.id);

      if (error) throw error;

      onUpdate();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl max-w-md w-full shadow-2xl">
        <div className="bg-gradient-to-r from-[#0033A0] to-[#ED1C24] p-6 flex justify-between items-center">
          <h3 className="text-xl font-bold text-white">Edit Customer</h3>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X size={20} className="text-white" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              name="full_name"
              required
              value={formData.full_name}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0033A0] outline-none"
              placeholder="Juan Dela Cruz"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              name="phone_number"
              value={formData.phone_number}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0033A0] outline-none"
              placeholder="0912 345 6789"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address
            </label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0033A0] outline-none resize-none"
              rows="3"
              placeholder="Customer's address"
            />
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-gradient-to-r from-[#0033A0] to-[#ED1C24] text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                'Saving...'
              ) : (
                <>
                  <Save size={18} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

EditCustomerModal.displayName = 'EditCustomerModal';

// Customer Details Modal Component
const CustomerDetailsModal = React.memo(({ customer, onClose }) => {
  const stats = useMemo(() => {
    const orders = customer.orders || [];
    const totalSpent = orders.reduce((sum, order) => 
      order.status === 'Completed' ? sum + order.total_amount : sum, 0
    );
    const lastOrder = orders.length > 0 
      ? new Date(Math.max(...orders.map(o => new Date(o.created_at))))
      : null;

    return {
      totalOrders: orders.length,
      totalSpent,
      lastOrder,
      completedOrders: orders.filter(o => o.status === 'Completed').length,
      pendingOrders: orders.filter(o => o.status === 'Pending').length
    };
  }, [customer]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        <div className="bg-gradient-to-r from-[#0033A0] to-[#ED1C24] p-6 flex justify-between items-center">
          <h3 className="text-xl font-bold text-white">Customer Details</h3>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X size={20} className="text-white" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto">
          <div className="space-y-6">
            {/* Customer Profile */}
            <div className="flex items-center">
              <div className="w-16 h-16 bg-gradient-to-r from-[#0033A0] to-[#ED1C24] rounded-xl flex items-center justify-center text-white font-bold text-2xl mr-4 shadow-lg">
                {customer.full_name?.charAt(0)?.toUpperCase()}
              </div>
              <div>
                <h4 className="text-xl font-bold text-gray-900">{customer.full_name}</h4>
                <p className="text-gray-500 flex items-center mt-1">
                  <Mail size={14} className="mr-1" />
                  {customer.email}
                </p>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-blue-50 p-3 rounded-lg text-center">
                <Package size={20} className="text-[#0033A0] mx-auto mb-1" />
                <p className="text-sm text-gray-600">Total Orders</p>
                <p className="font-bold text-[#0033A0]">{stats.totalOrders}</p>
              </div>
              <div className="bg-green-50 p-3 rounded-lg text-center">
                <DollarSign size={20} className="text-green-600 mx-auto mb-1" />
                <p className="text-sm text-gray-600">Total Spent</p>
                <p className="font-bold text-green-600">{formatCurrency(stats.totalSpent)}</p>
              </div>
              <div className="bg-purple-50 p-3 rounded-lg text-center">
                <Clock size={20} className="text-purple-600 mx-auto mb-1" />
                <p className="text-sm text-gray-600">Completed</p>
                <p className="font-bold text-purple-600">{stats.completedOrders}</p>
              </div>
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500 flex items-center">
                  <Phone size={14} className="mr-1" /> Phone Number
                </p>
                <p className="font-medium text-gray-900 mt-1">{customer.phone_number || 'N/A'}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500 flex items-center">
                  <Calendar size={14} className="mr-1" /> Member Since
                </p>
                <p className="font-medium text-gray-900 mt-1">
                  {customer.created_at ? formatDate(customer.created_at) : 'N/A'}
                </p>
              </div>
              {customer.address && (
                <div className="col-span-2 bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500 flex items-center">
                    <MapPin size={14} className="mr-1" /> Address
                  </p>
                  <p className="font-medium text-gray-900 mt-1">{customer.address}</p>
                </div>
              )}
            </div>

            {/* Order History */}
            {customer.orders && customer.orders.length > 0 && (
              <div>
                <h5 className="font-semibold text-gray-900 mb-3">Recent Orders</h5>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                  {customer.orders.slice(0, 5).map(order => (
                    <div key={order.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div>
                        <p className="font-medium text-gray-900">#{order.id}</p>
                        <p className="text-xs text-gray-500">{formatDate(order.created_at)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-[#0033A0]">{formatCurrency(order.total_amount)}</p>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          order.status === 'Completed' ? 'bg-green-100 text-green-700' :
                          order.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                          order.status === 'Processing' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
});

CustomerDetailsModal.displayName = 'CustomerDetailsModal';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Fetch customers
  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          orders!orders_user_id_fkey (
            id,
            total_amount,
            status,
            created_at
          )
        `)
        .eq('role', 'customer')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCustomers(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Memoized filtered customers
  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers;
    
    const query = searchQuery.toLowerCase().trim();
    return customers.filter(customer =>
      customer.full_name?.toLowerCase().includes(query) ||
      customer.email?.toLowerCase().includes(query) ||
      customer.phone_number?.includes(query)
    );
  }, [customers, searchQuery]);

  // Memoized pagination
  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredCustomers.slice(start, start + itemsPerPage);
  }, [filteredCustomers, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);

  // Memoized customer stats calculator
  const getCustomerStats = useCallback((customer) => {
    const orders = customer.orders || [];
    const totalSpent = orders.reduce((sum, order) => 
      order.status === 'Completed' ? sum + order.total_amount : sum, 0
    );
    const lastOrder = orders.length > 0 
      ? new Date(Math.max(...orders.map(o => new Date(o.created_at))))
      : null;

    return {
      totalOrders: orders.length,
      totalSpent,
      lastOrder,
      completedOrders: orders.filter(o => o.status === 'Completed').length,
      pendingOrders: orders.filter(o => o.status === 'Pending').length
    };
  }, []);

  // Memoized stats for summary cards
  const summaryStats = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    let totalRevenue = 0;
    let totalOrdersValue = 0;
    let customersWithOrders = 0;
    let activeCustomers = 0;

    customers.forEach(customer => {
      const stats = getCustomerStats(customer);
      totalRevenue += stats.totalSpent;
      
      if (stats.totalOrders > 0) {
        customersWithOrders++;
        totalOrdersValue += stats.totalSpent / stats.totalOrders;
      }

      if (stats.lastOrder && new Date(stats.lastOrder) > thirtyDaysAgo) {
        activeCustomers++;
      }
    });

    return {
      total: customers.length,
      active: activeCustomers,
      revenue: totalRevenue,
      avgOrderValue: customersWithOrders > 0 ? Math.round(totalOrdersValue / customersWithOrders) : 0
    };
  }, [customers, getCustomerStats]);

  const handleSearch = useCallback((query) => {
    setSearchQuery(query);
    setCurrentPage(1);
  }, []);

  const handlePageChange = useCallback((page) => {
    setCurrentPage(page);
  }, []);

  const handleViewDetails = useCallback((customer) => {
    setSelectedCustomer(customer);
    setShowDetailsModal(true);
  }, []);

  const handleEditClick = useCallback((customer) => {
    setSelectedCustomer(customer);
    setShowEditModal(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowDetailsModal(false);
    setShowEditModal(false);
    setSelectedCustomer(null);
  }, []);

  const handleUpdateSuccess = useCallback(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse"></div>

        {/* Filters Skeleton */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 h-12 bg-gray-200 rounded animate-pulse"></div>
        </div>

        {/* Stats Summary Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <StatCardSkeleton key={i} />)}
        </div>

        {/* Table Skeleton */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {[1,2,3,4,5,6].map(i => (
                  <th key={i} className="px-6 py-4">
                    <div className="h-4 w-20 bg-gray-200 rounded"></div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {[1,2,3,4,5,6,7,8,9,10].map(i => <TableRowSkeleton key={i} />)}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Customer Management</h2>
      </div>

      {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <SearchBar 
          onSearch={handleSearch}
          placeholder="Search customers by name, email, or phone..."
          className="flex-1"
        />
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-500">Total Customers</p>
          <p className="text-2xl font-bold text-[#0033A0]">{summaryStats.total}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-500">Active This Month</p>
          <p className="text-2xl font-bold text-green-600">{summaryStats.active}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-500">Total Revenue</p>
          <p className="text-2xl font-bold text-[#ED1C24]">
            {formatCurrency(summaryStats.revenue)}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-500">Avg Order Value</p>
          <p className="text-2xl font-bold text-purple-600">
            {formatCurrency(summaryStats.avgOrderValue)}
          </p>
        </div>
      </div>

      {/* Customers Table */}
      {filteredCustomers.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Users size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No customers found</h3>
          <p className="text-gray-500">
            {searchQuery ? "Try adjusting your search" : "No customers have registered yet"}
          </p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Orders</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Total Spent</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Last Order</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedCustomers.map((customer) => {
                  const stats = getCustomerStats(customer);
                  return (
                    <tr key={customer.id} className="hover:bg-gray-50 transition-colors duration-150">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gradient-to-r from-[#0033A0] to-[#ED1C24] rounded-lg flex items-center justify-center text-white font-bold mr-3 shadow-sm">
                            {customer.full_name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{customer.full_name || 'Unnamed'}</p>
                            <p className="text-sm text-gray-500">{customer.email || 'No email'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <p className="text-sm text-gray-900 flex items-center">
                            <Phone size={14} className="mr-1 text-gray-400" />
                            {customer.phone_number || 'N/A'}
                          </p>
                          {customer.address && (
                            <p className="text-sm text-gray-500 flex items-center">
                              <MapPin size={14} className="mr-1 text-gray-400" />
                              <span className="truncate max-w-[200px]">{customer.address}</span>
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{stats.totalOrders}</p>
                          <p className="text-xs text-gray-500">
                            {stats.completedOrders} completed
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-[#0033A0]">{formatCurrency(stats.totalSpent)}</p>
                      </td>
                      <td className="px-6 py-4">
                        {stats.lastOrder ? (
                          <div>
                            <p className="text-sm text-gray-900">
                              {stats.lastOrder.toLocaleDateString()}
                            </p>
                            <p className="text-xs text-gray-500">
                              {stats.lastOrder.toLocaleTimeString()}
                            </p>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">No orders</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleViewDetails(customer)}
                            className="p-2 text-[#0033A0] hover:bg-[#E5EEFF] rounded-lg transition-colors duration-150"
                            title="View Details"
                          >
                            <Eye size={18} />
                          </button>
                          <button 
                            onClick={() => handleEditClick(customer)}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-150"
                            title="Edit Customer"
                          >
                            <Edit2 size={18} />
                          </button>
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

      {/* Customer Details Modal */}
      {showDetailsModal && selectedCustomer && (
        <CustomerDetailsModal
          customer={selectedCustomer}
          onClose={handleCloseModal}
        />
      )}

      {/* Edit Customer Modal */}
      {showEditModal && selectedCustomer && (
        <EditCustomerModal
          isOpen={showEditModal}
          onClose={handleCloseModal}
          customer={selectedCustomer}
          onUpdate={handleUpdateSuccess}
        />
      )}
    </div>
  );
}