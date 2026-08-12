// src/utils/constants.js
export const ORDER_STATUS = {
  PENDING: 'Pending',
  PROCESSING: 'Processing',
  RIDER_PICKED_UP: 'Rider Picked Up the Order',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled'
};

export const ORDER_STATUS_COLORS = {
  [ORDER_STATUS.PENDING]: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-700/60',
  [ORDER_STATUS.PROCESSING]: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-700/60',
  [ORDER_STATUS.RIDER_PICKED_UP]: 'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/80 dark:text-sky-300 dark:border-sky-700/60',
  [ORDER_STATUS.OUT_FOR_DELIVERY]: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/80 dark:text-purple-300 dark:border-purple-700/60',
  [ORDER_STATUS.COMPLETED]: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-700/60',
  [ORDER_STATUS.CANCELLED]: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-700/60'
};

export const getOrderStatusColor = (status) => {
  if (!status) return 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700';

  const normalized = String(status).toLowerCase().replace(/_/g, ' ').trim();

  if (normalized.includes('pending')) {
    return 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-700/60';
  }
  if (normalized.includes('process')) {
    return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-700/60';
  }
  if (normalized.includes('pick') || normalized.includes('rider')) {
    return 'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/80 dark:text-sky-300 dark:border-sky-700/60';
  }
  if (normalized.includes('out') || normalized.includes('transit') || normalized.includes('delivery')) {
    return 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/80 dark:text-purple-300 dark:border-purple-700/60';
  }
  if (normalized.includes('complete') || normalized.includes('delivered')) {
    return 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-700/60';
  }
  if (normalized.includes('cancel') || normalized.includes('decline') || normalized.includes('fail')) {
    return 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-700/60';
  }

  return ORDER_STATUS_COLORS[status] || 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700';
};

export const DELIVERY_STATUS = {
  ASSIGNED: 'assigned',
  ACCEPTED: 'accepted',
  PICKED_UP: 'picked_up',
  DELIVERED: 'delivered',
  FAILED: 'failed',
  DECLINED: 'declined'
};

export const DELIVERY_STATUS_COLORS = {
  [DELIVERY_STATUS.ASSIGNED]: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-700/60',
  [DELIVERY_STATUS.ACCEPTED]: 'bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-950/80 dark:text-teal-300 dark:border-teal-700/60',
  [DELIVERY_STATUS.PICKED_UP]: 'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/80 dark:text-sky-300 dark:border-sky-700/60',
  [DELIVERY_STATUS.DELIVERED]: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-700/60',
  [DELIVERY_STATUS.FAILED]: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-700/60',
  [DELIVERY_STATUS.DECLINED]: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700/60'
};

export const getDeliveryStatusColor = (status) => {
  if (!status) return 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700';

  const normalized = String(status).toLowerCase().replace(/ /g, '_').trim();

  switch (normalized) {
    case 'assigned':
      return 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-700/60';
    case 'accepted':
      return 'bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-950/80 dark:text-teal-300 dark:border-teal-700/60';
    case 'picked_up':
      return 'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/80 dark:text-sky-300 dark:border-sky-700/60';
    case 'out_for_delivery':
      return 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/80 dark:text-purple-300 dark:border-purple-700/60';
    case 'delivered':
      return 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-700/60';
    case 'declined':
    case 'failed':
      return 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-700/60';
    default:
      return 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700';
  }
};

export const PRODUCT_CATEGORIES = {
  FUEL: 'Fuel',
  MOTOR_OIL: 'Motor Oil',
  ENGINE_OIL: 'Engine Oil'
};

export const PAYMENT_METHODS = {
  COD: 'Cash on Delivery',
  GCASH: 'G-Cash'
};

export const CANCELLATION_REASONS = [
  'Customer changed mind',
  'Customer unreachable',
  'Out of stock',
  'Address issue',
  'Rider unavailable',
  'Payment issue',
  'Duplicate order',
  'Other'
];

// Petron Brand Colors
export const PETRON_COLORS = {
  primary: '#0033A0',
  secondary: '#ED1C24',
  gradient: 'linear-gradient(135deg, #0033A0 0%, #ED1C24 100%)',
  light: '#E5EEFF'
};