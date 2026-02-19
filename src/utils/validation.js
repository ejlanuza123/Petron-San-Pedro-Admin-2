// src/utils/validation.js
export const validateProduct = (product) => {
  const errors = {};
  
  if (!product.name?.trim()) {
    errors.name = 'Product name is required';
  } else if (product.name.length < 3) {
    errors.name = 'Product name must be at least 3 characters';
  }
  
  if (!product.current_price || product.current_price <= 0) {
    errors.current_price = 'Price must be greater than 0';
  } else if (isNaN(parseFloat(product.current_price))) {
    errors.current_price = 'Price must be a valid number';
  }
  
  if (product.stock_quantity === '' || product.stock_quantity === null) {
    errors.stock_quantity = 'Stock quantity is required';
  } else if (parseInt(product.stock_quantity) < 0) {
    errors.stock_quantity = 'Stock quantity cannot be negative';
  }
  
  if (!product.unit?.trim()) {
    errors.unit = 'Unit is required';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export const validateOrderStatusUpdate = (currentStatus, newStatus) => {
  const validTransitions = {
    [ORDER_STATUS.PENDING]: [ORDER_STATUS.PROCESSING, ORDER_STATUS.CANCELLED],
    [ORDER_STATUS.PROCESSING]: [ORDER_STATUS.OUT_FOR_DELIVERY, ORDER_STATUS.CANCELLED],
    [ORDER_STATUS.OUT_FOR_DELIVERY]: [ORDER_STATUS.COMPLETED, ORDER_STATUS.CANCELLED],
    [ORDER_STATUS.COMPLETED]: [],
    [ORDER_STATUS.CANCELLED]: []
  };
  
  return validTransitions[currentStatus]?.includes(newStatus) || false;
};