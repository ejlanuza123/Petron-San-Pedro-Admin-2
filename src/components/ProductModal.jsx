// src/components/ProductModal.jsx (Enhanced)
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, Loader2, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { PRODUCT_CATEGORIES } from '../utils/constants';
import { validateProduct } from '../utils/validation';
import { useTheme } from '../context/ThemeContext';

export default function ProductModal({ isOpen, onClose, product, onSave }) {
  const { isDarkMode } = useTheme();
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: PRODUCT_CATEGORIES.MOTOR_OIL,
    current_price: '',
    stock_quantity: '',
    unit: 'pcs',
    description: '',
    image_url: '',
    is_active: true,
    low_stock_threshold: 10
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({});
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        sku: product.sku || '',
        category: product.category || PRODUCT_CATEGORIES.MOTOR_OIL,
        current_price: product.current_price || '',
        stock_quantity: product.stock_quantity || '',
        unit: product.unit || 'pcs',
        description: product.description || '',
        image_url: product.image_url || '',
        is_active: product.is_active !== undefined ? product.is_active : true,
        low_stock_threshold: product.low_stock_threshold || 10
      });
      setImagePreview(product.image_url || null);
    } else {
      setFormData({
        name: '',
        sku: '',
        category: PRODUCT_CATEGORIES.MOTOR_OIL,
        current_price: '',
        stock_quantity: '',
        unit: 'pcs',
        description: '',
        image_url: '',
        is_active: true,
        low_stock_threshold: 10
      });
      setImagePreview(null);
    }
    setErrors({});
    setTouched({});
  }, [product, isOpen]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : (name === 'sku' ? value.toUpperCase() : value);
    
    setFormData(prev => ({ ...prev, [name]: newValue }));
    
    if (touched[name]) {
      const validation = validateProduct({ ...formData, [name]: newValue });
      setErrors(prev => ({ ...prev, [name]: validation.errors[name] }));
    }

    // Auto-generate image preview
    if (name === 'image_url' && value) {
      setImagePreview(value);
    }
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    
    const validation = validateProduct(formData);
    setErrors(prev => ({ ...prev, [name]: validation.errors[name] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const validation = validateProduct(formData);
    setErrors(validation.errors);
    
    const allTouched = Object.keys(formData).reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {});
    setTouched(allTouched);
    
    if (!validation.isValid) return;
    
    setLoading(true);
    await onSave(formData);
    setLoading(false);
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm w-screen h-screen">
      <div className={`rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden transition-colors duration-300 ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
        <div className="bg-petron-blue p-6">
          <h3 className="text-xl font-bold text-white">
            {product ? 'Edit Product' : 'Add New Product'}
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Left Column */}
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 transition-colors duration-300 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                  Product Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  className={`w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-[#0033A0] outline-none transition-colors duration-300 ${errors.name ? 'border-red-500' : (isDarkMode ? 'border-slate-600 bg-slate-700 text-white' : 'border-gray-300 bg-white text-gray-900')}`}
                  value={formData.name}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="e.g. Petron Xtra Unleaded"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle size={14} className="mr-1" />
                    {errors.name}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={`block text-sm font-medium mb-1 transition-colors duration-300 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                    Category
                  </label>
                  <select
                    name="category"
                    className={`w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-[#0033A0] outline-none transition-colors duration-300 ${isDarkMode ? 'border-slate-600 bg-slate-700 text-white' : 'border-gray-300 bg-white text-gray-900'}`}
                    value={formData.category}
                    onChange={handleChange}
                  >
                    {Object.values(PRODUCT_CATEGORIES).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 transition-colors duration-300 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                    SKU
                  </label>
                  <input
                    type="text"
                    name="sku"
                    className={`w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-[#0033A0] outline-none transition-colors duration-300 ${errors.sku ? 'border-red-500' : (isDarkMode ? 'border-slate-600 bg-slate-700 text-white' : 'border-gray-300 bg-white text-gray-900')}`}
                    value={formData.sku}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="e.g. PET-EO-001"
                  />
                  {errors.sku && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle size={14} className="mr-1" />
                      {errors.sku}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 transition-colors duration-300 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                  Unit
                </label>
                <input
                  type="text"
                  name="unit"
                  className={`w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-[#0033A0] outline-none transition-colors duration-300 ${errors.unit ? 'border-red-500' : (isDarkMode ? 'border-slate-600 bg-slate-700 text-white' : 'border-gray-300 bg-white text-gray-900')}`}
                  value={formData.unit}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="pcs / liters"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={`block text-sm font-medium mb-1 transition-colors duration-300 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                    Price (₱)
                  </label>
                  <input
                    type="number"
                    name="current_price"
                    step="0.01"
                    min="0"
                    className={`w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-[#0033A0] outline-none transition-colors duration-300 ${errors.current_price ? 'border-red-500' : (isDarkMode ? 'border-slate-600 bg-slate-700 text-white' : 'border-gray-300 bg-white text-gray-900')}`}
                    value={formData.current_price}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 transition-colors duration-300 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                    Stock
                  </label>
                  <input
                    type="number"
                    name="stock_quantity"
                    min="0"
                    className={`w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-[#0033A0] outline-none transition-colors duration-300 ${errors.stock_quantity ? 'border-red-500' : (isDarkMode ? 'border-slate-600 bg-slate-700 text-white' : 'border-gray-300 bg-white text-gray-900')}`}
                    value={formData.stock_quantity}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 transition-colors duration-300 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                  Low Stock Threshold
                </label>
                <input
                  type="number"
                  name="low_stock_threshold"
                  min="1"
                  className={`w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-[#0033A0] outline-none transition-colors duration-300 ${isDarkMode ? 'border-slate-600 bg-slate-700 text-white' : 'border-gray-300 bg-white text-gray-900'}`}
                  value={formData.low_stock_threshold}
                  onChange={handleChange}
                  placeholder="10"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="is_active"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={handleChange}
                  className={`rounded text-[#0033A0] focus:ring-[#0033A0] transition-colors duration-300 ${isDarkMode ? 'border-slate-500 bg-slate-600' : 'border-gray-300'}`}
                />
                <label htmlFor="is_active" className={`ml-2 text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Active (visible to customers)
                </label>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 transition-colors duration-300 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                  Image URL
                </label>
                <input
                  type="url"
                  name="image_url"
                  className={`w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-[#0033A0] outline-none transition-colors duration-300 ${isDarkMode ? 'border-slate-600 bg-slate-700 text-white' : 'border-gray-300 bg-white text-gray-900'}`}
                  value={formData.image_url}
                  onChange={handleChange}
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              {imagePreview && (
                <div className={`border rounded-lg p-2 transition-colors duration-300 ${isDarkMode ? 'border-slate-600' : 'border-gray-200'}`}>
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    className="w-full h-32 object-cover rounded"
                    onError={() => setImagePreview(null)}
                  />
                </div>
              )}

              <div>
                <label className={`block text-sm font-medium mb-1 transition-colors duration-300 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                  Description
                </label>
                <textarea
                  name="description"
                  className={`w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-[#0033A0] outline-none h-32 resize-none transition-colors duration-300 ${isDarkMode ? 'border-slate-600 bg-slate-700 text-white' : 'border-gray-300 bg-white text-gray-900'}`}
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Product details, specifications, etc."
                />
              </div>
            </div>
          </div>

          <div className={`flex gap-3 pt-4 border-t transition-colors duration-300 ${isDarkMode ? 'border-slate-700' : 'border-gray-200'}`}>
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 py-2.5 border font-medium rounded-lg transition transition-colors duration-300 ${isDarkMode ? 'border-slate-600 text-gray-200 hover:bg-slate-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-petron-blue text-white font-medium rounded-lg hover:opacity-90 transition flex items-center justify-center disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={18} />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2" size={18} />
                  {product ? 'Update Product' : 'Save Product'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}