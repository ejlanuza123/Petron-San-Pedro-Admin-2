// src/pages/AuditLogs.jsx
import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import AdminLogsViewer from '../components/AdminLogsViewer';
import SearchBar from '../components/common/SearchBar';
import { supabase } from '../lib/supabase';
import { Filter, Calendar, Shield, User, RotateCcw } from 'lucide-react';

const ENTITY_OPTIONS = [
  { value: 'all', label: 'All Entities' },
  { value: 'order', label: 'Orders' },
  { value: 'product', label: 'Products & Inventory' },
  { value: 'rider', label: 'Riders & Fleet' },
  { value: 'customer', label: 'Customers' },
  { value: 'system', label: 'System Settings' }
];

const ACTION_OPTIONS = [
  { value: 'all', label: 'All Action Types' },
  { value: 'create', label: 'Create / Add' },
  { value: 'update', label: 'Update / Edit' },
  { value: 'delete', label: 'Delete / Remove' },
  { value: 'status', label: 'Status Changes' },
  { value: 'assign', label: 'Rider Assignments' },
];

export default function AuditLogs() {
  const { isDarkMode } = useTheme();
  const [entityType, setEntityType] = useState('all');
  const [actionType, setActionType] = useState('all');
  const [adminId, setAdminId] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [adminsList, setAdminsList] = useState([]);

  useEffect(() => {
    const fetchAdmins = async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('id, full_name, email, role')
          .in('role', ['admin', 'staff'])
          .order('full_name');
        setAdminsList(data || []);
      } catch (err) {
        console.error('Error fetching admin list for logs filter:', err);
      }
    };
    fetchAdmins();
  }, []);

  const applyDatePreset = (presetKey) => {
    const now = new Date();
    const end = now.toISOString().slice(0, 10);
    let start = new Date(now);

    if (presetKey === 'today') {
      start.setHours(0, 0, 0, 0);
    } else if (presetKey === '7days') {
      start.setDate(now.getDate() - 6);
    } else if (presetKey === '30days') {
      start.setDate(now.getDate() - 29);
    } else if (presetKey === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    setStartDate(start.toISOString().slice(0, 10));
    setEndDate(end);
  };

  const handleResetFilters = () => {
    setEntityType('all');
    setActionType('all');
    setAdminId('all');
    setSearchQuery('');
    setStartDate('');
    setEndDate('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className={`text-2xl font-bold transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            System Audit Logs
          </h2>
          <p className={`text-sm mt-1 transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Track and audit admin actions, inventory edits, order mutations, and system changes in real-time.
          </p>
        </div>
      </div>

      {/* Advanced Filter Bar */}
      <div className={`rounded-xl border p-5 shadow-sm transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center gap-2 mb-4 text-[#0033A0] dark:text-blue-400 font-semibold text-sm">
          <Filter size={16} /> Filter Criteria
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
          {/* Entity Type Filter */}
          <div>
            <label className={`block text-xs font-semibold mb-1 transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Entity Category
            </label>
            <select
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              className={`w-full rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#0033A0] outline-none transition-colors duration-300 ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border border-gray-300'}`}
            >
              {ENTITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          {/* Action Type Filter */}
          <div>
            <label className={`block text-xs font-semibold mb-1 transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Action Type
            </label>
            <select
              value={actionType}
              onChange={(e) => setActionType(e.target.value)}
              className={`w-full rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#0033A0] outline-none transition-colors duration-300 ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border border-gray-300'}`}
            >
              {ACTION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          {/* Admin User Filter */}
          <div>
            <label className={`block text-xs font-semibold mb-1 transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Performed By
            </label>
            <select
              value={adminId}
              onChange={(e) => setAdminId(e.target.value)}
              className={`w-full rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#0033A0] outline-none transition-colors duration-300 ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border border-gray-300'}`}
            >
              <option value="all">All Staff / Admins</option>
              {adminsList.map((admin) => (
                <option key={admin.id} value={admin.id}>{admin.full_name || admin.email}</option>
              ))}
            </select>
          </div>

          {/* Search Bar */}
          <div>
            <label className={`block text-xs font-semibold mb-1 transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Search Keyword / ID
            </label>
            <SearchBar
              onSearch={(value) => setSearchQuery(value)}
              placeholder="Action, ID, or details..."
              className="w-full"
            />
          </div>

          {/* Start Date */}
          <div>
            <label className={`block text-xs font-semibold mb-1 transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              From Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={`w-full rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#0033A0] outline-none transition-colors duration-300 ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border border-gray-300'}`}
            />
          </div>

          {/* End Date */}
          <div>
            <label className={`block text-xs font-semibold mb-1 transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              To Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={`w-full rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#0033A0] outline-none transition-colors duration-300 ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border border-gray-300'}`}
            />
          </div>
        </div>

        {/* Date Presets & Reset */}
        <div className="mt-4 pt-3 border-t flex flex-wrap justify-between items-center gap-2 border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Presets:</span>
            <button
              type="button"
              onClick={() => applyDatePreset('today')}
              className={`px-2.5 py-1 text-xs border rounded-md font-medium transition ${isDarkMode ? 'border-slate-600 text-gray-300 hover:bg-slate-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => applyDatePreset('7days')}
              className={`px-2.5 py-1 text-xs border rounded-md font-medium transition ${isDarkMode ? 'border-slate-600 text-gray-300 hover:bg-slate-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
            >
              Last 7 Days
            </button>
            <button
              type="button"
              onClick={() => applyDatePreset('30days')}
              className={`px-2.5 py-1 text-xs border rounded-md font-medium transition ${isDarkMode ? 'border-slate-600 text-gray-300 hover:bg-slate-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
            >
              Last 30 Days
            </button>
            <button
              type="button"
              onClick={() => applyDatePreset('month')}
              className={`px-2.5 py-1 text-xs border rounded-md font-medium transition ${isDarkMode ? 'border-slate-600 text-gray-300 hover:bg-slate-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
            >
              This Month
            </button>
          </div>

          <button
            onClick={handleResetFilters}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${isDarkMode ? 'bg-slate-700 text-gray-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            <RotateCcw size={13} /> Reset Filters
          </button>
        </div>
      </div>

      {/* Logs Viewer Table Container */}
      <div className={`rounded-xl border p-5 shadow-sm transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
        <AdminLogsViewer
          entityType={entityType}
          actionType={actionType}
          adminId={adminId}
          searchQuery={searchQuery}
          startDate={startDate}
          endDate={endDate}
          limit={50}
        />
      </div>
    </div>
  );
}