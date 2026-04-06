import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ORDER_STATUS } from '../../utils/constants';
import { orderService } from '../../services/orderService';

const mockEq = vi.fn();
const mockUpdate = vi.fn();
const mockFrom = vi.fn();
const mockChannel = vi.fn();
const mockChannelOn = vi.fn();
const mockChannelSubscribe = vi.fn();

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: (...args) => mockFrom(...args),
    channel: (...args) => mockChannel(...args),
  },
}));

describe('orderService.updateStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockEq.mockResolvedValue({ error: null });
    mockUpdate.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ update: mockUpdate });

    mockChannelOn.mockReturnValue({ subscribe: mockChannelSubscribe });
    mockChannel.mockReturnValue({ on: mockChannelOn });
    mockChannelSubscribe.mockReturnValue({ unsubscribe: vi.fn() });
  });

  it('updates cancelled orders with cancellation metadata', async () => {
    await orderService.updateStatus('order-123', ORDER_STATUS.CANCELLED, {
      cancellationReason: 'Other',
      cancellationNote: 'Customer requested delay',
      cancelledBy: 'admin-1',
    });

    expect(mockFrom).toHaveBeenCalledWith('orders');
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: ORDER_STATUS.CANCELLED,
        cancellation_reason: 'Other: Customer requested delay',
        cancelled_by: 'admin-1',
      })
    );
    expect(mockEq).toHaveBeenCalledWith('id', 'order-123');
  });

  it('uses explicit cancellation reason when not Other', async () => {
    await orderService.updateStatus('order-234', ORDER_STATUS.CANCELLED, {
      cancellationReason: 'Out of stock',
      cancelledBy: 'admin-2',
    });

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        cancellation_reason: 'Out of stock',
        cancelled_by: 'admin-2',
      })
    );
  });

  it('falls back to Unspecified when cancellation reason is missing', async () => {
    await orderService.updateStatus('order-345', ORDER_STATUS.CANCELLED, {
      cancelledBy: 'admin-3',
    });

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        cancellation_reason: 'Unspecified',
        cancelled_by: 'admin-3',
      })
    );
  });

  it('throws when Supabase update returns error', async () => {
    mockEq.mockResolvedValue({ error: new Error('db failed') });

    await expect(
      orderService.updateStatus('order-123', ORDER_STATUS.PROCESSING)
    ).rejects.toThrow('db failed');
  });

  it('updates delivery fee successfully', async () => {
    await orderService.updateDeliveryFee('order-123', 85);

    expect(mockFrom).toHaveBeenCalledWith('orders');
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ delivery_fee: 85 })
    );
    expect(mockEq).toHaveBeenCalledWith('id', 'order-123');
  });
});

