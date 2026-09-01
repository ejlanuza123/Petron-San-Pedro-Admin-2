// src/__tests__/services/receiptService.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- jsPDF mock ---
const mockText = vi.fn();
const mockRect = vi.fn();
const mockLine = vi.fn();
const mockSetFont = vi.fn();
const mockSetFontSize = vi.fn();
const mockSetFillColor = vi.fn();
const mockSetTextColor = vi.fn();
const mockSetDrawColor = vi.fn();
const mockSave = vi.fn();

const mockDocInstance = {
  text: mockText,
  rect: mockRect,
  line: mockLine,
  setFont: mockSetFont,
  setFontSize: mockSetFontSize,
  setFillColor: mockSetFillColor,
  setTextColor: mockSetTextColor,
  setDrawColor: mockSetDrawColor,
  save: mockSave,
};

vi.mock('jspdf', () => ({
  jsPDF: vi.fn(function() { return mockDocInstance; }),
}));

vi.mock('../../utils/formatters', () => ({
  formatCurrency: (val) => `PHP ${Number(val).toFixed(2)}`,
  formatDate: (d) => new Date(d).toISOString().slice(0, 10),
}));

// Mock window.open for printThermalPOS
const mockDocumentWrite = vi.fn();
const mockDocumentClose = vi.fn();
const mockWindowOpen = vi.fn(() => ({
  document: { write: mockDocumentWrite, close: mockDocumentClose },
}));

import { receiptService } from '../../services/receiptService';

const baseOrder = {
  id: 'ABC123456',
  order_number: 'ORD-001',
  created_at: '2026-01-15T10:00:00Z',
  delivery_address: '123 Main St, San Pedro',
  payment_method: 'gcash',
  total_amount: 560,
  delivery_fee: 60,
  status: 'completed',
  profiles: { full_name: 'Juan Dela Cruz', phone_number: '09171234567' },
  order_items: [
    {
      products: { name: 'Gasoline 95' },
      quantity: 2,
      price_at_order: 100,
    },
    {
      products: { name: 'Diesel' },
      quantity: 4,
      price_at_order: 85,
    },
  ],
};

// ─── generateOfficialPDF ──────────────────────────────────────────────────────

describe('receiptService.generateOfficialPDF', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls doc.save with the correct filename', () => {
    receiptService.generateOfficialPDF(baseOrder);
    const savedFilename = mockSave.mock.calls[0][0];
    expect(savedFilename).toMatch(/^Official-Invoice-/i);
  });

  it('renders store name header from storeInfo', () => {
    receiptService.generateOfficialPDF(baseOrder, { name: 'Custom Store' });
    const allTextCalls = mockText.mock.calls.map((c) => c[0]);
    expect(allTextCalls).toContain('Custom Store');
  });

  it('falls back to default store name when storeInfo is empty', () => {
    receiptService.generateOfficialPDF(baseOrder, {});
    const allTextCalls = mockText.mock.calls.map((c) => c[0]);
    expect(allTextCalls).toContain('PETRON SAN PEDRO STATION');
  });

  it('renders VAT invoice label when isVatRegistered is true', () => {
    receiptService.generateOfficialPDF(baseOrder, { isVatRegistered: true });
    const allTextCalls = mockText.mock.calls.map((c) => c[0]);
    expect(allTextCalls).toContain('OFFICIAL VAT SALES INVOICE');
  });

  it('renders non-VAT receipt label when isVatRegistered is false', () => {
    receiptService.generateOfficialPDF(baseOrder, { isVatRegistered: false });
    const allTextCalls = mockText.mock.calls.map((c) => c[0]);
    expect(allTextCalls).toContain('OFFICIAL SALES RECEIPT (NON-VAT)');
  });

  it('renders customer name from profiles', () => {
    receiptService.generateOfficialPDF(baseOrder);
    const allTextCalls = mockText.mock.calls.map((c) => c[0]);
    expect(allTextCalls.some((t) => t.includes('Juan Dela Cruz'))).toBe(true);
  });

  it('falls back to Valued Customer when profiles is missing', () => {
    const orderNoProfile = { ...baseOrder, profiles: null };
    receiptService.generateOfficialPDF(orderNoProfile);
    const allTextCalls = mockText.mock.calls.map((c) => c[0]);
    expect(allTextCalls.some((t) => t.includes('Valued Customer'))).toBe(true);
  });

  it('renders payment method in uppercase', () => {
    receiptService.generateOfficialPDF(baseOrder);
    const allTextCalls = mockText.mock.calls.map((c) => c[0]);
    expect(allTextCalls.some((t) => t.includes('GCASH'))).toBe(true);
  });

  it('renders each order item name on the PDF', () => {
    receiptService.generateOfficialPDF(baseOrder);
    const allTextCalls = mockText.mock.calls.map((c) => c[0]);
    expect(allTextCalls).toContain('Gasoline 95');
    expect(allTextCalls).toContain('Diesel');
  });

  it('renders grand total on the PDF', () => {
    receiptService.generateOfficialPDF(baseOrder);
    const allTextCalls = mockText.mock.calls.map((c) => c[0]);
    expect(allTextCalls.some((t) => t.includes('560.00'))).toBe(true);
  });

  it('renders delivery fee line', () => {
    receiptService.generateOfficialPDF(baseOrder);
    const allTextCalls = mockText.mock.calls.map((c) => c[0]);
    expect(allTextCalls.some((t) => t.includes('60.00'))).toBe(true);
  });

  it('handles order with no items without throwing', () => {
    const emptyOrder = { ...baseOrder, order_items: [] };
    expect(() => receiptService.generateOfficialPDF(emptyOrder)).not.toThrow();
  });

  it('falls back to subtotal = grandTotal - deliveryFee when items are empty', () => {
    const emptyOrder = { ...baseOrder, order_items: [], total_amount: 200, delivery_fee: 50 };
    receiptService.generateOfficialPDF(emptyOrder);
    const allTextCalls = mockText.mock.calls.map((c) => c[0]);
    // subtotal = 200 - 50 = 150
    expect(allTextCalls.some((t) => t.includes('150.00'))).toBe(true);
  });

  it('uses order.id when order_number is missing', () => {
    const orderNoNum = { ...baseOrder, order_number: undefined, id: 'FALLBACK99' };
    receiptService.generateOfficialPDF(orderNoNum);
    expect(mockSave).toHaveBeenCalledWith(expect.stringContaining('FALLBACK'));
  });

  it('uses price_at_order priority over price_per_unit and unit_price', () => {
    const orderWithMultiplePrices = {
      ...baseOrder,
      order_items: [{
        products: { name: 'Diesel', price: 50 },
        quantity: 1,
        price_at_order: 85,
        price_per_unit: 70,
        unit_price: 60,
      }],
    };
    receiptService.generateOfficialPDF(orderWithMultiplePrices);
    const allTextCalls = mockText.mock.calls.map((c) => c[0]);
    expect(allTextCalls.some((t) => t.includes('85.00'))).toBe(true);
    expect(allTextCalls.every((t) => !t.includes('70.00'))).toBe(true);
  });
});

