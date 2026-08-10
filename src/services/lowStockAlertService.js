// src/services/lowStockAlertService.js
import { notifyError, notifyWarning } from '../utils/notifications';

const NOTIFIED_KEY = 'petron_low_stock_notified_v1';

const getNotifiedSet = () => {
  try {
    const raw = sessionStorage.getItem(NOTIFIED_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
};

const saveNotifiedSet = (set) => {
  try {
    sessionStorage.setItem(NOTIFIED_KEY, JSON.stringify([...set]));
  } catch (err) {
    console.error('Failed to store low stock notification state:', err);
  }
};

export const lowStockAlertService = {
  /**
   * Evaluates products against threshold and triggers toast alerts for new low/out-of-stock items.
   * @param {Array} products - List of products
   * @param {number} threshold - Low stock threshold count
   * @returns {{ lowStockProducts: Array, outOfStockProducts: Array }}
   */
  evaluateStockAlerts(products = [], threshold = 10) {
    if (!products || !products.length) {
      return { lowStockProducts: [], outOfStockProducts: [] };
    }

    const notifiedSet = getNotifiedSet();
    const outOfStockProducts = [];
    const lowStockProducts = [];

    products.forEach((product) => {
      const qty = Number(product.stock_quantity) || 0;
      const key = `${product.id}_${qty}`;

      if (qty === 0) {
        outOfStockProducts.push(product);
        if (!notifiedSet.has(key)) {
          notifyError(`🚨 CRITICAL: "${product.name}" is OUT OF STOCK!`);
          notifiedSet.add(key);
        }
      } else if (qty <= threshold) {
        lowStockProducts.push(product);
        if (!notifiedSet.has(key)) {
          notifyWarning(`⚠️ LOW STOCK: "${product.name}" has only ${qty} units remaining (threshold: ${threshold})`);
          notifiedSet.add(key);
        }
      }
    });

    saveNotifiedSet(notifiedSet);

    return {
      lowStockProducts,
      outOfStockProducts
    };
  },

  /**
   * Resets session notification history (e.g. after restock)
   */
  clearNotifiedHistory() {
    try {
      sessionStorage.removeItem(NOTIFIED_KEY);
    } catch {}
  }
};
