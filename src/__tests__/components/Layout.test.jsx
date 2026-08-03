import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import Layout from '../../components/Layout';

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  useTheme: vi.fn(),
  useNotifications: vi.fn(),
  useLocation: vi.fn(),
  useNavigate: vi.fn(),
}));

vi.mock('../../hooks/useAuth', () => ({
  useAuth: (...args) => mocks.useAuth(...args),
}));

vi.mock('../../context/ThemeContext', () => ({
  useTheme: (...args) => mocks.useTheme(...args),
  AnimatedThemeToggle: () => <span data-testid="theme-toggle" />,
}));

vi.mock('../../context/NotificationContext', () => ({
  useNotifications: (...args) => mocks.useNotifications(...args),
}));

vi.mock('react-router-dom', () => ({
  Outlet: () => <div>Outlet content</div>,
  useLocation: (...args) => mocks.useLocation(...args),
  useNavigate: (...args) => mocks.useNavigate(...args),
}));

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_, element) => {
      const MotionComponent = ({ children, ...props }) => {
        const Tag = element;
        return <Tag {...props}>{children}</Tag>;
      };

      return MotionComponent;
    },
  }),
  AnimatePresence: ({ children }) => <>{children}</>,
}));

vi.mock('../../components/SettingsModal', () => ({
  default: () => null,
}));

vi.mock('../../components/common/FloatingChatBubble', () => ({
  default: () => null,
}));

vi.mock('../../components/PageTransition', () => ({
  default: ({ children }) => <>{children}</>,
}));

const setViewportWidth = (width) => {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: width,
    writable: true,
  });
  window.dispatchEvent(new Event('resize'));
};

describe('Layout sidebar responsiveness', () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.useAuth.mockReturnValue({
      user: { id: 'user-1' },
      profile: {
        full_name: 'Admin User',
        email: 'admin@example.com',
        avatar_url: 'https://example.com/avatar.png',
      },
      signOut: vi.fn(),
    });
    mocks.useTheme.mockReturnValue({
      isDarkMode: false,
      toggleDarkMode: vi.fn(),
    });
    mocks.useNotifications.mockReturnValue({
      notifications: [],
      unreadCount: 2,
      markAsRead: vi.fn(),
      markAllAsRead: vi.fn(),
      removeNotification: vi.fn(),
      clearAll: vi.fn(),
      permissionStatus: 'granted',
      requestNotificationPermission: vi.fn(),
    });
    mocks.useLocation.mockReturnValue({ pathname: '/' });
    mocks.useNavigate.mockReturnValue(vi.fn());
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('keeps desktop collapse controls and compact elements available when collapsed', () => {
    localStorage.setItem('petron-sidebar-collapsed', 'true');

    act(() => {
      setViewportWidth(1280);
    });

    render(<Layout />);

    const sidebar = screen.getByRole('complementary');
    expect(within(sidebar).getByLabelText('Open notifications')).toBeTruthy();
    expect(within(sidebar).getByAltText('Admin User')).toBeTruthy();
    expect(within(sidebar).getByLabelText('Open profile menu for Admin User')).toBeTruthy();
    expect(screen.getByRole('button', { name: /expand sidebar/i })).toBeTruthy();
    expect(within(sidebar).queryByTitle('Dashboard')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /expand sidebar/i }));

    expect(screen.getByRole('button', { name: /collapse sidebar/i })).toBeTruthy();
    expect(screen.getByRole('complementary').className).toContain('w-72');
    expect(within(screen.getByRole('complementary')).queryByTitle('Dashboard')).toBeNull();
  });

  it('shows the full mobile overlay menu and hides desktop collapse controls', () => {
    localStorage.setItem('petron-sidebar-collapsed', 'true');

    act(() => {
      setViewportWidth(375);
    });

    render(<Layout />);

    expect(screen.queryByRole('button', { name: /expand sidebar/i })).toBeNull();
    expect(screen.getByLabelText('Open mobile menu')).toBeTruthy();

    fireEvent.click(screen.getByLabelText('Open mobile menu'));

    expect(screen.getByText('Dashboard')).toBeTruthy();
    expect(screen.getByText('Inventory')).toBeTruthy();
    expect(screen.getByText('Customers')).toBeTruthy();
    expect(screen.getByLabelText('Open notifications')).toBeTruthy();
  });
});
