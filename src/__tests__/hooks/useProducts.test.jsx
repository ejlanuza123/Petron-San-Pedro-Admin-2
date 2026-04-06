import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useProducts } from '../../hooks/useProducts';

const mocks = vi.hoisted(() => ({
  productService: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getLowStock: vi.fn(),
    subscribeToChanges: vi.fn(),
  },
  logProductAction: vi.fn(),
  notifySuccess: vi.fn(),
  retryAsync: vi.fn(),
  unsubscribe: vi.fn(),
}));

let realtimeCallback;

vi.mock('../../services/productService', () => ({
  productService: mocks.productService,
}));

vi.mock('../../hooks/useAdminLog', () => ({
  useAdminLog: () => ({
    logProductAction: (...args) => mocks.logProductAction(...args),
  }),
}));

vi.mock('../../utils/successNotifier', () => ({
  notifySuccess: (...args) => mocks.notifySuccess(...args),
}));

vi.mock('../../utils/retry', () => ({
  retryAsync: (...args) => mocks.retryAsync(...args),
}));

vi.mock('../../utils/diff', () => ({
  diffObjects: () => ({ name: { from: 'A', to: 'B' } }),
  formatChangesDescription: () => 'Updated product',
}));

describe('useProducts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    realtimeCallback = undefined;

    mocks.productService.getAll.mockResolvedValue([{ id: 'p-1', name: 'Oil A' }]);
    mocks.productService.create.mockResolvedValue({ id: 'p-2', name: 'Oil B' });
    mocks.productService.update.mockResolvedValue({ id: 'p-1', name: 'Oil A+', stock: 10 });
    mocks.productService.delete.mockResolvedValue(undefined);
    mocks.productService.getLowStock.mockResolvedValue([{ id: 'p-3', stock: 2 }]);
    mocks.productService.subscribeToChanges.mockImplementation((cb) => {
      realtimeCallback = cb;
      return { unsubscribe: mocks.unsubscribe };
    });

    mocks.retryAsync.mockImplementation(async (fn) => fn());
    mocks.logProductAction.mockResolvedValue(undefined);
  });

  it('loads products on mount', async () => {
    const { result } = renderHook(() => useProducts());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.products).toEqual([{ id: 'p-1', name: 'Oil A' }]);
    });

    expect(mocks.productService.getAll).toHaveBeenCalledTimes(1);
  });

  it('adds product and logs action', async () => {
    const { result } = renderHook(() => useProducts());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.addProduct({ name: 'Oil B' });
    });

    expect(mocks.productService.create).toHaveBeenCalledWith({ name: 'Oil B' });
    expect(mocks.logProductAction).toHaveBeenCalledWith('p-2', 'create_product', { name: 'Oil B' });
    expect(mocks.notifySuccess).toHaveBeenCalledWith('Created product: Oil B');
    expect(result.current.products.some((p) => p.id === 'p-2')).toBe(true);
  });

  it('updates and deletes products', async () => {
    const { result } = renderHook(() => useProducts());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.updateProduct('p-1', { name: 'Oil A+' });
    });

    expect(mocks.productService.update).toHaveBeenCalledWith('p-1', { name: 'Oil A+' });
    expect(mocks.logProductAction).toHaveBeenCalledWith(
      'p-1',
      'update_product',
      expect.any(Object),
      'Updated product'
    );

    await act(async () => {
      await result.current.deleteProduct('p-1');
    });

    expect(mocks.productService.delete).toHaveBeenCalledWith('p-1');
    expect(mocks.logProductAction).toHaveBeenCalledWith('p-1', 'delete_product');
    expect(result.current.products.find((p) => p.id === 'p-1')).toBeUndefined();
  });

  it('handles realtime product update and delete', async () => {
    const { result } = renderHook(() => useProducts());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(typeof realtimeCallback).toBe('function');
    });

    act(() => {
      realtimeCallback({
        eventType: 'UPDATE',
        new: { id: 'p-1', name: 'Oil A Updated' },
      });
    });

    expect(result.current.products[0].name).toBe('Oil A Updated');

    act(() => {
      realtimeCallback({
        eventType: 'DELETE',
        old: { id: 'p-1' },
      });
    });

    expect(result.current.products).toEqual([]);
  });

  it('fetches low stock products', async () => {
    const { result } = renderHook(() => useProducts());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let lowStock;
    await act(async () => {
      lowStock = await result.current.getLowStock();
    });

    expect(mocks.productService.getLowStock).toHaveBeenCalledTimes(1);
    expect(lowStock).toEqual([{ id: 'p-3', stock: 2 }]);
  });

  it('cleans up subscription on unmount', async () => {
    const { unmount } = renderHook(() => useProducts());

    await waitFor(() => {
      expect(mocks.productService.subscribeToChanges).toHaveBeenCalledTimes(1);
    });

    unmount();

    expect(mocks.unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('catches and stores error when getAll fails during fetch', async () => {
    mocks.productService.getAll.mockRejectedValue(new Error('fetch failed'));

    const { result } = renderHook(() => useProducts());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('fetch failed');
    expect(result.current.products).toEqual([]);
  });

  it('handles addProduct failure and sets error state', async () => {
    const { result } = renderHook(() => useProducts());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    mocks.productService.create.mockRejectedValue(new Error('create failed'));

    await expect(result.current.addProduct({ name: 'Will Fail' })).rejects.toThrow('create failed');

    await waitFor(() => {
      expect(result.current.error).toBe('create failed');
    });
  });

  it('handles updateProduct failure and sets error state', async () => {
    const { result } = renderHook(() => useProducts());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    mocks.productService.update.mockRejectedValue(new Error('update failed'));

    await expect(result.current.updateProduct('p-1', { name: 'Updated' })).rejects.toThrow('update failed');

    await waitFor(() => {
      expect(result.current.error).toBe('update failed');
    });
  });

  it('handles deleteProduct failure and sets error state', async () => {
    const { result } = renderHook(() => useProducts());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    mocks.productService.delete.mockRejectedValue(new Error('delete failed'));

    await expect(result.current.deleteProduct('p-1')).rejects.toThrow('delete failed');

    await waitFor(() => {
      expect(result.current.error).toBe('delete failed');
    });
  });

  it('returns empty array and sets error when getLowStock fails', async () => {
    const { result } = renderHook(() => useProducts());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    mocks.productService.getLowStock.mockRejectedValue(new Error('stock check failed'));

    let lowStock;
    await act(async () => {
      lowStock = await result.current.getLowStock();
    });

    expect(lowStock).toEqual([]);
    expect(result.current.error).toBe('stock check failed');
  });

  it('handles realtime INSERT event and prepends new product', async () => {
    const { result } = renderHook(() => useProducts());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(typeof realtimeCallback).toBe('function');
    });

    act(() => {
      realtimeCallback({
        eventType: 'INSERT',
        new: { id: 'p-new', name: 'New Product' },
      });
    });

    expect(result.current.products[0]).toEqual({ id: 'p-new', name: 'New Product' });
  });
});
