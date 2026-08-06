// src/pages/Riders.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Truck, MapPin, Phone, Edit2, Plus, X, CheckCircle, Eye, EyeOff, Calendar, Package, Clock, Navigation, MessageCircle, TrendingUp, Award, DollarSign, BarChart2, ChevronDown, ChevronUp, Star, Download, FileSpreadsheet } from 'lucide-react';
import ErrorAlert from '../components/common/ErrorAlert';
import SearchBar from '../components/common/SearchBar';
import RiderLiveTrackingModal from '../components/RiderLiveTrackingModal';
import { supabase } from '../lib/supabase';
import { chatService } from '../services/chatService';
import { diffObjects, formatChangesDescription } from '../utils/diff';
import { notifySuccess } from '../utils/successNotifier';
import { useAdminLog } from '../hooks/useAdminLog';
import { useAuth } from '../hooks/useAuth';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { getAllRidersWithStats, buildLeaderboard, computePlatformStats, computeRiderStats, resolveDateRange, getStoredPayoutSettlements, setRiderPayoutStatus } from '../services/riderService';
import { exportRiderPayouts } from '../utils/exportUtils';

// Skeleton Components (keep as is)
const RiderCardSkeleton = ({ isDarkMode }) => (
  <div className={`rounded-xl border p-6 animate-pulse transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center">
        <div className={`w-12 h-12 rounded-xl mr-3 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'}`}></div>
        <div className="space-y-2">
          <div className={`h-5 w-32 rounded ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'}`}></div>
          <div className={`h-4 w-24 rounded ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'}`}></div>
        </div>
      </div>
      <div className={`w-3 h-3 rounded-full ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'}`}></div>
    </div>

    <div className="grid grid-cols-2 gap-3 mb-4">
      <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-slate-700' : 'bg-gray-100'}`}>
        <div className={`h-3 w-16 rounded mx-auto mb-1 ${isDarkMode ? 'bg-slate-600' : 'bg-gray-200'}`}></div>
        <div className={`h-5 w-8 rounded mx-auto ${isDarkMode ? 'bg-slate-600' : 'bg-gray-200'}`}></div>
      </div>
      <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-slate-700' : 'bg-gray-100'}`}>
        <div className={`h-3 w-16 rounded mx-auto mb-1 ${isDarkMode ? 'bg-slate-600' : 'bg-gray-200'}`}></div>
        <div className={`h-5 w-8 rounded mx-auto ${isDarkMode ? 'bg-slate-600' : 'bg-gray-200'}`}></div>
      </div>
    </div>

    <div className={`h-4 w-full rounded mb-4 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'}`}></div>

    <div className={`flex gap-2 pt-4 border-t ${isDarkMode ? 'border-slate-700' : ''}`}>
      <div className={`flex-1 h-10 rounded ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'}`}></div>
      <div className={`w-12 h-10 rounded ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'}`}></div>
    </div>
  </div>
);

const StatCardSkeleton = ({ isDarkMode }) => (
  <div className={`p-4 rounded-lg border animate-pulse transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
    <div className={`h-4 w-20 rounded mb-2 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'}`}></div>
    <div className={`h-8 w-16 rounded ${isDarkMode ? 'bg-slate-600' : 'bg-gray-300'}`}></div>
  </div>
);

// Add Rider Modal Component
const AddRiderModal = React.memo(({ isOpen, onClose, onAdd, isDarkMode }) => {
  const { logRiderAction } = useAdminLog();
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone_number: '',
    address: '',
    vehicle_type: '',
    vehicle_plate: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const validateForm = () => {
    if (!formData.full_name.trim()) {
      setError('Full name is required');
      return false;
    }
    if (!formData.email.trim()) {
      setError('Email is required');
      return false;
    }
    if (!formData.email.includes('@')) {
      setError('Please enter a valid email address');
      return false;
    }
    if (!formData.password) {
      setError('Password is required');
      return false;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    if (!formData.phone_number.trim()) {
      setError('Phone number is required');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    setError('');

    try {
      // 1. Create auth user with custom password
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.full_name,
            phone_number: formData.phone_number,
            role: 'rider'  // This goes into raw_user_meta_data
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // IMPORTANT: Wait a moment for the trigger to complete
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 2. Update the profile with additional rider-specific data
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            full_name: formData.full_name,
            phone_number: formData.phone_number,
            address: formData.address,
            vehicle_type: formData.vehicle_type || null,
            vehicle_plate: formData.vehicle_plate?.toUpperCase() || null,
            role: 'rider',  // Explicitly set role to rider
            is_active: true,
            email: formData.email, // If you added email column
            updated_at: new Date().toISOString()
          })
          .eq('id', authData.user.id);

        if (profileError) throw profileError;

        // 3. Show success and close modal
        notifySuccess(`Created rider ${formData.full_name}`);

        await logRiderAction(authData.user.id, 'create_rider', {
          email: formData.email,
          phone_number: formData.phone_number,
          vehicle_type: formData.vehicle_type
        });

        onAdd();
        onClose();
        
        // Reset form
        setFormData({
          full_name: '',
          email: '',
          password: '',
          confirmPassword: '',
          phone_number: '',
          address: '',
          vehicle_type: '',
          vehicle_plate: ''
        });
      }
    } catch (err) {
      console.error('Error creating rider:', err);
      
      // Handle specific error messages
      if (err.message.includes('duplicate key value violates unique constraint')) {
        if (err.message.includes('phone_number')) {
          setError('This phone number is already registered');
        } else if (err.message.includes('email')) {
          setError('This email is already registered');
        } else {
          setError('A rider with this information already exists');
        }
      } else if (err.message.includes('already registered')) {
        setError('This email is already registered');
      } else {
        setError(err.message || 'Failed to create rider account');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm overflow-y-auto">
      <div className={`${isDarkMode ? 'bg-slate-800' : 'bg-white'} rounded-xl max-w-2xl w-full shadow-2xl my-8 transition-colors duration-300`}>
        <div className="bg-petron-blue p-6 flex justify-between items-center sticky top-0">
          <h3 className="text-xl font-bold text-white">Add New Rider</h3>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X size={20} className="text-white" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
          {error && (
            <div className={`${isDarkMode ? 'bg-red-900/30 border-red-700' : 'bg-red-50 border-red-500'} border-l-4 p-4 rounded`}>
              <p className={`text-sm ${isDarkMode ? 'text-red-300' : 'text-red-700'}`}>{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left Column */}
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Full Name <span className="text-red-500">*</span>
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
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#0033A0] outline-none transition-colors duration-300 ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                  placeholder="rider@example.com"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#0033A0] outline-none pr-10 transition-colors duration-300 ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                    placeholder="••••••••"
                    minLength="6"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute right-3 top-1/2 transform -translate-y-1/2 transition-colors duration-300 ${isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <p className={`text-xs mt-1 transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Minimum 6 characters</p>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#0033A0] outline-none pr-10 transition-colors duration-300 ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className={`absolute right-3 top-1/2 transform -translate-y-1/2 transition-colors duration-300 ${isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="phone_number"
                  required
                  value={formData.phone_number}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#0033A0] outline-none transition-colors duration-300 ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                  placeholder="0912 345 6789"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Vehicle Type
                </label>
                <select
                  name="vehicle_type"
                  value={formData.vehicle_type}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#0033A0] outline-none transition-colors duration-300 ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                >
                  <option value="">Select vehicle type</option>
                  <option value="Motorcycle">Motorcycle</option>
                  <option value="Scooter">Scooter</option>
                  <option value="Bicycle">Bicycle</option>
                  <option value="Car">Car</option>
                  <option value="Van">Van</option>
                </select>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Plate Number
                </label>
                <input
                  type="text"
                  name="vehicle_plate"
                  value={formData.vehicle_plate}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#0033A0] outline-none uppercase transition-colors duration-300 ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                  placeholder="ABC-1234"
                  style={{ textTransform: 'uppercase' }}
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
                  placeholder="Rider's complete address"
                />
              </div>
            </div>
          </div>

          {/* Important Note */}
          <div className={`${isDarkMode ? 'bg-blue-900/30' : 'bg-blue-50'} p-4 rounded-lg mt-4 transition-colors duration-300`}>
            <p className={`text-sm transition-colors duration-300 ${isDarkMode ? 'text-blue-300' : 'text-blue-800'}`}>
              <strong>Note:</strong> The rider will use this email and password to log in to the mobile app. 
              Please save these credentials and share them securely with the rider.
            </p>
          </div>

          <div className={`flex gap-3 pt-4 border-t mt-4 transition-colors duration-300 ${isDarkMode ? 'border-slate-700' : 'border-gray-200'}`}>
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
              className="flex-1 py-2.5 bg-petron-blue text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating Account...
                </>
              ) : (
                'Create Rider Account'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

AddRiderModal.displayName = 'AddRiderModal';

// Edit Rider Modal Component
const EditRiderModal = React.memo(({ isOpen, onClose, rider, onUpdate, isDarkMode }) => {
  const { logRiderAction } = useAdminLog();
  const [formData, setFormData] = useState({
    full_name: '',
    phone_number: '',
    address: '',
    vehicle_type: '',
    vehicle_plate: '',
    is_active: true
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (rider) {
      setFormData({
        full_name: rider.full_name || '',
        phone_number: rider.phone_number || '',
        address: rider.address || '',
        vehicle_type: rider.vehicle_type || '',
        vehicle_plate: rider.vehicle_plate || '',
        is_active: rider.is_active !== undefined ? rider.is_active : true
      });
    }
  }, [rider]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
  };

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
          address: formData.address,
          vehicle_type: formData.vehicle_type || null,
          vehicle_plate: formData.vehicle_plate?.toUpperCase() || null,
          is_active: formData.is_active
        })
        .eq('id', rider.id);

      if (error) throw error;

      const changes = diffObjects(
        {
          full_name: rider.full_name,
          phone_number: rider.phone_number,
          address: rider.address,
          vehicle_type: rider.vehicle_type,
          vehicle_plate: rider.vehicle_plate,
          is_active: rider.is_active
        },
        {
          full_name: formData.full_name,
          phone_number: formData.phone_number,
          address: formData.address,
          vehicle_type: formData.vehicle_type,
          vehicle_plate: formData.vehicle_plate,
          is_active: formData.is_active
        }
      );

      const description = formatChangesDescription(changes) || 'Updated rider details';

      await logRiderAction(rider.id, 'update_rider', changes, description);
      notifySuccess(description);

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
      <div className={`${isDarkMode ? 'bg-slate-800' : 'bg-white'} rounded-xl max-w-md w-full shadow-2xl transition-colors duration-300`}>
        <div className="bg-petron-blue p-6 flex justify-between items-center">
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
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Phone Number *
            </label>
            <input
              type="tel"
              name="phone_number"
              required
              value={formData.phone_number}
              onChange={handleChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#0033A0] outline-none transition-colors duration-300 ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Vehicle Type
            </label>
            <select
              name="vehicle_type"
              value={formData.vehicle_type}
              onChange={handleChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#0033A0] outline-none transition-colors duration-300 ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
            >
              <option value="">Select vehicle type</option>
              <option value="Motorcycle">Motorcycle</option>
              <option value="Scooter">Scooter</option>
              <option value="Bicycle">Bicycle</option>
              <option value="Car">Car</option>
              <option value="Van">Van</option>
            </select>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Plate Number
            </label>
            <input
              type="text"
              name="vehicle_plate"
              value={formData.vehicle_plate}
              onChange={handleChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#0033A0] outline-none uppercase transition-colors duration-300 ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
              style={{ textTransform: 'uppercase' }}
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
              rows="2"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              name="is_active"
              id="is_active"
              checked={formData.is_active}
              onChange={handleChange}
              className="rounded border-gray-300 text-[#0033A0] focus:ring-[#0033A0]"
            />
            <label htmlFor="is_active" className={`ml-2 text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Active (can log in and receive deliveries)
            </label>
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
              className="flex-1 py-2.5 bg-petron-blue text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Updating...
                </>
              ) : (
                'Update Rider'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

EditRiderModal.displayName = 'EditRiderModal';

// Reset Password Modal Component
const ResetPasswordModal = React.memo(({ isOpen, onClose, rider, onReset, isDarkMode }) => {
  const { logRiderAction } = useAdminLog();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!newPassword) {
      setError('Password is required');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Update password using admin API (requires service role key)
      const { error } = await supabase.auth.admin.updateUserById(
        rider.id,
        { password: newPassword }
      );

      if (error) throw error;

      notifySuccess('Password reset successfully');
      await logRiderAction(rider.id, 'reset_password');
      onReset();
      onClose();
    } catch (err) {
      console.error('Error resetting password:', err);
      setError(err.message || 'Failed to reset password. Make sure you have admin privileges.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className={`${isDarkMode ? 'bg-slate-800' : 'bg-white'} rounded-xl max-w-md w-full shadow-2xl transition-colors duration-300`}>
        <div className="bg-petron-blue p-6 flex justify-between items-center">
          <h3 className="text-xl font-bold text-white">Reset Password</h3>
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
              Rider
            </label>
            <div className={`${isDarkMode ? 'bg-slate-700' : 'bg-gray-50'} p-3 rounded-lg transition-colors duration-300`}>
              <p className={`font-medium transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{rider?.full_name}</p>
              <p className={`text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{rider?.email}</p>
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              New Password *
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#0033A0] outline-none pr-10 transition-colors duration-300 ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                placeholder="••••••••"
                minLength="6"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={`absolute right-3 top-1/2 transform -translate-y-1/2 transition-colors duration-300 ${isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Confirm New Password *
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#0033A0] outline-none pr-10 transition-colors duration-300 ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className={`absolute right-3 top-1/2 transform -translate-y-1/2 transition-colors duration-300 ${isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className={`${isDarkMode ? 'bg-yellow-900/30' : 'bg-yellow-50'} p-4 rounded-lg transition-colors duration-300`}>
            <p className={`text-sm transition-colors duration-300 ${isDarkMode ? 'text-yellow-300' : 'text-yellow-800'}`}>
              <strong>Note:</strong> Password reset requires admin privileges in Supabase. 
              Make sure your service role key is configured.
            </p>
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
              className="flex-1 py-2.5 bg-petron-blue text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Resetting...
                </>
              ) : (
                'Reset Password'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

ResetPasswordModal.displayName = 'ResetPasswordModal';

// Rider Details Modal Component
const RiderDetailsModal = React.memo(({ rider, onClose, onTrackLive, onChatRider, onAvatarClick, chatInFlight, isDarkMode }) => {
  const stats = useMemo(() => {
    const deliveries = rider?.deliveries || [];
    const completed = deliveries.filter(d => d.status === 'delivered').length;
    const pending = deliveries.filter(d => ['assigned', 'accepted', 'picked_up'].includes(d.status)).length;
    const failed = deliveries.filter(d => d.status === 'failed').length;
    
    return {
      total: deliveries.length,
      completed,
      pending,
      failed
    };
  }, [rider]);

  const perfStats = useMemo(() => computeRiderStats(rider), [rider]);

  if (!rider) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className={`${isDarkMode ? 'bg-slate-800' : 'bg-white'} rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl transition-colors duration-300`}>
        <div className="bg-petron-blue p-6 flex justify-between items-center">
          <h3 className="text-xl font-bold text-white">Rider Details</h3>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X size={20} className="text-white" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          <div className="space-y-6">
            {/* Rider Profile */}
            <div className="flex items-center">
              {rider.avatar_url ? (
                <button
                  type="button"
                  onClick={() => onAvatarClick?.(rider.avatar_url)}
                  className="mr-4 rounded-xl"
                  title="View full image"
                >
                  <img
                    src={rider.avatar_url}
                    alt={rider.full_name}
                    className="w-20 h-20 rounded-xl object-cover border-2 border-gray-200 shadow-lg hover:opacity-90 transition"
                  />
                </button>
              ) : (
                <div className="w-20 h-20 bg-petron-blue rounded-xl flex items-center justify-center text-white font-bold text-3xl mr-4 shadow-lg">
                  {rider.full_name?.charAt(0)?.toUpperCase()}
                </div>
              )}
              <div>
                <h4 className={`text-xl font-bold transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{rider.full_name}</h4>
                <p className={`flex items-center mt-1 transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  <Phone size={14} className="mr-1" />
                  {rider.phone_number || 'No phone'}
                </p>
                <div className="mt-2 flex items-center">
                  <span className={`w-3 h-3 rounded-full mr-2 ${rider.is_active ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  <span className={`text-sm font-medium transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{rider.is_active ? 'Active' : 'Inactive'}</span>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-4 gap-3">
              <div className={`${isDarkMode ? 'bg-slate-700' : 'bg-blue-50'} p-3 rounded-lg text-center transition-colors duration-300`}>
                <Package size={18} className="text-[#0033A0] mx-auto mb-1" />
                <p className={`text-xs transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total</p>
                <p className="font-bold text-[#0033A0] text-lg">{stats.total}</p>
              </div>
              <div className={`${isDarkMode ? 'bg-slate-700' : 'bg-green-50'} p-3 rounded-lg text-center transition-colors duration-300`}>
                <CheckCircle size={18} className="text-green-600 mx-auto mb-1" />
                <p className={`text-xs transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Completed</p>
                <p className="font-bold text-green-600 text-lg">{stats.completed}</p>
              </div>
              <div className={`${isDarkMode ? 'bg-slate-700' : 'bg-yellow-50'} p-3 rounded-lg text-center transition-colors duration-300`}>
                <Clock size={18} className="text-yellow-600 mx-auto mb-1" />
                <p className={`text-xs transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Pending</p>
                <p className="font-bold text-yellow-600 text-lg">{stats.pending}</p>
              </div>
              <div className={`${isDarkMode ? 'bg-slate-700' : 'bg-red-50'} p-3 rounded-lg text-center transition-colors duration-300`}>
                <X size={18} className="text-red-600 mx-auto mb-1" />
                <p className={`text-xs transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Failed</p>
                <p className="font-bold text-red-600 text-lg">{stats.failed}</p>
              </div>
            </div>

            {/* Vehicle Information */}
            <div className="grid grid-cols-2 gap-4">
              <div className={`${isDarkMode ? 'bg-slate-700' : 'bg-gray-50'} p-4 rounded-lg transition-colors duration-300`}>
                <p className={`text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Vehicle Type</p>
                <p className={`font-medium mt-1 transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{rider.vehicle_type || 'N/A'}</p>
              </div>
              <div className={`${isDarkMode ? 'bg-slate-700' : 'bg-gray-50'} p-4 rounded-lg transition-colors duration-300`}>
                <p className={`text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Vehicle Plate</p>
                <p className={`font-medium mt-1 transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{rider.vehicle_plate || 'N/A'}</p>
              </div>
              {rider.address && (
                <div className={`col-span-2 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-50'} p-4 rounded-lg transition-colors duration-300`}>
                  <p className={`text-sm flex items-center transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    <MapPin size={14} className="mr-1" /> Address
                  </p>
                  <p className={`font-medium mt-1 transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{rider.address}</p>
                </div>
              )}
              <div className={`${isDarkMode ? 'bg-slate-700' : 'bg-gray-50'} p-4 rounded-lg transition-colors duration-300`}>
                <p className={`text-sm flex items-center transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  <Calendar size={14} className="mr-1" /> Member Since
                </p>
                <p className={`font-medium mt-1 transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {rider.created_at ? new Date(rider.created_at).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>

            {/* Earnings & Performance */}
            <div className={`rounded-xl p-4 border transition-colors duration-300 ${isDarkMode ? 'bg-slate-700/60 border-slate-600' : 'bg-blue-50/60 border-blue-100'}`}>
              <h5 className={`font-semibold mb-3 flex items-center gap-2 transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                <TrendingUp size={16} className="text-[#0033A0]" />
                Earnings &amp; Performance
              </h5>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className={`rounded-lg p-3 text-center transition-colors duration-300 ${isDarkMode ? 'bg-slate-600' : 'bg-white'}`}>
                  <Star size={16} className="text-amber-400 fill-amber-400 mx-auto mb-1" />
                  <p className={`text-xs mb-0.5 transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Rating</p>
                  <p className="font-bold text-amber-500 text-sm">{perfStats.avgRating > 0 ? `${perfStats.avgRating} ★` : '—'}</p>
                </div>
                <div className={`rounded-lg p-3 text-center transition-colors duration-300 ${isDarkMode ? 'bg-slate-600' : 'bg-white'}`}>
                  <CheckCircle size={16} className="text-[#0033A0] mx-auto mb-1" />
                  <p className={`text-xs mb-0.5 transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Completion Rate</p>
                  <p className="font-bold text-[#0033A0] text-sm">{perfStats.completionRate}%</p>
                </div>
                <div className={`rounded-lg p-3 text-center transition-colors duration-300 ${isDarkMode ? 'bg-slate-600' : 'bg-white'}`}>
                  <Clock size={16} className="text-orange-500 mx-auto mb-1" />
                  <p className={`text-xs mb-0.5 transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Avg. Time</p>
                  <p className="font-bold text-orange-500 text-sm">{perfStats.avgDeliveryTime !== null ? `${perfStats.avgDeliveryTime}m` : '—'}</p>
                </div>
              </div>
              {/* 7-day delivery bar chart */}
              {perfStats.weeklyData && perfStats.weeklyData.length > 0 && (
                <div>
                  <p className={`text-xs mb-2 transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Last 7 Days</p>
                  <div className="flex items-end gap-1 h-16">
                    {(() => {
                      const maxCount = Math.max(...perfStats.weeklyData.map(d => d.count), 1);
                      return perfStats.weeklyData.map((d, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-0.5" title={`${d.label}: ${d.count} deliveries`}>
                          <div
                            className="w-full rounded-t transition-all duration-500 bg-[#0033A0]/70 hover:bg-[#0033A0]"
                            style={{ height: `${Math.max((d.count / maxCount) * 52, d.count > 0 ? 4 : 0)}px` }}
                          />
                          <span className={`text-[9px] transition-colors duration-300 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>{d.day}</span>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              )}
            </div>

            {/* Recent Deliveries */}
            <div>
              <h5 className={`font-semibold mb-3 transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Recent Deliveries</h5>
              {rider.deliveries && rider.deliveries.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                  {rider.deliveries.slice(0, 5).map(delivery => (
                    <div key={delivery.id} className={`flex justify-between items-center p-3 rounded-lg transition-colors duration-150 ${isDarkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-50 hover:bg-gray-100'}`}>
                      <div>
                        <p className={`font-medium transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Order #{delivery.order_id}</p>
                        <p className={`text-xs transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{new Date(delivery.assigned_at).toLocaleDateString()}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        delivery.status === 'delivered' ? (isDarkMode ? 'bg-green-900/50 text-green-300' : 'bg-green-100 text-green-700') :
                        delivery.status === 'picked_up' ? (isDarkMode ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-700') :
                        delivery.status === 'accepted' ? (isDarkMode ? 'bg-cyan-900/50 text-cyan-300' : 'bg-cyan-100 text-cyan-700') :
                        delivery.status === 'assigned' ? (isDarkMode ? 'bg-yellow-900/50 text-yellow-300' : 'bg-yellow-100 text-yellow-700') :
                        delivery.status === 'failed' ? (isDarkMode ? 'bg-red-900/50 text-red-300' : 'bg-red-100 text-red-700') :
                        (isDarkMode ? 'bg-slate-600 text-gray-300' : 'bg-gray-100 text-gray-700')
                      }`}>
                        {delivery.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`p-4 rounded-lg text-center transition-colors duration-300 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-50'}`}>
                  <Truck size={24} className={`mx-auto mb-2 transition-colors duration-300 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                  <p className={`text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>No deliveries yet</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className={`flex flex-col sm:flex-row gap-3 pt-6 border-t mt-6 transition-colors duration-300 ${isDarkMode ? 'border-slate-700' : 'border-gray-200'}`}>
              <button
                onClick={onClose}
                className={`flex-1 py-2.5 border rounded-lg transition-colors duration-300 ${isDarkMode ? 'border-slate-600 text-gray-300 hover:bg-slate-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
              >
                Close
              </button>
              {onChatRider && (
                <button
                  onClick={() => onChatRider(rider)}
                  disabled={Boolean(chatInFlight)}
                  className="flex-1 py-2.5 bg-[#0033A0] text-white rounded-lg hover:bg-[#0A3DB6] transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <MessageCircle size={18} />
                  {chatInFlight ? 'Opening...' : 'Chat Rider'}
                </button>
              )}
              {onTrackLive && (
                <button
                  onClick={() => {
                    onTrackLive(rider);
                    onClose();
                  }}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Navigation size={18} />
                  Track Live
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

RiderDetailsModal.displayName = 'RiderDetailsModal';

// ─── Performance Dashboard ───────────────────────────────────────────────────

const DATE_RANGES = [
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: '30days', label: 'Last 30 Days' },
];

const RANK_EMOJI = { 1: '🥇', 2: '🥈', 3: '🥉' };

const PerformanceDashboard = React.memo(({ isDarkMode }) => {
  const [perfRiders, setPerfRiders] = useState([]);
  const [perfLoading, setPerfLoading] = useState(true);
  const [perfError, setPerfError] = useState(null);
  const [dateRangeKey, setDateRangeKey] = useState('30days');
  const [expandedRiderId, setExpandedRiderId] = useState(null);
  const [sortCol, setSortCol] = useState('score');
  const [sortDir, setSortDir] = useState('desc');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setPerfLoading(true);
      setPerfError(null);
      const { data, error } = await getAllRidersWithStats();
      if (cancelled) return;
      if (error) { setPerfError(error.message); setPerfLoading(false); return; }
      setPerfRiders(data || []);
      setPerfLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const dateFilter = useMemo(() => resolveDateRange(dateRangeKey), [dateRangeKey]);

  const leaderboard = useMemo(() => buildLeaderboard(perfRiders, dateFilter), [perfRiders, dateFilter]);

  const platformStats = useMemo(() => computePlatformStats(leaderboard), [leaderboard]);

  const sorted = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...leaderboard].sort((a, b) => {
      if (sortCol === 'score') return dir * (a.score - b.score);
      if (sortCol === 'total') return dir * (a.stats.total - b.stats.total);
      if (sortCol === 'rate') return dir * (a.stats.completionRate - b.stats.completionRate);
      if (sortCol === 'time') return dir * ((a.stats.avgDeliveryTime ?? 9999) - (b.stats.avgDeliveryTime ?? 9999));
      if (sortCol === 'earnings') return dir * (a.stats.earnings - b.stats.earnings);
      return 0;
    });
  }, [leaderboard, sortCol, sortDir]);

  const toggleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('desc'); }
  };

  const SortIcon = ({ col }) => {
    if (sortCol !== col) return <ChevronDown size={12} className="opacity-30 inline ml-0.5" />;
    return sortDir === 'desc'
      ? <ChevronDown size={12} className="inline ml-0.5 text-[#0033A0]" />
      : <ChevronUp size={12} className="inline ml-0.5 text-[#0033A0]" />;
  };

  if (perfLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className={`h-24 rounded-xl animate-pulse ${isDarkMode ? 'bg-slate-700' : 'bg-gray-100'}`} />)}
        </div>
        <div className={`h-64 rounded-xl animate-pulse ${isDarkMode ? 'bg-slate-700' : 'bg-gray-100'}`} />
      </div>
    );
  }

  if (perfError) {
    return <ErrorAlert message={perfError} onDismiss={() => setPerfError(null)} />;
  }

  return (
    <div className="space-y-6">
      {/* Date range tabs */}
      <div className={`flex gap-2 p-1 rounded-xl w-fit transition-colors duration-300 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-100'}`}>
        {DATE_RANGES.map(r => (
          <button
            key={r.key}
            onClick={() => setDateRangeKey(r.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              dateRangeKey === r.key
                ? 'bg-[#0033A0] text-white shadow-md'
                : (isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900')
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Platform-wide stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Deliveries', value: platformStats.totalDeliveries, icon: Package, color: 'text-[#0033A0]' },
          { label: 'Avg Completion Rate', value: `${platformStats.avgCompletionRate}%`, icon: CheckCircle, color: 'text-green-500' },
          { label: 'Avg Delivery Time', value: platformStats.avgDeliveryTime !== null ? `${platformStats.avgDeliveryTime} min` : '—', icon: Clock, color: 'text-orange-500' },
          { label: 'Total Earnings Paid', value: `₱${platformStats.totalEarnings.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: DollarSign, color: 'text-emerald-500' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className={`p-4 rounded-xl border transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center gap-2 mb-1">
              <Icon size={16} className={color} />
              <p className={`text-xs transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{label}</p>
            </div>
            <p className={`text-xl font-bold transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Leaderboard */}
      <div className={`rounded-xl border overflow-hidden transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
        <div className={`flex items-center gap-2 px-4 py-3 border-b transition-colors duration-300 ${isDarkMode ? 'border-slate-700' : 'border-gray-100'}`}>
          <Award size={18} className="text-[#0033A0]" />
          <h3 className={`font-semibold transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Rider Leaderboard</h3>
          <span className={`ml-auto text-xs transition-colors duration-300 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>{sorted.length} riders</span>
        </div>

        {sorted.length === 0 ? (
          <div className="p-10 text-center">
            <Truck size={36} className={`mx-auto mb-3 ${isDarkMode ? 'text-gray-600' : 'text-gray-300'}`} />
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>No delivery data for this period</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={`border-b transition-colors duration-300 ${isDarkMode ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
                  <th className={`text-left px-4 py-2.5 font-medium transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Rank</th>
                  <th className={`text-left px-4 py-2.5 font-medium transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Rider</th>
                  <th className={`text-center px-3 py-2.5 font-medium cursor-pointer select-none transition-colors duration-300 ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-800'}`} onClick={() => toggleSort('total')}>Deliveries<SortIcon col="total" /></th>
                  <th className={`text-center px-3 py-2.5 font-medium cursor-pointer select-none transition-colors duration-300 ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-800'}`} onClick={() => toggleSort('rate')}>Rate<SortIcon col="rate" /></th>
                  <th className={`text-center px-3 py-2.5 font-medium cursor-pointer select-none transition-colors duration-300 ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-800'}`} onClick={() => toggleSort('rating')}>Rating<SortIcon col="rating" /></th>
                  <th className={`text-center px-3 py-2.5 font-medium cursor-pointer select-none transition-colors duration-300 ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-800'}`} onClick={() => toggleSort('time')}>Avg Time<SortIcon col="time" /></th>
                  <th className={`text-right px-4 py-2.5 font-medium cursor-pointer select-none transition-colors duration-300 ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-800'}`} onClick={() => toggleSort('earnings')}>Earnings<SortIcon col="earnings" /></th>
                  <th className={`text-center px-3 py-2.5 font-medium cursor-pointer select-none transition-colors duration-300 ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-800'}`} onClick={() => toggleSort('score')}>Score<SortIcon col="score" /></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(({ rider, stats, score, rank }) => {
                  const isExpanded = expandedRiderId === rider.id;
                  const maxBar = Math.max(...sorted.map(e => e.stats.total), 1);
                  return (
                    <React.Fragment key={rider.id}>
                      <tr
                        className={`border-b cursor-pointer transition-colors duration-150 ${
                          isDarkMode
                            ? `border-slate-700 ${isExpanded ? 'bg-slate-700/60' : 'hover:bg-slate-700/40'}`
                            : `border-gray-50 ${isExpanded ? 'bg-blue-50/60' : 'hover:bg-gray-50'}`
                        }`}
                        onClick={() => setExpandedRiderId(isExpanded ? null : rider.id)}
                      >
                        <td className="px-4 py-3">
                          <span className="text-base">{RANK_EMOJI[rank] || <span className={`font-bold text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>#{rank}</span>}</span>
                          {!RANK_EMOJI[rank] && <span className={`font-bold text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>#{rank}</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {rider.avatar_url
                              ? <img src={rider.avatar_url} alt={rider.full_name} className="w-8 h-8 rounded-lg object-cover" />
                              : <div className="w-8 h-8 bg-[#0033A0] rounded-lg flex items-center justify-center text-white font-bold text-xs">{rider.full_name?.charAt(0)?.toUpperCase() || '?'}</div>
                            }
                            <div>
                              <p className={`font-medium leading-tight transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{rider.full_name}</p>
                              <p className={`text-xs transition-colors duration-300 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>{rider.vehicle_type || 'Rider'}</p>
                            </div>
                            <span className={`ml-1 w-2 h-2 rounded-full flex-shrink-0 ${rider.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className={`font-semibold transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{stats.total}</span>
                            <div className={`h-1 w-12 rounded-full ${isDarkMode ? 'bg-slate-600' : 'bg-gray-200'}`}>
                              <div className="h-1 rounded-full bg-[#0033A0]" style={{ width: `${Math.min((stats.total / maxBar) * 100, 100)}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            stats.completionRate >= 90 ? (isDarkMode ? 'bg-green-900/50 text-green-300' : 'bg-green-100 text-green-700') :
                            stats.completionRate >= 70 ? (isDarkMode ? 'bg-yellow-900/50 text-yellow-300' : 'bg-yellow-100 text-yellow-700') :
                            (isDarkMode ? 'bg-red-900/50 text-red-300' : 'bg-red-100 text-red-700')
                          }`}>{stats.completionRate}%</span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 inline-flex items-center gap-1">
                            <Star size={11} className="fill-amber-400 text-amber-400" />
                            {stats.avgRating > 0 ? stats.avgRating : '—'}
                          </span>
                        </td>
                        <td className={`px-3 py-3 text-center transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          {stats.avgDeliveryTime !== null ? `${stats.avgDeliveryTime} min` : '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-semibold text-emerald-600">₱{stats.earnings.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <div className={`h-1.5 rounded-full ${isDarkMode ? 'bg-slate-600' : 'bg-gray-200'}`} style={{ width: '40px' }}>
                              <div className="h-1.5 rounded-full bg-gradient-to-r from-[#0033A0] to-blue-400" style={{ width: `${score}%` }} />
                            </div>
                            <span className={`text-xs font-bold transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{score}</span>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className={`border-b transition-colors duration-300 ${isDarkMode ? 'border-slate-700 bg-slate-700/30' : 'border-gray-100 bg-blue-50/40'}`}>
                          <td colSpan={7} className="px-6 py-4">
                            <div className="flex items-end gap-1 h-16">
                              {(() => {
                                const weeklyData = stats.weeklyData || [];
                                const maxCount = Math.max(...weeklyData.map(d => d.count), 1);
                                return weeklyData.map((d, i) => (
                                  <div key={i} className="flex-1 flex flex-col items-center gap-0.5" title={`${d.label}: ${d.count} deliveries · ₱${d.earnings.toFixed(2)}`}>
                                    <div
                                      className="w-full rounded-t bg-[#0033A0]/60 hover:bg-[#0033A0] transition-all duration-300"
                                      style={{ height: `${Math.max((d.count / maxCount) * 48, d.count > 0 ? 4 : 0)}px` }}
                                    />
                                    <span className={`text-[9px] ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>{d.day}</span>
                                  </div>
                                ));
                              })()}
                            </div>
                            <div className="flex gap-6 mt-3">
                              <span className={`text-xs transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                ✅ Completed: <strong className={isDarkMode ? 'text-white' : 'text-gray-900'}>{stats.completed}</strong>
                              </span>
                              <span className={`text-xs transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                ❌ Failed: <strong className="text-red-500">{stats.failed}</strong>
                              </span>
                              <span className={`text-xs transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                ⏳ Pending: <strong className="text-yellow-500">{stats.pending}</strong>
                              </span>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
});
// Rider Payouts & Settlement Tracker Component
const RiderPayoutsTracker = React.memo(({ riders, isDarkMode }) => {
  const [settlements, setSettlements] = useState(() => getStoredPayoutSettlements());
  const [filterPreset, setFilterPreset] = useState('month'); // 'week' | 'month' | '30days' | 'all'

  const dateFilter = useMemo(() => {
    if (filterPreset === 'all') return null;
    return resolveDateRange(filterPreset);
  }, [filterPreset]);

  const payoutRows = useMemo(() => {
    return riders.map((rider) => {
      const stats = computeRiderStats(rider, dateFilter);
      const record = settlements[rider.id] || { status: 'pending', settled_at: null };
      return {
        rider,
        stats,
        payoutStatus: record.status || 'pending',
        settledAt: record.settled_at,
      };
    });
  }, [riders, dateFilter, settlements]);

  const totals = useMemo(() => {
    let totalGross = 0;
    let totalSettled = 0;
    let totalPending = 0;

    payoutRows.forEach((r) => {
      totalGross += r.stats.earnings;
      if (r.payoutStatus === 'settled') {
        totalSettled += r.stats.earnings;
      } else {
        totalPending += r.stats.earnings;
      }
    });

    return { totalGross, totalSettled, totalPending };
  }, [payoutRows]);

  const handleToggleStatus = (riderId, currentStatus, riderName) => {
    const nextStatus = currentStatus === 'settled' ? 'pending' : 'settled';
    const updated = setRiderPayoutStatus(riderId, nextStatus);
    setSettlements({ ...updated });
    notifySuccess(`Payout status for ${riderName} updated to ${nextStatus.toUpperCase()}`);
  };

  return (
    <div className="space-y-6">
      {/* 3 Top Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`p-4 rounded-xl border transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
          <div className="flex justify-between items-center mb-1">
            <p className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total Delivery Fees Owed</p>
            <DollarSign size={18} className="text-blue-500" />
          </div>
          <p className="text-2xl font-extrabold text-blue-600">
            ₱{totals.totalGross.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Cumulative delivery fee earnings across riders</p>
        </div>

        <div className={`p-4 rounded-xl border transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
          <div className="flex justify-between items-center mb-1">
            <p className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Pending Payouts</p>
            <Clock size={18} className="text-amber-500" />
          </div>
          <p className="text-2xl font-extrabold text-amber-500">
            ₱{totals.totalPending.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Fees waiting for cashier/admin settlement</p>
        </div>

        <div className={`p-4 rounded-xl border transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
          <div className="flex justify-between items-center mb-1">
            <p className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Settled Payouts</p>
            <CheckCircle size={18} className="text-emerald-500" />
          </div>
          <p className="text-2xl font-extrabold text-emerald-600">
            ₱{totals.totalSettled.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Completed settlements disbursed to riders</p>
        </div>
      </div>

      {/* Date Filter & Table Header */}
      <div className={`p-6 rounded-xl border transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
        <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
          <div>
            <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Rider Payout & Settlement Statement</h3>
            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Track individual rider earnings, completed deliveries, and settlement statuses</p>
          </div>

          <div className="flex items-center gap-2">
            <label className={`text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Time Period:</label>
            <select
              value={filterPreset}
              onChange={(e) => setFilterPreset(e.target.value)}
              className={`px-3 py-1.5 border rounded-lg text-sm font-medium outline-none transition-colors duration-300 ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-800'}`}
            >
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="30days">Last 30 Days</option>
              <option value="all">All Time</option>
            </select>
          </div>
        </div>

        {/* Payout Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className={`text-xs uppercase border-b transition-colors duration-300 ${isDarkMode ? 'bg-slate-700/50 border-slate-700 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
              <tr>
                <th className="px-4 py-3">Rider Name</th>
                <th className="px-4 py-3 text-center">Vehicle</th>
                <th className="px-4 py-3 text-center">Completed Deliveries</th>
                <th className="px-4 py-3 text-right">Gross Delivery Fee (₱)</th>
                <th className="px-4 py-3 text-center">Settlement Status</th>
                <th className="px-4 py-3 text-center">Last Settled Date</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {payoutRows.map(({ rider, stats, payoutStatus, settledAt }) => (
                <tr key={rider.id} className={`transition-colors duration-150 ${isDarkMode ? 'hover:bg-slate-700/40' : 'hover:bg-gray-50'}`}>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      {rider.avatar_url ? (
                        <img src={rider.avatar_url} alt={rider.full_name} className="w-9 h-9 rounded-lg object-cover" />
                      ) : (
                        <div className="w-9 h-9 bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold text-sm">
                          {rider.full_name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                      )}
                      <div>
                        <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{rider.full_name}</p>
                        <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{rider.phone_number || rider.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${isDarkMode ? 'bg-slate-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                      {rider.vehicle_type || 'Rider'} ({rider.vehicle_plate || 'N/A'})
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-center font-semibold">
                    {stats.completed}
                  </td>
                  <td className="px-4 py-3.5 text-right font-bold text-emerald-600">
                    ₱{stats.earnings.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    {payoutStatus === 'settled' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                        <CheckCircle size={12} /> Settled
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                        <Clock size={12} /> Pending
                      </span>
                    )}
                  </td>
                  <td className={`px-4 py-3.5 text-center text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {settledAt ? new Date(settledAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <button
                      onClick={() => handleToggleStatus(rider.id, payoutStatus, rider.full_name)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition shadow-sm ${
                        payoutStatus === 'settled'
                          ? 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600'
                          : 'bg-emerald-600 text-white hover:bg-emerald-700'
                      }`}
                    >
                      {payoutStatus === 'settled' ? 'Mark Pending' : 'Mark Settled'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
});
RiderPayoutsTracker.displayName = 'RiderPayoutsTracker';

// ─── Main Riders Page ─────────────────────────────────────────────────────────

export default function Riders() {
  const { isDarkMode } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const handledFocusNonceRef = useRef(null);
  const { logRiderAction } = useAdminLog();
  const [activeTab, setActiveTab] = useState('riders');
  const [riders, setRiders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [showRiderDetailsModal, setShowRiderDetailsModal] = useState(false);
  const [showRiderLiveTrackingModal, setShowRiderLiveTrackingModal] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState(null);
  const [selectedRider, setSelectedRider] = useState(null);
  const [selectedRiderForDetails, setSelectedRiderForDetails] = useState(null);
  const [selectedRiderForTracking, setSelectedRiderForTracking] = useState(null);
  const [statusUpdateInFlight, setStatusUpdateInFlight] = useState({});
  const [chatInFlightRiderId, setChatInFlightRiderId] = useState(null);

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
    const focusRiderId = location.state?.focusRiderId;
    const focusNonce = location.state?.focusNonce;
    if (!focusRiderId || !riders?.length || !focusNonce) return;
    if (handledFocusNonceRef.current === focusNonce) return;

    const targetRider = riders.find((r) => r.id === focusRiderId);
    if (!targetRider) return;

    handledFocusNonceRef.current = focusNonce;
    setSelectedRiderForDetails(targetRider);
    setShowRiderDetailsModal(true);

    navigate(location.pathname, { replace: true, state: {} });
  }, [location.pathname, location.state?.focusNonce, location.state?.focusRiderId, navigate, riders]);

  const fetchRiders = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
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

    const ridersSubscription = supabase
      .channel('riders-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: 'role=eq.rider' }, () => {
        fetchRiders(true);
      })
      .subscribe();

    const deliveriesSubscription = supabase
      .channel('deliveries-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deliveries' }, () => {
        fetchRiders(true);
      })
      .subscribe();

    return () => {
      ridersSubscription.unsubscribe();
      deliveriesSubscription.unsubscribe();
    };
  }, [fetchRiders]);

  const updateRiderStatus = useCallback(async (riderId, isActive) => {
    try {
      setStatusUpdateInFlight((prev) => ({ ...prev, [riderId]: true }));
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

      await logRiderAction(riderId, isActive ? 'activate_rider' : 'deactivate_rider', { is_active: isActive });
      notifySuccess(isActive ? 'Rider activated' : 'Rider deactivated');
    } catch (err) {
      setError(err.message);
    } finally {
      setStatusUpdateInFlight((prev) => ({ ...prev, [riderId]: false }));
    }
  }, [logRiderAction]);

  // Calculate delivery stats for each rider
  const getRiderStats = useCallback((rider) => {
    const deliveries = rider.deliveries || [];
    const completedDeliveries = deliveries.filter(d => d.status === 'delivered').length;
    const pendingDeliveries = deliveries.filter(d => d.status === 'assigned' || d.status === 'picked_up').length;
    const failedDeliveries = deliveries.filter(d => d.status === 'failed').length;
    
    // Calculate average delivery time
    const deliveryTimes = deliveries
      .filter(d => d.delivered_at && d.assigned_at)
      .map(d => new Date(d.delivered_at) - new Date(d.assigned_at));
    
    const avgDeliveryTime = deliveryTimes.length > 0 
      ? Math.round(deliveryTimes.reduce((a, b) => a + b, 0) / deliveryTimes.length / (1000 * 60))
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
      rider.phone_number?.includes(query) ||
      rider.address?.toLowerCase().includes(query) ||
      rider.vehicle_type?.toLowerCase().includes(query) ||
      rider.vehicle_plate?.toLowerCase().includes(query)
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

  const handleResetPasswordClick = useCallback((rider) => {
    setSelectedRider(rider);
    setShowResetPasswordModal(true);
  }, []);

  const handleViewRiderDetails = useCallback((rider) => {
    setSelectedRiderForDetails(rider);
    setShowRiderDetailsModal(true);
  }, []);

  const handleTrackRiderLive = useCallback((rider) => {
    setSelectedRiderForTracking(rider);
    setShowRiderLiveTrackingModal(true);
  }, []);

  const handleChatRider = useCallback(async (rider) => {
    if (!user?.id || !rider?.id) {
      setError('Sign in again to start a chat.');
      return;
    }

    try {
      setChatInFlightRiderId(rider.id);
      setError(null);

      const result = await chatService.getOrCreateAdminRiderConversation(user.id, rider.id);
      if (!result.success) {
        throw new Error(result.error || 'Failed to open chat');
      }

      navigate(`/chat/${result.conversation.id}`, {
        state: {
          backTo: '/riders'
        }
      });
    } catch (err) {
      setError(err.message || 'Failed to open rider chat');
    } finally {
      setChatInFlightRiderId(null);
    }
  }, [navigate, user?.id]);

  const handleCloseEdit = useCallback(() => {
    setShowEditModal(false);
    setSelectedRider(null);
  }, []);

  const handleCloseResetPassword = useCallback(() => {
    setShowResetPasswordModal(false);
    setSelectedRider(null);
  }, []);

  const handleAddSuccess = useCallback(() => {
    fetchRiders();
  }, [fetchRiders]);

  const handleUpdateSuccess = async () => {
    await supabase
      .from('notifications')
      .insert({
        user_id: selectedRider.id,
        type: 'system',
        title: 'Profile Updated',
        message: 'Your profile has been updated by admin',
        data: { refresh: true }
      });
    
    fetchRiders();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
        </div>

        {/* Stats Summary Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <StatCardSkeleton key={i} isDarkMode={isDarkMode} />)}
        </div>

        {/* Search Skeleton */}
        <div className={`h-12 rounded animate-pulse ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'}`}></div>

        {/* Riders Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <RiderCardSkeleton key={i} isDarkMode={isDarkMode} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h2 className={`text-2xl font-bold transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Rider Management</h2>
          {/* Tab switcher */}
          <div className={`flex gap-1 mt-2 p-1 rounded-lg w-fit transition-colors duration-300 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-100'}`}>
            <button
              id="riders-tab-riders"
              onClick={() => setActiveTab('riders')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-sm font-medium transition-all duration-200 ${
                activeTab === 'riders'
                  ? 'bg-[#0033A0] text-white shadow-sm'
                  : (isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900')
              }`}
            >
              <Truck size={14} /> Riders
            </button>
            <button
              id="riders-tab-performance"
              onClick={() => setActiveTab('performance')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-sm font-medium transition-all duration-200 ${
                activeTab === 'performance'
                  ? 'bg-[#0033A0] text-white shadow-sm'
                  : (isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900')
              }`}
            >
              <BarChart2 size={14} /> Performance
            </button>
            <button
              id="riders-tab-payouts"
              onClick={() => setActiveTab('payouts')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-sm font-medium transition-all duration-200 ${
                activeTab === 'payouts'
                  ? 'bg-[#0033A0] text-white shadow-sm'
                  : (isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900')
              }`}
            >
              <DollarSign size={14} /> Payouts & Settlement
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              const lb = buildLeaderboard(riders);
              exportRiderPayouts(lb, 'csv');
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg text-sm transition-colors shadow-sm"
            title="Export Rider Payout Statement to CSV"
          >
            <Download size={16} />
            <span>Export Payouts (CSV)</span>
          </button>

          <button
            onClick={() => {
              const lb = buildLeaderboard(riders);
              exportRiderPayouts(lb, 'excel');
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-green-700 hover:bg-green-800 text-white font-medium rounded-lg text-sm transition-colors shadow-sm"
            title="Export Rider Payout Statement to Excel"
          >
            <FileSpreadsheet size={16} />
            <span>Export Excel</span>
          </button>

          {activeTab === 'riders' && (
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-petron-blue text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:opacity-90 transition-opacity text-sm font-medium"
            >
              <Plus size={18} />
              Add Rider
            </button>
          )}
        </div>
      </div>

      {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

      {activeTab === 'performance' ? (
        <PerformanceDashboard isDarkMode={isDarkMode} />
      ) : activeTab === 'payouts' ? (
        <RiderPayoutsTracker riders={riders} isDarkMode={isDarkMode} />
      ) : (
        <>
          {/* Stats Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className={`p-4 rounded-lg border transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
              <p className={`text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total Riders</p>
              <p className="text-2xl font-bold text-[#0033A0]">{stats.total}</p>
            </div>
            <div className={`p-4 rounded-lg border transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
              <p className={`text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Active Riders</p>
              <p className="text-2xl font-bold text-green-600">{stats.active}</p>
            </div>
            <div className={`p-4 rounded-lg border transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
              <p className={`text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total Deliveries</p>
              <p className="text-2xl font-bold text-[#ED1C24]">{stats.totalDeliveries}</p>
            </div>
            <div className={`p-4 rounded-lg border transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
              <p className={`text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Success Rate</p>
              <div className="flex items-center">
                <CheckCircle size={20} className="text-green-500 mr-1" />
                <span className={`text-2xl font-bold transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{stats.successRate}%</span>
              </div>
            </div>
          </div>

          {/* Search */}
          <SearchBar 
            onSearch={handleSearch}
            placeholder="Search riders by name, phone, vehicle, or address..."
            className="w-full"
          />

          {filteredRiders.length === 0 ? (
        <div className={`rounded-xl border p-12 text-center transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
          <Truck size={48} className={`mx-auto mb-4 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
          <h3 className={`text-lg font-medium mb-2 transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>No riders found</h3>
          <p className={`transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {searchQuery ? "Try adjusting your search" : "No riders have been added yet"}
          </p>
          {!searchQuery && (
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 bg-petron-blue text-white px-6 py-2 rounded-lg hover:opacity-90"
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
              <div key={rider.id} className={`rounded-xl shadow-sm border p-6 hover:shadow-md transition-all duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    {rider.avatar_url ? (
                      <button
                        type="button"
                        onClick={() => setPreviewImageUrl(rider.avatar_url)}
                        className="mr-3 rounded-xl"
                        title="View full image"
                      >
                        <img
                          src={rider.avatar_url}
                          alt={rider.full_name}
                          className="w-12 h-12 rounded-xl object-cover shadow-md border-2 border-gray-100 hover:opacity-90 transition"
                        />
                      </button>
                    ) : (
                      <div className="w-12 h-12 bg-petron-blue rounded-xl flex items-center justify-center text-white font-bold text-xl mr-3 shadow-md">
                        {rider.full_name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                    )}
                    <div>
                      <h3 className={`font-bold transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{rider.full_name || 'Unnamed'}</h3>
                      <p className={`text-sm flex items-center transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        <Phone size={12} className="mr-1" />
                        {rider.phone_number || 'No phone'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <span className={`w-3 h-3 rounded-full ${rider.is_active ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                    <span className={`ml-2 text-xs font-medium transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{rider.is_active ? 'Active' : 'Inactive'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className={`p-2 rounded-lg text-center transition-colors duration-300 ${isDarkMode ? 'bg-slate-700' : 'bg-blue-50'}`}>
                    <p className={`text-xs transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total</p>
                    <p className="font-bold text-[#0033A0] text-lg">{riderStats.total}</p>
                  </div>
                  <div className={`p-2 rounded-lg text-center transition-colors duration-300 ${isDarkMode ? 'bg-slate-700' : 'bg-green-50'}`}>
                    <p className={`text-xs transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Completed</p>
                    <p className="font-bold text-green-600 text-lg">{riderStats.completed}</p>
                  </div>
                  <div className={`p-2 rounded-lg text-center transition-colors duration-300 ${isDarkMode ? 'bg-slate-700' : 'bg-yellow-50'}`}>
                    <p className={`text-xs transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Pending</p>
                    <p className="font-bold text-yellow-600 text-lg">{riderStats.pending}</p>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  {rider.email && (
                    <div className={`text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      <span className="font-medium">Email:</span> {rider.email}
                    </div>
                  )}
                  
                  {rider.vehicle_type && (
                    <div className={`text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      <span className="font-medium">Vehicle:</span> {rider.vehicle_type} 
                      {rider.vehicle_plate && ` (${rider.vehicle_plate})`}
                    </div>
                  )}

                  {rider.address && (
                    <div className={`flex items-start text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      <MapPin size={16} className={`mr-2 flex-shrink-0 mt-0.5 transition-colors duration-300 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                      <span className="line-clamp-2">{rider.address}</span>
                    </div>
                  )}

                  <div className={`text-xs flex items-center transition-colors duration-300 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                    <Calendar size={12} className="mr-1" />
                    Joined: {new Date(rider.created_at).toLocaleDateString()}
                  </div>

                  {riderStats.avgDeliveryTime && (
                    <div className={`text-xs transition-colors duration-300 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                      Avg delivery time: {riderStats.avgDeliveryTime} mins
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 pt-4 border-t">
                  <button
                    onClick={() => updateRiderStatus(rider.id, !rider.is_active)}
                    disabled={Boolean(statusUpdateInFlight[rider.id])}
                    className={`flex-1 min-w-[120px] py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                      rider.is_active
                        ? (isDarkMode ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50' : 'bg-red-50 text-red-600 hover:bg-red-100')
                        : (isDarkMode ? 'bg-green-900/30 text-green-400 hover:bg-green-900/50' : 'bg-green-50 text-green-600 hover:bg-green-100')
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {statusUpdateInFlight[rider.id] ? 'Updating...' : (rider.is_active ? 'Deactivate' : 'Activate')}
                  </button>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleResetPasswordClick(rider)}
                      className={`p-2 border rounded-lg transition-colors ${isDarkMode ? 'border-slate-700 text-gray-400 hover:bg-slate-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                      title="Reset Password"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-theme-secondary">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                      </svg>
                    </button>
                    <button 
                      onClick={() => handleEditClick(rider)}
                      className={`p-2 border rounded-lg transition-colors ${isDarkMode ? 'border-slate-700 text-gray-400 hover:bg-slate-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                      title="Edit Rider"
                    >
                      <Edit2 size={18} className="text-theme-secondary" />
                    </button>
                    <button 
                      onClick={() => handleViewRiderDetails(rider)}
                      className={`p-2 border rounded-lg transition-colors ${isDarkMode ? 'border-slate-700 text-gray-400 hover:bg-slate-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                      title="View Details"
                    >
                      <Eye size={18} className="text-theme-secondary" />
                    </button>
                    <button 
                      onClick={() => handleChatRider(rider)}
                      disabled={chatInFlightRiderId === rider.id}
                      className={`p-2 border rounded-lg transition-colors disabled:opacity-60 ${isDarkMode ? 'border-slate-700 text-[#0033A0] hover:bg-slate-800' : 'border-gray-200 text-[#0033A0] hover:bg-blue-50'}`}
                      title="Chat Rider"
                    >
                      <MessageCircle size={18} />
                    </button>
                    <button 
                      onClick={() => handleTrackRiderLive(rider)}
                      className={`p-2 border rounded-lg transition-colors ${isDarkMode ? 'border-slate-700 text-blue-400 hover:bg-slate-800' : 'border-gray-200 text-blue-600 hover:bg-blue-50'}`}
                      title="Track Live Location"
                    >
                      <Navigation size={18} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  )}

      {/* Modals */}
      <AddRiderModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddSuccess}
        isDarkMode={isDarkMode}
      />

      <EditRiderModal
        isOpen={showEditModal}
        onClose={handleCloseEdit}
        rider={selectedRider}
        onUpdate={handleUpdateSuccess}
        isDarkMode={isDarkMode}
      />

      <ResetPasswordModal
        isOpen={showResetPasswordModal}
        onClose={handleCloseResetPassword}
        rider={selectedRider}
        onReset={handleUpdateSuccess}
        isDarkMode={isDarkMode}
      />

      {showRiderDetailsModal && (
        <RiderDetailsModal
          rider={selectedRiderForDetails}
          onClose={() => {
            setShowRiderDetailsModal(false);
            setSelectedRiderForDetails(null);
          }}
          onTrackLive={handleTrackRiderLive}
          onChatRider={(rider) => {
            setShowRiderDetailsModal(false);
            setSelectedRiderForDetails(null);
            handleChatRider(rider);
          }}
          chatInFlight={chatInFlightRiderId === selectedRiderForDetails?.id}
          onAvatarClick={setPreviewImageUrl}
          isDarkMode={isDarkMode}
        />
      )}

      <RiderLiveTrackingModal
        isOpen={showRiderLiveTrackingModal}
        onClose={() => {
          setShowRiderLiveTrackingModal(false);
          setSelectedRiderForTracking(null);
        }}
        rider={selectedRiderForTracking}
        isDarkMode={isDarkMode}
      />

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
              alt="Rider avatar full view"
              className="w-full max-h-[85vh] object-contain rounded-lg bg-black"
            />
          </div>
        </div>
      )}
    </div>
  );
}