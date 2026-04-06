import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useOrders } from '../../hooks/useOrders';

const mocks = vi.hoisted(() => ({
  orderService: {
    getAll: vi.fn(),
    getById: vi.fn(),
    updateStatus: vi.fn(),
    updateDeliveryFee: vi.fn(),
    subscribeToChanges: vi.fn(),
  },
  logOrderAction: vi.fn(),
  notifySuccess: vi.fn(),
  retryAsync: vi.fn(),
  unsubscribe: vi.fn(),
}));

let realtimeCallback;

vi.mock('../../services/orderService', () => ({
  orderService: mocks.orderService,
}));

vi.mock('../../hooks/useAdminLog', () => ({
  useAdminLog: () => ({
    logOrderAction: (...args) => mocks.logOrderAction(...args),
  }),
}));

vi.mock('../../utils/successNotifier', () => ({
  notifySuccess: (...args) => mocks.notifySuccess(...args),
}));

vi.mock('../../utils/retry', () => ({
  retryAsync: (...args) => mocks.retryAsync(...args),
}));

vi.mock('../../utils/diff', () => ({
  diffObjects: () => ({ status: { from: 'Pending', to: 'Processing' } }),
  formatChangesDescription: () => 'Status updated to Processing',
}));

describe('useOrders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    realtimeCallback = undefined;

    mocks.orderService.getAll.mockResolvedValue([{ id: 'o-1', status: 'Pending' }]);
    mocks.orderService.getById.mockResolvedValue({ id: 'o-1', status: 'Pending' });
    mocks.orderService.updateStatus.mockResolvedValue(undefined);
    mocks.orderService.updateDeliveryFee.mockResolvedValue(undefined);
    mocks.orderService.subscribeToChanges.mockImplementation((cb) => {
      realtimeCallback = cb;
      return { unsubscribe: mocks.unsubscribe };
    });

    mocks.retryAsync.mockImplementation(async (fn) => fn());
    mocks.logOrderAction.mockResolvedValue(undefined);
  });

  it('loads orders on mount and stops loading', async () => {
    const { result } = renderHook(() => useOrders());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.orders).toEqual([{ id: 'o-1', status: 'Pending' }]);
    });

    expect(mocks.orderService.getAll).toHaveBeenCalledTimes(1);
    expect(mocks.orderService.subscribeToChanges).toHaveBeenCalledTimes(1);
  });

  it('handles realtime insert events', async () => {
    const { result } = renderHook(() => useOrders());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(typeof realtimeCallback).toBe('function');
    });

    act(() => {
      realtimeCallback({
        eventType: 'INSERT',
        new: { id: 'o-2', status: 'Processing' },
      });
    });

    expect(result.current.orders[0]).toEqual({ id: 'o-2', status: 'Processing' });
  });

  it('handles realtime update and delete events', async () => {
    const { result } = renderHook(() => useOrders());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(typeof realtimeCallback).toBe('function');
    });

    await act(async () => {
      await result.current.viewOrderDetails('o-1');
    });
    expect(result.current.selectedOrder).toEqual({ id: 'o-1', status: 'Pending' });

    act(() => {
      realtimeCallback({
        eventType: 'UPDATE',
        new: { id: 'o-1', status: 'Completed' },
      });
    });

    expect(result.current.orders[0].status).toBe('Completed');
    expect(result.current.selectedOrder.status).toBe('Completed');

    act(() => {
      realtimeCallback({
        eventType: 'DELETE',
        old: { id: 'o-1' },
      });
    });

    expect(result.current.orders).toEqual([]);
    expect(result.current.selectedOrder).toBe(null);
  });

  it('updates status and records admin log', async () => {
    const { result } = renderHook(() => useOrders());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.updateStatus('o-1', 'Processing');
    });

    expect(mocks.orderService.updateStatus).toHaveBeenCalledWith('o-1', 'Processing', {});
    expect(mocks.logOrderAction).toHaveBeenCalledWith(
      'o-1',
      'update_status',
      expect.any(Object),
      'Status updated to Processing'
    );
    expect(mocks.notifySuccess).toHaveBeenCalledWith('Status updated to Processing');
  });

  it('updates delivery fee and records admin log', async () => {
    const { result } = renderHook(() => useOrders());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.updateDeliveryFee('o-1', 120);
    });

    expect(mocks.orderService.updateDeliveryFee).toHaveBeenCalledWith('o-1', 120);
    expect(mocks.logOrderAction).toHaveBeenCalledWith(
      'o-1',
      'update_delivery_fee',
      expect.any(Object),
      'Status updated to Processing'
    );
    expect(mocks.notifySuccess).toHaveBeenCalledWith('Status updated to Processing');
  });

  it('loads selected order details', async () => {
    const { result } = renderHook(() => useOrders());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.viewOrderDetails('o-1');
    });

    expect(mocks.orderService.getById).toHaveBeenCalledWith('o-1');
    expect(result.current.selectedOrder).toEqual({ id: 'o-1', status: 'Pending' });
  });

  it('cleans up subscription on unmount', async () => {
    const { unmount } = renderHook(() => useOrders());

    await waitFor(() => {
      expect(mocks.orderService.subscribeToChanges).toHaveBeenCalledTimes(1);
    });

    unmount();

    expect(mocks.unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('catches and stores error when getAll fails during fetch', async () => {
    mocks.orderService.getAll.mockRejectedValue(new Error('fetch failed'));

    const { result } = renderHook(() => useOrders());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('fetch failed');
    expect(result.current.orders).toEqual([]);
  });

  it('handles updateStatus failure and sets error state', async () => {
    const { result } = renderHook(() => useOrders());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    mocks.orderService.updateStatus.mockRejectedValue(new Error('status update failed'));

    await expect(result.current.updateStatus('o-1', 'Processing')).rejects.toThrow('status update failed');

    await waitFor(() => {
      expect(result.current.error).toBe('status update failed');
    });
  });

  it('handles updateDeliveryFee failure and sets error state', async () => {
    const { result } = renderHook(() => useOrders());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    mocks.orderService.updateDeliveryFee.mockRejectedValue(new Error('fee update failed'));

    await expect(result.current.updateDeliveryFee('o-1', 150)).rejects.toThrow('fee update failed');

    await waitFor(() => {
      expect(result.current.error).toBe('fee update failed');
    });
  });

  it('handles viewOrderDetails failure and sets error state', async () => {
    const { result } = renderHook(() => useOrders());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    mocks.orderService.getById.mockRejectedValue(new Error('details fetch failed'));

    await act(async () => {
      await result.current.viewOrderDetails('o-missing');
    });

    expect(result.current.error).toBe('details fetch failed');
    expect(result.current.selectedOrder).toBe(null);
  });

  it('clears selected order on realtime DELETE when order id matches', async () => {
    const { result } = renderHook(() => useOrders());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(typeof realtimeCallback).toBe('function');
    });

    await act(async () => {
      await result.current.viewOrderDetails('o-1');
    });

    expect(result.current.selectedOrder).not.toBeNull();

    act(() => {
      realtimeCallback({
        eventType: 'DELETE',
        old: { id: 'o-1' },
      });
    });

    expect(result.current.selectedOrder).toBeNull();
  });

  it('handles realtime INSERT event and prepends new order', async () => {
    const { result } = renderHook(() => useOrders());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(typeof realtimeCallback).toBe('function');
    });

    act(() => {
      realtimeCallback({
        eventType: 'INSERT',
        new: { id: 'o-new', status: 'Pending' },
      });
    });

    expect(result.current.orders[0]).toEqual({ id: 'o-new', status: 'Pending' });
  });
});
