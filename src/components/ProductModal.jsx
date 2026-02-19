// src/components/ProductModal.jsx
import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, AlertCircle } from 'lucide-react';
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
    image_url: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({});

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        category: product.category || PRODUCT_CATEGORIES.MOTOR_OIL,
        current_price: product.current_price || '',
        stock_quantity: product.stock_quantity || '',
        unit: product.unit || 'pcs',
        description: product.description || '',
        image_url: product.image_url || ''
      });
    } else {
      setFormData({
        name: '',
        category: PRODUCT_CATEGORIES.MOTOR_OIL,
        current_price: '',
        stock_quantity: '',
        unit: 'pcs',
        description: '',
        image_url: ''
      });
    }
    setErrors({});
    setTouched({});
  }, [product, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Validate on change if field has been touched
    if (touched[name]) {
      const validation = validateProduct({ ...formData, [name]: value });
      setErrors(prev => ({ ...prev, [name]: validation.errors[name] }));
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
    
    // Validate all fields
    const validation = validateProduct(formData);
    setErrors(validation.errors);
    
    // Mark all fields as touched
    const allTouched = Object.keys(formData).reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {});
    setTouched(allTouched);
    
    if (!validation.isValid) {
      return;
    }
    
    setLoading(true);
    await onSave(formData);
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b bg-gradient-to-r from-blue-600 to-blue-700">
          <h3 className="text-xl font-bold text-white">
            {product ? 'Edit Product' : 'Add New Product'}
          </h3>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-blue-500 rounded-full transition text-white"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[calc(90vh-200px)] overflow-y-auto">
          {/* Product Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              required
              className={`w-full border ${errors.name ? 'border-red-500' : 'border-gray-300'} rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none`}
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

          {/* Category and Price */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                name="category"
                className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
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
                Price (₱) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="current_price"
                required
                step="0.01"
                min="0"
                className={`w-full border ${errors.current_price ? 'border-red-500' : 'border-gray-300'} rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none`}
                value={formData.current_price}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="0.00"
              />
              {errors.current_price && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle size={14} className="mr-1" />
                  {errors.current_price}
                </p>
              )}
            </div>
          </div>

          {/* Stock and Unit */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stock Quantity <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="stock_quantity"
                required
                min="0"
                className={`w-full border ${errors.stock_quantity ? 'border-red-500' : 'border-gray-300'} rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none`}
                value={formData.stock_quantity}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="0"
              />
              {errors.stock_quantity && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle size={14} className="mr-1" />
                  {errors.stock_quantity}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="unit"
                required
                className={`w-full border ${errors.unit ? 'border-red-500' : 'border-gray-300'} rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none`}
                value={formData.unit}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="pcs / liters"
              />
              {errors.unit && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle size={14} className="mr-1" />
                  {errors.unit}
                </p>
              )}
            </div>
          </div>

          {/* Image URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Image URL (Optional)
            </label>
            <input
              type="url"
              name="image_url"
              className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.image_url}
              onChange={handleChange}
              placeholder="https://example.com/image.jpg"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              name="description"
              className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none"
              value={formData.description}
              onChange={handleChange}
              placeholder="Product details, specifications, etc."
            />
          </div>

          {/* Form Actions */}
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
              className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-lg hover:from-blue-700 hover:to-blue-800 transition flex items-center justify-center disabled:opacity-50"
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