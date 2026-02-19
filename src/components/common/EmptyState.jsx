// src/components/common/EmptyState.jsx
import { Package, ShoppingBag, Inbox } from 'lucide-react';

const icons = {
  orders: ShoppingBag,
  products: Package,
  default: Inbox
};

export default function EmptyState({ type = 'default', message, action }) {
  const Icon = icons[type] || icons.default;

  return (
    <div className="text-center py-12 px-4">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
        <Icon className="text-gray-400" size={32} />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">No items found</h3>
      <p className="text-gray-500 mb-6">{message || `No ${type} available yet.`}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}