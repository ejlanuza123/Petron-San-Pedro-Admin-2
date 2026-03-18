// src/hooks/useProducts.js
import { useState, useEffect, useCallback, useRef } from 'react';
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

  // Track whether we have fetched at least once so that navigating back to
  // this route doesn't flash skeletons over already-loaded data.
  const hasFetchedRef = useRef(false);

  const fetchProducts = useCallback(async (isSilent = false) => {
    try {
      // Only show skeletons on the very first load, never on silent refreshes
      // or subsequent navigations where we already have data.
      if (!isSilent && !hasFetchedRef.current) {
        setLoading(true);
      }
      setError(null);
      const data = await productService.getAll();
      setProducts(data);
      hasFetchedRef.current = true;
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load only — do NOT re-run on pathname change to avoid
  // skeleton-lock when returning from another tab or page.
  useEffect(() => {
    fetchProducts(false);
  }, [fetchProducts]);

  // Real-time subscription
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
          stock: existingProduct.stock,
        },
        {
          name: updatedProduct.name,
          description: updatedProduct.description,
          price: updatedProduct.price,
          stock: updatedProduct.stock,
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
    refetch: fetchProducts,
  };
}