describe('orderService retrieval methods', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns order details from getById', async () => {
    const mockSingle = vi.fn().mockResolvedValue({
      data: { id: 'order-123', status: ORDER_STATUS.PENDING },
      error: null,
    });
    const mockEqLocal = vi.fn().mockReturnValue({ single: mockSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEqLocal });

    mockFrom.mockReturnValue({ select: mockSelect });

    const result = await orderService.getById('order-123');

    expect(mockFrom).toHaveBeenCalledWith('orders');
    expect(mockEqLocal).toHaveBeenCalledWith('id', 'order-123');
    expect(result).toEqual({ id: 'order-123', status: ORDER_STATUS.PENDING });
  });

  it('throws when getById query fails', async () => {
    const mockSingle = vi.fn().mockResolvedValue({
      data: null,
      error: new Error('not found'),
    });
    const mockEqLocal = vi.fn().mockReturnValue({ single: mockSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEqLocal });

    mockFrom.mockReturnValue({ select: mockSelect });

    await expect(orderService.getById('order-missing')).rejects.toThrow('not found');
  });

  it('returns all orders from getAll on success', async () => {
    const rows = [{ id: 'o-1' }, { id: 'o-2' }];
    const localOrder = vi.fn().mockResolvedValue({ data: rows, error: null });
    const mockSelect = vi.fn().mockReturnValue({ order: localOrder });

    mockFrom.mockReturnValue({ select: mockSelect });

    const result = await orderService.getAll();

    expect(result).toEqual(rows);
  });

  it('throws when getAll query fails', async () => {
    const localOrder = vi.fn().mockResolvedValue({
      data: null,
      error: new Error('query failed'),
    });
    const mockSelect = vi.fn().mockReturnValue({ order: localOrder });

    mockFrom.mockReturnValue({ select: mockSelect });

    await expect(orderService.getAll()).rejects.toThrow('query failed');
  });

  it('computes order stats on successful queries', async () => {
    const revenueCompleted = { data: [{ total_amount: 100 }, { total_amount: 50 }], error: null };
    const pendingCount = { count: 2, error: null };
    const processingCount = { count: 3, error: null };
    const completedCount = { count: 4, error: null };
    const lowStockCount = { count: 5, error: null };
    const todayCompleted = { data: [{ total_amount: 20 }, { total_amount: 30 }], error: null };
    let totalAmountQueryCount = 0;

    const selectOrders = vi.fn((selection, options) => {
      if (selection === 'total_amount' && !options) {
        totalAmountQueryCount += 1;

        if (totalAmountQueryCount === 1) {
          return {
            eq: vi.fn(() => Promise.resolve(revenueCompleted)),
          };
        }

        return {
          eq: vi.fn(() => ({
            gte: vi.fn(() => Promise.resolve(todayCompleted)),
          })),
        };
      }
      if (selection === '*' && options?.count === 'exact' && options?.head === true) {
        return {
          eq: vi.fn((_, status) => {
            if (status === ORDER_STATUS.PENDING) return Promise.resolve(pendingCount);
            if (status === ORDER_STATUS.PROCESSING) return Promise.resolve(processingCount);
            if (status === ORDER_STATUS.COMPLETED) return Promise.resolve(completedCount);
            return Promise.resolve({ count: 0 });
          }),
        };
      }
      return {};
    });

    const selectProducts = vi.fn(() => ({ lt: vi.fn(() => Promise.resolve(lowStockCount)) }));

    mockFrom.mockImplementation((table) => {
      if (table === 'orders') return { select: selectOrders };
      if (table === 'products') return { select: selectProducts };
      return {};
    });

    const stats = await orderService.getStats();

    expect(stats.totalRevenue).toBe(150);
    expect(stats.todayRevenue).toBe(50);
    expect(stats.pendingOrders).toBe(2);
    expect(stats.processingOrders).toBe(3);
    expect(stats.completedOrders).toBe(4);
    expect(stats.lowStock).toBe(5);
  });

  it('returns zeroed stats on failure', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'orders') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => Promise.reject(new Error('stats failed'))),
          })),
        };
      }
      return { select: vi.fn(() => ({ lt: vi.fn(() => Promise.resolve({ count: 0 })) })) };
    });

    const stats = await orderService.getStats();

    expect(stats).toEqual({
      totalRevenue: 0,
      todayRevenue: 0,
      pendingOrders: 0,
      processingOrders: 0,
      completedOrders: 0,
      lowStock: 0,
    });
  });

  it('subscribeToChanges forwards realtime payload', () => {
    const callback = vi.fn();
    const subscriptionObj = { unsubscribe: vi.fn() };
    mockChannelSubscribe.mockReturnValue(subscriptionObj);

    const result = orderService.subscribeToChanges(callback);

    expect(mockChannel).toHaveBeenCalledWith('orders-channel');
    expect(mockChannelOn).toHaveBeenCalledWith(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'orders' },
      expect.any(Function)
    );
    expect(result).toBe(subscriptionObj);

    const handler = mockChannelOn.mock.calls[0][2];
    handler({ eventType: 'INSERT', new: { id: 'o-9' } });
    expect(callback).toHaveBeenCalledWith({ eventType: 'INSERT', new: { id: 'o-9' } });
  });
});
