// src/pages/BroadcastNotifications.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Radio, 
  Megaphone, 
  Users, 
  ShoppingBag, 
  Truck, 
  Send, 
  Sparkles, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  CloudRain, 
  Flame, 
  RefreshCw, 
  Smartphone, 
  History,
  Info,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import { notifySuccess } from '../utils/successNotifier';
import { 
  broadcastNotificationService, 
  BROADCAST_CATEGORIES, 
  PRESET_TEMPLATES 
} from '../services/broadcastNotificationService';

const QUICK_EMOJIS = ['🌧️', '⚡', '⛽', '🍗', '🛵', '⚠️', '🔥', '🎉', '📢', '✅'];

export default function BroadcastNotifications() {
  const { isDarkMode } = useTheme();

  // Form State
  const [targetAudience, setTargetAudience] = useState('all'); // 'all' | 'customers' | 'riders'
  const [category, setCategory] = useState('weather_advisory');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');

  // Async & UI State
  const [estimates, setEstimates] = useState({
    customers: 0,
    riders: 0,
    total: 0,
    pushTokens: { customers: 0, riders: 0, total: 0 }
  });
  const [loadingEstimates, setLoadingEstimates] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [sendResult, setSendResult] = useState(null);

  // History State
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [activeTab, setActiveTab] = useState('composer'); // 'composer' | 'history'

  // Load audience estimates
  const fetchEstimates = useCallback(async () => {
    setLoadingEstimates(true);
    try {
      const res = await broadcastNotificationService.getAudienceEstimates();
      if (res.success) {
        setEstimates(res);
      }
    } catch (err) {
      console.error('Error fetching estimates:', err);
    } finally {
      setLoadingEstimates(false);
    }
  }, []);

  // Load past history
  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await broadcastNotificationService.getBroadcastHistory({ page: 1, limit: 15 });
      if (res.success) {
        setHistory(res.data || []);
      }
    } catch (err) {
      console.error('Error fetching broadcast history:', err);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    fetchEstimates();
    fetchHistory();
  }, [fetchEstimates, fetchHistory]);

  // Selected target audience count
  const estimatedRecipientCount = useMemo(() => {
    if (targetAudience === 'customers') return estimates.customers;
    if (targetAudience === 'riders') return estimates.riders;
    return estimates.total;
  }, [targetAudience, estimates]);

  const estimatedPushTokenCount = useMemo(() => {
    if (targetAudience === 'customers') return estimates.pushTokens?.customers || 0;
    if (targetAudience === 'riders') return estimates.pushTokens?.riders || 0;
    return estimates.pushTokens?.total || 0;
  }, [targetAudience, estimates]);

  // Apply preset template
  const handleApplyPreset = (preset) => {
    setCategory(preset.category);
    setTargetAudience(preset.targetAudience);
    setTitle(preset.title);
    setMessage(preset.message);
  };

  // Insert emoji at end of active field or message
  const handleInsertEmoji = (emoji) => {
    setMessage((prev) => `${prev} ${emoji}`.trim());
  };

  // Trigger dispatch confirmation
  const handleInitiateSend = (e) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      return;
    }
    setShowConfirmModal(true);
  };

  // Confirm and send broadcast
  const handleConfirmSend = async () => {
    setIsSending(true);
    setSendResult(null);

    try {
      const result = await broadcastNotificationService.sendBroadcast({
        targetAudience,
        category,
        title: title.trim(),
        message: message.trim()
      });

      if (result.success) {
        setSendResult({
          success: true,
          recipientCount: result.recipientCount,
          pushSentCount: result.pushSentCount
        });
        notifySuccess(`Broadcast successfully sent to ${result.recipientCount} recipient(s)!`);
        setShowConfirmModal(false);
        setTitle('');
        setMessage('');
        fetchHistory();
      } else {
        setSendResult({
          success: false,
          error: result.error || 'Failed to dispatch broadcast'
        });
      }
    } catch (err) {
      console.error('Broadcast error:', err);
      setSendResult({
        success: false,
        error: err?.message || 'Failed to send broadcast'
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className={`p-6 max-w-7xl mx-auto min-h-screen transition-colors duration-200 ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Push Notification Broadcaster</h1>
              <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Broadcast alerts, weather advisories, and flash promos to customer and rider phones
              </p>
            </div>
          </div>
        </div>

        {/* Tab Toggle & Refresh */}
        <div className="flex items-center gap-2">
          <div className={`p-1 rounded-xl border flex items-center gap-1 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
            <button
              onClick={() => setActiveTab('composer')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                activeTab === 'composer'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Megaphone className="w-3.5 h-3.5" />
              Composer
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                activeTab === 'history'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              History ({history.length})
            </button>
          </div>

          <button
            onClick={fetchEstimates}
            disabled={loadingEstimates}
            className={`p-2 rounded-xl border transition ${
              isDarkMode 
                ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300' 
                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
            }`}
            title="Refresh audience estimates"
          >
            <RefreshCw className={`w-4 h-4 ${loadingEstimates ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Success Banner Alert */}
      <AnimatePresence>
        {sendResult && sendResult.success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              <div>
                <p className="font-semibold text-sm">Broadcast Delivered Successfully!</p>
                <p className="text-xs opacity-90">
                  Delivered to {sendResult.recipientCount} account(s) via real-time stream. {sendResult.pushSentCount > 0 ? `Sent to ${sendResult.pushSentCount} mobile device(s).` : ''}
                </p>
              </div>
            </div>
            <button 
              onClick={() => setSendResult(null)}
              className="p-1 rounded-lg hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      {activeTab === 'composer' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Form & Presets (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Audience Selection Card */}
            <div className={`p-5 rounded-2xl border transition-colors ${isDarkMode ? 'bg-slate-800/80 border-slate-700/80' : 'bg-white border-slate-200 shadow-sm'}`}>
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-bold uppercase tracking-wider text-blue-500">1. Select Target Audience</label>
                <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Estimated Reach: <strong className={isDarkMode ? 'text-white' : 'text-slate-900'}>{estimatedRecipientCount} users</strong>
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'all', label: 'Everyone', icon: Users, desc: 'All customers & riders', count: estimates.total },
                  { id: 'customers', label: 'Customers', icon: ShoppingBag, desc: 'Active customers only', count: estimates.customers },
                  { id: 'riders', label: 'Riders', icon: Truck, desc: 'Active delivery fleet', count: estimates.riders }
                ].map((aud) => {
                  const Icon = aud.icon;
                  const isSelected = targetAudience === aud.id;
                  return (
                    <button
                      key={aud.id}
                      type="button"
                      onClick={() => setTargetAudience(aud.id)}
                      className={`p-3.5 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/20'
                          : isDarkMode 
                            ? 'border-slate-700 bg-slate-800/40 hover:bg-slate-700/50' 
                            : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <Icon className={`w-5 h-5 ${isSelected ? 'text-blue-500' : isDarkMode ? 'text-slate-400' : 'text-slate-500'}`} />
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${
                          isSelected ? 'bg-blue-500 text-white' : isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {aud.count}
                        </span>
                      </div>
                      <p className={`font-semibold text-sm ${isSelected ? 'text-blue-500' : ''}`}>{aud.label}</p>
                      <p className={`text-[11px] truncate ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{aud.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Category Selection Card */}
            <div className={`p-5 rounded-2xl border transition-colors ${isDarkMode ? 'bg-slate-800/80 border-slate-700/80' : 'bg-white border-slate-200 shadow-sm'}`}>
              <label className="text-xs font-bold uppercase tracking-wider text-blue-500 mb-3 block">2. Category & Alert Style</label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {BROADCAST_CATEGORIES.map((cat) => {
                  const isSelected = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/20 font-semibold'
                          : isDarkMode
                            ? 'border-slate-700 bg-slate-800/40 hover:bg-slate-700/40 text-slate-300'
                            : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <span className="text-lg mb-1 block">
                        {cat.id === 'weather_advisory' && '🌧️'}
                        {cat.id === 'promo' && '🔥'}
                        {cat.id === 'announcement' && '📢'}
                        {cat.id === 'emergency' && '⚠️'}
                      </span>
                      <p className="text-xs leading-tight">{cat.name}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Presets */}
            <div className={`p-5 rounded-2xl border transition-colors ${isDarkMode ? 'bg-slate-800/80 border-slate-700/80' : 'bg-white border-slate-200 shadow-sm'}`}>
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-bold uppercase tracking-wider text-blue-500 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Quick 1-Click Presets
                </label>
                <span className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Click to auto-populate</span>
              </div>

              <div className="flex flex-wrap gap-2">
                {PRESET_TEMPLATES.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                      isDarkMode 
                        ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 hover:border-slate-600 text-slate-200' 
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    {preset.title.split(' ')[0]} {preset.title.replace(/^[^ ]+ /, '')}
                  </button>
                ))}
              </div>
            </div>

            {/* Message Composer Form */}
            <form onSubmit={handleInitiateSend} className={`p-5 rounded-2xl border transition-colors ${isDarkMode ? 'bg-slate-800/80 border-slate-700/80' : 'bg-white border-slate-200 shadow-sm'}`}>
              <label className="text-xs font-bold uppercase tracking-wider text-blue-500 mb-3 block">3. Compose Message</label>

              {/* Title Field */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold">Notification Title</span>
                  <span className={`text-[11px] ${title.length > 50 ? 'text-amber-500 font-bold' : isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {title.length}/60 chars
                  </span>
                </div>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. 🌧️ Heavy Rain Advisory"
                  maxLength={70}
                  required
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium transition ${
                    isDarkMode 
                      ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500' 
                      : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600'
                  }`}
                />
              </div>

              {/* Message Body Field */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold">Notification Message</span>
                  <span className={`text-[11px] ${message.length > 150 ? 'text-amber-500 font-bold' : isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {message.length}/200 chars
                  </span>
                </div>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="e.g. Deliveries in San Pedro may be delayed by 10–15 mins for rider safety. Thank you for your patience!"
                  rows={3}
                  maxLength={250}
                  required
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition ${
                    isDarkMode 
                      ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500' 
                      : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600'
                  }`}
                />
              </div>

              {/* Emoji Quick Insert Toolbar */}
              <div className="flex items-center gap-1.5 flex-wrap mb-5">
                <span className={`text-[11px] mr-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Add icon:</span>
                {QUICK_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleInsertEmoji(emoji)}
                    className={`px-2 py-1 rounded-md text-xs border transition ${
                      isDarkMode 
                        ? 'border-slate-700 bg-slate-900/60 hover:bg-slate-700' 
                        : 'border-slate-200 bg-slate-100 hover:bg-slate-200'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!title.trim() || !message.trim() || isSending}
                className={`w-full py-3 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 text-white shadow-lg transition-all ${
                  !title.trim() || !message.trim() || isSending
                    ? 'bg-slate-400 cursor-not-allowed opacity-60'
                    : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/25 active:scale-[0.99]'
                }`}
              >
                <Send className="w-4 h-4" />
                Review & Dispatch Broadcast to {estimatedRecipientCount} Users
              </button>
            </form>
          </div>

          {/* Right Column: Live Smartphone Device Preview (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className={`p-5 rounded-2xl border transition-colors sticky top-6 ${isDarkMode ? 'bg-slate-800/80 border-slate-700/80' : 'bg-white border-slate-200 shadow-sm'}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-blue-500" />
                  <h3 className="text-sm font-bold">Live Phone Preview</h3>
                </div>
                <span className={`text-[11px] px-2 py-0.5 rounded-full border ${
                  isDarkMode ? 'border-slate-700 bg-slate-900 text-slate-300' : 'border-slate-200 bg-slate-100 text-slate-700'
                }`}>
                  Lock-screen view
                </span>
              </div>

              {/* Simulated Phone Shell */}
              <div className={`mx-auto max-w-[320px] rounded-[36px] p-3 border-4 shadow-2xl transition-all ${
                isDarkMode ? 'bg-slate-950 border-slate-700' : 'bg-slate-900 border-slate-800'
              }`}>
                {/* Phone Speaker Notch & Dynamic Island */}
                <div className="flex justify-center mb-3">
                  <div className="w-24 h-4 rounded-full bg-slate-800 border border-slate-700/60 flex items-center justify-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-900 mr-2"></div>
                    <div className="w-8 h-1 rounded-full bg-slate-700"></div>
                  </div>
                </div>

                {/* Lockscreen Time Display */}
                <div className="text-center text-white/90 my-6">
                  <p className="text-3xl font-light tracking-tight">09:41</p>
                  <p className="text-[11px] text-white/60 font-medium">Friday, September 11</p>
                </div>

                {/* Realistic iOS/Android Banner Card */}
                <motion.div 
                  key={title + message + category}
                  initial={{ scale: 0.95, opacity: 0.8 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                  className="rounded-2xl p-3.5 bg-slate-800/90 backdrop-blur-md border border-slate-700/80 shadow-lg text-white mb-6"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded-md bg-blue-600 flex items-center justify-center text-[9px] font-bold text-white">
                        P
                      </div>
                      <span className="text-[11px] font-bold tracking-wide uppercase text-white/90">
                        {targetAudience === 'riders' ? 'Rider Alert' : 'Petron San Pedro'}
                      </span>
                    </div>
                    <span className="text-[10px] text-white/50">now</span>
                  </div>

                  <p className="text-xs font-semibold text-white truncate">
                    {title || 'Notification Title Preview'}
                  </p>
                  <p className="text-[11px] text-white/80 leading-relaxed mt-0.5 line-clamp-3">
                    {message || 'Type your message above to see how it will appear on customer and rider smartphones.'}
                  </p>
                </motion.div>

                {/* Home Indicator Bar */}
                <div className="w-24 h-1 rounded-full bg-white/40 mx-auto mt-6 mb-1"></div>
              </div>

              {/* Delivery Stats Information */}
              <div className={`mt-5 p-3.5 rounded-xl border text-xs space-y-1.5 ${
                isDarkMode ? 'bg-slate-900/60 border-slate-700/60 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}>
                <div className="flex items-center gap-1.5 font-semibold text-blue-500">
                  <Info className="w-3.5 h-3.5" />
                  Delivery Pipeline Stats
                </div>
                <div className="flex justify-between">
                  <span>Eligible In-App Users:</span>
                  <strong>{estimatedRecipientCount}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Active Push Tokens (FCM):</span>
                  <strong>{estimatedPushTokenCount}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Targeted Role:</span>
                  <strong className="capitalize">{targetAudience}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* History Log View */
        <div className={`p-5 rounded-2xl border transition-colors ${isDarkMode ? 'bg-slate-800/80 border-slate-700/80' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold">Past Dispatched Broadcasts</h3>
              <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Audit log of system-wide notifications dispatched by administrators
              </p>
            </div>
            <button
              onClick={fetchHistory}
              disabled={loadingHistory}
              className={`p-2 rounded-xl border transition ${
                isDarkMode ? 'border-slate-700 hover:bg-slate-700' : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${loadingHistory ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {loadingHistory ? (
            <div className="py-12 text-center">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
              <p className="text-xs text-slate-400">Loading broadcast history...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="py-12 text-center">
              <Megaphone className="w-10 h-10 mx-auto text-slate-400 mb-2 opacity-40" />
              <p className="text-sm font-semibold">No broadcasts sent yet</p>
              <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Use the Composer tab to dispatch your first notification to customers and riders.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className={`border-b ${isDarkMode ? 'border-slate-700 text-slate-400' : 'border-slate-200 text-slate-500'}`}>
                    <th className="py-3 px-3">Date & Time</th>
                    <th className="py-3 px-3">Audience</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Title & Message</th>
                    <th className="py-3 px-3 text-right">Recipients</th>
                    <th className="py-3 px-3">Dispatched By</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDarkMode ? 'divide-slate-700/60' : 'divide-slate-200'}`}>
                  {history.map((item) => (
                    <tr key={item.id} className={`hover:bg-blue-500/5 transition`}>
                      <td className="py-3 px-3 whitespace-nowrap text-slate-400 font-mono">
                        {new Date(item.created_at).toLocaleString('en-PH', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full font-semibold capitalize ${
                          item.target_audience === 'riders'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                            : item.target_audience === 'customers'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                              : 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300'
                        }`}>
                          {item.target_audience}
                        </span>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="font-medium capitalize text-slate-300">
                          {item.category?.replace('_', ' ') || 'General'}
                        </span>
                      </td>
                      <td className="py-3 px-3 max-w-xs">
                        <p className="font-semibold text-slate-200 truncate">{item.title}</p>
                        <p className={`text-[11px] truncate ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{item.message}</p>
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <strong className="text-emerald-500">{item.recipient_count}</strong>
                        {item.push_tokens_count > 0 && (
                          <span className="text-[10px] text-slate-400 block">({item.push_tokens_count} push)</span>
                        )}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap text-slate-400">
                        {item.profiles?.full_name || item.profiles?.email || 'Administrator'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Safety Confirmation Modal */}
      <AnimatePresence>
        {showConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`w-full max-w-md p-6 rounded-2xl border shadow-2xl ${
                isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3 mb-4 text-amber-500">
                <AlertTriangle className="w-6 h-6 flex-shrink-0" />
                <h3 className="text-lg font-bold">Confirm Broadcast Dispatch</h3>
              </div>

              <p className={`text-sm mb-4 leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                You are about to dispatch this notification to{' '}
                <strong className="text-blue-500">{estimatedRecipientCount} active account(s)</strong>. 
                This action will trigger an in-app banner and mobile push notifications.
              </p>

              {/* Message Summary Box */}
              <div className={`p-3 rounded-xl border mb-6 text-xs space-y-1 ${
                isDarkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'
              }`}>
                <p className="font-bold text-sm text-blue-500">{title}</p>
                <p className={isDarkMode ? 'text-slate-300' : 'text-slate-600'}>{message}</p>
                <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Target: <strong className="capitalize">{targetAudience}</strong></span>
                  <span>Estimated tokens: <strong>{estimatedPushTokenCount}</strong></span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  disabled={isSending}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold border transition ${
                    isDarkMode ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSend}
                  disabled={isSending}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 shadow-md shadow-blue-500/30"
                >
                  {isSending ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Dispatching...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      Yes, Dispatch Now
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
