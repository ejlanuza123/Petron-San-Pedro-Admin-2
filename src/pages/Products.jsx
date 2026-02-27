// src/pages/Products.jsx
import React, { useState, useMemo, useCallback } from 'react';
import { Plus, Edit2, Trash2, Package, AlertTriangle, ImageOff } from 'lucide-react';
import ProductModal from '../components/ProductModal';
import ErrorAlert from '../components/common/ErrorAlert';
import EmptyState from '../components/common/EmptyState';
import SearchBar from '../components/common/SearchBar';
import Pagination from '../components/common/Pagination';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { useProducts } from '../hooks/useProducts';
import { PRODUCT_CATEGORIES } from '../utils/constants';
import { formatCurrency } from '../utils/formatters';

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
const ProductCardSkeleton = () => (
  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-pulse">
    <div className="h-48 bg-gray-200"></div>
    <div className="p-4">
      <div className="h-5 w-32 bg-gray-200 rounded mb-2"></div>
      <div className="h-4 w-24 bg-gray-200 rounded mb-3"></div>
      <div className="flex justify-between items-center mt-3">
        <div className="space-y-2">
          <div className="h-3 w-12 bg-gray-200 rounded"></div>
          <div className="h-5 w-20 bg-gray-200 rounded"></div>
        </div>
        <div className="text-right space-y-2">
          <div className="h-3 w-12 bg-gray-200 rounded"></div>
          <div className="h-5 w-16 bg-gray-200 rounded"></div>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t flex gap-2">
        <div className="flex-1 h-10 bg-gray-200 rounded"></div>
        <div className="w-12 h-10 bg-gray-200 rounded"></div>
      </div>
    </div>
  </div>
);

const StatCardSkeleton = () => (
  <div className="bg-white p-4 rounded-lg border border-gray-200 animate-pulse">
    <div className="h-4 w-20 bg-gray-200 rounded mb-2"></div>
    <div className="h-8 w-16 bg-gray-300 rounded"></div>
  </div>
);

export default function Products() {
  const { products, loading, error, addProduct, updateProduct, deleteProduct } = useProducts();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [imageErrors, setImageErrors] = useState({});

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
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [products, searchQuery, categoryFilter]);

  // Memoized pagination
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  // Memoized stats
  const stats = useMemo(() => ({
    total: products.length,
    lowStock: products.filter(p => p.stock_quantity < 10).length,
    categories: new Set(products.map(p => p.category)).size,
    totalValue: products.reduce((sum, p) => sum + (p.current_price * p.stock_quantity), 0)
  }), [products]);

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

  const closeDeleteDialog = useCallback(() => {
    setShowDeleteDialog(false);
    setProductToDelete(null);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setCurrentPage(1);
  }, []);

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

        {/* Stats Summary Skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <StatCardSkeleton key={i} />)}
        </div>

        {/* Products Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1,2,3,4,5,6,7,8].map(i => <ProductCardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Inventory Management</h2>
        
        <button 
          onClick={openAdd}
          className="bg-gradient-to-r from-[#0033A0] to-[#ED1C24] text-white px-6 py-2.5 rounded-lg flex items-center gap-2 hover:opacity-90 transition-opacity duration-150 shadow-lg"
        >
          <Plus size={18} />
          Add New Product
        </button>
      </div>

      {error && <ErrorAlert message={error} />}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <SearchBar 
          onSearch={handleSearch}
          placeholder="Search products..."
          className="flex-1"
        />
        
        <select
          value={categoryFilter}
          onChange={handleCategoryChange}
          className="bg-white border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#0033A0] outline-none"
        >
          <option value="All">All Categories</option>
          {Object.values(PRODUCT_CATEGORIES).map(category => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-500">Total Products</p>
          <p className="text-2xl font-bold text-[#0033A0]">{stats.total}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-500">Low Stock</p>
          <p className="text-2xl font-bold text-[#ED1C24]">{stats.lowStock}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-500">Categories</p>
          <p className="text-2xl font-bold text-gray-900">{stats.categories}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-500">Total Value</p>
          <p className="text-2xl font-bold text-green-600">
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
            {paginatedProducts.map((product) => (
              <div 
                key={product.id} 
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-150 group"
              >
                {/* Product Image */}
                <div className="h-48 bg-gray-100 relative overflow-hidden">
                  {!imageErrors[product.id] && product.image_url ? (
                    <img 
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      onError={() => handleImageError(product.id)}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
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
                    <span className={`px-2 py-1 text-xs font-bold rounded shadow-lg ${
                      product.stock_quantity > 10 
                        ? 'bg-green-500 text-white' 
                        : 'bg-red-500 text-white'
                    }`}>
                      {product.stock_quantity} {product.unit}
                    </span>
                  </div>

                  {/* Category Badge */}
                  <div className="absolute top-2 left-2">
                    <span className="px-2 py-1 text-xs font-bold rounded bg-white/90 backdrop-blur-sm text-gray-700 shadow-lg">
                      {product.category}
                    </span>
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="font-bold text-gray-900 mb-1 line-clamp-1">{product.name}</h3>
                  
                  {product.description && (
                    <p className="text-sm text-gray-500 mb-2 line-clamp-2">{product.description}</p>
                  )}
                  
                  {product.stock_quantity < 10 && (
                    <div className="flex items-center text-[#ED1C24] text-xs mb-2 bg-red-50 p-1 rounded">
                      <AlertTriangle size={12} className="mr-1 flex-shrink-0" />
                      Low stock alert
                    </div>
                  )}

                  <div className="flex justify-between items-center mt-3">
                    <div>
                      <p className="text-xs text-gray-400">Price</p>
                      <p className="font-bold text-[#0033A0] text-lg">
                        {formatCurrency(product.current_price)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Stock</p>
                      <p className={`font-medium ${
                        product.stock_quantity > 10 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {product.stock_quantity} {product.unit}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t flex gap-2">
                    <button 
                      onClick={() => openEdit(product)}
                      className="flex-1 bg-gray-50 text-gray-700 py-2 rounded-lg hover:bg-[#E5EEFF] hover:text-[#0033A0] text-sm font-medium flex items-center justify-center gap-2 transition-colors duration-150"
                    >
                      <Edit2 size={14} />
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDeleteClick(product)}
                      className="bg-red-50 text-[#ED1C24] px-4 rounded-lg hover:bg-red-100 flex items-center justify-center transition-colors duration-150"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
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

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={closeDeleteDialog}
        onConfirm={confirmDelete}
        title="Delete Product"
        message={`Are you sure you want to delete "${productToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
      />
    </div>
  );
}