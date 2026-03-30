import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, act } from '@testing-library/react';
import Orders from '../../pages/Orders';
import { ORDER_STATUS } from '../../utils/constants';

const mocks = vi.hoisted(() => ({
  useOrders: vi.fn(),
  useAuth: vi.fn(),
  useLocation: vi.fn(),
  useNavigate: vi.fn(),
  from: vi.fn(),
  channel: vi.fn(),
}));

vi.mock('../../hooks/useOrders', () => ({
  useOrders: (...args) => mocks.useOrders(...args),
}));

vi.mock('../../hooks/useAuth', () => ({
  useAuth: (...args) => mocks.useAuth(...args),
}));

vi.mock('react-router-dom', () => ({
  useLocation: (...args) => mocks.useLocation(...args),
  useNavigate: (...args) => mocks.useNavigate(...args),
}));

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: (...args) => mocks.from(...args),
    channel: (...args) => mocks.channel(...args),
  },
}));

vi.mock('../../components/OrderModal', () => ({
  default: () => null,
}));

vi.mock('../../components/AssignRiderModal', () => ({
  default: () => null,
}));

vi.mock('../../components/RiderTrackingModal', () => ({
  default: () => null,
}));

vi.mock('../../components/DeliveryTrackingMap', () => ({
  default: () => null,
}));

vi.mock('../../components/common/ErrorAlert', () => ({
  default: ({ message, onDismiss }) => (
    <button type="button" onClick={onDismiss} data-testid="error-alert">
      {message}
    </button>
  ),
}));

vi.mock('../../components/common/EmptyState', () => ({
  default: ({ message, action }) => (
    <div>
      <p>{message}</p>
      {action ? (
        <button type="button" onClick={action.onClick}>
          {action.label}
        </button>
      ) : null}
    </div>
  ),
}));

vi.mock('../../components/common/SearchBar', () => ({
  default: ({ onSearch }) => (
    <input
      aria-label="search-orders"
      onChange={(e) => onSearch(e.target.value)}
      placeholder="Search"
    />
  ),
}));

vi.mock('../../components/common/Pagination', () => ({
  default: ({ currentPage, totalPages, onPageChange }) => (
    <div data-testid="pagination">
      <span>
        {currentPage}/{totalPages}
      </span>
      <button type="button" onClick={() => onPageChange(currentPage + 1)}>
        Next
      </button>
    </div>
  ),
}));

vi.mock('../../components/common/ConfirmDialog', () => ({
  default: ({ isOpen, title, message, onConfirm, onClose }) =>
    isOpen ? (
      <div role="dialog" aria-label={title}>
        <p>{message}</p>
        <button type="button" onClick={onConfirm}>
          Confirm
        </button>
        <button type="button" onClick={onClose}>
          Cancel
        </button>
      </div>
    ) : null,
}));

const makeOrder = (id, status) => ({
  id,
  status,
  total_amount: 150,
  created_at: '2026-03-01T10:00:00.000Z',
  delivery_address: 'Sample Address',
  profiles: {
    full_name: 'Juan Dela Cruz',
    phone_number: '09123456789',
  },
});

describe('Orders page', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.useAuth.mockReturnValue({ user: { id: 'admin-1' } });
    mocks.useLocation.mockReturnValue({ pathname: '/orders', state: {} });
    mocks.useNavigate.mockReturnValue(vi.fn());

    const fromProfiles = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      }),
    };

    const fromDeliveries = {
      select: vi.fn().mockReturnValue({
        in: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    };

    const fromDeliveryProofs = {
      select: vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({ count: 1, error: null }),
      }),
    };

    mocks.from.mockImplementation((table) => {
      if (table === 'profiles') return fromProfiles;
      if (table === 'deliveries') return fromDeliveries;
      if (table === 'delivery_proofs') return fromDeliveryProofs;
      return {};
    });

    const subscription = { unsubscribe: vi.fn() };
    mocks.channel.mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnValue(subscription),
    });
  });

  it('renders order list from useOrders', async () => {
    mocks.useOrders.mockReturnValue({
      orders: [makeOrder(101, ORDER_STATUS.PENDING)],
      loading: false,
      error: '',
      clearError: vi.fn(),
      selectedOrder: null,
      setSelectedOrder: vi.fn(),
      updateStatus: vi.fn(),
      updateDeliveryFee: vi.fn(),
      viewOrderDetails: vi.fn(),
    });

    await act(async () => {
      render(<Orders />);
    });

    expect(screen.getByText('Order Management')).toBeTruthy();
    expect(screen.getByText('#101')).toBeTruthy();
    expect(screen.getByText('Juan Dela Cruz')).toBeTruthy();
    expect(screen.getAllByText('Pending').length).toBeGreaterThan(0);
  });

  it('renders empty state when there are no orders', async () => {
    mocks.useOrders.mockReturnValue({
      orders: [],
      loading: false,
      error: '',
      clearError: vi.fn(),
      selectedOrder: null,
      setSelectedOrder: vi.fn(),
      updateStatus: vi.fn(),
      updateDeliveryFee: vi.fn(),
      viewOrderDetails: vi.fn(),
    });

    await act(async () => {
      render(<Orders />);
    });

    expect(screen.getByText('No orders found')).toBeTruthy();
  });

  it('updates order status after confirm flow', async () => {
    const updateStatus = vi.fn().mockResolvedValue(undefined);

    mocks.useOrders.mockReturnValue({
      orders: [makeOrder(202, ORDER_STATUS.PENDING)],
      loading: false,
      error: '',
      clearError: vi.fn(),
      selectedOrder: null,
      setSelectedOrder: vi.fn(),
      updateStatus,
      updateDeliveryFee: vi.fn(),
      viewOrderDetails: vi.fn(),
    });

    await act(async () => {
      render(<Orders />);
    });

    await act(async () => {
      fireEvent.click(screen.getByTitle('Process Order'));
    });

    expect(screen.getByRole('dialog')).toBeTruthy();
    
    await act(async () => {
      fireEvent.click(screen.getByText('Confirm'));
    });

    await waitFor(() => {
      expect(updateStatus).toHaveBeenCalledWith(202, ORDER_STATUS.PROCESSING);
    });
  });
});
