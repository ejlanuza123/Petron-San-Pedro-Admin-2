// src/__tests__/riderService.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  computeRiderStats,
  buildLeaderboard,
  computePlatformStats,
  computePerformanceScore,
  resolveDateRange,
} from '../services/riderService';

// \u2500\u2500\u2500 Helpers \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

const now = new Date();
const hoursAgo = (h) => new Date(now - h * 3600 * 1000).toISOString();

const makeDelivery = (status, assignedHoursAgo = 2, deliveredHoursAgo = null, deliveryFee = 50) => ({
  id: Math.random().toString(),
  status,
  assigned_at: hoursAgo(assignedHoursAgo),
  delivered_at: deliveredHoursAgo !== null ? hoursAgo(deliveredHoursAgo) : null,
  order_id: Math.floor(Math.random() * 9999),
  orders: { id: Math.floor(Math.random() * 9999), delivery_fee: deliveryFee },
});

const makeRider = (deliveries = [], opts = {}) => ({
  id: opts.id || 'rider-1',
  full_name: opts.name || 'Test Rider',
  is_active: opts.is_active !== undefined ? opts.is_active : true,
  vehicle_type: 'Motorcycle',
  avatar_url: null,
  deliveries,
});

// \u2500\u2500\u2500 resolveDateRange \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

