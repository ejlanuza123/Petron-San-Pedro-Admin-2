// src/__tests__/services/reservationService.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockOrder = vi.fn();
const mockLte = vi.fn();
const mockGte = vi.fn();
const mockEq = vi.fn();
const mockSelect = vi.fn();
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

import { reservationService } from '../../services/reservationService';

describe('reservationService.getByDate', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockOrder.mockResolvedValue({ data: [], error: null });
    mockLte.mockReturnValue({ order: mockOrder });
    mockGte.mockReturnValue({ lte: mockLte });
    mockEq.mockReturnValue({ gte: mockGte });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });
  });

  it('queries the reservations table', async () => {
    await reservationService.getByDate('2026-09-01');
    expect(mockFrom).toHaveBeenCalledWith('reservations');
  });

  it('filters by status = reserved', async () => {
    await reservationService.getByDate('2026-09-01');
    expect(mockEq).toHaveBeenCalledWith('status', 'reserved');
  });

  it('applies gte and lte bounds matching the full day range for the given date', async () => {
    await reservationService.getByDate('2026-09-01');
    const gteArg = mockGte.mock.calls[0];
    const lteArg = mockLte.mock.calls[0];
    expect(gteArg[0]).toBe('scheduled_at');
    expect(lteArg[0]).toBe('scheduled_at');
    const expectedGte = new Date('2026-09-01T00:00:00').toISOString();
    const expectedLte = new Date('2026-09-01T23:59:59.999').toISOString();
    expect(gteArg[1]).toBe(expectedGte);
    expect(lteArg[1]).toBe(expectedLte);
  });

  it('returns data array on success', async () => {
    const rows = [{ id: 'r1', scheduled_at: '2026-09-01T10:00:00Z' }];
    mockOrder.mockResolvedValue({ data: rows, error: null });

    const result = await reservationService.getByDate('2026-09-01');
    expect(result).toEqual(rows);
  });

  it('returns empty array when data is null', async () => {
    mockOrder.mockResolvedValue({ data: null, error: null });
    const result = await reservationService.getByDate('2026-09-01');
    expect(result).toEqual([]);
  });

  it('throws when Supabase returns an error', async () => {
    mockOrder.mockResolvedValue({ data: null, error: new Error('query failed') });
    await expect(reservationService.getByDate('2026-09-01')).rejects.toThrow('query failed');
  });
});

describe('reservationService.getMonthReservations', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockOrder.mockResolvedValue({ data: [], error: null });
    mockLte.mockReturnValue({ order: mockOrder });
    mockGte.mockReturnValue({ lte: mockLte });
    mockEq.mockReturnValue({ gte: mockGte });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });
  });

  it('queries the reservations table', async () => {
    await reservationService.getMonthReservations(new Date('2026-09-01'));
    expect(mockFrom).toHaveBeenCalledWith('reservations');
  });

  it('applies gte from first day of month', async () => {
    await reservationService.getMonthReservations(new Date('2026-09-15'));
    const gteArg = mockGte.mock.calls[0][1];
    const expectedStart = new Date(2026, 8, 1, 0, 0, 0, 0).toISOString();
    expect(gteArg).toBe(expectedStart);
  });

  it('applies lte to last day of month', async () => {
    await reservationService.getMonthReservations(new Date('2026-09-15'));
    const lteArg = mockLte.mock.calls[0][1];
    const expectedEnd = new Date(2026, 9, 0, 23, 59, 59, 999).toISOString();
    expect(lteArg).toBe(expectedEnd);
  });

  it('returns data on success', async () => {
    const rows = [{ id: 'r2', scheduled_at: '2026-09-10T09:00:00Z' }];
    mockOrder.mockResolvedValue({ data: rows, error: null });
    const result = await reservationService.getMonthReservations(new Date('2026-09-01'));
    expect(result).toEqual(rows);
  });

  it('returns empty array when data is null', async () => {
    mockOrder.mockResolvedValue({ data: null, error: null });
    const result = await reservationService.getMonthReservations(new Date('2026-09-01'));
    expect(result).toEqual([]);
  });

  it('throws on error', async () => {
    mockOrder.mockResolvedValue({ data: null, error: new Error('month query failed') });
    await expect(
      reservationService.getMonthReservations(new Date('2026-09-01'))
    ).rejects.toThrow('month query failed');
  });

  it('handles February correctly (28/29 days boundary)', async () => {
    mockOrder.mockResolvedValue({ data: [], error: null });
    await reservationService.getMonthReservations(new Date('2026-02-15'));
    const lteArg = mockLte.mock.calls[0][1];
    expect(lteArg).toContain('2026-02-28');
  });
});

describe('reservationService.subscribe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChannelSubscribe.mockReturnValue({});
    mockChannelOn.mockReturnValue({ subscribe: mockChannelSubscribe });
    mockChannel.mockReturnValue({ on: mockChannelOn });
  });

  it('subscribes to the admin-reservations-channel', () => {
    const cb = vi.fn();
    reservationService.subscribe(cb);
    expect(mockChannel).toHaveBeenCalledWith('admin-reservations-channel');
  });

  it('listens for postgres_changes on the reservations table', () => {
    const cb = vi.fn();
    reservationService.subscribe(cb);
    expect(mockChannelOn).toHaveBeenCalledWith(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'reservations' },
      cb
    );
  });

  it('calls .subscribe() on the channel', () => {
    reservationService.subscribe(vi.fn());
    expect(mockChannelSubscribe).toHaveBeenCalled();
  });
});
