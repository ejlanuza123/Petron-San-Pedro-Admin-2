// src/pages/Products.jsx
import React, { useState, useMemo, useCallback, useRef } from 'react';
import { Plus, Edit2, Trash2, Package, AlertTriangle, ImageOff, Settings, Bell, RefreshCw, Zap, CheckCircle2 } from 'lucide-react';
import ProductModal from '../components/ProductModal';
import ProductDetailsModal from '../components/ProductDetailsModal';
import ErrorAlert from '../components/common/ErrorAlert';
import EmptyState from '../components/common/EmptyState';
import SearchBar from '../components/common/SearchBar';
import Pagination from '../components/common/Pagination';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { useProducts } from '../hooks/useProducts';
import { PRODUCT_CATEGORIES } from '../utils/constants';
import { formatCurrency } from '../utils/formatters';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { settingsService } from '../services/settingsService';
import { lowStockAlertService } from '../services/lowStockAlertService';
import { notifySuccess } from '../utils/successNotifier';

// Default placeholder images based on category
const getPlaceholderImage = (category) => {
  switch(category) {
    case PRODUCT_CATEGORIES.FUEL:
      return 'https://images.unsplash.com/photo-1588707631731-9627b1e4cd2a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
    case PRODUCT_CATEGORIES.MOTOR_OIL:
      return 'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
    case PRODUCT_CATEGORIES.ENGINE_OIL:
      return 'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
    default:
      return 'https://images.unsplash.com/photo-1588707631731-9627b1e4cd2a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
  }
};