describe('resolveDateRange', () => {
  it('returns from/to for "week" preset', () => {
    const { from, to } = resolveDateRange('week');
    expect(from).toBeInstanceOf(Date);
    expect(to).toBeInstanceOf(Date);
    expect(from < to).toBe(true);
  });

  it('returns from/to for "month" preset', () => {
    const { from, to } = resolveDateRange('month');
    expect(from.getDate()).toBe(1);
  });

  it('returns from/to for "30days" default', () => {
    const { from, to } = resolveDateRange('30days');
    const diffDays = Math.round((to - from) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(30);
  });

  it('returns from/to for custom object', () => {
    const { from, to } = resolveDateRange({ from: '2026-01-01', to: '2026-01-31' });
    expect(from.getFullYear()).toBe(2026);
    expect(to.getDate()).toBe(31);
  });
});

// \u2500\u2500\u2500 computeRiderStats \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

describe('computeRiderStats', () => {
  it('returns zeroes for a rider with no deliveries', () => {
    const rider = makeRider([]);
    const stats = computeRiderStats(rider);
    expect(stats.total).toBe(0);
    expect(stats.completed).toBe(0);
    expect(stats.earnings).toBe(0);
    expect(stats.completionRate).toBe(0);
    expect(stats.avgDeliveryTime).toBeNull();
  });

  it('correctly counts completed, failed, pending', () => {
    const deliveries = [
      makeDelivery('delivered', 5, 3),
      makeDelivery('delivered', 4, 2),
      makeDelivery('failed', 3, null),
      makeDelivery('assigned', 1, null),
    ];
    const rider = makeRider(deliveries);
    const stats = computeRiderStats(rider);

    expect(stats.total).toBe(4);
    expect(stats.completed).toBe(2);
    expect(stats.failed).toBe(1);
    expect(stats.pending).toBe(1);
  });

  it('calculates earnings from delivery_fee of completed deliveries', () => {
    const deliveries = [
      makeDelivery('delivered', 5, 3, 100),
      makeDelivery('delivered', 4, 2, 75),
      makeDelivery('failed', 3, null, 50), // failed \u2014 should not count
    ];
    const rider = makeRider(deliveries);
    const stats = computeRiderStats(rider);

    expect(stats.earnings).toBe(175);
  });

  it('computes completionRate correctly', () => {
    const deliveries = [
      makeDelivery('delivered', 5, 3),
      makeDelivery('delivered', 4, 2),
      makeDelivery('failed', 3, null),
      makeDelivery('failed', 2, null),
    ];
    const rider = makeRider(deliveries);
    const stats = computeRiderStats(rider);

    expect(stats.completionRate).toBe(50);
  });

  it('computes avgDeliveryTime from assigned_at to delivered_at in minutes', () => {
    // 2 hours = 120 minutes
    const deliveries = [
      makeDelivery('delivered', 2, 0),
    ];
    const rider = makeRider(deliveries);
    const stats = computeRiderStats(rider);

    expect(stats.avgDeliveryTime).toBeCloseTo(120, 0);
  });

  it('returns null avgDeliveryTime if no timestamps available', () => {
    const deliveries = [
      { ...makeDelivery('delivered', 2, null), assigned_at: null, delivered_at: null },
    ];
    const rider = makeRider(deliveries);
    const stats = computeRiderStats(rider);
    expect(stats.avgDeliveryTime).toBeNull();
  });

  it('produces 7-day weeklyData array', () => {
    const rider = makeRider([]);
    const stats = computeRiderStats(rider);
    expect(stats.weeklyData).toHaveLength(7);
    expect(stats.weeklyData[0]).toHaveProperty('day');
    expect(stats.weeklyData[0]).toHaveProperty('count');
    expect(stats.weeklyData[0]).toHaveProperty('earnings');
  });

  it('filters deliveries by dateFilter', () => {
    const farAgo = new Date('2020-01-01').toISOString();
    const deliveries = [
      { ...makeDelivery('delivered', 1, 0, 80), assigned_at: farAgo, delivered_at: farAgo },
      makeDelivery('delivered', 1, 0, 50),
    ];
    const rider = makeRider(deliveries);
    const { from, to } = resolveDateRange('30days');
    const stats = computeRiderStats(rider, { from, to });

    // Only the recent delivery falls within the last 30 days
    expect(stats.total).toBe(1);
    expect(stats.earnings).toBe(50);
  });
});

// \u2500\u2500\u2500 buildLeaderboard \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

describe('buildLeaderboard', () => {
  it('returns empty array for no riders', () => {
    expect(buildLeaderboard([])).toEqual([]);
  });

  it('assigns rank starting at 1', () => {
    const riders = [
      makeRider([makeDelivery('delivered', 5, 3)], { id: 'r1' }),
      makeRider([makeDelivery('failed', 5, null)], { id: 'r2' }),
    ];
    const lb = buildLeaderboard(riders);
    expect(lb[0].rank).toBe(1);
    expect(lb[1].rank).toBe(2);
  });

  it('sorts higher scoring riders first', () => {
    const highPerformer = makeRider([
      makeDelivery('delivered', 5, 3),
      makeDelivery('delivered', 4, 2),
      makeDelivery('delivered', 3, 1),
    ], { id: 'high' });

    const lowPerformer = makeRider([
      makeDelivery('failed', 5, null),
    ], { id: 'low' });

    const lb = buildLeaderboard([lowPerformer, highPerformer]);
    expect(lb[0].rider.id).toBe('high');
  });

  it('each entry contains rider, stats, score, rank', () => {
    const riders = [makeRider([makeDelivery('delivered', 2, 1)])];
    const lb = buildLeaderboard(riders);
    const entry = lb[0];
    expect(entry).toHaveProperty('rider');
    expect(entry).toHaveProperty('stats');
    expect(entry).toHaveProperty('score');
    expect(entry).toHaveProperty('rank');
    expect(entry.score).toBeGreaterThanOrEqual(0);
    expect(entry.score).toBeLessThanOrEqual(100);
  });
});

// \u2500\u2500\u2500 computePlatformStats \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

describe('computePlatformStats', () => {
  it('returns zero stats for empty leaderboard', () => {
    const result = computePlatformStats([]);
    expect(result.totalDeliveries).toBe(0);
    expect(result.avgCompletionRate).toBe(0);
    expect(result.totalEarnings).toBe(0);
    expect(result.avgDeliveryTime).toBeNull();
  });

  it('sums totalDeliveries and totalEarnings across all riders', () => {
    const riders = [
      makeRider([makeDelivery('delivered', 3, 1, 100)], { id: 'r1' }),
      makeRider([makeDelivery('delivered', 2, 1, 200)], { id: 'r2' }),
    ];
    const lb = buildLeaderboard(riders);
    const platform = computePlatformStats(lb);

    expect(platform.totalDeliveries).toBe(2);
    expect(platform.totalEarnings).toBe(300);
  });

  it('averages completion rates', () => {
    const riders = [
      makeRider([makeDelivery('delivered', 3, 1)], { id: 'r1' }), // 100%
      makeRider([makeDelivery('failed', 3, null)], { id: 'r2' }),  // 0%
    ];
    const lb = buildLeaderboard(riders);
    const platform = computePlatformStats(lb);
    // Both riders have 1 delivery each. r1 = 100%, r2 = 0% → avg = 50%
    expect(platform.avgCompletionRate).toBe(50);
  });
});

// ──────────────── computePerformanceScore ──────────────────────────────

describe('computePerformanceScore', () => {
  it('returns 0 for zero total deliveries and 0 completion rate', () => {
    const score = computePerformanceScore({ completionRate: 0, total: 0 }, 10);
    expect(score).toBe(0);
  });

  it('returns close to 100 for a perfect performer with max volume', () => {
    const score = computePerformanceScore({ completionRate: 100, total: 100 }, 100);
    expect(score).toBe(100);
  });

  it('weights completion rate at 50%, volume at 30%, and rating at 20%', () => {
    // completionRate=60, volumeScore=(5/10)*100=50, ratingScore=60
    // score = 60*0.5 + 50*0.3 + 60*0.2 = 30 + 15 + 12 = 57
    const score = computePerformanceScore({ completionRate: 60, total: 5 }, 10);
    expect(score).toBe(57);
  });
});
