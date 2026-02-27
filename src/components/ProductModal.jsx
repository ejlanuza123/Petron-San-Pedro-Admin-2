// src/components/ProductModal.jsx (Enhanced)
import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { PRODUCT_CATEGORIES } from '../utils/constants';
import { validateProduct } from '../utils/validation';

export default function ProductModal({ isOpen, onClose, product, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
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
    const newValue = type === 'checkbox' ? checked : value;
    
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-[#0033A0] to-[#ED1C24] p-6">
          <h3 className="text-xl font-bold text-white">
            {product ? 'Edit Product' : 'Add New Product'}
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[calc(90vh-200px)] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            {/* Left Column */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  className={`w-full border ${errors.name ? 'border-red-500' : 'border-gray-300'} rounded-lg p-2.5 focus:ring-2 focus:ring-[#0033A0] outline-none`}
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    name="category"
                    className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-[#0033A0] outline-none"
                    value={formData.category}
                    onChange={handleChange}
                  >
                    {Object.values(PRODUCT_CATEGORIES).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit
                  </label>
                  <input
                    type="text"
                    name="unit"
                    className={`w-full border ${errors.unit ? 'border-red-500' : 'border-gray-300'} rounded-lg p-2.5 focus:ring-2 focus:ring-[#0033A0] outline-none`}
                    value={formData.unit}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="pcs / liters"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price (₱)
                  </label>
                  <input
                    type="number"
                    name="current_price"
                    step="0.01"
                    min="0"
                    className={`w-full border ${errors.current_price ? 'border-red-500' : 'border-gray-300'} rounded-lg p-2.5 focus:ring-2 focus:ring-[#0033A0] outline-none`}
                    value={formData.current_price}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stock
                  </label>
                  <input
                    type="number"
                    name="stock_quantity"
                    min="0"
                    className={`w-full border ${errors.stock_quantity ? 'border-red-500' : 'border-gray-300'} rounded-lg p-2.5 focus:ring-2 focus:ring-[#0033A0] outline-none`}
                    value={formData.stock_quantity}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Low Stock Threshold
                </label>
                <input
                  type="number"
                  name="low_stock_threshold"
                  min="1"
                  className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-[#0033A0] outline-none"
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
                  className="rounded border-gray-300 text-[#0033A0] focus:ring-[#0033A0]"
                />
                <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                  Active (visible to customers)
                </label>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Image URL
                </label>
                <input
                  type="url"
                  name="image_url"
                  className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-[#0033A0] outline-none"
                  value={formData.image_url}
                  onChange={handleChange}
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              {imagePreview && (
                <div className="border rounded-lg p-2">
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    className="w-full h-32 object-cover rounded"
                    onError={() => setImagePreview(null)}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-[#0033A0] outline-none h-32 resize-none"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Product details, specifications, etc."
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-gradient-to-r from-[#0033A0] to-[#ED1C24] text-white font-medium rounded-lg hover:opacity-90 transition flex items-center justify-center disabled:opacity-50"
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
    </div>
  );
}