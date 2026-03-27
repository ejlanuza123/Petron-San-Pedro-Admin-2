import { beforeEach, describe, expect, it, vi } from 'vitest';
import { bulkOperationsService } from '../../services/bulkOperationsService';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  authGetUser: vi.fn(),
  sql: vi.fn((parts, ...vals) => `${parts[0]}${vals.join('')}`),
}));

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: (...args) => mocks.from(...args),
    auth: {
      getUser: (...args) => mocks.authGetUser(...args),
    },
    sql: (...args) => mocks.sql(...args),
  },
}));

describe('bulkOperationsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authGetUser.mockResolvedValue({ data: { user: { id: 'admin-fallback' } }, error: null });
  });

  it('bulkUpdateOrderStatus returns success and writes audit logs', async () => {
    const inSpy = vi.fn().mockResolvedValue({ error: null });
    const updateSpy = vi.fn().mockReturnValue({ in: inSpy });
    const insertSpy = vi.fn().mockResolvedValue({ error: null });

    mocks.from.mockImplementation((table) => {
      if (table === 'orders') return { update: updateSpy };
      if (table === 'admin_logs') return { insert: insertSpy };
      return {};
    });

    const result = await bulkOperationsService.bulkUpdateOrderStatus(['o1', 'o2'], 'Processing', 'admin-1');

    expect(result.success).toBe(true);
    expect(result.count).toBe(2);
    expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({ status: 'Processing' }));
    expect(insertSpy).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ admin_id: 'admin-1', entity_type: 'order', entity_id: 'o1' }),
      ])
    );
  });

  it('bulkAssignRiders resolves actor from auth when adminId missing', async () => {
    const inDeliveries = vi.fn().mockResolvedValue({ error: null });
    const updateDeliveries = vi.fn().mockReturnValue({ in: inDeliveries });
    const insertNotifications = vi.fn().mockResolvedValue({ error: null });
    const insertAudit = vi.fn().mockResolvedValue({ error: null });

    mocks.from.mockImplementation((table) => {
      if (table === 'deliveries') return { update: updateDeliveries };
      if (table === 'notifications') return { insert: insertNotifications };
      if (table === 'admin_logs') return { insert: insertAudit };
      return {};
    });

    const result = await bulkOperationsService.bulkAssignRiders(['d1', 'd2'], 'rider-7');

    expect(result.success).toBe(true);
    expect(insertNotifications).toHaveBeenCalledTimes(1);
    expect(insertAudit).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ admin_id: 'admin-fallback', entity_type: 'delivery' }),
      ])
    );
  });

  it('bulkApplyDiscount updates computed discount prices', async () => {
    const products = [
      { id: 'p1', current_price: 100 },
      { id: 'p2', current_price: 250 },
    ];

    const inProducts = vi.fn().mockResolvedValue({ data: products, error: null });
    const selectProducts = vi.fn().mockReturnValue({ in: inProducts });

    const eqUpdate = vi.fn().mockResolvedValue({ error: null });
    const updateProducts = vi.fn().mockReturnValue({ eq: eqUpdate });

    const insertAudit = vi.fn().mockResolvedValue({ error: null });

    mocks.from.mockImplementation((table) => {
      if (table === 'products') {
        return { select: selectProducts, update: updateProducts };
      }
      if (table === 'admin_logs') return { insert: insertAudit };
      return {};
    });

    const result = await bulkOperationsService.bulkApplyDiscount(['p1', 'p2'], 10, 'admin-9');

    expect(result.success).toBe(true);
    expect(updateProducts).toHaveBeenCalledWith(expect.objectContaining({ discount_price: 90 }));
    expect(updateProducts).toHaveBeenCalledWith(expect.objectContaining({ discount_price: 225 }));
  });

  it('exportToCsv returns error when no data provided', async () => {
    const result = await bulkOperationsService.exportToCsv([], 'orders');

    expect(result).toEqual({ success: false, error: 'No data to export' });
  });

  it('exportToCsv succeeds for valid data', async () => {
    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const appendSpy = vi.spyOn(document.body, 'appendChild');
    const removeSpy = vi.spyOn(document.body, 'removeChild');
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const setAttributeSpy = vi.spyOn(HTMLElement.prototype, 'setAttribute');

    const result = await bulkOperationsService.exportToCsv([{ id: 1, name: 'A,B' }], 'orders');

    expect(result.success).toBe(true);
    expect(createObjectURLSpy).toHaveBeenCalledTimes(1);
    expect(setAttributeSpy).toHaveBeenCalledWith('download', expect.stringContaining('orders-'));
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(appendSpy).toHaveBeenCalledTimes(1);
    expect(removeSpy).toHaveBeenCalledTimes(1);
    expect(revokeSpy).toHaveBeenCalledWith('blob:test');
  });

  it('bulkCancelOrders delegates to order status update with cancelled state', async () => {
    const inSpy = vi.fn().mockResolvedValue({ error: null });
    const updateSpy = vi.fn().mockReturnValue({ in: inSpy });
    const selectInSpy = vi.fn().mockResolvedValue({ data: [{ user_id: 'u-1' }], error: null });
    const selectSpy = vi.fn().mockReturnValue({ in: selectInSpy });
    const insertNotifications = vi.fn().mockResolvedValue({ error: null });
    const insertAudit = vi.fn().mockResolvedValue({ error: null });

    mocks.from.mockImplementation((table) => {
      if (table === 'orders') return { update: updateSpy, select: selectSpy };
      if (table === 'notifications') return { insert: insertNotifications };
      if (table === 'admin_logs') return { insert: insertAudit };
      return {};
    });

    const result = await bulkOperationsService.bulkCancelOrders(['o1'], 'Out of stock', 'user-1', 'admin-1');

    expect(result.success).toBe(true);
    expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({ status: 'Cancelled' }));
    expect(insertNotifications).toHaveBeenCalledTimes(1);
  });

  it('bulkDeactivateProducts delegates to product status update with inactive state', async () => {
    const inSpy = vi.fn().mockResolvedValue({ error: null });
    const updateSpy = vi.fn().mockReturnValue({ in: inSpy });
    const insertSpy = vi.fn().mockResolvedValue({ error: null });

    mocks.from.mockImplementation((table) => {
      if (table === 'products') return { update: updateSpy };
      if (table === 'admin_logs') return { insert: insertSpy };
      return {};
    });

    const result = await bulkOperationsService.bulkDeactivateProducts(['p1'], 'admin-1');

    expect(result.success).toBe(true);
    expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({ is_active: false }));
  });

  it('bulkUpdateStock updates all selected products', async () => {
    const eqUpdate = vi.fn().mockResolvedValue({ error: null });
    const updateProducts = vi.fn().mockReturnValue({ eq: eqUpdate });
    const insertAudit = vi.fn().mockResolvedValue({ error: null });

    mocks.from.mockImplementation((table) => {
      if (table === 'products') {
        return { update: updateProducts };
      }
      if (table === 'admin_logs') return { insert: insertAudit };
      return {};
    });

    const result = await bulkOperationsService.bulkUpdateStock(
      [
        { id: 'p1', adjustment: 2 },
        { id: 'p2', adjustment: -1 },
      ],
      'admin-1'
    );

    expect(result.success).toBe(true);
    expect(result.count).toBe(2);
  });

  it('bulkUpdateStock returns failure when selected products cannot be loaded', async () => {
    const eqUpdate = vi.fn()
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: new Error('write failed') });
    const updateProducts = vi.fn().mockReturnValue({ eq: eqUpdate });

    mocks.from.mockImplementation((table) => {
      if (table === 'products') {
        return { update: updateProducts };
      }
      return {};
    });

    const result = await bulkOperationsService.bulkUpdateStock(
      [
        { id: 'p1', adjustment: 1 },
        { id: 'p2', adjustment: 1 },
      ],
      'admin-1'
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('Failed to update 1 products');
  });
});
