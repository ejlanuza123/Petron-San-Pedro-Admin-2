import { renderHook, act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationProvider, useNotifications } from '../../context/NotificationContext';

const mockSetError = vi.fn();
const mockUnsubscribe = vi.fn();
const mockSubscribeToNotifications = vi.fn();
const mockRequestPermission = vi.fn();
const mockGetPermissionState = vi.fn();
const mockMarkAsRead = vi.fn();
const mockMarkAllAsRead = vi.fn();
const mockRemoveNotification = vi.fn();
const mockClearNotifications = vi.fn();
const mockFrom = vi.fn();

let mockUser = { id: 'user-1' };
let capturedOnNewNotification;

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: mockUser }),
}));

vi.mock('../../context/ErrorContext', () => ({
  useError: () => ({ setError: mockSetError }),
}));

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: (...args) => mockFrom(...args),
  },
}));

vi.mock('../../services/pushNotificationService', () => ({
  pushNotificationService: {
    requestPermission: (...args) => mockRequestPermission(...args),
    getPermissionState: (...args) => mockGetPermissionState(...args),
    subscribeToNotifications: (...args) => mockSubscribeToNotifications(...args),
    markAsRead: (...args) => mockMarkAsRead(...args),
    markAllAsRead: (...args) => mockMarkAllAsRead(...args),
    removeNotification: (...args) => mockRemoveNotification(...args),
    clearNotifications: (...args) => mockClearNotifications(...args),
  },
}));

const wrapper = ({ children }) => <NotificationProvider>{children}</NotificationProvider>;

describe('NotificationContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedOnNewNotification = undefined;
    mockUser = { id: 'user-1' };

    mockGetPermissionState.mockReturnValue('default');
    mockRequestPermission.mockResolvedValue({ success: true, permission: 'granted' });

    mockSubscribeToNotifications.mockImplementation((userId, onNew, onStatus) => {
      capturedOnNewNotification = onNew;
      void onStatus;
      return mockUnsubscribe;
    });

    const mockLimit = vi.fn().mockResolvedValue({
      data: [
        { id: 'n-1', is_read: false, title: 'Pending order' },
        { id: 'n-2', is_read: true, title: 'Processed order' },
      ],
      error: null,
    });

    const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

    mockFrom.mockImplementation((table) => {
      if (table === 'notifications') {
        return { select: mockSelect };
      }
      return {};
    });

    mockMarkAsRead.mockResolvedValue({ success: true });
    mockMarkAllAsRead.mockResolvedValue({ success: true });
    mockRemoveNotification.mockResolvedValue({ success: true });
    mockClearNotifications.mockResolvedValue({ success: true });
  });

  it('loads notifications and calculates unread count', async () => {
    const { result } = renderHook(() => useNotifications(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.notifications).toHaveLength(2);
      expect(result.current.unreadCount).toBe(1);
    });

    expect(mockSubscribeToNotifications).toHaveBeenCalledWith(
      'user-1',
      expect.any(Function),
      expect.any(Function)
    );
  });

  it('updates unread count when markAsRead succeeds', async () => {
    const { result } = renderHook(() => useNotifications(), { wrapper });

    await waitFor(() => {
      expect(result.current.unreadCount).toBe(1);
    });

    await act(async () => {
      await result.current.markAsRead('n-1');
    });

    expect(mockMarkAsRead).toHaveBeenCalledWith('n-1');
    expect(result.current.unreadCount).toBe(0);
    expect(result.current.notifications.find((n) => n.id === 'n-1')?.is_read).toBe(true);
  });

  it('cleans up notification subscription on unmount', async () => {
    const { unmount } = renderHook(() => useNotifications(), { wrapper });

    await waitFor(() => {
      expect(mockSubscribeToNotifications).toHaveBeenCalledTimes(1);
    });

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it('prepends new notifications received from subscription callback', async () => {
    const { result } = renderHook(() => useNotifications(), { wrapper });

    await waitFor(() => {
      expect(capturedOnNewNotification).toBeTypeOf('function');
      expect(result.current.notifications).toHaveLength(2);
      expect(result.current.unreadCount).toBe(1);
    });

    act(() => {
      capturedOnNewNotification({
        id: 'n-3',
        is_read: false,
        title: 'New assignment',
      });
    });

    expect(result.current.notifications[0].id).toBe('n-3');
    expect(result.current.unreadCount).toBe(2);
  });
});
