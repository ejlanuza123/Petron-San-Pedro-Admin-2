// src/pages/Riders.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Truck, MapPin, Phone, Edit2, Plus, X, CheckCircle, XCircle } from 'lucide-react';
import ErrorAlert from '../components/common/ErrorAlert';
import SearchBar from '../components/common/SearchBar';
import { supabase } from '../lib/supabase';

// Skeleton Components
const RiderCardSkeleton = () => (
  <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center">
        <div className="w-12 h-12 bg-gray-200 rounded-xl mr-3"></div>
        <div className="space-y-2">
          <div className="h-5 w-32 bg-gray-200 rounded"></div>
          <div className="h-4 w-24 bg-gray-200 rounded"></div>
        </div>
      </div>
      <div className="w-3 h-3 bg-gray-200 rounded-full"></div>
    </div>

    <div className="grid grid-cols-2 gap-3 mb-4">
      <div className="bg-gray-100 p-2 rounded-lg">
        <div className="h-3 w-16 bg-gray-200 rounded mx-auto mb-1"></div>
        <div className="h-5 w-8 bg-gray-200 rounded mx-auto"></div>
      </div>
      <div className="bg-gray-100 p-2 rounded-lg">
        <div className="h-3 w-16 bg-gray-200 rounded mx-auto mb-1"></div>
        <div className="h-5 w-8 bg-gray-200 rounded mx-auto"></div>
      </div>
    </div>

    <div className="h-4 w-full bg-gray-200 rounded mb-4"></div>

    <div className="flex gap-2 pt-4 border-t">
      <div className="flex-1 h-10 bg-gray-200 rounded"></div>
      <div className="w-12 h-10 bg-gray-200 rounded"></div>
    </div>
  </div>
);

const StatCardSkeleton = () => (
  <div className="bg-white p-4 rounded-lg border border-gray-200 animate-pulse">
    <div className="h-4 w-20 bg-gray-200 rounded mb-2"></div>
    <div className="h-8 w-16 bg-gray-300 rounded"></div>
  </div>
);

