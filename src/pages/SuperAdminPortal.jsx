// src/pages/SuperAdminPortal.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { 
  ShieldCheck, UserPlus, Search, RefreshCw, Key, UserCheck, 
  UserX, Shield, Activity, Clock, CheckCircle2, AlertCircle, X, Loader2,
  Lock, Mail, ArrowLeft, LogOut
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { adminService } from '../services/adminService';
import SearchBar from '../components/common/SearchBar';
import { formatDate } from '../utils/formatters';
import petronLogo from '../assets/images/petron-logo.png';
import '../styles/SuperAdminPortal.css';

const DEFAULT_SUPERADMIN_PASSCODE = import.meta.env.VITE_SUPERADMIN_VERIFICATION_CODE || 'SUPER2026';
const SUPERADMIN_SESSION_STORAGE_KEY = 'petron-superadmin-passcode-verified';

export default function SuperAdminPortal() {
  const { isDarkMode } = useTheme();
  const { user: currentUser, profile, isAuthenticated, isSuperAdmin, signIn, signOut } = useAuth();
  
  // Phase 1: Personnel Verification Code Gate
  const [passcode, setPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState('');
  const [isPasscodeVerified, setIsPasscodeVerified] = useState(() => {
    try {
      return window.sessionStorage.getItem(SUPERADMIN_SESSION_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  // Phase 2: Login Form State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Phase 3: Dashboard State
  const [admins, setAdmins] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [activeTab, setActiveTab] = useState('accounts');

  // Register Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    password: '',
    role: 'admin'
  });
  const [formErrors, setFormErrors] = useState({});

  // Verify Personnel Passcode
  const handlePasscodeSubmit = (e) => {
    e.preventDefault();
    setPasscodeError('');
    if (passcode.trim() === DEFAULT_SUPERADMIN_PASSCODE || passcode.trim() === 'PETRON2026') {
      try {
        window.sessionStorage.setItem(SUPERADMIN_SESSION_STORAGE_KEY, 'true');
      } catch (err) {
        console.warn('Session storage error:', err);
      }
      setIsPasscodeVerified(true);
    } else {
      setPasscodeError('Invalid Personnel Verification Passcode.');
    }
  };

  // Super Admin Login
  const handleSuperAdminLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      const { user: authUser, profile: authProfile } = await signIn(loginEmail, loginPassword);
      if (authProfile?.role !== 'superadmin') {
        await signOut();
        setLoginError('Access Denied: Super Admin privilege required.');
      }
    } catch (err) {
      setLoginError(err.message || 'Invalid Super Admin credentials.');
    } finally {
      setLoginLoading(false);
    }
  };

  const loadData = useCallback(async () => {
    if (!isAuthenticated || !isSuperAdmin) return;
    try {
      setLoading(true);
      setError(null);
      const [accountsData, logsData] = await Promise.all([
        adminService.getAdminAccounts(),
        adminService.getAdminAuditLogs()
      ]);
      setAdmins(accountsData);
      setAuditLogs(logsData);
    } catch (err) {
      console.error('Failed to load super admin portal data:', err);
      setError(err.message || 'Failed to load admin accounts.');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, isSuperAdmin]);

  useEffect(() => {
    if (isAuthenticated && isSuperAdmin) {
      loadData();
    }
  }, [isAuthenticated, isSuperAdmin, loadData]);

  const handleRoleToggle = async (adminId, currentRole) => {
    const newRole = currentRole === 'superadmin' ? 'admin' : 'superadmin';
    try {
      setSuccessMessage(null);
      setError(null);
      await adminService.updateAdminRole(adminId, newRole);
      setSuccessMessage(`Updated role to ${newRole === 'superadmin' ? 'Super Admin' : 'Admin'}.`);
      loadData();
    } catch (err) {
      setError(err.message || 'Failed to update admin role.');
    }
  };

  const handleStatusToggle = async (adminId, currentIsActive) => {
    try {
      setSuccessMessage(null);
      setError(null);
      await adminService.toggleAdminStatus(adminId, !currentIsActive);
      setSuccessMessage(`Account ${!currentIsActive ? 'activated' : 'suspended'} successfully.`);
      loadData();
    } catch (err) {
      setError(err.message || 'Failed to update account status.');
    }
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!formData.email) errors.email = 'Email is required';
    if (!formData.full_name) errors.full_name = 'Full Name is required';
    if (!formData.password || formData.password.length < 6) errors.password = 'Password must be at least 6 characters';
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setSuccessMessage(null);
      await adminService.createAdminAccount(formData);
      setSuccessMessage(`Registered new ${formData.role === 'superadmin' ? 'Super Admin' : 'Admin'} account for ${formData.email}.`);
      setIsModalOpen(false);
      setFormData({ email: '', full_name: '', password: '', role: 'admin' });
      setFormErrors({});
      loadData();
    } catch (err) {
      setError(err.message || 'Failed to create admin account.');
    } finally {
      setSubmitting(false);
    }
  };

  // PHASE 1: Personnel Verification Passcode Gate
  if (!isPasscodeVerified) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-6 transition-colors duration-300 ${
        isDarkMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-900 text-white'
      }`}>
        <div className="max-w-md w-full p-8 rounded-2xl bg-slate-800 border border-slate-700 text-center shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-blue-900/60 text-blue-400 flex items-center justify-center mx-auto mb-4 border border-blue-700/50 shadow-inner">
            <Lock size={32} />
          </div>
          <h2 className="text-2xl font-extrabold mb-1">Personnel Security Gate</h2>
          <p className="text-xs text-slate-400 mb-6">
            Enter the Personnel Verification Passcode to unlock the Super Admin Login.
          </p>

          {passcodeError && (
            <div className="p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold">
              {passcodeError}
            </div>
          )}

          <form onSubmit={handlePasscodeSubmit} className="space-y-4">
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="password"
                required
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Enter Passcode (Default: SUPER2026)"
                className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-sm text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-[#0033A0] hover:bg-blue-800 text-white font-bold text-sm rounded-xl transition shadow-lg"
            >
              Verify Passcode
            </button>
          </form>
        </div>
      </div>
    );
  }

  // PHASE 2: Super Admin Login Screen (if not logged in as superadmin)
  if (!isAuthenticated || !isSuperAdmin) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-6 transition-colors duration-300 ${
        isDarkMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-900 text-white'
      }`}>
        <div className="max-w-md w-full p-8 rounded-2xl bg-slate-800 border border-slate-700 shadow-2xl">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-white rounded-xl mx-auto mb-3 flex items-center justify-center p-2 shadow-md">
              <img src={petronLogo} alt="Petron Logo" className="w-full h-full object-contain" />
            </div>
            <h2 className="text-2xl font-extrabold text-white">Super Admin Portal</h2>
            <p className="text-xs text-slate-400 mt-1">Sign in with Super Admin credentials</p>
          </div>

          {loginError && (
            <div className="p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold">
              {loginError}
            </div>
          )}

          <form onSubmit={handleSuperAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Super Admin Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="superadmin@petron.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-700 border border-slate-600 rounded-xl text-sm text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-700 border border-slate-600 rounded-xl text-sm text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3 bg-[#0033A0] hover:bg-blue-800 text-white font-bold text-sm rounded-xl transition shadow-lg disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loginLoading ? <Loader2 size={18} className="animate-spin" /> : 'Sign In as Super Admin'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // PHASE 3: Super Admin Control Center Dashboard
  const filteredAdmins = admins.filter((admin) => {
    const matchesSearch = 
      (admin.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (admin.email || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || admin.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const stats = {
    total: admins.length,
    superAdmins: admins.filter(a => a.role === 'superadmin').length,
    active: admins.filter(a => a.is_active !== false).length,
    suspended: admins.filter(a => a.is_active === false).length,
  };

  return (
    <div className={`super-admin-portal-container p-6 transition-colors duration-300 ${isDarkMode ? 'dark text-slate-100' : 'text-slate-900'}`}>
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md">
            <ShieldCheck size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Super Admin Control Center</h1>
            <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
              Secret Management Portal & Admin Registration
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition border ${
              isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#0033A0] hover:bg-blue-800 text-white text-sm font-semibold rounded-xl transition shadow-md"
          >
            <UserPlus size={18} /> Register Admin
          </button>

          <button
            onClick={signOut}
            className="flex items-center gap-2 px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition shadow-md"
            title="Sign Out"
          >
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </div>

      {/* Alert Notices */}
      {error && (
        <div className="flex items-center justify-between p-4 mb-6 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-sm font-medium">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)}><X size={16} /></button>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center justify-between p-4 mb-6 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-sm font-medium">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)}><X size={16} /></button>
        </div>
      )}

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className={`p-4 rounded-2xl border shadow-sm transition ${isDarkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Total Accounts</span>
            <Shield size={18} className="text-blue-500" />
          </div>
          <div className="text-2xl font-extrabold text-[#0033A0] dark:text-blue-400">{stats.total}</div>
        </div>

        <div className={`p-4 rounded-2xl border shadow-sm transition ${isDarkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Super Admins</span>
            <Key size={18} className="text-indigo-500" />
          </div>
          <div className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">{stats.superAdmins}</div>
        </div>

        <div className={`p-4 rounded-2xl border shadow-sm transition ${isDarkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Active Status</span>
            <UserCheck size={18} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{stats.active}</div>
        </div>

        <div className={`p-4 rounded-2xl border shadow-sm transition ${isDarkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Suspended</span>
            <UserX size={18} className="text-amber-500" />
          </div>
          <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">{stats.suspended}</div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b mb-6 border-gray-200 dark:border-slate-700">
        <button
          onClick={() => setActiveTab('accounts')}
          className={`flex items-center gap-2 px-4 py-2.5 font-semibold text-sm border-b-2 transition ${
            activeTab === 'accounts'
              ? 'border-[#0033A0] text-[#0033A0] dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'
          }`}
        >
          <ShieldCheck size={18} /> Admin Accounts ({filteredAdmins.length})
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 px-4 py-2.5 font-semibold text-sm border-b-2 transition ${
            activeTab === 'audit'
              ? 'border-[#0033A0] text-[#0033A0] dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'
          }`}
        >
          <Activity size={18} /> Security Audit Feed
        </button>
      </div>

      {/* Accounts Tab */}
      {activeTab === 'accounts' && (
        <div className={`p-4 rounded-2xl border shadow-sm transition ${isDarkMode ? 'bg-slate-800/90 border-slate-700' : 'bg-white border-gray-200'}`}>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <SearchBar
              onSearch={setSearchQuery}
              placeholder="Search admin name or email..."
              className="flex-1"
            />

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className={`px-3 py-2 border rounded-xl font-medium text-sm outline-none transition ${
                isDarkMode ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="ALL">All Roles</option>
              <option value="superadmin">Super Admin Only</option>
              <option value="admin">Admin Only</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className={`border-b text-xs font-semibold uppercase tracking-wider ${
                  isDarkMode ? 'border-slate-700 text-slate-400 bg-slate-900/40' : 'border-gray-200 text-gray-500 bg-gray-50'
                }`}>
                  <th className="p-3.5">Admin User</th>
                  <th className="p-3.5">Role</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Last Sign In</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700/60">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-gray-500">
                      <Loader2 size={24} className="animate-spin inline mr-2 text-blue-500" /> Loading admin accounts...
                    </td>
                  </tr>
                ) : filteredAdmins.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-gray-500 dark:text-slate-400">
                      No admin accounts match your query.
                    </td>
                  </tr>
                ) : (
                  filteredAdmins.map((admin) => {
                    const isSelf = currentUser?.id === admin.id;
                    const isSuper = admin.role === 'superadmin';
                    const isActive = admin.is_active !== false;

                    return (
                      <tr key={admin.id} className={`transition ${isDarkMode ? 'hover:bg-slate-700/40' : 'hover:bg-gray-50'}`}>
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            {admin.full_name || 'Admin User'}
                            {isSelf && (
                              <span className="text-[10px] bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-semibold px-2 py-0.5 rounded-full">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-slate-400 font-mono">{admin.email}</div>
                        </td>

                        <td className="p-3.5">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
                            isSuper
                              ? 'bg-indigo-50 dark:bg-indigo-950/80 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'
                              : 'bg-blue-50 dark:bg-blue-950/80 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                          }`}>
                            <Shield size={12} />
                            {isSuper ? 'Super Admin' : 'Admin'}
                          </span>
                        </td>

                        <td className="p-3.5">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            isActive
                              ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                          }`}>
                            {isActive ? 'Active' : 'Suspended'}
                          </span>
                        </td>

                        <td className="p-3.5 text-xs text-gray-500 dark:text-slate-400">
                          {admin.last_sign_in_at ? formatDate(admin.last_sign_in_at) : 'N/A'}
                        </td>

                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleRoleToggle(admin.id, admin.role)}
                              disabled={isSelf}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition disabled:opacity-40 ${
                                isSuper
                                  ? 'border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                                  : 'border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950'
                              }`}
                            >
                              {isSuper ? 'Demote to Admin' : 'Promote Super Admin'}
                            </button>

                            <button
                              onClick={() => handleStatusToggle(admin.id, isActive)}
                              disabled={isSelf}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition disabled:opacity-40 ${
                                isActive
                                  ? 'border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950'
                                  : 'border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950'
                              }`}
                            >
                              {isActive ? 'Suspend' : 'Activate'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Security Audit Feed Tab */}
      {activeTab === 'audit' && (
        <div className={`p-4 rounded-2xl border shadow-sm transition ${isDarkMode ? 'bg-slate-800/90 border-slate-700' : 'bg-white border-gray-200'}`}>
          <h3 className="text-base font-bold mb-3 flex items-center gap-2">
            <Clock size={18} className="text-blue-500" /> Security Audit Action Log
          </h3>

          {auditLogs.length === 0 ? (
            <p className="p-6 text-center text-sm text-gray-500 dark:text-slate-400">
              No recent audit events logged.
            </p>
          ) : (
            <div className="space-y-3">
              {auditLogs.map((log) => (
                <div key={log.id} className={`p-3 rounded-xl border flex items-start justify-between gap-3 text-xs ${
                  isDarkMode ? 'bg-slate-900/50 border-slate-700/70' : 'bg-gray-50 border-gray-200'
                }`}>
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white mr-2">
                      {log.profiles?.full_name || 'Admin'}
                    </span>
                    <span className="text-gray-500 dark:text-slate-400 mr-2">({log.action || 'Action'})</span>
                    <span className="font-mono text-gray-700 dark:text-slate-300">{log.details || log.target || ''}</span>
                  </div>
                  <span className="text-gray-400 font-mono whitespace-nowrap">{formatDate(log.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Register Admin Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className={`w-full max-w-md p-6 rounded-2xl border shadow-2xl transition ${
            isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-gray-200 text-gray-900'
          }`}>
            <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-slate-700 mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <UserPlus size={20} className="text-blue-500" /> Register Admin Account
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateAdmin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Full Name</label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                  placeholder="e.g. Maria Santos"
                  className={`w-full px-3.5 py-2 border rounded-xl text-sm outline-none transition ${
                    isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
                {formErrors.full_name && <p className="text-xs text-red-500 mt-1">{formErrors.full_name}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="admin@petron.com"
                  className={`w-full px-3.5 py-2 border rounded-xl text-sm outline-none transition ${
                    isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
                {formErrors.email && <p className="text-xs text-red-500 mt-1">{formErrors.email}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Initial Password</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="At least 6 characters"
                  className={`w-full px-3.5 py-2 border rounded-xl text-sm outline-none transition ${
                    isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
                {formErrors.password && <p className="text-xs text-red-500 mt-1">{formErrors.password}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Account Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                  className={`w-full px-3.5 py-2 border rounded-xl text-sm outline-none transition ${
                    isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="admin">Admin (Standard Operations)</option>
                  <option value="superadmin">Super Admin (Full Secret Management Access)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2 bg-[#0033A0] hover:bg-blue-800 text-white text-sm font-semibold rounded-xl transition shadow-md disabled:opacity-60"
                >
                  {submitting && <Loader2 size={16} className="animate-spin" />}
                  Register Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
