// src/pages/Customers.jsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Users, Mail, Phone, MapPin, Calendar, Eye, Edit2, X, Package, DollarSign, Clock, Save } from 'lucide-react';
import ErrorAlert from '../components/common/ErrorAlert';
import SearchBar from '../components/common/SearchBar';
import Pagination from '../components/common/Pagination';
import { supabase } from '../lib/supabase';
import { formatCurrency, formatDate } from '../utils/formatters';
import { diffObjects, formatChangesDescription } from '../utils/diff';
import { notifySuccess } from '../utils/successNotifier';
import { useAdminLog } from '../hooks/useAdminLog';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

// Skeleton Components (keep as is)
const TableRowSkeleton = ({ isDarkMode }) => (
  <tr className="animate-pulse">
    <td className="px-6 py-4">
      <div className="flex items-center">
        <div className={`w-10 h-10 rounded-lg mr-3 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'}`}></div>
        <div className="space-y-2">
          <div className={`h-4 w-32 rounded ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'}`}></div>
          <div className={`h-3 w-24 rounded ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'}`}></div>
        </div>
      </div>
    </td>
    <td className="px-6 py-4">
      <div className="space-y-2">
        <div className={`h-4 w-28 rounded ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'}`}></div>
        <div className={`h-3 w-36 rounded ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'}`}></div>
      </div>
    </td>
    <td className="px-6 py-4">
      <div className="space-y-2">
        <div className={`h-4 w-16 rounded ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'}`}></div>
        <div className={`h-3 w-20 rounded ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'}`}></div>
      </div>
    </td>
    <td className="px-6 py-4">
      <div className={`h-5 w-24 rounded ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'}`}></div>
    </td>
    <td className="px-6 py-4">
      <div className="space-y-2">
        <div className={`h-4 w-20 rounded ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'}`}></div>
        <div className={`h-3 w-16 rounded ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'}`}></div>
      </div>
    </td>
    <td className="px-6 py-4">
      <div className="flex gap-2">
        <div className={`w-8 h-8 rounded ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'}`}></div>
        <div className={`w-8 h-8 rounded ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'}`}></div>
      </div>
    </td>
  </tr>
);

