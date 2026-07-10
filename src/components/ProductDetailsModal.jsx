import React from 'react';
import { createPortal } from 'react-dom';
import { X, Edit2, Package, Tag, Hash, Boxes, CircleDollarSign, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import { AnimatePresence, motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
};

export default function ProductDetailsModal({ isOpen, onClose, product, onEdit }) {
  const { isDarkMode } = useTheme();
  
  if (!product) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm w-screen h-screen"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className={`rounded-xl w-full max-w-3xl shadow-2xl overflow-hidden transition-colors duration-300 ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
        <div className="bg-petron-blue p-5 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-white">Product Details</h3>
            <p className="text-sm text-white/80">{product.name || 'Unnamed Product'}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-white/15 hover:bg-white/25 text-white"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className={`p-6 max-h-[calc(90vh-170px)] overflow-y-auto transition-colors duration-300 ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className={`w-full h-64 rounded-xl overflow-hidden border transition-colors duration-300 ${isDarkMode ? 'border-slate-600 bg-slate-700' : 'border-gray-200 bg-gray-100'}`}>
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center transition-colors duration-300 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    <Package size={48} />
                  </div>
                )}
              </div>

              <div className={`mt-4 border rounded-xl p-4 transition-colors duration-300 ${isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-gray-50 border-gray-200'}`}>
                <p className={`text-xs mb-2 transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Description</p>
                <p className={`text-sm whitespace-pre-wrap transition-colors duration-300 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                  {product.description?.trim() || 'No description provided.'}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InfoCard icon={Tag} label="Category" value={product.category || '-'} isDarkMode={isDarkMode} />
                <InfoCard icon={Boxes} label="Unit" value={product.unit || '-'} isDarkMode={isDarkMode} />
                <InfoCard icon={CircleDollarSign} label="Current Price" value={formatCurrency(product.current_price || 0)} isDarkMode={isDarkMode} />
                <InfoCard icon={CircleDollarSign} label="Discount Price" value={product.discount_price ? formatCurrency(product.discount_price) : '-'} isDarkMode={isDarkMode} />
                <InfoCard icon={Package} label="Stock Quantity" value={String(product.stock_quantity ?? 0)} isDarkMode={isDarkMode} />
                <InfoCard icon={AlertTriangle} label="Low Stock Threshold" value={String(product.low_stock_threshold ?? '-')} isDarkMode={isDarkMode} />
                <InfoCard icon={Hash} label="Product ID" value={String(product.id ?? '-')} isDarkMode={isDarkMode} />
                <InfoCard icon={Hash} label="SKU" value={product.sku || '-'} isDarkMode={isDarkMode} />
                <InfoCard
                  icon={product.is_active ? CheckCircle2 : XCircle}
                  label="Status"
                  value={product.is_active ? 'Active' : 'Inactive'}
                  valueClassName={product.is_active ? 'text-green-500' : 'text-red-500'}
                  isDarkMode={isDarkMode}
                />
                <InfoCard
                  icon={product.is_featured ? CheckCircle2 : XCircle}
                  label="Featured"
                  value={product.is_featured ? 'Yes' : 'No'}
                  isDarkMode={isDarkMode}
                />
                <InfoCard icon={Tag} label="Image URL" value={product.image_url || '-'} isDarkMode={isDarkMode} />
              </div>

              <div className={`border rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 transition-colors duration-300 ${isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-gray-50 border-gray-200'}`}>
                <div>
                  <p className={`text-xs transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Created At</p>
                  <p className={`text-sm mt-1 transition-colors duration-300 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{formatDateTime(product.created_at)}</p>
                </div>
                <div>
                  <p className={`text-xs transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Updated At</p>
                  <p className={`text-sm mt-1 transition-colors duration-300 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{formatDateTime(product.updated_at)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={`px-6 py-4 border-t flex items-center justify-end gap-3 transition-colors duration-300 ${isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-gray-50 border-gray-200'}`}>
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-lg border transition-colors duration-300 ${isDarkMode ? 'border-slate-600 text-gray-200 hover:bg-slate-600' : 'border-gray-300 text-gray-700 hover:bg-gray-100'}`}
          >
            Close
          </button>
          <button
            onClick={() => onEdit(product)}
            className="px-4 py-2 rounded-lg bg-petron-blue text-white hover:opacity-90 inline-flex items-center gap-2"
          >
            <Edit2 size={16} />
            Edit Product
          </button>
        </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    ,
    document.body
  );
}

function InfoCard({ icon: Icon, label, value, valueClassName = '', isDarkMode }) {
  return (
    <div className={`border rounded-lg p-3 transition-colors duration-300 ${isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-white border-gray-200'}`}>
      <p className={`text-xs flex items-center gap-1 transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
        <Icon size={13} />
        {label}
      </p>
      <p className={`text-sm mt-1 break-words transition-colors duration-300 ${isDarkMode ? 'text-gray-200' : 'text-gray-900'} ${valueClassName}`}>{value}</p>
    </div>
  );
}