// ─── printThermalPOS ──────────────────────────────────────────────────────────

describe('receiptService.printThermalPOS', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.window = { open: mockWindowOpen };
  });

  it('opens a new browser window', () => {
    receiptService.printThermalPOS(baseOrder);
    expect(mockWindowOpen).toHaveBeenCalledWith('', '_blank', expect.any(String));
  });

  it('writes HTML content to the opened window', () => {
    receiptService.printThermalPOS(baseOrder);
    expect(mockDocumentWrite).toHaveBeenCalledWith(expect.stringContaining('<!DOCTYPE html>'));
  });

  it('includes store name in the printed HTML', () => {
    receiptService.printThermalPOS(baseOrder, { name: 'My Fuel Shop' });
    const html = mockDocumentWrite.mock.calls[0][0];
    expect(html).toContain('My Fuel Shop');
  });

  it('includes order number in the printed HTML', () => {
    receiptService.printThermalPOS(baseOrder);
    const html = mockDocumentWrite.mock.calls[0][0];
    expect(html).toContain('ORD-001');
  });

  it('includes each item name in the printed HTML', () => {
    receiptService.printThermalPOS(baseOrder);
    const html = mockDocumentWrite.mock.calls[0][0];
    expect(html).toContain('Gasoline 95');
    expect(html).toContain('Diesel');
  });

  it('includes grand total in the printed HTML', () => {
    receiptService.printThermalPOS(baseOrder);
    const html = mockDocumentWrite.mock.calls[0][0];
    expect(html).toContain('560.00');
  });

  it('includes delivery fee in the printed HTML', () => {
    receiptService.printThermalPOS(baseOrder);
    const html = mockDocumentWrite.mock.calls[0][0];
    expect(html).toContain('60.00');
  });

  it('falls back gracefully when window.open returns null', () => {
    mockWindowOpen.mockReturnValueOnce(null);
    expect(() => receiptService.printThermalPOS(baseOrder)).not.toThrow();
  });

  it('uses customer name from profiles', () => {
    receiptService.printThermalPOS(baseOrder);
    const html = mockDocumentWrite.mock.calls[0][0];
    expect(html).toContain('Juan Dela Cruz');
  });

  it('falls back to Customer when profiles is missing', () => {
    receiptService.printThermalPOS({ ...baseOrder, profiles: null });
    const html = mockDocumentWrite.mock.calls[0][0];
    expect(html).toContain('Customer');
  });
});
