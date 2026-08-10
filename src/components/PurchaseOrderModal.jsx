// src/components/PurchaseOrderModal.jsx
import React, { useState, useMemo } from 'react';
import { X, Printer, Download, ShoppingBag, AlertTriangle, CheckCircle } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

export default function PurchaseOrderModal({ isOpen, onClose, products = [], storeName = "PETRON SAN PEDRO STATION" }) {
  const [supplierName, setSupplierName] = useState('Official Petroleum & Lubricants Wholesale');
  const [reorderQtyMap, setReorderQtyMap] = useState({});

  // Filter low stock or out of stock items
  const lowStockItems = useMemo(() => {
    return products.filter(p => p.stock_quantity < 10);
  }, [products]);

  // Handle reorder qty change
  const handleQtyChange = (productId, value) => {
    const qty = Math.max(1, parseInt(value, 10) || 1);
    setReorderQtyMap(prev => ({ ...prev, [productId]: qty }));
  };

  // Calculate totals
  const poSummary = useMemo(() => {
    let totalItems = 0;
    let totalUnits = 0;
    let totalEstimatedCost = 0;

    const items = lowStockItems.map(p => {
      const defaultQty = Math.max(10, 30 - p.stock_quantity);
      const qty = reorderQtyMap[p.id] !== undefined ? reorderQtyMap[p.id] : defaultQty;
      const unitCost = p.current_price * 0.85; // Estimated wholesale cost (85% of retail)
      const itemTotal = unitCost * qty;

      totalItems += 1;
      totalUnits += qty;
      totalEstimatedCost += itemTotal;

      return {
        ...p,
        reorderQty: qty,
        unitCost,
        itemTotal,
      };
    });

    return { items, totalItems, totalUnits, totalEstimatedCost };
  }, [lowStockItems, reorderQtyMap]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Product ID', 'Product Name', 'Category', 'Current Stock', 'Reorder Qty', 'Unit Cost (PHP)', 'Total Cost (PHP)'];
    const rows = poSummary.items.map(item => [
      item.id,
      `"${item.name}"`,
      `"${item.category || ''}"`,
      item.stock_quantity,
      item.reorderQty,
      item.unitCost.toFixed(2),
      item.itemTotal.toFixed(2)
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Purchase_Order_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print PO Slip
  const handlePrintPO = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const poNumber = `PO-${Date.now().toString().slice(-6)}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Purchase Order - ${poNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #111; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0033A0; padding-bottom: 12px; margin-bottom: 20px; }
          .store-title { font-size: 20px; font-weight: bold; color: #0033A0; }
          .po-title { font-size: 24px; font-weight: bold; text-align: right; color: #ED1C24; }
          .meta-grid { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 13px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th { background: #0033A0; color: #fff; text-align: left; padding: 10px; font-size: 12px; }
          td { border-bottom: 1px solid #ddd; padding: 10px; font-size: 13px; }
          .total-row td { font-weight: bold; border-top: 2px solid #111; font-size: 15px; }
          .footer { margin-top: 40px; font-size: 11px; text-align: center; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="store-title">${storeName}</div>
            <div style="font-size: 12px; color: #555;">Official Inventory Auto-Replenishment Slip</div>
          </div>
          <div>
            <div class="po-title">PURCHASE ORDER</div>
            <div style="font-size: 13px; text-align: right;">${poNumber}</div>
          </div>
        </div>

        <div class="meta-grid">
          <div>
            <strong>Supplier:</strong> ${supplierName}<br>
            <strong>Issued By:</strong> Inventory Manager
          </div>
          <div style="text-align: right;">
            <strong>Date:</strong> ${dateStr}<br>
            <strong>Status:</strong> Draft / Pending Dispatch
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Item Name</th>
              <th>Category</th>
              <th>Current Stock</th>
              <th>Reorder Qty</th>
              <th>Est. Unit Cost</th>
              <th style="text-align: right;">Line Total</th>
            </tr>
          </thead>
          <tbody>
            ${poSummary.items.map(item => `
              <tr>
                <td>${item.name}</td>
                <td>${item.category || '-'}</td>
                <td>${item.stock_quantity}</td>
                <td><strong>${item.reorderQty}</strong></td>
                <td>₱${item.unitCost.toFixed(2)}</td>
                <td style="text-align: right;">₱${item.itemTotal.toFixed(2)}</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="3">Total (${poSummary.totalItems} Products)</td>
              <td>${poSummary.totalUnits} Units</td>
              <td>-</td>
              <td style="text-align: right; color: #0033A0;">₱${poSummary.totalEstimatedCost.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        <div style="margin-top: 30px;">
          <div style="width: 200px; border-top: 1px solid #111; padding-top: 4px; font-size: 12px;">
            Authorized Signature
          </div>
        </div>

        <div class="footer">
          Generated via Petron/MKC Enterprise Platform Inventory Auto-Replenishment Module
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Generate Purchase Order (PO)</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Low-stock replenishment order slip for suppliers</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Supplier Input Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-blue-50/60 dark:bg-slate-800/60 p-4 rounded-xl border border-blue-100 dark:border-slate-700">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-1">
                Supplier / Distributor Name
              </label>
              <input
                type="text"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#0033A0] outline-none"
                placeholder="Enter supplier name..."
              />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1 bg-white dark:bg-slate-800 p-3 rounded-lg border border-gray-200 dark:border-slate-700">
                <span className="text-xs text-gray-500 dark:text-gray-400 block">Low Stock Items</span>
                <span className="text-lg font-bold text-red-600">{poSummary.totalItems} Products</span>
              </div>
              <div className="flex-1 bg-white dark:bg-slate-800 p-3 rounded-lg border border-gray-200 dark:border-slate-700">
                <span className="text-xs text-gray-500 dark:text-gray-400 block">Total Est. Cost</span>
                <span className="text-lg font-bold text-green-600">{formatCurrency(poSummary.totalEstimatedCost)}</span>
              </div>
            </div>
          </div>

          {/* Items Table */}
          {poSummary.items.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 dark:bg-slate-800/30 rounded-xl border border-dashed border-gray-300 dark:border-slate-700">
              <CheckCircle className="w-12 h-12 mx-auto text-emerald-500 mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">All Stock Levels Are Healthy!</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto mt-1">
                No products are currently below the low-stock safety threshold (10 units).
              </p>
            </div>
          ) : (
            <div className="border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 font-semibold border-b border-gray-200 dark:border-slate-700">
                  <tr>
                    <th className="py-3 px-4">Product</th>
                    <th className="py-3 px-4">Current Stock</th>
                    <th className="py-3 px-4">Reorder Qty</th>
                    <th className="py-3 px-4">Est. Wholesale Cost</th>
                    <th className="py-3 px-4 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-gray-800 dark:text-gray-200">
                  {poSummary.items.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-gray-900 dark:text-white">{item.name}</div>
                        <div className="text-xs text-gray-500">{item.category || 'General'}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                          item.stock_quantity === 0
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                        }`}>
                          <AlertTriangle className="w-3 h-3" />
                          {item.stock_quantity === 0 ? 'Out of Stock (0)' : `${item.stock_quantity} left`}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="number"
                          min="1"
                          value={item.reorderQty}
                          onChange={(e) => handleQtyChange(item.id, e.target.value)}
                          className="w-20 px-2 py-1 border border-gray-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-800 font-semibold text-center focus:ring-2 focus:ring-[#0033A0] outline-none"
                        />
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                        {formatCurrency(item.unitCost)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-gray-900 dark:text-white">
                        {formatCurrency(item.itemTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50 flex flex-wrap justify-between items-center gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          >
            Close
          </button>
          
          {poSummary.items.length > 0 && (
            <div className="flex items-center gap-3">
              <button
                onClick={handleExportCSV}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-md transition-colors"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
              <button
                onClick={handlePrintPO}
                className="px-4 py-2 bg-[#0033A0] hover:bg-[#002270] text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-md transition-colors"
              >
                <Printer className="w-4 h-4" />
                Print Purchase Order
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
