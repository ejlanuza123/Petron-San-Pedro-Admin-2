// src/components/BulkAssignRiderModal.jsx
import React, { useState, useEffect } from 'react';
import { X, Truck, User, Phone, CheckCircle, AlertCircle, ShoppingBag, ShieldCheck } from 'lucide-react';
import { bulkOperationsService } from '../services/bulkOperationsService';
import { formatCurrency, formatOrderNumber } from '../utils/formatters';
import { useTheme } from '../context/ThemeContext';

export default function BulkAssignRiderModal({
  isOpen,
  onClose,
  selectedOrders = [],
  availableRiders = [],
  onAssigned,
  adminId
}) {
  const { isDarkMode } = useTheme();
  const [selectedRiderId, setSelectedRiderId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSelectedRiderId('');
      setError('');
      setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const totalAmount = selectedOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
  const selectedRiderObj = availableRiders.find(r => r.id === selectedRiderId);

  const handleConfirm = async () => {
    if (!selectedRiderId) {
      setError('Please select a delivery rider from the list.');
      return;
    }

    if (!selectedOrders.length) {
      setError('No orders selected for assignment.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const orderIds = selectedOrders.map(o => o.id);
      const res = await bulkOperationsService.bulkAssignRidersToOrders(orderIds, selectedRiderId, adminId);

      if (res.success) {
        if (typeof onAssigned === 'function') {
          onAssigned({
            riderId: selectedRiderId,
            orderIds,
            riderName: selectedRiderObj?.full_name || 'Rider'
          });
        }
        onClose();
      } else {
        setError(res.error || 'Failed to bulk assign riders.');
      }
    } catch (err) {
      console.error('Bulk rider assignment error:', err);
      setError(err.message || 'An unexpected error occurred during assignment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className={`relative w-full max-w-xl rounded-2xl shadow-2xl border flex flex-col max-h-[90vh] transition-colors duration-300 ${
        isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-100 text-gray-900'
      }`}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/40 text-[#0033A0] dark:text-blue-400 rounded-xl">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Bulk Assign Rider</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Dispatch {selectedOrders.length} order{selectedOrders.length > 1 ? 's' : ''} to an available fleet rider
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 flex items-center gap-2.5 text-xs text-red-600 dark:text-red-400 font-medium">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Selected Orders Summary Banner */}
          <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-slate-800/60 border border-blue-100 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-gray-600 dark:text-gray-300 flex items-center gap-1.5">
                <ShoppingBag size={14} className="text-[#0033A0] dark:text-blue-400" />
                Selected Orders ({selectedOrders.length})
              </span>
              <span className="font-bold text-[#0033A0] dark:text-blue-400">
                Total: {formatCurrency(totalAmount)}
              </span>
            </div>

            {/* Order Chips */}
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
              {selectedOrders.map((o) => (
                <span
                  key={o.id}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-slate-700 border border-blue-200 dark:border-slate-600 text-gray-800 dark:text-gray-200 shadow-2xs"
                  title={`${o.customer_name || o.profiles?.full_name || 'Customer'} • ${o.delivery_address || ''}`}
                >
                  {formatOrderNumber(o.order_number, o.id)}
                  <span className="text-[10px] font-normal text-gray-400 dark:text-gray-400 ml-1">
                    ({formatCurrency(o.total_amount || 0)})
                  </span>
                </span>
              ))}
            </div>
          </div>

          {/* Rider Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2.5">
              Select Fleet Rider
            </label>

            {availableRiders.length === 0 ? (
              <div className="p-6 text-center rounded-xl border border-dashed border-gray-200 dark:border-slate-700 text-gray-400 text-xs">
                No active riders currently available. Please register or activate riders in Fleet Management.
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {availableRiders.map((rider) => {
                  const isSelected = selectedRiderId === rider.id;
                  return (
                    <div
                      key={rider.id}
                      onClick={() => setSelectedRiderId(rider.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                        isSelected
                          ? 'border-[#0033A0] bg-blue-50/80 dark:bg-blue-900/30 dark:border-blue-500 ring-2 ring-blue-500/20'
                          : 'border-gray-200 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative p-2.5 rounded-xl bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200">
                          <User size={18} />
                          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white dark:ring-slate-900" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900 dark:text-white">
                            {rider.full_name || 'Fleet Rider'}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                            <span>{rider.vehicle_type || 'Motorcycle'}</span>
                            {rider.vehicle_plate && (
                              <>
                                <span>•</span>
                                <span className="font-mono">{rider.vehicle_plate}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {rider.phone_number && (
                          <span className="text-[11px] text-gray-400 dark:text-gray-500 flex items-center gap-1 hidden sm:flex">
                            <Phone size={11} /> {rider.phone_number}
                          </span>
                        )}
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition ${
                          isSelected
                            ? 'border-[#0033A0] bg-[#0033A0] text-white'
                            : 'border-gray-300 dark:border-slate-600'
                        }`}>
                          {isSelected && <CheckCircle size={14} className="text-white" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-gray-50/50 dark:bg-slate-900/50 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2.5 border border-gray-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading || !selectedRiderId || !selectedOrders.length}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#0033A0] hover:bg-blue-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition"
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Assigning Orders...</span>
              </>
            ) : (
              <>
                <ShieldCheck size={15} />
                <span>
                  {selectedRiderObj
                    ? `Assign ${selectedOrders.length} Order${selectedOrders.length > 1 ? 's' : ''} to ${selectedRiderObj.full_name}`
                    : 'Select a Rider'}
                </span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
