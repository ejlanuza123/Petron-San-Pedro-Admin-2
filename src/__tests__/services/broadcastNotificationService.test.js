import { beforeEach, describe, expect, it, vi } from 'vitest';
import { broadcastNotificationService, PRESET_TEMPLATES, BROADCAST_CATEGORIES } from '../../services/broadcastNotificationService';

const mockRpc = vi.fn();
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockRange = vi.fn();

vi.mock('../../lib/supabase', () => ({
  supabase: {
    rpc: (...args) => mockRpc(...args),
    from: (...args) => mockFrom(...args),
  },
}));

describe('broadcastNotificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();

    mockEq.mockResolvedValue({
      data: [
        { role: 'customer', notifications_enabled: true, fcm_token: 'ExponentPushToken[c1]' },
        { role: 'customer', notifications_enabled: false, fcm_token: 'ExponentPushToken[c2]' },
        { role: 'rider', notifications_enabled: true, fcm_token: 'ExponentPushToken[r1]' },
        { role: 'rider', notifications_enabled: true, fcm_token: null }
      ],
      error: null
    });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });
  });

  describe('PRESET_TEMPLATES and BROADCAST_CATEGORIES', () => {
    it('contains valid categories with required metadata', () => {
      expect(BROADCAST_CATEGORIES.length).toBeGreaterThanOrEqual(4);
      const ids = BROADCAST_CATEGORIES.map(c => c.id);
      expect(ids).toContain('weather_advisory');
      expect(ids).toContain('promo');
    });

    it('contains preset templates for weather and promos', () => {
      expect(PRESET_TEMPLATES.length).toBeGreaterThanOrEqual(3);
      const rainPreset = PRESET_TEMPLATES.find(p => p.id === 'rain_advisory');
      expect(rainPreset).toBeDefined();
      expect(rainPreset.title).toContain('Heavy Rain Advisory');
    });
  });

  describe('getAudienceEstimates', () => {
    it('calculates audience estimates correctly from active profiles', async () => {
      const result = await broadcastNotificationService.getAudienceEstimates();

      expect(result.success).toBe(true);
      expect(result.customers).toBe(1); // Only the enabled customer
      expect(result.riders).toBe(2); // Both enabled riders
      expect(result.total).toBe(3);
      expect(result.pushTokens.customers).toBe(1);
      expect(result.pushTokens.riders).toBe(1);
      expect(result.pushTokens.total).toBe(2);
    });

    it('handles query error gracefully', async () => {
      mockEq.mockResolvedValueOnce({ data: null, error: new Error('Database down') });

      const result = await broadcastNotificationService.getAudienceEstimates();

      expect(result.success).toBe(false);
      expect(result.total).toBe(0);
      expect(result.error).toBe('Database down');
    });
  });

  describe('sendExpoPushChunks', () => {
    it('returns 0 counts when tokens list is empty or missing', async () => {
      const res = await broadcastNotificationService.sendExpoPushChunks([], {
        title: 'Test',
        message: 'Body'
      });

      expect(res.sentCount).toBe(0);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('dispatches valid tokens to Expo push endpoint', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ status: 'ok' }] })
      });

      const res = await broadcastNotificationService.sendExpoPushChunks(
        ['ExponentPushToken[abc123]', 'invalid-token'],
        { title: 'Rain Alert', message: 'Take care', category: 'weather_advisory' }
      );

      expect(res.sentCount).toBe(1);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://exp.host/--/api/v2/push/send',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ 'Content-Type': 'application/json' })
        })
      );
    });
  });

  describe('sendBroadcast', () => {
    it('validates input parameters before dispatch', async () => {
      const invalidAudience = await broadcastNotificationService.sendBroadcast({
        targetAudience: 'unknown',
        title: 'Hello',
        message: 'World'
      });
      expect(invalidAudience.success).toBe(false);

      const emptyTitle = await broadcastNotificationService.sendBroadcast({
        targetAudience: 'customers',
        title: '   ',
        message: 'World'
      });
      expect(emptyTitle.success).toBe(false);
    });

    it('invokes send_broadcast_notification RPC and delivers result', async () => {
      mockRpc.mockResolvedValueOnce({
        data: {
          broadcast_id: 'b-100',
          recipient_count: 5,
          tokens_count: 1,
          tokens: ['ExponentPushToken[123]']
        },
        error: null
      });

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ status: 'ok' }] })
      });

      const result = await broadcastNotificationService.sendBroadcast({
        targetAudience: 'customers',
        category: 'promo',
        title: 'Friday Promo',
        message: '15% off platters'
      });

      expect(result.success).toBe(true);
      expect(result.broadcastId).toBe('b-100');
      expect(result.recipientCount).toBe(5);
      expect(mockRpc).toHaveBeenCalledWith('send_broadcast_notification', {
        p_target_audience: 'customers',
        p_title: 'Friday Promo',
        p_message: '15% off platters',
        p_category: 'promo',
        p_data: {}
      });
    });
  });

  describe('getBroadcastHistory', () => {
    it('retrieves paginated history list', async () => {
      mockRange.mockResolvedValueOnce({
        data: [
          { id: 'b-1', title: 'Rain Advisory', message: 'Delayed deliveries', recipient_count: 20 }
        ],
        count: 1,
        error: null
      });
      mockOrder.mockReturnValueOnce({ range: mockRange });
      mockSelect.mockReturnValueOnce({ order: mockOrder });
      mockFrom.mockReturnValueOnce({ select: mockSelect });

      const res = await broadcastNotificationService.getBroadcastHistory({ page: 1, limit: 10 });

      expect(res.success).toBe(true);
      expect(res.data.length).toBe(1);
      expect(res.count).toBe(1);
    });
  });
});
