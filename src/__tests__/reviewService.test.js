// src/__tests__/reviewService.test.js
import { describe, it, expect } from 'vitest';
import { computeReviewSummary } from '../services/reviewService';

describe('computeReviewSummary', () => {
  it('returns zeroes when both review arrays are empty', () => {
    const summary = computeReviewSummary([], []);
    expect(summary.avgProductRating).toBe(0);
    expect(summary.avgRiderRating).toBe(0);
    expect(summary.totalProductReviews).toBe(0);
    expect(summary.totalRiderRatings).toBe(0);
    expect(summary.productStarCounts).toEqual({ 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 });
    expect(summary.riderStarCounts).toEqual({ 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 });
  });

  it('correctly averages product ratings and counts star distributions', () => {
    const productReviews = [
      { id: '1', rating: 5, comment: 'Great product' },
      { id: '2', rating: 5, comment: 'Loved it' },
      { id: '3', rating: 4, comment: 'Very good' },
      { id: '4', rating: 2, comment: 'Poor quality' },
    ];
    const summary = computeReviewSummary(productReviews, []);

    // (5 + 5 + 4 + 2) / 4 = 16 / 4 = 4.0
    expect(summary.avgProductRating).toBe(4.0);
    expect(summary.totalProductReviews).toBe(4);
    expect(summary.productStarCounts[5]).toBe(2);
    expect(summary.productStarCounts[4]).toBe(1);
    expect(summary.productStarCounts[2]).toBe(1);
    expect(summary.productStarCounts[3]).toBe(0);
  });

  it('correctly averages rider ratings and counts star distributions', () => {
    const riderRatings = [
      { id: '10', rating: 5, comment: 'Fast delivery' },
      { id: '11', rating: 3, comment: 'On time but cold' },
      { id: '12', rating: 4, comment: 'Polite rider' },
    ];
    const summary = computeReviewSummary([], riderRatings);

    // (5 + 3 + 4) / 3 = 12 / 3 = 4.0
    expect(summary.avgRiderRating).toBe(4.0);
    expect(summary.totalRiderRatings).toBe(3);
    expect(summary.riderStarCounts[5]).toBe(1);
    expect(summary.riderStarCounts[4]).toBe(1);
    expect(summary.riderStarCounts[3]).toBe(1);
  });

  it('handles fractional ratings and clamps ratings to 1..5', () => {
    const productReviews = [
      { id: '1', rating: 4.8 },
      { id: '2', rating: 4.2 },
    ];
    const summary = computeReviewSummary(productReviews, []);
    // (4.8 + 4.2) / 2 = 9.0 / 2 = 4.5
    expect(summary.avgProductRating).toBe(4.5);
    expect(summary.productStarCounts[5]).toBe(1);
    expect(summary.productStarCounts[4]).toBe(1);
  });
});
