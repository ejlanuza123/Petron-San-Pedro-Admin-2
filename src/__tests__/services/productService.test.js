import { beforeEach, describe, expect, it, vi } from 'vitest';
import { productService } from '../../services/productService';

const mockSingle = vi.fn();
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockLt = vi.fn();
const mockFrom = vi.fn();
const mockSubscribe = vi.fn();
const mockOn = vi.fn();
const mockChannel = vi.fn();

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: (...args) => mockFrom(...args),
    channel: (...args) => mockChannel(...args),
  },
}));

describe('productService', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockSingle.mockResolvedValue({ data: { id: 'p-1', name: 'Oil A' }, error: null });
    mockSelect.mockReturnValue({ single: mockSingle });
    mockInsert.mockReturnValue({ select: mockSelect });
    mockUpdate.mockReturnValue({ eq: mockEq, select: mockSelect });
    mockDelete.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ single: mockSingle, select: mockSelect });
    mockOrder.mockResolvedValue({ data: [{ id: 'p-1' }], error: null });
    mockLt.mockReturnValue({ order: mockOrder });

    mockOn.mockReturnValue({ subscribe: mockSubscribe });
    mockChannel.mockReturnValue({ on: mockOn });
    mockSubscribe.mockReturnValue({ unsubscribe: vi.fn() });
  });

  it('getAll returns ordered products', async () => {
    const localOrder = vi.fn().mockResolvedValue({ data: [{ id: 'p-1' }], error: null });
    const localSelect = vi.fn().mockReturnValue({ order: localOrder });
    mockFrom.mockReturnValue({ select: localSelect });

    const data = await productService.getAll();

    expect(mockFrom).toHaveBeenCalledWith('products');
    expect(localOrder).toHaveBeenCalledWith('name');
    expect(data).toEqual([{ id: 'p-1' }]);
  });

  it('getAll throws when query fails', async () => {
    const localOrder = vi.fn().mockResolvedValue({ data: null, error: new Error('list failed') });
    const localSelect = vi.fn().mockReturnValue({ order: localOrder });
    mockFrom.mockReturnValue({ select: localSelect });

    await expect(productService.getAll()).rejects.toThrow('list failed');
  });

  it('getById returns product when found', async () => {
    const localSingle = vi.fn().mockResolvedValue({ data: { id: 'p-7' }, error: null });
    const localEq = vi.fn().mockReturnValue({ single: localSingle });
    const localSelect = vi.fn().mockReturnValue({ eq: localEq });
    mockFrom.mockReturnValue({ select: localSelect });

    const data = await productService.getById('p-7');

    expect(data).toEqual({ id: 'p-7' });
  });

  it('getById throws when query fails', async () => {
    const localSingle = vi.fn().mockResolvedValue({ data: null, error: new Error('not found') });
    const localEq = vi.fn().mockReturnValue({ single: localSingle });
    const localSelect = vi.fn().mockReturnValue({ eq: localEq });
    mockFrom.mockReturnValue({ select: localSelect });

    await expect(productService.getById('x')).rejects.toThrow('not found');
  });

  it('create returns inserted product', async () => {
    const created = { id: 'p-2', name: 'Oil B' };
    const localSingle = vi.fn().mockResolvedValue({ data: created, error: null });
    const localSelect = vi.fn().mockReturnValue({ single: localSingle });
    const localInsert = vi.fn().mockReturnValue({ select: localSelect });
    mockFrom.mockReturnValue({ insert: localInsert });

    const data = await productService.create({ name: 'Oil B' });

    expect(localInsert).toHaveBeenCalledWith([
      expect.objectContaining({ name: 'Oil B', created_at: expect.any(String), updated_at: expect.any(String) }),
    ]);
    expect(data).toEqual(created);
  });

  it('update returns updated product', async () => {
    const updated = { id: 'p-2', name: 'Updated Oil' };
    const localSingle = vi.fn().mockResolvedValue({ data: updated, error: null });
    const localSelect = vi.fn().mockReturnValue({ single: localSingle });
    const localEq = vi.fn().mockReturnValue({ select: localSelect });
    const localUpdate = vi.fn().mockReturnValue({ eq: localEq });
    mockFrom.mockReturnValue({ update: localUpdate });

    const data = await productService.update('p-2', { name: 'Updated Oil' });

    expect(data).toEqual(updated);
    expect(localUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Updated Oil', updated_at: expect.any(String) })
    );
  });

  it('update throws when update query fails', async () => {
    const localSingle = vi.fn().mockResolvedValue({ data: null, error: new Error('update failed') });
    const localSelect = vi.fn().mockReturnValue({ single: localSingle });
    const localEq = vi.fn().mockReturnValue({ select: localSelect });
    const localUpdate = vi.fn().mockReturnValue({ eq: localEq });
    mockFrom.mockReturnValue({ update: localUpdate });

    await expect(productService.update('p-2', { name: 'Updated Oil' })).rejects.toThrow('update failed');
  });

  it('delete succeeds and throws on query error', async () => {
    const successEq = vi.fn().mockResolvedValue({ error: null });
    const successDelete = vi.fn().mockReturnValue({ eq: successEq });
    mockFrom.mockReturnValueOnce({ delete: successDelete });

    await expect(productService.delete('p-2')).resolves.toBeUndefined();

    const failEq = vi.fn().mockResolvedValue({ error: new Error('delete failed') });
    const failDelete = vi.fn().mockReturnValue({ eq: failEq });
    mockFrom.mockReturnValueOnce({ delete: failDelete });

    await expect(productService.delete('p-2')).rejects.toThrow('delete failed');
  });

  it('updateStock throws when update fails', async () => {
    const localEq = vi.fn().mockResolvedValue({ error: new Error('db write failed') });
    const localUpdate = vi.fn().mockReturnValue({ eq: localEq });
    mockFrom.mockReturnValue({ update: localUpdate });

    await expect(productService.updateStock('p-1', 3)).rejects.toThrow('db write failed');
  });

  it('getLowStock uses threshold and returns data', async () => {
    const localOrder = vi.fn().mockResolvedValue({ data: [{ id: 'p-3', stock_quantity: 2 }], error: null });
    const localLt = vi.fn().mockReturnValue({ order: localOrder });
    const localSelect = vi.fn().mockReturnValue({ lt: localLt });
    mockFrom.mockReturnValue({ select: localSelect });

    const data = await productService.getLowStock(5);

    expect(localLt).toHaveBeenCalledWith('stock_quantity', 5);
    expect(localOrder).toHaveBeenCalledWith('stock_quantity');
    expect(data).toEqual([{ id: 'p-3', stock_quantity: 2 }]);
  });

  it('subscribeToChanges wires postgres channel callback', () => {
    const callback = vi.fn();
    const subscriptionObj = { unsubscribe: vi.fn() };
    mockSubscribe.mockReturnValue(subscriptionObj);

    const result = productService.subscribeToChanges(callback);

    expect(mockChannel).toHaveBeenCalledWith('products-channel');
    expect(mockOn).toHaveBeenCalledWith(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'products' },
      expect.any(Function)
    );
    expect(result).toBe(subscriptionObj);

    const eventHandler = mockOn.mock.calls[0][2];
    eventHandler({ eventType: 'INSERT', new: { id: 'p-9' } });
    expect(callback).toHaveBeenCalledWith({ eventType: 'INSERT', new: { id: 'p-9' } });
  });
});
