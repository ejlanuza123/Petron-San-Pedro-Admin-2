// src/__tests__/services/lowStockAlertService.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock notifySuccess (imported but not directly called in evaluateStockAlerts)
vi.mock('../../utils/successNotifier', () => ({
  notifySuccess: vi.fn(),
}));

// Stub sessionStorage before importing the service
const mockSessionStorage = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] ?? null),
    setItem: vi.fn((key, value) => { store[key] = value; }),
    removeItem: vi.fn((key) => { delete store[key]; }),
    clear: () => { store = {}; },
    _store: () => store,
  };
})();

Object.defineProperty(global, 'sessionStorage', {
  value: mockSessionStorage,
  writable: true,
});

// Capture window.notifyError / notifyWarning calls
let notifyErrorCalls = [];
let notifyWarningCalls = [];

Object.defineProperty(global, 'window', {
  value: {
    notifyError: vi.fn((msg) => notifyErrorCalls.push(msg)),
    notifyWarning: vi.fn((msg) => notifyWarningCalls.push(msg)),
  },
  writable: true,
});

import { lowStockAlertService } from '../../services/lowStockAlertService';

const makeProduct = (id, name, qty) => ({ id, name, stock_quantity: qty });

describe('lowStockAlertService.evaluateStockAlerts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionStorage.clear();
    notifyErrorCalls = [];
    notifyWarningCalls = [];
  });

  it('returns empty arrays when products list is empty', () => {
    const result = lowStockAlertService.evaluateStockAlerts([]);
    expect(result.lowStockProducts).toEqual([]);
    expect(result.outOfStockProducts).toEqual([]);
  });

  it('returns empty arrays when products is null', () => {
    const result = lowStockAlertService.evaluateStockAlerts(null);
    expect(result.lowStockProducts).toEqual([]);
    expect(result.outOfStockProducts).toEqual([]);
  });

  it('classifies a product with qty=0 as out-of-stock', () => {
    const products = [makeProduct('p1', 'Diesel', 0)];
    const result = lowStockAlertService.evaluateStockAlerts(products);
    expect(result.outOfStockProducts).toHaveLength(1);
    expect(result.outOfStockProducts[0].id).toBe('p1');
    expect(result.lowStockProducts).toHaveLength(0);
  });

  it('classifies a product at or below threshold as low stock', () => {
    const products = [makeProduct('p2', 'Gasoline 95', 5)];
    const result = lowStockAlertService.evaluateStockAlerts(products, 10);
    expect(result.lowStockProducts).toHaveLength(1);
    expect(result.outOfStockProducts).toHaveLength(0);
  });

  it('does not classify a product above threshold as low stock or out-of-stock', () => {
    const products = [makeProduct('p3', 'Premium', 50)];
    const result = lowStockAlertService.evaluateStockAlerts(products, 10);
    expect(result.lowStockProducts).toHaveLength(0);
    expect(result.outOfStockProducts).toHaveLength(0);
  });

  it('uses threshold of 10 by default', () => {
    const products = [makeProduct('p4', 'Oil', 10)];
    const result = lowStockAlertService.evaluateStockAlerts(products);
    expect(result.lowStockProducts).toHaveLength(1);
  });

  it('handles multiple products and categorizes each correctly', () => {
    const products = [
      makeProduct('a', 'Out Product', 0),
      makeProduct('b', 'Low Product', 3),
      makeProduct('c', 'OK Product', 100),
    ];
    const result = lowStockAlertService.evaluateStockAlerts(products, 10);
    expect(result.outOfStockProducts).toHaveLength(1);
    expect(result.lowStockProducts).toHaveLength(1);
  });

  it('triggers window.notifyError for out-of-stock product on first evaluation', () => {
    const products = [makeProduct('p5', 'Diesel', 0)];
    lowStockAlertService.evaluateStockAlerts(products);
    expect(notifyErrorCalls.length).toBeGreaterThan(0);
    expect(notifyErrorCalls[0]).toContain('OUT OF STOCK');
    expect(notifyErrorCalls[0]).toContain('Diesel');
  });

  it('triggers window.notifyWarning for low-stock product on first evaluation', () => {
    const products = [makeProduct('p6', 'Gas 95', 5)];
    lowStockAlertService.evaluateStockAlerts(products);
    expect(notifyWarningCalls.length).toBeGreaterThan(0);
    expect(notifyWarningCalls[0]).toContain('LOW STOCK');
    expect(notifyWarningCalls[0]).toContain('Gas 95');
  });

  it('does NOT re-trigger notification for same product/qty on second call (deduplication)', () => {
    const products = [makeProduct('p7', 'Diesel', 0)];

    lowStockAlertService.evaluateStockAlerts(products);
    const firstCount = notifyErrorCalls.length;

    lowStockAlertService.evaluateStockAlerts(products);
    expect(notifyErrorCalls.length).toBe(firstCount); // no new notification
  });

  it('DOES trigger notification again if stock quantity changes', () => {
    lowStockAlertService.evaluateStockAlerts([makeProduct('p8', 'Oil', 0)]);
    const afterFirst = notifyErrorCalls.length;

    // Quantity changes — should trigger again
    lowStockAlertService.evaluateStockAlerts([makeProduct('p8', 'Oil', 0)]);
    // Same qty same key — deduplicated
    expect(notifyErrorCalls.length).toBe(afterFirst);

    // Different quantity (restocked then went low again)
    lowStockAlertService.evaluateStockAlerts([makeProduct('p8', 'Oil', 3)]);
    expect(notifyWarningCalls.length).toBeGreaterThan(0);
  });

  it('persists notified set to sessionStorage', () => {
    lowStockAlertService.evaluateStockAlerts([makeProduct('p9', 'Diesel', 0)]);
    expect(mockSessionStorage.setItem).toHaveBeenCalled();
  });

  it('reads existing notified set from sessionStorage on evaluation', () => {
    // Pre-seed a notification as already sent
    const product = makeProduct('p10', 'Diesel', 0);
    const key = `${product.id}_0`;
    mockSessionStorage.getItem.mockReturnValueOnce(JSON.stringify([key]));

    lowStockAlertService.evaluateStockAlerts([product]);
    expect(notifyErrorCalls.length).toBe(0); // already notified
  });
});

describe('lowStockAlertService.clearNotifiedHistory', () => {
  it('removes the notification key from sessionStorage', () => {
    lowStockAlertService.clearNotifiedHistory();
    expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('petron_low_stock_notified_v1');
  });

  it('does not throw when sessionStorage.removeItem fails', () => {
    mockSessionStorage.removeItem.mockImplementationOnce(() => { throw new Error('storage error'); });
    expect(() => lowStockAlertService.clearNotifiedHistory()).not.toThrow();
  });
});
