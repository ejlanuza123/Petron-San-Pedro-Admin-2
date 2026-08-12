// src/services/riderService.js
import { supabase } from '../lib/supabase';

/**
 * Returns date range boundaries for common presets.
 * @param {'week'|'month'|'30days'|{from:string,to:string}} range
 * @returns {{ from: Date, to: Date }}
 */
export function resolveDateRange(range) {
  const now = new Date();
  const to = new Date(now);
  let from;

  if (range && typeof range === 'object' && range.from) {
    return { from: new Date(range.from), to: new Date(range.to) };
  }

  switch (range) {
    case 'week': {
      const day = now.getDay();
      from = new Date(now);
      from.setDate(now.getDate() - day);
      from.setHours(0, 0, 0, 0);
      break;
    }
    case 'month': {
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    }
    case '30days':
    default: {
      from = new Date(now);
      from.setDate(now.getDate() - 30);
      from.setHours(0, 0, 0, 0);
      break;
    }
  }

  return { from, to };
}

/**
 * Fetches all rider profiles with joined deliveries and the delivery_fee from
 * the parent order (for earnings calculation).
 *
 * @returns {Promise<{ data: Array|null, error: object|null }>}
 */
export async function getAllRidersWithStats() {
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      id,
      full_name,
      email,
      phone_number,
      address,
      vehicle_type,
      vehicle_plate,
      is_active,
      is_online,
      avatar_url,
      created_at,
      deliveries!deliveries_rider_id_fkey (
        id,
        status,
        assigned_at,
        delivered_at,
        order_id,
        orders (
          id,
          status,
          delivery_fee
        )
      ),
      rider_ratings!rider_ratings_rider_id_fkey (
        id,
        rating,
        comment,
        created_at
      )
    `)
    .eq('role', 'rider')
    .order('created_at', { ascending: false });

  return { data, error };
}

/**
 * Computes per-rider stats from the joined deliveries array.
 *
 * @param {object} rider - rider profile with `.deliveries` array
 * @param {{ from: Date, to: Date }|null} dateFilter - optional date window
 * @returns {{
 *   total: number, completed: number, failed: number, pending: number,
 *   avgDeliveryTime: number|null, earnings: number,
 *   completionRate: number, weeklyData: Array<{day:string, count:number, earnings:number}>
 * }}
 */
export function computeRiderStats(rider, dateFilter = null) {
  const allDeliveries = rider.deliveries || [];

  const deliveries = dateFilter
    ? allDeliveries.filter((d) => {
        const rawTs = d.delivered_at || d.assigned_at || d.accepted_at;
        if (!rawTs) return true;
        const ts = new Date(rawTs);
        if (isNaN(ts.getTime())) return true;
        return ts >= dateFilter.from && ts <= dateFilter.to;
      })
    : allDeliveries;

  const completed = deliveries.filter((d) => {
    const status = String(d.status || '').toLowerCase().trim();
    return status === 'delivered';
  });

  const failed = deliveries.filter((d) => {
    const status = String(d.status || '').toLowerCase().trim();
    return status === 'failed' || status === 'declined';
  });

  const pending = deliveries.filter((d) => {
    const status = String(d.status || '').toLowerCase().trim();
    return status === 'assigned' || status === 'accepted' || status === 'picked_up' || status === 'in_transit' || status === 'out_for_delivery';
  });

  // Average delivery time (assigned_at → delivered_at) in minutes
  const times = completed
    .filter((d) => d.delivered_at && d.assigned_at)
    .map((d) => new Date(d.delivered_at) - new Date(d.assigned_at))
    .filter((t) => !isNaN(t) && t > 0);

  const avgDeliveryTime =
    times.length > 0
      ? Math.round(times.reduce((a, b) => a + b, 0) / times.length / 60000)
      : null;

  // Earnings: sum delivery_fee from completed deliveries
  const earnings = completed.reduce((sum, d) => {
    const fee = d.orders?.delivery_fee;
    const numFee = typeof fee === 'number' ? fee : parseFloat(fee);
    return sum + (!isNaN(numFee) && numFee > 0 ? numFee : 0);
  }, 0);

  const completionRate =
    deliveries.length > 0 ? Math.round((completed.length / deliveries.length) * 100) : 0;

  // Star Ratings calculation
  const allRatings = rider.rider_ratings || [];
  const ratingSum = allRatings.reduce((sum, r) => sum + (r.rating || 0), 0);
  const avgRating = allRatings.length > 0 ? parseFloat((ratingSum / allRatings.length).toFixed(1)) : 0;
  const totalRatings = allRatings.length;

  // Weekly bar chart: last 7 days
  const weeklyData = buildWeeklyData(allDeliveries);

  return {
    total: deliveries.length,
    completed: completed.length,
    failed: failed.length,
    pending: pending.length,
    avgDeliveryTime,
    earnings,
    completionRate,
    avgRating,
    totalRatings,
    weeklyData,
  };
}

/**
 * Builds a 7-day rolling window array for bar chart rendering.
 * @param {Array} deliveries
 * @returns {Array<{day: string, label: string, count: number, earnings: number}>}
 */
function buildWeeklyData(deliveries) {
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const result = [];
  const now = new Date();

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayStart.getDate() + 1);

    const dayDeliveries = deliveries.filter((del) => {
      if (del.status !== 'delivered') return false;
      const ts = new Date(del.delivered_at || del.assigned_at);
      return ts >= dayStart && ts < dayEnd;
    });

    const dayEarnings = dayDeliveries.reduce((sum, del) => {
      const fee = del.orders?.delivery_fee;
      return sum + (typeof fee === 'number' ? fee : parseFloat(fee) || 0);
    }, 0);

    result.push({
      day: DAYS[d.getDay()],
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      count: dayDeliveries.length,
      earnings: dayEarnings,
    });
  }

  return result;
}

/**
 * Computes a performance score for leaderboard ranking.
 * Weighted: 60% completion rate + 40% volume (normalized to 100).
 * @param {{ completionRate: number, total: number }} stats
 * @param {number} maxTotal - max total deliveries across all riders
 * @returns {number} 0-100 score
 */
export function computePerformanceScore(stats, maxTotal) {
  const volumeScore = maxTotal > 0 ? (stats.total / maxTotal) * 100 : 0;
  const ratingScore = stats.avgRating > 0 ? (stats.avgRating / 5) * 100 : stats.completionRate;
  return Math.round(stats.completionRate * 0.5 + volumeScore * 0.3 + ratingScore * 0.2);
}

/**
 * Builds a sorted leaderboard from riders with computed stats.
 * @param {Array} riders - array from getAllRidersWithStats()
 * @param {object|null} dateFilter
 * @returns {Array} sorted leaderboard entries with rank, stats, and score
 */
export function buildLeaderboard(riders, dateFilter = null) {
  const entries = riders.map((rider) => ({
    rider,
    stats: computeRiderStats(rider, dateFilter),
  }));

  const maxTotal = Math.max(...entries.map((e) => e.stats.total), 1);

  return entries
    .map((e) => ({
      ...e,
      score: computePerformanceScore(e.stats, maxTotal),
    }))
    .sort((a, b) => b.score - a.score)
    .map((e, idx) => ({ ...e, rank: idx + 1 }));
}

/**
 * Computes platform-wide aggregate stats for the performance tab header.
 * @param {Array} leaderboardEntries - output of buildLeaderboard()
 * @returns {{ totalDeliveries: number, avgCompletionRate: number, avgDeliveryTime: number|null, totalEarnings: number }}
 */
export function computePlatformStats(leaderboardEntries) {
  if (!leaderboardEntries.length) {
    return { totalDeliveries: 0, avgCompletionRate: 0, avgDeliveryTime: null, totalEarnings: 0 };
  }

  let totalDeliveries = 0;
  let totalEarnings = 0;
  let completionRates = [];
  let deliveryTimes = [];

  leaderboardEntries.forEach(({ stats }) => {
    totalDeliveries += stats.total;
    totalEarnings += stats.earnings;
    if (stats.total > 0) completionRates.push(stats.completionRate);
    if (stats.avgDeliveryTime !== null) deliveryTimes.push(stats.avgDeliveryTime);
  });

  const avgCompletionRate =
    completionRates.length > 0
      ? Math.round(completionRates.reduce((a, b) => a + b, 0) / completionRates.length)
      : 0;

  const avgDeliveryTime =
    deliveryTimes.length > 0
      ? Math.round(deliveryTimes.reduce((a, b) => a + b, 0) / deliveryTimes.length)
      : null;

  return { totalDeliveries, avgCompletionRate, avgDeliveryTime, totalEarnings };
}

/**
 * Retrieves stored payout settlement state for riders.
 * Stores in localStorage key 'rider_payout_settlements'.
 */
export function getStoredPayoutSettlements() {
  try {
    const raw = localStorage.getItem('rider_payout_settlements');
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    console.error('Error reading payout settlements:', err);
    return {};
  }
}

/**
 * Updates payout settlement status for a specific rider.
 * @param {string} riderId
 * @param {'settled'|'pending'} status
 */
export function setRiderPayoutStatus(riderId, status) {
  try {
    const settlements = getStoredPayoutSettlements();
    settlements[riderId] = {
      status,
      settled_at: status === 'settled' ? new Date().toISOString() : null,
    };
    localStorage.setItem('rider_payout_settlements', JSON.stringify(settlements));
    return settlements;
  } catch (err) {
    console.error('Error saving payout settlement:', err);
    return {};
  }
}