const StatCardSkeleton = ({ isDarkMode }) => (
  <div className={`p-4 rounded-lg border animate-pulse transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
    <div className={`h-4 w-20 rounded mb-2 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'}`}></div>
    <div className={`h-8 w-16 rounded ${isDarkMode ? 'bg-slate-600' : 'bg-gray-300'}`}></div>
  </div>
);

// Edit Customer Modal Component
  const EditCustomerModal = React.memo(({ isOpen, onClose, customer, onUpdate, isDarkMode }) => {
    const { logCustomerAction } = useAdminLog();
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

      const changes = diffObjects(
        {
          full_name: customer.full_name,
          phone_number: customer.phone_number,
          address: customer.address
        },
        {
          full_name: formData.full_name,
          phone_number: formData.phone_number,
          address: formData.address
        }
      );

      const description = formatChangesDescription(changes) || 'Updated customer details';

      await logCustomerAction(customer.id, 'update_customer', changes, description);
      notifySuccess(description);

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
      <div className={`${isDarkMode ? 'bg-slate-800' : 'bg-white'} rounded-xl max-w-md w-full shadow-2xl transition-colors duration-300`}>
        <div className="bg-petron-blue p-6 flex justify-between items-center">
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
            <div className={`${isDarkMode ? 'bg-red-900/30 border-red-700' : 'bg-red-50 border-red-500'} border-l-4 p-4 rounded`}>
              <p className={`text-sm ${isDarkMode ? 'text-red-300' : 'text-red-700'}`}>{error}</p>
            </div>
          )}

          <div>
            <label className={`block text-sm font-medium mb-1 transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Full Name *
            </label>
            <input
              type="text"
              name="full_name"
              required
              value={formData.full_name}
              onChange={handleChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#0033A0] outline-none transition-colors duration-300 ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
              placeholder="Juan Dela Cruz"
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Phone Number
            </label>
            <input
              type="tel"
              name="phone_number"
              value={formData.phone_number}
              onChange={handleChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#0033A0] outline-none transition-colors duration-300 ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
              placeholder="0912 345 6789"
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Address
            </label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#0033A0] outline-none resize-none transition-colors duration-300 ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
              rows="3"
              placeholder="Customer's address"
            />
          </div>

          <div className={`flex gap-3 pt-4 border-t transition-colors duration-300 ${isDarkMode ? 'border-slate-700' : 'border-gray-200'}`}>
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 py-2.5 border rounded-lg transition-colors duration-300 ${isDarkMode ? 'border-slate-600 text-gray-300 hover:bg-slate-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-petron-blue text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
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
  const CustomerDetailsModal = React.memo(({ customer, onClose, onAvatarClick, isDarkMode }) => {
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
      <div className={`${isDarkMode ? 'bg-slate-800' : 'bg-white'} rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl transition-colors duration-300`}>
        <div className="bg-petron-blue p-6 flex justify-between items-center">
          <h3 className="text-xl font-bold text-white">Customer Details</h3>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X size={20} className="text-white" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          <div className="space-y-6">
            {/* Customer Profile */}
            <div className="flex items-center">
              {customer.avatar_url ? (
                <button
                  type="button"
                  onClick={() => onAvatarClick?.(customer.avatar_url)}
                  className="mr-4 rounded-xl"
                  title="View full image"
                >
                  <img
                    src={customer.avatar_url}
                    alt={customer.full_name}
                    className="w-16 h-16 rounded-xl object-cover border-2 border-gray-200 shadow-lg hover:opacity-90 transition"
                  />
                </button>
              ) : (
                <div className="w-16 h-16 bg-petron-blue rounded-xl flex items-center justify-center text-white font-bold text-2xl mr-4 shadow-lg">
                  {customer.full_name?.charAt(0)?.toUpperCase()}
                </div>
              )}
              <div>
                <h4 className={`text-xl font-bold transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{customer.full_name}</h4>
                <p className={`flex items-center mt-1 transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  <Mail size={14} className="mr-1" />
                  {customer.email}
                </p>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className={`${isDarkMode ? 'bg-slate-700' : 'bg-blue-50'} p-3 rounded-lg text-center transition-colors duration-300`}>
                <Package size={20} className="text-[#0033A0] mx-auto mb-1" />
                <p className={`text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Orders</p>
                <p className="font-bold text-[#0033A0]">{stats.totalOrders}</p>
              </div>
              <div className={`${isDarkMode ? 'bg-slate-700' : 'bg-green-50'} p-3 rounded-lg text-center transition-colors duration-300`}>
                <DollarSign size={20} className="text-green-600 mx-auto mb-1" />
                <p className={`text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Spent</p>
                <p className="font-bold text-green-600">{formatCurrency(stats.totalSpent)}</p>
              </div>
              <div className={`${isDarkMode ? 'bg-slate-700' : 'bg-purple-50'} p-3 rounded-lg text-center transition-colors duration-300`}>
                <Clock size={20} className="text-purple-600 mx-auto mb-1" />
                <p className={`text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Completed</p>
                <p className="font-bold text-purple-600">{stats.completedOrders}</p>
              </div>
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-2 gap-4">
              <div className={`${isDarkMode ? 'bg-slate-700' : 'bg-gray-50'} p-4 rounded-lg transition-colors duration-300`}>
                <p className={`text-sm flex items-center transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  <Phone size={14} className="mr-1" /> Phone Number
                </p>
                <p className={`font-medium mt-1 transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{customer.phone_number || 'N/A'}</p>
              </div>
              <div className={`${isDarkMode ? 'bg-slate-700' : 'bg-gray-50'} p-4 rounded-lg transition-colors duration-300`}>
                <p className={`text-sm flex items-center transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  <Calendar size={14} className="mr-1" /> Member Since
                </p>
                <p className={`font-medium mt-1 transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {customer.created_at ? formatDate(customer.created_at) : 'N/A'}
                </p>
              </div>
              {customer.address && (
                <div className={`col-span-2 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-50'} p-4 rounded-lg transition-colors duration-300`}>
                  <p className={`text-sm flex items-center transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    <MapPin size={14} className="mr-1" /> Address
                  </p>
                  <p className={`font-medium mt-1 transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{customer.address}</p>
                </div>
              )}
            </div>

            {/* Order History */}
            <div>
              <h5 className={`font-semibold mb-3 transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Recent Orders</h5>
              {customer.orders && customer.orders.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                  {customer.orders.slice(0, 5).map(order => (
                    <div key={order.id} className={`flex justify-between items-center p-3 rounded-lg transition-colors duration-150 ${isDarkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-50 hover:bg-gray-100'}`}>
                      <div>
                        <p className={`font-medium transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Order #{order.id}</p>
                        <p className={`text-xs transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{formatDate(order.created_at)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-[#0033A0]">{formatCurrency(order.total_amount)}</p>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          order.status === 'Completed' ? (isDarkMode ? 'bg-green-900/50 text-green-300' : 'bg-green-100 text-green-700') :
                          order.status === 'Pending' ? (isDarkMode ? 'bg-yellow-900/50 text-yellow-300' : 'bg-yellow-100 text-yellow-700') :
                          order.status === 'Processing' ? (isDarkMode ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-700') :
                          (isDarkMode ? 'bg-slate-600 text-gray-300' : 'bg-gray-100 text-gray-700')
                        }`}>
                          {order.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`p-4 rounded-lg text-center transition-colors duration-300 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-50'}`}>
                  <Package size={24} className={`mx-auto mb-2 transition-colors duration-300 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                  <p className={`text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>No orders yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

CustomerDetailsModal.displayName = 'CustomerDetailsModal';

export default function Customers() {
  const { isDarkMode } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const handledFocusNonceRef = useRef(null);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [previewImageUrl, setPreviewImageUrl] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    if (!previewImageUrl) return;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setPreviewImageUrl(null);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [previewImageUrl]);

  useEffect(() => {
    const focusCustomerId = location.state?.focusCustomerId;
    const focusNonce = location.state?.focusNonce;
    if (!focusCustomerId || !customers?.length || !focusNonce) return;
    if (handledFocusNonceRef.current === focusNonce) return;

    const targetCustomer = customers.find((c) => c.id === focusCustomerId);
    if (!targetCustomer) return;

    handledFocusNonceRef.current = focusNonce;
    setSelectedCustomer(targetCustomer);
    setShowDetailsModal(true);

    navigate(location.pathname, { replace: true, state: {} });
  }, [location.pathname, location.state?.focusNonce, location.state?.focusCustomerId, customers, navigate]);

  // Fetch customers
  const fetchCustomers = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true); // Only show skeletons if NOT silent
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

    const subscription = supabase
      .channel('customers-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: 'role=eq.customer' }, () => {
        fetchCustomers(true);
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
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
          {[1,2,3,4].map(i => <StatCardSkeleton key={i} isDarkMode={isDarkMode} />)}
        </div>

        {/* Table Skeleton */}
        <div className={`rounded-xl border overflow-x-auto transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
          <table className="w-full min-w-[900px]">
            <thead className={`transition-colors duration-300 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-50'}`}>
              <tr>
                {[1,2,3,4,5,6].map(i => (
                  <th key={i} className="px-6 py-4">
                    <div className={`h-4 w-20 rounded ${isDarkMode ? 'bg-slate-600' : 'bg-gray-200'}`}></div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={`divide-y transition-colors duration-300 ${isDarkMode ? 'divide-slate-700' : 'divide-gray-200'}`}>
              {[1,2,3,4,5,6,7,8,9,10].map(i => <TableRowSkeleton key={i} isDarkMode={isDarkMode} />)}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className={`text-2xl font-bold transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Customer Management</h2>
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
        <div className={`p-4 rounded-lg border transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
          <p className={`text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total Customers</p>
          <p className="text-2xl font-bold text-[#0033A0]">{summaryStats.total}</p>
        </div>
        <div className={`p-4 rounded-lg border transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
          <p className={`text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Active This Month</p>
          <p className="text-2xl font-bold text-green-600">{summaryStats.active}</p>
        </div>
        <div className={`p-4 rounded-lg border transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
          <p className={`text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total Revenue</p>
          <p className="text-2xl font-bold text-[#ED1C24]">
            {formatCurrency(summaryStats.revenue)}
          </p>
        </div>
        <div className={`p-4 rounded-lg border transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
          <p className={`text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Avg Order Value</p>
          <p className="text-2xl font-bold text-purple-600">
            {formatCurrency(summaryStats.avgOrderValue)}
          </p>
        </div>
      </div>

      {/* Customers Table */}
      {filteredCustomers.length === 0 ? (
        <div className={`rounded-xl border p-12 text-center transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
          <Users size={48} className={`mx-auto mb-4 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
          <h3 className={`text-lg font-medium mb-2 transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>No customers found</h3>
          <p className={`transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {searchQuery ? "Try adjusting your search" : "No customers have registered yet"}
          </p>
        </div>
      ) : (
        <>
          <div className={`rounded-xl shadow-sm border overflow-x-auto transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
            <table className="w-full min-w-[900px]">
              <thead className={`border-b transition-colors duration-300 ${isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-gray-50 border-gray-200'}`}>
                <tr>
                  <th className={`px-6 py-4 text-left text-xs font-medium uppercase transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Customer</th>
                  <th className={`px-6 py-4 text-left text-xs font-medium uppercase transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Contact</th>
                  <th className={`px-6 py-4 text-left text-xs font-medium uppercase transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Orders</th>
                  <th className={`px-6 py-4 text-left text-xs font-medium uppercase transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Total Spent</th>
                  <th className={`px-6 py-4 text-left text-xs font-medium uppercase transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Last Order</th>
                  <th className={`px-6 py-4 text-left text-xs font-medium uppercase transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Actions</th>
                </tr>
              </thead>
            <tbody className={`divide-y transition-colors duration-300 ${isDarkMode ? 'divide-slate-700' : 'divide-gray-200'}`}>
                {paginatedCustomers.map((customer) => {
                  const stats = getCustomerStats(customer);
                  return (
                    <tr key={customer.id} className={`transition-colors duration-150 ${isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-50'}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          {customer.avatar_url ? (
                            <button
                              type="button"
                              onClick={() => setPreviewImageUrl(customer.avatar_url)}
                              className="mr-3 rounded-lg"
                              title="View full image"
                            >
                              <img
                                src={customer.avatar_url}
                                alt={customer.full_name}
                                className="w-10 h-10 rounded-lg object-cover border border-gray-200 hover:opacity-90 transition"
                              />
                            </button>
                          ) : (
                            <div className="w-10 h-10 bg-petron-blue rounded-lg flex items-center justify-center text-white font-bold mr-3 shadow-sm">
                              {customer.full_name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                          )}
                          <div>
                            <p className={`font-medium transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{customer.full_name || 'Unnamed'}</p>
                            <p className={`text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{customer.email || 'No email'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <p className={`text-sm flex items-center transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                            <Phone size={14} className={`mr-1 transition-colors duration-300 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                            {customer.phone_number || 'N/A'}
                          </p>
                          {customer.address && (
                            <p className={`text-sm flex items-center transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              <MapPin size={14} className={`mr-1 transition-colors duration-300 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                              <span className="truncate max-w-[200px]">{customer.address}</span>
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className={`font-medium transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{stats.totalOrders}</p>
                          <p className={`text-xs transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
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
                            <p className={`text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                              {stats.lastOrder.toLocaleDateString()}
                            </p>
                            <p className={`text-xs transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              {stats.lastOrder.toLocaleTimeString()}
                            </p>
                          </div>
                        ) : (
                          <span className={`text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>No orders</span>
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
                            className={`p-2 rounded-lg transition-colors duration-150 ${isDarkMode ? 'text-gray-400 hover:bg-slate-700' : 'text-gray-600 hover:bg-gray-100'}`}
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
          onAvatarClick={setPreviewImageUrl}
          isDarkMode={isDarkMode}
        />
      )}

      {/* Edit Customer Modal */}
      {showEditModal && selectedCustomer && (
        <EditCustomerModal
          isOpen={showEditModal}
          onClose={handleCloseModal}
          customer={selectedCustomer}
          onUpdate={handleUpdateSuccess}
          isDarkMode={isDarkMode}
        />
      )}

      {previewImageUrl && (
        <div
          className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4"
          onClick={() => setPreviewImageUrl(null)}
        >
          <div
            className="relative max-w-4xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewImageUrl(null)}
              className="absolute top-2 right-2 bg-black/70 text-white px-3 py-1 rounded-md hover:bg-black"
            >
              Close
            </button>
            <img
              src={previewImageUrl}
              alt="Customer avatar full view"
              className="w-full max-h-[85vh] object-contain rounded-lg bg-black"
            />
          </div>
        </div>
      )}
    </div>
  );
}