// src/utils/formatters.js
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2
  }).format(amount);
};

export const formatDate = (date) => {
  return new Intl.DateTimeFormat('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(date));
};

export const formatPhoneNumber = (phone) => {
  if (!phone) return 'N/A';
  const cleaned = phone.replace(/\D/g, '');
  const match = cleaned.match(/^(\d{4})(\d{3})(\d{4})$/);
  if (match) {
    return `${match[1]} ${match[2]} ${match[3]}`;
  }
  return phone;
};

export const formatOrderNumber = (orderNumber, orderId) => {
  const numId = Number(orderId);
  const hasValidOrderId = Number.isFinite(numId) && numId > 0;

  // If orderNumber is absent, empty, or corrupted like 'ORD-0000' / 'ORD-000000'
  if (!orderNumber || String(orderNumber).trim() === '' || String(orderNumber).includes('ORD-0000')) {
    if (hasValidOrderId) return `#${numId}`;
  }

  const rawValue = orderNumber ?? orderId;
  if (rawValue == null || rawValue === '') return '#-';

  const str = String(rawValue).trim();
  const match = str.match(/(\d+)$/);

  if (match) {
    const parsed = parseInt(match[1], 10);
    if (parsed > 0) {
      return `#${parsed}`;
    }
    if (hasValidOrderId) {
      return `#${numId}`;
    }
  }

  if (hasValidOrderId) return `#${numId}`;
  return `#${str}`;
};