// Skeleton Components
const ProductCardSkeleton = ({ isDarkMode }) => (
  <div className={`rounded-xl border overflow-hidden animate-pulse transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
    <div className={`h-48 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'}`}></div>
    <div className="p-4">
      <div className={`h-5 w-32 rounded mb-2 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'}`}></div>
      <div className={`h-4 w-24 rounded mb-3 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'}`}></div>
      <div className="flex justify-between items-center mt-3">
        <div className="space-y-2">
          <div className={`h-3 w-12 rounded ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'}`}></div>
          <div className={`h-5 w-20 rounded ${isDarkMode ? 'bg-slate-600' : 'bg-gray-300'}`}></div>
        </div>
        <div className="text-right space-y-2">
          <div className={`h-3 w-12 rounded ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'}`}></div>
          <div className={`h-5 w-16 rounded ${isDarkMode ? 'bg-slate-600' : 'bg-gray-300'}`}></div>
        </div>
      </div>
      <div className={`mt-4 pt-4 border-t flex gap-2 ${isDarkMode ? 'border-slate-700' : 'border-gray-200'}`}>
        <div className={`flex-1 h-10 rounded ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'}`}></div>
        <div className={`w-12 h-10 rounded ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'}`}></div>
      </div>
    </div>
  </div>
);

const StatCardSkeleton = ({ isDarkMode }) => (
  <div className={`p-4 rounded-lg border animate-pulse transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
    <div className={`h-4 w-20 rounded mb-2 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'}`}></div>
    <div className={`h-8 w-16 rounded ${isDarkMode ? 'bg-slate-600' : 'bg-gray-300'}`}></div>
  </div>
);

export default function Products() {
  const { isDarkMode } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const handledFocusNonceRef = useRef(null);
  const { products, loading, error, addProduct, updateProduct, deleteProduct } = useProducts();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [imageErrors, setImageErrors] = useState({});

  // Low stock threshold & quick restock state
  const [lowStockThreshold, setLowStockThreshold] = useState(10);
  const [showThresholdModal, setShowThresholdModal] = useState(false);
  const [thresholdInput, setThresholdInput] = useState('10');
  const [savingThreshold, setSavingThreshold] = useState(false);
  const [stockFilter, setStockFilter] = useState('all'); // 'all' | 'low_stock' | 'out_of_stock'
  const [quickRestockProduct, setQuickRestockProduct] = useState(null);
  const [restockAmount, setRestockAmount] = useState('10');
  const [savingRestock, setSavingRestock] = useState(false);

  // Fetch low stock threshold on mount
  React.useEffect(() => {
    const fetchThreshold = async () => {
      const threshold = await settingsService.getLowStockThreshold();
      setLowStockThreshold(threshold);
      setThresholdInput(String(threshold));
    };
    fetchThreshold();
  }, []);

  // Run real-time stock alert evaluation whenever products or threshold change
  React.useEffect(() => {
    if (products && products.length > 0) {
      lowStockAlertService.evaluateStockAlerts(products, lowStockThreshold);
    }
  }, [products, lowStockThreshold]);

  React.useEffect(() => {
    const focusProductId = Number(location.state?.focusProductId);
    const focusNonce = location.state?.focusNonce;
    if (!Number.isFinite(focusProductId) || !products?.length || !focusNonce) return;
    if (handledFocusNonceRef.current === focusNonce) return;

    const targetProduct = products.find((p) => p.id === focusProductId);
    if (!targetProduct) return;

    handledFocusNonceRef.current = focusNonce;
    setEditingProduct(targetProduct);
    setIsModalOpen(true);

    navigate(location.pathname, { replace: true, state: {} });
  }, [location.pathname, location.state?.focusNonce, location.state?.focusProductId, navigate, products]);

  // Handle image error
  const handleImageError = (productId) => {
    setImageErrors(prev => ({ ...prev, [productId]: true }));
  };

  // Memoized filtered products
  const filteredProducts = useMemo(() => {
    let filtered = products;
    
    if (categoryFilter !== 'All') {
      filtered = filtered.filter(p => p.category === categoryFilter);
    }

    if (stockFilter === 'low_stock') {
      filtered = filtered.filter(p => p.stock_quantity <= lowStockThreshold && p.stock_quantity > 0);
    } else if (stockFilter === 'out_of_stock') {
      filtered = filtered.filter(p => p.stock_quantity === 0);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [products, searchQuery, categoryFilter, stockFilter, lowStockThreshold]);

  // Memoized pagination
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  // Memoized stats
  const stats = useMemo(() => ({
    total: products.length,
    lowStock: products.filter(p => p.stock_quantity <= lowStockThreshold && p.stock_quantity > 0).length,
    outOfStock: products.filter(p => p.stock_quantity === 0).length,
    categories: new Set(products.map(p => p.category)).size,
    totalValue: products.reduce((sum, p) => sum + (p.current_price * p.stock_quantity), 0)
  }), [products, lowStockThreshold]);

  const handleSaveProduct = useCallback(async (productData) => {
    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, productData);
      } else {
        await addProduct(productData);
      }
      setIsModalOpen(false);
      setEditingProduct(null);
    } catch (err) {
      // Error is handled by hook
    }
  }, [editingProduct, addProduct, updateProduct]);

  const handleDeleteClick = useCallback((product) => {
    setProductToDelete(product);
    setShowDeleteDialog(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (productToDelete) {
      await deleteProduct(productToDelete.id);
      setShowDeleteDialog(false);
      setProductToDelete(null);
    }
  }, [productToDelete, deleteProduct]);

  const openEdit = useCallback((product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  }, []);

  const openDetails = useCallback((product) => {
    setSelectedProduct(product);
  }, []);

  const openAdd = useCallback(() => {
    setEditingProduct(null);
    setIsModalOpen(true);
  }, []);

  const handleSearch = useCallback((query) => {
    setSearchQuery(query);
    setCurrentPage(1);
  }, []);

  const handleCategoryChange = useCallback((e) => {
    setCategoryFilter(e.target.value);
    setCurrentPage(1);
  }, []);

  const handlePageChange = useCallback((page) => {
    setCurrentPage(page);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingProduct(null);
  }, []);

  const closeDetails = useCallback(() => {
    setSelectedProduct(null);
  }, []);

  const openEditFromDetails = useCallback((product) => {
    setSelectedProduct(null);
    openEdit(product);
  }, [openEdit]);

  const closeDeleteDialog = useCallback(() => {
    setShowDeleteDialog(false);
    setProductToDelete(null);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setCurrentPage(1);
  }, []);

  const handleSaveThreshold = useCallback(async () => {
    const val = parseInt(thresholdInput, 10);
    if (Number.isNaN(val) || val < 1) {
      alert('Threshold must be a valid positive number');
      return;
    }
    try {
      setSavingThreshold(true);
      const success = await settingsService.updateLowStockThreshold(val);
      if (success) {
        setLowStockThreshold(val);
        setShowThresholdModal(false);
        notifySuccess(`Low stock threshold updated to ${val} units`);
      } else {
        alert('Failed to update low stock threshold');
      }
    } finally {
      setSavingThreshold(false);
    }
  }, [thresholdInput]);

  const handleExecuteQuickRestock = useCallback(async (addedQty) => {
    if (!quickRestockProduct) return;
    const currentQty = Number(quickRestockProduct.stock_quantity) || 0;
    const addVal = Number(addedQty || restockAmount) || 0;
    if (addVal <= 0) {
      alert('Restock quantity must be greater than 0');
      return;
    }
    const newQty = currentQty + addVal;
    try {
      setSavingRestock(true);
      await updateProduct(quickRestockProduct.id, {
        stock_quantity: newQty,
        category: quickRestockProduct.category
      });
      notifySuccess(`Restocked "${quickRestockProduct.name}" by +${addVal} units! New total: ${newQty}`);
      setQuickRestockProduct(null);
      setRestockAmount('10');
    } catch (err) {
      alert('Failed to restock product');
    } finally {
      setSavingRestock(false);
    }
  }, [quickRestockProduct, restockAmount, updateProduct]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-12 w-40 bg-gray-200 rounded animate-pulse"></div>
        </div>

        {/* Filters Skeleton */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 h-12 bg-gray-200 rounded animate-pulse"></div>
          <div className="w-48 h-12 bg-gray-200 rounded animate-pulse"></div>
        </div>

        {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <StatCardSkeleton key={i} isDarkMode={isDarkMode} />)}
      </div>
      {/* Products Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[1,2,3,4,5,6,7,8].map(i => <ProductCardSkeleton key={i} isDarkMode={isDarkMode} />)}
      </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className={`text-2xl font-bold transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Inventory Management</h2>
          <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Alert Threshold: <span className="font-semibold text-amber-500">{lowStockThreshold} units</span>
          </p>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              setThresholdInput(String(lowStockThreshold));
              setShowThresholdModal(true);
            }}
            className={`px-3 py-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition ${
              isDarkMode ? 'border-slate-700 bg-slate-800 text-gray-300 hover:bg-slate-700' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            }`}
            title="Configure Low Stock Alert Threshold"
          >
            <Settings size={15} className="text-amber-500" />
            <span>Alert Threshold ({lowStockThreshold})</span>
          </button>

          <button 
            onClick={openAdd}
            className="bg-petron-blue text-white px-5 py-2 rounded-lg flex items-center gap-2 hover:opacity-90 transition-opacity duration-150 shadow-md text-sm font-semibold"
          >
            <Plus size={18} />
            Add New Product
          </button>
        </div>
      </div>

      {error && <ErrorAlert message={error} />}

      {/* Critical Stock Alert Banner */}
      {(stats.lowStock > 0 || stats.outOfStock > 0) && (
        <div className={`p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-3 ${
          stats.outOfStock > 0
            ? isDarkMode ? 'bg-red-950/40 border-red-800 text-red-200' : 'bg-red-50 border-red-200 text-red-800'
            : isDarkMode ? 'bg-amber-950/40 border-amber-800 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-800'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${stats.outOfStock > 0 ? 'bg-red-600 text-white' : 'bg-amber-500 text-white'}`}>
              <AlertTriangle size={20} />
            </div>
            <div>
              <h4 className="font-bold text-sm">
                {stats.outOfStock > 0 ? `🚨 Alert: ${stats.outOfStock} items Out of Stock & ${stats.lowStock} Low Stock` : `⚠️ Warning: ${stats.lowStock} items below ${lowStockThreshold} units threshold`}
              </h4>
              <p className="text-xs opacity-90">Review inventory levels and restock items to prevent order cancellations.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setStockFilter(stockFilter === 'all' ? 'low_stock' : 'all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg shadow-sm transition ${
                stats.outOfStock > 0 ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-amber-600 hover:bg-amber-700 text-white'
              }`}
            >
              {stockFilter === 'all' ? 'View Low Stock Items' : 'Show All Items'}
            </button>
          </div>
        </div>
      )}

      {/* Filters & Stock Filter Chips */}
      <div className="flex flex-col sm:flex-row gap-4">
        <SearchBar 
          onSearch={handleSearch}
          placeholder="Search products by name or description..."
          className="flex-1"
        />

        <div className="flex items-center gap-1.5 p-1 bg-gray-100 dark:bg-slate-700/80 rounded-lg">
          <button
            onClick={() => setStockFilter('all')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              stockFilter === 'all'
                ? 'bg-[#0033A0] text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
            }`}
          >
            All ({stats.total})
          </button>
          <button
            onClick={() => setStockFilter('low_stock')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition ${
              stockFilter === 'low_stock'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-amber-600'
            }`}
          >
            ⚠️ Low Stock ({stats.lowStock})
          </button>
          <button
            onClick={() => setStockFilter('out_of_stock')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition ${
              stockFilter === 'out_of_stock'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-red-600'
            }`}
          >
            🚨 Out of Stock ({stats.outOfStock})
          </button>
        </div>
        
        <select
          value={categoryFilter}
          onChange={handleCategoryChange}
          className={`border rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#0033A0] outline-none transition-colors duration-300 text-sm ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
        >
          <option value="All">All Categories</option>
          {Object.values(PRODUCT_CATEGORIES).map(category => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className={`p-4 rounded-lg border min-w-0 transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
          <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total Products</p>
          <p className={`text-2xl font-bold ${isDarkMode ? 'text-blue-400' : 'text-[#0033A0]'}`}>{stats.total}</p>
        </div>
        <div 
          onClick={() => setStockFilter('low_stock')}
          className={`p-4 rounded-lg border min-w-0 cursor-pointer transition-all duration-300 ${stockFilter === 'low_stock' ? 'ring-2 ring-amber-500' : ''} ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}
        >
          <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Low Stock (&le;{lowStockThreshold})</p>
          <p className="text-2xl font-bold text-amber-500">{stats.lowStock}</p>
        </div>
        <div 
          onClick={() => setStockFilter('out_of_stock')}
          className={`p-4 rounded-lg border min-w-0 cursor-pointer transition-all duration-300 ${stockFilter === 'out_of_stock' ? 'ring-2 ring-red-500' : ''} ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}
        >
          <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Out of Stock</p>
          <p className="text-2xl font-bold text-red-600">{stats.outOfStock}</p>
        </div>
        <div className={`p-4 rounded-lg border min-w-0 transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
          <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Categories</p>
          <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{stats.categories}</p>
        </div>
        <div className={`p-4 rounded-lg border min-w-0 transition-colors duration-300 col-span-2 lg:col-span-1 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
          <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total Value</p>
          <p className="text-lg font-bold text-green-600 leading-tight truncate">
            {formatCurrency(stats.totalValue)}
          </p>
        </div>
      </div>

      {filteredProducts.length === 0 ? (
        <EmptyState 
          type="products"
          message={searchQuery ? "No products match your search" : "No products found"}
          action={searchQuery ? {
            label: "Clear Search",
            onClick: clearSearch
          } : {
            label: "Add Your First Product",
            onClick: openAdd
          }}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {paginatedProducts.map((product) => {
              const isOutOfStock = product.stock_quantity === 0;
              const isLowStock = product.stock_quantity <= lowStockThreshold && !isOutOfStock;

              return (
                <div 
                  key={product.id} 
                  className={`rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-all duration-150 group cursor-pointer relative ${
                    isOutOfStock 
                      ? isDarkMode ? 'bg-slate-800 border-red-800 ring-1 ring-red-800' : 'bg-white border-red-300 ring-1 ring-red-300'
                      : isLowStock
                        ? isDarkMode ? 'bg-slate-800 border-amber-800 ring-1 ring-amber-800' : 'bg-white border-amber-300 ring-1 ring-amber-300'
                        : isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
                  }`}
                  onClick={() => openDetails(product)}
                >
                  {/* Product Image */}
                  <div className={`h-48 relative overflow-hidden ${isDarkMode ? 'bg-slate-700' : 'bg-gray-100'}`}>
                    {!imageErrors[product.id] && product.image_url ? (
                      <img 
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        onError={() => handleImageError(product.id)}
                      />
                    ) : (
                      <div className={`w-full h-full flex items-center justify-center ${isDarkMode ? 'bg-gradient-to-br from-slate-700 to-slate-800' : 'bg-gradient-to-br from-gray-100 to-gray-200'}`}>
                        {product.category === PRODUCT_CATEGORIES.FUEL ? (
                          <div className="text-center">
                            <div className="text-6xl mb-2">⛽</div>
                            <p className="text-sm text-gray-400">Fuel Product</p>
                          </div>
                        ) : product.category === PRODUCT_CATEGORIES.MOTOR_OIL ? (
                          <div className="text-center">
                            <div className="text-6xl mb-2">🛢️</div>
                            <p className="text-sm text-gray-400">Motor Oil</p>
                          </div>
                        ) : (
                          <div className="text-center">
                            <div className="text-6xl mb-2">🔧</div>
                            <p className="text-sm text-gray-400">Engine Oil</p>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Stock Badge */}
                    <div className="absolute top-2 right-2">
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-lg shadow-lg ${
                        isOutOfStock 
                          ? 'bg-red-600 text-white animate-pulse' 
                          : isLowStock
                            ? 'bg-amber-500 text-white'
                            : 'bg-green-600 text-white'
                      }`}>
                        {isOutOfStock ? 'OUT OF STOCK' : `${product.stock_quantity} ${product.unit}`}
                      </span>
                    </div>

                    {/* Category Badge */}
                    <div className="absolute top-2 left-2">
                      <span className={`px-2 py-1 text-xs font-bold rounded shadow-lg backdrop-blur-sm ${
                        isDarkMode 
                          ? 'bg-slate-700/90 text-gray-200' 
                          : 'bg-white/90 text-gray-700'
                      }`}>
                        {product.category}
                      </span>
                    </div>
                  </div>

                  <div className="p-4">
                    <h3 className={`font-bold mb-1 line-clamp-1 transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{product.name}</h3>
                    
                    {product.description && (
                      <p className={`text-sm mb-2 line-clamp-2 transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{product.description}</p>
                    )}
                    
                    {isOutOfStock ? (
                      <div className={`flex items-center text-red-600 text-xs mb-2 p-1.5 rounded-md font-bold ${isDarkMode ? 'bg-red-950/60' : 'bg-red-50'}`}>
                        <AlertTriangle size={13} className="mr-1.5 flex-shrink-0" />
                        🚨 Out of stock — Action required
                      </div>
                    ) : isLowStock ? (
                      <div className={`flex items-center text-amber-600 text-xs mb-2 p-1.5 rounded-md font-bold ${isDarkMode ? 'bg-amber-950/60' : 'bg-amber-50'}`}>
                        <AlertTriangle size={13} className="mr-1.5 flex-shrink-0" />
                        ⚠️ Low stock (&le;{lowStockThreshold} units)
                      </div>
                    ) : null}

                    <div className="flex justify-between items-center mt-3">
                      <div>
                        <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Price</p>
                        <p className={`font-bold text-lg ${isDarkMode ? 'text-blue-400' : 'text-[#0033A0]'}`}>
                          {formatCurrency(product.current_price)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Stock</p>
                        <p className={`font-bold ${
                          isOutOfStock ? 'text-red-600' : isLowStock ? 'text-amber-500' : 'text-green-600'
                        }`}>
                          {product.stock_quantity} {product.unit}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t flex gap-2">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setQuickRestockProduct(product);
                          setRestockAmount('10');
                        }}
                        className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 shadow-sm transition"
                        title="1-Click Quick Restock"
                      >
                        <Zap size={14} />
                        Restock
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(product);
                        }}
                        className={`flex-1 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-colors ${isDarkMode ? 'bg-slate-700 text-gray-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-700 hover:bg-[#E5EEFF] hover:text-[#0033A0]'}`}
                      >
                        <Edit2 size={13} />
                        Edit
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(product);
                        }}
                        className={`px-3 rounded-lg flex items-center justify-center transition-colors ${isDarkMode ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50' : 'bg-red-50 text-[#ED1C24] hover:bg-red-100'}`}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination 
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          )}
        </>
      )}

      {/* Product Modal */}
      <ProductModal 
        isOpen={isModalOpen}
        onClose={closeModal}
        product={editingProduct}
        onSave={handleSaveProduct}
      />

      <ProductDetailsModal
        isOpen={!!selectedProduct}
        onClose={closeDetails}
        product={selectedProduct}
        onEdit={openEditFromDetails}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={closeDeleteDialog}
        onConfirm={confirmDelete}
        title="Delete Product"
        message={`Are you sure you want to delete "${productToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
      />

      {/* Low Stock Threshold Modal */}
      {showThresholdModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className={`${isDarkMode ? 'bg-slate-800' : 'bg-white'} rounded-xl w-full max-w-md shadow-2xl transition-colors duration-300`}>
            <div className="p-6 border-b bg-[#0033A0] text-white">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Settings size={18} /> Low Stock Alert Threshold
              </h3>
              <p className="text-xs text-blue-100 mt-1">Set the unit count at which automated low stock warnings trigger.</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className={`block text-xs font-semibold mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Threshold (Units)</label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={thresholdInput}
                  onChange={(e) => setThresholdInput(e.target.value)}
                  className={`w-full border rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-[#0033A0] outline-none ${
                    isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  placeholder="Enter threshold e.g. 10"
                />
                <p className="text-xs text-gray-500 mt-1">Default is 10 units. Products at or below this level will trigger automated warnings.</p>
              </div>
            </div>
            <div className={`p-6 border-t flex gap-3 justify-end ${isDarkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-gray-50 border-gray-200'}`}>
              <button
                onClick={() => setShowThresholdModal(false)}
                disabled={savingThreshold}
                className={`px-4 py-2 border rounded-lg text-sm font-medium ${isDarkMode ? 'border-slate-600 text-gray-300 hover:bg-slate-600' : 'border-gray-300 text-gray-700 hover:bg-gray-100'}`}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveThreshold}
                disabled={savingThreshold}
                className="px-4 py-2 bg-[#0033A0] text-white rounded-lg text-sm font-medium hover:bg-blue-800 transition shadow-sm disabled:opacity-50"
              >
                {savingThreshold ? 'Saving...' : 'Save Threshold'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ⚡ 1-Click Quick Restock Modal */}
      {quickRestockProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className={`${isDarkMode ? 'bg-slate-800' : 'bg-white'} rounded-xl w-full max-w-md shadow-2xl transition-colors duration-300`}>
            <div className="p-6 border-b bg-emerald-600 text-white">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Zap size={20} /> 1-Click Quick Restock
              </h3>
              <p className="text-xs text-emerald-100 mt-1">{quickRestockProduct.name}</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Current Stock</p>
                  <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{quickRestockProduct.stock_quantity} {quickRestockProduct.unit}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Category</p>
                  <p className="text-sm font-semibold">{quickRestockProduct.category}</p>
                </div>
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Add Quantity to Stock</label>
                <div className="flex gap-2 mb-3">
                  {[5, 10, 20, 50].map((qty) => (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => setRestockAmount(String(qty))}
                      className={`flex-1 py-1.5 rounded-lg border text-xs font-bold transition ${
                        restockAmount === String(qty)
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : isDarkMode ? 'border-slate-600 text-gray-300 hover:bg-slate-700' : 'border-gray-300 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      +{qty}
                    </button>
                  ))}
                </div>

                <input
                  type="number"
                  min="1"
                  value={restockAmount}
                  onChange={(e) => setRestockAmount(e.target.value)}
                  className={`w-full border rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none ${
                    isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  placeholder="Enter custom restock amount"
                />
                <p className="text-xs text-gray-500 mt-1">
                  New total will be: <strong className="text-emerald-600">{(Number(quickRestockProduct.stock_quantity) || 0) + (Number(restockAmount) || 0)} {quickRestockProduct.unit}</strong>
                </p>
              </div>
            </div>
            <div className={`p-6 border-t flex gap-3 justify-end ${isDarkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-gray-50 border-gray-200'}`}>
              <button
                onClick={() => setQuickRestockProduct(null)}
                disabled={savingRestock}
                className={`px-4 py-2 border rounded-lg text-sm font-medium ${isDarkMode ? 'border-slate-600 text-gray-300 hover:bg-slate-600' : 'border-gray-300 text-gray-700 hover:bg-gray-100'}`}
              >
                Cancel
              </button>
              <button
                onClick={() => handleExecuteQuickRestock()}
                disabled={savingRestock}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition shadow-sm disabled:opacity-50"
              >
                {savingRestock ? 'Restocking...' : `+ Add ${restockAmount} Units`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