// Add Rider Modal Component
const AddRiderModal = React.memo(({ isOpen, onClose, onAdd }) => {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone_number: '',
    address: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data: { user }, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: Math.random().toString(36).slice(-8), // Generate random password
        options: {
          data: {
            full_name: formData.full_name,
            phone_number: formData.phone_number,
            role: 'rider'
          }
        }
      });

      if (authError) throw authError;

      if (user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            full_name: formData.full_name,
            phone_number: formData.phone_number,
            address: formData.address,
            role: 'rider',
            is_active: true
          })
          .eq('id', user.id);

        if (profileError) throw profileError;
      }

      onAdd();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl max-w-md w-full shadow-2xl">
        <div className="bg-gradient-to-r from-[#0033A0] to-[#ED1C24] p-6 flex justify-between items-center">
          <h3 className="text-xl font-bold text-white">Add New Rider</h3>
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
              required
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0033A0] outline-none"
              placeholder="Juan Dela Cruz"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0033A0] outline-none"
              placeholder="rider@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number *
            </label>
            <input
              type="tel"
              required
              value={formData.phone_number}
              onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0033A0] outline-none"
              placeholder="0912 345 6789"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address
            </label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0033A0] outline-none resize-none"
              rows="3"
              placeholder="Rider's address"
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
              className="flex-1 py-2.5 bg-gradient-to-r from-[#0033A0] to-[#ED1C24] text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center"
            >
              {loading ? 'Adding...' : 'Add Rider'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

AddRiderModal.displayName = 'AddRiderModal';

// Edit Rider Modal Component
const EditRiderModal = React.memo(({ isOpen, onClose, rider, onUpdate }) => {
  const [formData, setFormData] = useState({
    full_name: '',
    phone_number: '',
    address: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (rider) {
      setFormData({
        full_name: rider.full_name || '',
        phone_number: rider.phone_number || '',
        address: rider.address || ''
      });
    }
  }, [rider]);

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
        .eq('id', rider.id);

      if (error) throw error;

      onUpdate();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl max-w-md w-full shadow-2xl">
        <div className="bg-gradient-to-r from-[#0033A0] to-[#ED1C24] p-6 flex justify-between items-center">
          <h3 className="text-xl font-bold text-white">Edit Rider</h3>
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
              required
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0033A0] outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number *
            </label>
            <input
              type="tel"
              required
              value={formData.phone_number}
              onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0033A0] outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address
            </label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0033A0] outline-none resize-none"
              rows="3"
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
              className="flex-1 py-2.5 bg-gradient-to-r from-[#0033A0] to-[#ED1C24] text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center"
            >
              {loading ? 'Updating...' : 'Update Rider'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

EditRiderModal.displayName = 'EditRiderModal';

export default function Riders() {
  const [riders, setRiders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRider, setSelectedRider] = useState(null);

  const fetchRiders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          deliveries!deliveries_rider_id_fkey (
            id,
            status,
            assigned_at,
            delivered_at,
            order_id
          )
        `)
        .eq('role', 'rider')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRiders(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRiders();
  }, [fetchRiders]);

  const updateRiderStatus = useCallback(async (riderId, isActive) => {
    try {
      setError(null);
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: isActive })
        .eq('id', riderId);

      if (error) throw error;
      
      // Optimistic update
      setRiders(prev => prev.map(rider => 
        rider.id === riderId ? { ...rider, is_active: isActive } : rider
      ));
    } catch (err) {
      setError(err.message);
    }
  }, []);

  // Calculate delivery stats for each rider
  const getRiderStats = useCallback((rider) => {
    const deliveries = rider.deliveries || [];
    const completedDeliveries = deliveries.filter(d => d.status === 'delivered').length;
    const pendingDeliveries = deliveries.filter(d => d.status === 'assigned' || d.status === 'picked_up').length;
    const failedDeliveries = deliveries.filter(d => d.status === 'failed').length;
    
    // Calculate average delivery time (if you have timing data)
    const deliveryTimes = deliveries
      .filter(d => d.delivered_at && d.assigned_at)
      .map(d => new Date(d.delivered_at) - new Date(d.assigned_at));
    
    const avgDeliveryTime = deliveryTimes.length > 0 
      ? Math.round(deliveryTimes.reduce((a, b) => a + b, 0) / deliveryTimes.length / (1000 * 60)) // in minutes
      : null;

    return {
      total: deliveries.length,
      completed: completedDeliveries,
      pending: pendingDeliveries,
      failed: failedDeliveries,
      avgDeliveryTime
    };
  }, []);

  // Memoized filtered riders
  const filteredRiders = useMemo(() => {
    if (!searchQuery.trim()) return riders;
    
    const query = searchQuery.toLowerCase().trim();
    return riders.filter(rider =>
      rider.full_name?.toLowerCase().includes(query) ||
      rider.email?.toLowerCase().includes(query) ||
      rider.phone_number?.includes(query) ||
      rider.address?.toLowerCase().includes(query)
    );
  }, [riders, searchQuery]);

  // Memoized stats
  const stats = useMemo(() => {
    const active = riders.filter(r => r.is_active).length;
    let totalDeliveries = 0;
    let completedDeliveries = 0;

    riders.forEach(rider => {
      const stats = getRiderStats(rider);
      totalDeliveries += stats.total;
      completedDeliveries += stats.completed;
    });

    const successRate = totalDeliveries > 0 
      ? Math.round((completedDeliveries / totalDeliveries) * 100) 
      : 0;

    return {
      total: riders.length,
      active,
      inactive: riders.length - active,
      totalDeliveries,
      completedDeliveries,
      successRate
    };
  }, [riders, getRiderStats]);

  const handleSearch = useCallback((query) => {
    setSearchQuery(query);
  }, []);

  const handleEditClick = useCallback((rider) => {
    setSelectedRider(rider);
    setShowEditModal(true);
  }, []);

  const handleCloseEdit = useCallback(() => {
    setShowEditModal(false);
    setSelectedRider(null);
  }, []);

  const handleAddSuccess = useCallback(() => {
    fetchRiders();
  }, [fetchRiders]);

  const handleUpdateSuccess = useCallback(() => {
    fetchRiders();
  }, [fetchRiders]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
        </div>

        {/* Stats Summary Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <StatCardSkeleton key={i} />)}
        </div>

        {/* Search Skeleton */}
        <div className="h-12 bg-gray-200 rounded animate-pulse"></div>

        {/* Riders Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <RiderCardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Rider Management</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-gradient-to-r from-[#0033A0] to-[#ED1C24] text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:opacity-90 transition-opacity"
        >
          <Plus size={18} />
          Add Rider
        </button>
      </div>

      {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-500">Total Riders</p>
          <p className="text-2xl font-bold text-[#0033A0]">{stats.total}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-500">Active Riders</p>
          <p className="text-2xl font-bold text-green-600">{stats.active}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-500">Total Deliveries</p>
          <p className="text-2xl font-bold text-[#ED1C24]">{stats.totalDeliveries}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-500">Success Rate</p>
          <div className="flex items-center">
            <CheckCircle size={20} className="text-green-500 mr-1" />
            <span className="text-2xl font-bold text-gray-900">{stats.successRate}%</span>
          </div>
        </div>
      </div>

      {/* Search */}
      <SearchBar 
        onSearch={handleSearch}
        placeholder="Search riders by name, email, phone, or address..."
        className="w-full"
      />

      {filteredRiders.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Truck size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No riders found</h3>
          <p className="text-gray-500">
            {searchQuery ? "Try adjusting your search" : "No riders have been added yet"}
          </p>
          {!searchQuery && (
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 bg-gradient-to-r from-[#0033A0] to-[#ED1C24] text-white px-6 py-2 rounded-lg hover:opacity-90"
            >
              Add Your First Rider
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRiders.map((rider) => {
            const riderStats = getRiderStats(rider);
            
            return (
              <div key={rider.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-gradient-to-r from-[#0033A0] to-[#ED1C24] rounded-xl flex items-center justify-center text-white font-bold text-xl mr-3 shadow-md">
                      {rider.full_name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{rider.full_name || 'Unnamed'}</h3>
                      <p className="text-sm text-gray-500 flex items-center">
                        <Phone size={12} className="mr-1" />
                        {rider.phone_number || 'No phone'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <span className={`w-3 h-3 rounded-full ${rider.is_active ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="bg-blue-50 p-2 rounded-lg text-center">
                    <p className="text-xs text-gray-600">Total</p>
                    <p className="font-bold text-[#0033A0] text-lg">{riderStats.total}</p>
                  </div>
                  <div className="bg-green-50 p-2 rounded-lg text-center">
                    <p className="text-xs text-gray-600">Completed</p>
                    <p className="font-bold text-green-600 text-lg">{riderStats.completed}</p>
                  </div>
                  <div className="bg-yellow-50 p-2 rounded-lg text-center">
                    <p className="text-xs text-gray-600">Pending</p>
                    <p className="font-bold text-yellow-600 text-lg">{riderStats.pending}</p>
                  </div>
                </div>

                {rider.email && (
                  <div className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">Email:</span> {rider.email}
                  </div>
                )}

                {rider.address && (
                  <div className="flex items-start text-sm text-gray-600 mb-4">
                    <MapPin size={16} className="mr-2 text-gray-400 flex-shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{rider.address}</span>
                  </div>
                )}

                {riderStats.avgDeliveryTime && (
                  <div className="text-xs text-gray-500 mb-4">
                    Avg delivery time: {riderStats.avgDeliveryTime} mins
                  </div>
                )}

                <div className="flex gap-2 pt-4 border-t">
                  <button
                    onClick={() => updateRiderStatus(rider.id, !rider.is_active)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                      rider.is_active
                        ? 'bg-red-50 text-red-600 hover:bg-red-100'
                        : 'bg-green-50 text-green-600 hover:bg-green-100'
                    }`}
                  >
                    {rider.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button 
                    onClick={() => handleEditClick(rider)}
                    className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    title="Edit Rider"
                  >
                    <Edit2 size={18} className="text-gray-600" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <AddRiderModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddSuccess}
      />

      <EditRiderModal
        isOpen={showEditModal}
        onClose={handleCloseEdit}
        rider={selectedRider}
        onUpdate={handleUpdateSuccess}
      />
    </div>
  );
}