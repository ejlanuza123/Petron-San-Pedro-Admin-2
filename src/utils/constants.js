// src/utils/constants.js
export const ORDER_STATUS = {
  PENDING: 'Pending',
  PROCESSING: 'Processing',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled'
};

export const ORDER_STATUS_COLORS = {
  [ORDER_STATUS.PENDING]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  [ORDER_STATUS.PROCESSING]: 'bg-petron-light-blue text-petron-blue border-petron-light-blue',
  [ORDER_STATUS.OUT_FOR_DELIVERY]: 'bg-purple-100 text-purple-800 border-purple-200',
  [ORDER_STATUS.COMPLETED]: 'bg-green-100 text-green-800 border-green-200',
  [ORDER_STATUS.CANCELLED]: 'bg-red-100 text-petron-red border-red-200'
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

// Petron Brand Colors
export const PETRON_COLORS = {
  primary: '#0033A0',
  secondary: '#ED1C24',
  gradient: 'linear-gradient(135deg, #0033A0 0%, #ED1C24 100%)',
  light: '#E5EEFF'
};