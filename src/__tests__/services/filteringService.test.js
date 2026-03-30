import { beforeEach, describe, expect, it, vi } from 'vitest';
import { filteringService } from '../../services/filteringService';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: (...args) => mocks.from(...args),
  },
}));

const createQuery = (result) => {
  const q = {
    in: vi.fn(() => q),
    eq: vi.fn(() => q),
    gte: vi.fn(() => q),
    lte: vi.fn(() => q),
    or: vi.fn(() => q),
    ilike: vi.fn(() => q),
    order: vi.fn(() => q),
    range: vi.fn(() => Promise.resolve(result)),
    from: vi.fn(() => ({ select: vi.fn(() => 10) })),
  };
  return q;
};

describe('filteringService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getFilteredOrders returns paginated success payload', async () => {
    const q = createQuery({ data: [{ id: 'o1' }], error: null, count: 21 });
    const select = vi.fn(() => q);
    mocks.from.mockImplementation((table) => {
      if (table === 'orders') return { select };
      return {};
    });

    const result = await filteringService.getFilteredOrders({
      status: ['Pending'],
      search: 'ABC',
      pageSize: 10,
      page: 1,
    });

    expect(result.success).toBe(true);
    expect(result.currentPage).toBe(1);
    expect(result.totalPages).toBe(3);
    expect(q.in).toHaveBeenCalledWith('status', ['Pending']);
    expect(q.or).toHaveBeenCalledTimes(1);
    expect(q.range).toHaveBeenCalledWith(10, 19);
  });

  it('getFilteredDeliveries returns failure on query error', async () => {
    const q = createQuery({ data: null, error: new Error('delivery query failed'), count: 0 });
    const select = vi.fn(() => q);
    mocks.from.mockImplementation((table) => {
      if (table === 'deliveries') return { select };
      return {};
    });

    const result = await filteringService.getFilteredDeliveries({ pageSize: 5, page: 0 });

    expect(result.success).toBe(false);
    expect(result.error).toBe('delivery query failed');
  });

  it('getFilteredProducts applies search and returns data', async () => {
    const q = createQuery({ data: [{ id: 'p1', name: 'Oil' }], error: null, count: 1 });
    const select = vi.fn(() => q);
    mocks.from.mockImplementation((table) => {
      if (table === 'products') return { select };
      return {};
    });

    const result = await filteringService.getFilteredProducts({
      search: 'oil',
      isActive: true,
      pageSize: 50,
      page: 0,
    });

    expect(result.success).toBe(true);
    expect(q.eq).toHaveBeenCalledWith('is_active', true);
    expect(q.ilike).toHaveBeenCalledWith('name', '%oil%');
    expect(result.data).toEqual([{ id: 'p1', name: 'Oil' }]);
  });

  it('getFilterOptions returns de-duplicated options', async () => {
    const ordersSelect = vi.fn().mockResolvedValue({
      data: [
        { status: 'Pending', payment_method: 'COD' },
        { status: 'Pending', payment_method: 'GCash' },
      ],
    });
    const productsSelect = vi.fn().mockResolvedValue({
      data: [{ category: 'Fuel' }, { category: 'Fuel' }, { category: 'Oil' }],
    });
    const ridersEq = vi.fn().mockResolvedValue({
      data: [{ id: 'r1', full_name: 'Rider One' }],
    });
    const ridersSelect = vi.fn().mockReturnValue({ eq: ridersEq });

    mocks.from.mockImplementation((table) => {
      if (table === 'orders') return { select: ordersSelect };
      if (table === 'products') return { select: productsSelect };
      if (table === 'profiles') return { select: ridersSelect };
      return {};
    });

    const result = await filteringService.getFilterOptions();

    expect(result.success).toBe(true);
    expect(result.options.statuses).toEqual(['Pending']);
    expect(result.options.paymentMethods).toEqual(['COD', 'GCash']);
    expect(result.options.categories).toEqual(['Fuel', 'Oil']);
    expect(result.options.riders).toEqual([{ id: 'r1', name: 'Rider One' }]);
  });

  it('getFilteredOrders applies multiple filters (date range and amount)', async () => {
    const q = createQuery({ data: [{ id: 'o2' }], error: null, count: 1 });
    const select = vi.fn(() => q);
    mocks.from.mockImplementation((table) => {
      if (table === 'orders') return { select };
      return {};
    });

    const startDate = new Date('2026-03-01');
    const endDate = new Date('2026-03-31');

    const result = await filteringService.getFilteredOrders({
      startDate,
      endDate,
      minAmount: 100,
      maxAmount: 500,
      pageSize: 10,
      page: 0,
    });

    expect(result.success).toBe(true);
    expect(q.gte).toHaveBeenCalledWith('created_at', startDate.toISOString());
    expect(q.lte).toHaveBeenCalledWith('created_at', endDate.toISOString());
    expect(q.gte).toHaveBeenCalledWith('total_amount', 100);
    expect(q.lte).toHaveBeenCalledWith('total_amount', 500);
  });

  it('getFilteredDeliveries with multiple filters returns paginated data', async () => {
    const q = createQuery({ data: [{ id: 'd1', status: 'delivered' }], error: null, count: 5 });
    const select = vi.fn(() => q);
    mocks.from.mockImplementation((table) => {
      if (table === 'deliveries') return { select };
      return {};
    });

    const startDate = new Date('2026-03-01');
    const endDate = new Date('2026-03-31');

    const result = await filteringService.getFilteredDeliveries({
      status: ['delivered', 'failed'],
      riderId: 'rider-123',
      startDate,
      endDate,
      minAttempts: 1,
      pageSize: 20,
      page: 1,
    });

    expect(result.success).toBe(true);
    expect(q.in).toHaveBeenCalledWith('status', ['delivered', 'failed']);
    expect(q.eq).toHaveBeenCalledWith('rider_id', 'rider-123');
    expect(q.gte).toHaveBeenCalledWith('attempt_count', 1);
    expect(q.range).toHaveBeenCalledWith(20, 39);
    expect(result.currentPage).toBe(1);
    expect(result.totalPages).toBe(1);
  });

  it('getFilterOptions returns error when query fails', async () => {
    const ordersSelect = vi.fn().mockRejectedValue(new Error('orders query failed'));
    const productsSelect = vi.fn().mockResolvedValue({
      data: [{ category: 'Fuel' }],
    });
    const ridersEq = vi.fn().mockResolvedValue({
      data: [],
    });
    const ridersSelect = vi.fn().mockReturnValue({ eq: ridersEq });

    mocks.from.mockImplementation((table) => {
      if (table === 'orders') return { select: ordersSelect };
      if (table === 'products') return { select: productsSelect };
      if (table === 'profiles') return { select: ridersSelect };
      return {};
    });

    const result = await filteringService.getFilterOptions();

    expect(result.success).toBe(false);
    expect(result.error).toBe('orders query failed');
  });
});
