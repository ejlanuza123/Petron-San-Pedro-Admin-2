// src/hooks/useProducts.js
import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { productService } from '../services/productService';
import { useAdminLog } from './useAdminLog';
import { diffObjects, formatChangesDescription } from '../utils/diff';
import { notifySuccess } from '../utils/successNotifier';

export function useProducts() {
  const { logProductAction } = useAdminLog();
  const location = useLocation();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Throttle refetch to prevent excessive calls
  const throttle = (func, limit) => {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    }
  };

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await productService.getAll();
      setProducts(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load + route change refetch
  useEffect(() => {
    fetchProducts();
  }, [location.pathname, fetchProducts]);

  // Visibility change refetch (tab switch)
  useEffect(() => {
    const throttledRefetch = throttle(fetchProducts, 1000);
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        throttledRefetch();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchProducts]);

  // Real-time subscription (unchanged)
  useEffect(() => {
    const subscription = productService.subscribeToChanges((payload) => {
      if (payload.eventType === 'INSERT') {
        setProducts(prev => [payload.new, ...prev]);
      } else if (payload.eventType === 'UPDATE') {
        setProducts(prev => prev.map(p => p.id === payload.new.id ? { ...p, ...payload.new } : p));
      } else if (payload.eventType === 'DELETE') {
        setProducts(prev => prev.filter(p => p.id !== payload.old.id));
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const addProduct = async (productData) => {
    try {
      setError(null);
      const newProduct = await productService.create(productData);
      setProducts(prev => [...prev, newProduct]);
      await logProductAction(newProduct.id, 'create_product', { name: newProduct.name });
      notifySuccess(`Created product: ${newProduct.name}`);
      return newProduct;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const updateProduct = async (id, productData) => {
    try {
      setError(null);
      const existingProduct = products.find((p) => p.id === id) || {};
      const updatedProduct = await productService.update(id, productData);
      setProducts(prev => prev.map(p => p.id === id ? updatedProduct : p));

      const changes = diffObjects(
        {
          name: existingProduct.name,
          description: existingProduct.description,
          price: existingProduct.price,
          stock: existingProduct.stock
        },
        {
          name: updatedProduct.name,
          description: updatedProduct.description,
          price: updatedProduct.price,
          stock: updatedProduct.stock
        }
      );

      const description = formatChangesDescription(changes) || 'Updated product';

      await logProductAction(id, 'update_product', changes, description);
      notifySuccess(description);
      return updatedProduct;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const deleteProduct = async (id) => {
    try {
      setError(null);
      await productService.delete(id);
      setProducts(prev => prev.filter(p => p.id !== id));
      await logProductAction(id, 'delete_product');
      notifySuccess('Deleted product successfully');
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const getLowStock = useCallback(async () => {
    try {
      return await productService.getLowStock();
    } catch (err) {
      setError(err.message);
      return [];
    }
  }, []);

  return {
    products,
    loading,
    error,
    addProduct,
    updateProduct,
    deleteProduct,
    getLowStock,
    refetch: fetchProducts
  };
}