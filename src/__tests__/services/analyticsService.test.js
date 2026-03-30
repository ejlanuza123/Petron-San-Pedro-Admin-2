import { beforeEach, describe, expect, it, vi } from 'vitest';
import { analyticsService } from '../../services/analyticsService';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: (...args) => mocks.from(...args),
  },
}));

describe('analyticsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getSalesMetrics computes totals and completion rate', async () => {
    const ordersLte = vi.fn().mockResolvedValue({
      data: [
        { total_amount: '100', status: 'Completed' },
        { total_amount: '50', status: 'Pending' },
      ],
      error: null,
    });
    const ordersGte = vi.fn().mockReturnValue({ lte: ordersLte });
    const ordersSelect = vi.fn().mockReturnValue({ gte: ordersGte });

    const deliveriesLte = vi.fn().mockResolvedValue({
      data: [{ id: 'd1' }, { id: 'd2' }],
      error: null,
    });
    const deliveriesGte = vi.fn().mockReturnValue({ lte: deliveriesLte });
    const deliveriesSelect = vi.fn().mockReturnValue({ gte: deliveriesGte });

    mocks.from.mockImplementation((table) => {
      if (table === 'orders') return { select: ordersSelect };
      if (table === 'deliveries') return { select: deliveriesSelect };
      return {};
    });

    const start = new Date('2026-01-01T00:00:00.000Z');
    const end = new Date('2026-01-31T23:59:59.000Z');
    const result = await analyticsService.getSalesMetrics(start, end);

    expect(result.success).toBe(true);
    expect(result.totalSales).toBe(150);
    expect(result.totalOrders).toBe(2);
    expect(result.completedOrders).toBe(1);
    expect(result.completionRate).toBe('50.00');
    expect(result.avgOrderValue).toBe('75.00');
    expect(result.totalDeliveries).toBe(2);
  });

  it('getOrderStatusDistribution groups counts by status', async () => {
    const ordersSelect = vi.fn().mockResolvedValue({
      data: [{ status: 'Pending' }, { status: 'Pending' }, { status: 'Completed' }],
      error: null,
    });

    mocks.from.mockImplementation((table) => {
      if (table === 'orders') return { select: ordersSelect };
      return {};
    });

    const result = await analyticsService.getOrderStatusDistribution();

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ Pending: 2, Completed: 1 });
  });

  it('getDailySalesData aggregates by date', async () => {
    const ordersOrder = vi.fn().mockResolvedValue({
      data: [
        { created_at: '2026-01-01T08:00:00.000Z', total_amount: '100', status: 'Completed' },
        { created_at: '2026-01-01T10:00:00.000Z', total_amount: '50', status: 'Pending' },
      ],
      error: null,
    });
    const ordersGte = vi.fn().mockReturnValue({ order: ordersOrder });
    const ordersSelect = vi.fn().mockReturnValue({ gte: ordersGte });

    mocks.from.mockImplementation((table) => {
      if (table === 'orders') return { select: ordersSelect };
      return {};
    });

    const result = await analyticsService.getDailySalesData(7);

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toEqual(
      expect.objectContaining({ sales: 150, orders: 2, completed: 1 })
    );
  });

  it('getDeliveryMetrics computes success rate and attempts', async () => {
    const deliveriesLte = vi.fn().mockResolvedValue({
      data: [
        { status: 'delivered', attempt_count: 1 },
        { status: 'failed', attempt_count: 2 },
      ],
      error: null,
    });
    const deliveriesGte = vi.fn().mockReturnValue({ lte: deliveriesLte });
    const deliveriesSelect = vi.fn().mockReturnValue({ gte: deliveriesGte });

    mocks.from.mockImplementation((table) => {
      if (table === 'deliveries') return { select: deliveriesSelect };
      return {};
    });

    const start = new Date('2026-01-01T00:00:00.000Z');
    const end = new Date('2026-01-31T23:59:59.000Z');
    const result = await analyticsService.getDeliveryMetrics(start, end);

    expect(result.success).toBe(true);
    expect(result.data.total).toBe(2);
    expect(result.data.completed).toBe(1);
    expect(result.data.failed).toBe(1);
    expect(result.data.successRate).toBe('50.00');
    expect(result.data.avgAttempts).toBe(1.5);
  });

  it('getCustomerMetrics computes retention fields', async () => {
    const thisMonth = new Date().toISOString();
    const oldDate = new Date('2025-01-01T00:00:00.000Z').toISOString();

    const profilesEq = vi.fn().mockResolvedValue({
      data: [
        { id: 'u1', role: 'customer', created_at: thisMonth },
        { id: 'u2', role: 'customer', created_at: oldDate },
      ],
      error: null,
    });
    const profilesSelect = vi.fn().mockReturnValue({ eq: profilesEq });

    const ordersSelect = vi.fn().mockResolvedValue({
      data: [{ user_id: 'u1' }, { user_id: 'u1' }, { user_id: 'u2' }],
      error: null,
    });

    mocks.from.mockImplementation((table) => {
      if (table === 'profiles') return { select: profilesSelect };
      if (table === 'orders') return { select: ordersSelect };
      return {};
    });

    const result = await analyticsService.getCustomerMetrics();

    expect(result.success).toBe(true);
    expect(result.data.totalCustomers).toBe(2);
    expect(result.data.activeCustomers).toBe(2);
    expect(result.data.newCustomersThisMonth).toBe(1);
    expect(result.data.customerRetentionRate).toBe('100.00');
  });

  it('exportToCSV succeeds and triggers download flow', async () => {
    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:report');
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const setAttributeSpy = vi.spyOn(HTMLElement.prototype, 'setAttribute');
    const appendSpy = vi.spyOn(document.body, 'appendChild');
    const removeSpy = vi.spyOn(document.body, 'removeChild');

    const result = await analyticsService.exportToCSV([{ id: 1, name: 'Item, A' }], 'report.csv');

    expect(result.success).toBe(true);
    expect(createObjectURLSpy).toHaveBeenCalledTimes(1);
    expect(setAttributeSpy).toHaveBeenCalledWith('download', 'report.csv');
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(appendSpy).toHaveBeenCalledTimes(1);
    expect(removeSpy).toHaveBeenCalledTimes(1);
  });

  it('exportToPDF returns placeholder error response', async () => {
    const result = await analyticsService.exportToPDF([{ id: 1 }], 'file.pdf');

    expect(result.success).toBe(false);
    expect(result.error).toBe('PDF export not configured');
  });

  it('getProductPerformance aggregates sales by product', async () => {
    const orderItemsSelect = vi.fn().mockReturnValue({
      order: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({
          data: [
            {
              product_id: 'p1',
              quantity: 5,
              price_at_order: '100',
              products: { name: 'Widget A', category: 'Electronics' },
            },
            {
              product_id: 'p1',
              quantity: 3,
              price_at_order: '100',
              products: { name: 'Widget A', category: 'Electronics' },
            },
            {
              product_id: 'p2',
              quantity: 2,
              price_at_order: '50',
              products: { name: 'Widget B', category: 'Electronics' },
            },
          ],
          error: null,
        }),
      }),
    });

    mocks.from.mockImplementation((table) => {
      if (table === 'order_items') return { select: orderItemsSelect };
      return {};
    });

    const result = await analyticsService.getProductPerformance();

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
    expect(result.data).toContainEqual(
      expect.objectContaining({
        name: 'Widget A',
        quantity: 8,
        revenue: 800,
      })
    );
    expect(result.data).toContainEqual(
      expect.objectContaining({
        name: 'Widget B',
        quantity: 2,
        revenue: 100,
      })
    );
  });

  it('getSalesMetrics returns error when query fails', async () => {
    const ordersSelect = vi.fn().mockReturnValue({
      gte: vi.fn().mockReturnValue({
        lte: vi.fn().mockResolvedValue({
          data: null,
          error: new Error('query failed'),
        }),
      }),
    });

    mocks.from.mockImplementation((table) => {
      if (table === 'orders') return { select: ordersSelect };
      return {};
    });

    const start = new Date('2026-01-01T00:00:00.000Z');
    const end = new Date('2026-01-31T23:59:59.000Z');
    const result = await analyticsService.getSalesMetrics(start, end);

    expect(result.success).toBe(false);
    expect(result.error).toBe('query failed');
  });

  it('getProductPerformance returns error when query fails', async () => {
    const orderItemsSelect = vi.fn().mockReturnValue({
      order: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({
          data: null,
          error: new Error('db error'),
        }),
      }),
    });

    mocks.from.mockImplementation((table) => {
      if (table === 'order_items') return { select: orderItemsSelect };
      return {};
    });

    const result = await analyticsService.getProductPerformance();

    expect(result.success).toBe(false);
    expect(result.error).toBe('db error');
  });

  it('getOrderStatusDistribution returns error when query fails', async () => {
    const ordersSelect = vi.fn().mockResolvedValue({
      data: null,
      error: new Error('distribution query failed'),
    });

    mocks.from.mockImplementation((table) => {
      if (table === 'orders') return { select: ordersSelect };
      return {};
    });

    const result = await analyticsService.getOrderStatusDistribution();

    expect(result.success).toBe(false);
    expect(result.error).toBe('distribution query failed');
  });

  it('getDailySalesData returns empty when no orders found', async () => {
    const ordersOrder = vi.fn().mockResolvedValue({
      data: [],
      error: null,
    });
    const ordersGte = vi.fn().mockReturnValue({ order: ordersOrder });
    const ordersSelect = vi.fn().mockReturnValue({ gte: ordersGte });

    mocks.from.mockImplementation((table) => {
      if (table === 'orders') return { select: ordersSelect };
      return {};
    });

    const result = await analyticsService.getDailySalesData(7);

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(0);
  });
});
