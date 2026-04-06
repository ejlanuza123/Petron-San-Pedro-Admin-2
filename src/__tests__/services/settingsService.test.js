import { beforeEach, describe, expect, it, vi } from 'vitest';
import { settingsService } from '../../services/settingsService';

const mockSingle = vi.fn();
const mockEq = vi.fn();
const mockSelect = vi.fn();
const mockUpsert = vi.fn();
const mockFrom = vi.fn();

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: (...args) => mockFrom(...args),
  },
}));

describe('settingsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockSingle.mockResolvedValue({ data: { value: '75' }, error: null });
    mockEq.mockReturnValue({ single: mockSingle });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockUpsert.mockResolvedValue({ error: null });

    mockFrom.mockImplementation((table) => {
      if (table === 'app_settings') {
        return { select: mockSelect, upsert: mockUpsert };
      }
      return {};
    });
  });

  it('getDefaultDeliveryFee returns parsed numeric value', async () => {
    const fee = await settingsService.getDefaultDeliveryFee();

    expect(mockFrom).toHaveBeenCalledWith('app_settings');
    expect(fee).toBe(75);
  });

  it('getDefaultDeliveryFee falls back to 50 when query errors', async () => {
    mockSingle.mockResolvedValue({ data: null, error: new Error('missing') });

    const fee = await settingsService.getDefaultDeliveryFee();

    expect(fee).toBe(50);
  });

  it('getDefaultDeliveryFee falls back to 50 when value is not numeric', async () => {
    mockSingle.mockResolvedValue({ data: { value: 'abc' }, error: null });

    const fee = await settingsService.getDefaultDeliveryFee();

    expect(fee).toBe(50);
  });

  it('getDefaultDeliveryFee falls back to 50 when query throws', async () => {
    mockSingle.mockRejectedValue(new Error('connection down'));

    const fee = await settingsService.getDefaultDeliveryFee();

    expect(fee).toBe(50);
  });

  it('updateDefaultDeliveryFee returns true on successful upsert', async () => {
    const ok = await settingsService.updateDefaultDeliveryFee(65);

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'default_delivery_fee', value: '65' }),
      { onConflict: 'key' }
    );
    expect(ok).toBe(true);
  });

  it('updateDefaultDeliveryFee returns false when upsert throws', async () => {
    mockUpsert.mockResolvedValue({ error: new Error('write failed') });

    const ok = await settingsService.updateDefaultDeliveryFee(90);

    expect(ok).toBe(false);
  });

  it('getSetting returns default when value missing', async () => {
    mockSingle.mockResolvedValue({ data: { value: null }, error: null });

    const value = await settingsService.getSetting('missing_key', 'fallback');

    expect(value).toBe('fallback');
  });

  it('getSetting returns fetched value when present', async () => {
    mockSingle.mockResolvedValue({ data: { value: 'enabled' }, error: null });

    const value = await settingsService.getSetting('feature_flag', 'fallback');

    expect(value).toBe('enabled');
  });

  it('getSetting returns default when query returns error', async () => {
    mockSingle.mockResolvedValue({ data: null, error: new Error('not found') });

    const value = await settingsService.getSetting('missing_key', 'fallback');

    expect(value).toBe('fallback');
  });

  it('getSetting returns default when query throws', async () => {
    mockSingle.mockRejectedValue(new Error('timeout'));

    const value = await settingsService.getSetting('missing_key', 'fallback');

    expect(value).toBe('fallback');
  });
});
