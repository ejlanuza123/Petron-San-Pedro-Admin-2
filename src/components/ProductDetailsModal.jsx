import React from 'react';
import { createPortal } from 'react-dom';
import { X, Edit2, Package, Tag, Hash, Boxes, CircleDollarSign, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import { AnimatePresence, motion } from 'framer-motion';

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
};

export default function ProductDetailsModal({ isOpen, onClose, product, onEdit }) {
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
            className="bg-white rounded-xl w-full max-w-3xl shadow-2xl overflow-hidden"
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

        <div className="p-6 max-h-[calc(90vh-170px)] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="w-full h-64 rounded-xl overflow-hidden border border-gray-200 bg-gray-100">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <Package size={48} />
                  </div>
                )}
              </div>

              <div className="mt-4 bg-gray-50 border border-gray-200 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-2">Description</p>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">
                  {product.description?.trim() || 'No description provided.'}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InfoCard icon={Tag} label="Category" value={product.category || '-'} />
                <InfoCard icon={Boxes} label="Unit" value={product.unit || '-'} />
                <InfoCard icon={CircleDollarSign} label="Current Price" value={formatCurrency(product.current_price || 0)} />
                <InfoCard icon={CircleDollarSign} label="Discount Price" value={product.discount_price ? formatCurrency(product.discount_price) : '-'} />
                <InfoCard icon={Package} label="Stock Quantity" value={String(product.stock_quantity ?? 0)} />
                <InfoCard icon={AlertTriangle} label="Low Stock Threshold" value={String(product.low_stock_threshold ?? '-')} />
                <InfoCard icon={Hash} label="Product ID" value={String(product.id ?? '-')} />
                <InfoCard icon={Hash} label="SKU" value={product.sku || '-'} />
                <InfoCard
                  icon={product.is_active ? CheckCircle2 : XCircle}
                  label="Status"
                  value={product.is_active ? 'Active' : 'Inactive'}
                  valueClassName={product.is_active ? 'text-green-700' : 'text-red-700'}
                />
                <InfoCard
                  icon={product.is_featured ? CheckCircle2 : XCircle}
                  label="Featured"
                  value={product.is_featured ? 'Yes' : 'No'}
                />
                <InfoCard icon={Tag} label="Image URL" value={product.image_url || '-'} />
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-500">Created At</p>
                  <p className="text-sm text-gray-800 mt-1">{formatDateTime(product.created_at)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Updated At</p>
                  <p className="text-sm text-gray-800 mt-1">{formatDateTime(product.updated_at)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
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

function InfoCard({ icon: Icon, label, value, valueClassName = '' }) {
  return (
    <div className="border border-gray-200 rounded-lg p-3 bg-white">
      <p className="text-xs text-gray-500 flex items-center gap-1">
        <Icon size={13} />
        {label}
      </p>
      <p className={`text-sm text-gray-900 mt-1 break-words ${valueClassName}`}>{value}</p>
    </div>
  );
}
