import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import SuperAdminPortal from '../../pages/SuperAdminPortal';

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  useNavigate: vi.fn(),
  signOut: vi.fn(),
  signIn: vi.fn(),
  adminService: {
    getAdminAccounts: vi.fn(),
    getAdminAuditLogs: vi.fn(),
    updateAdminRole: vi.fn(),
    toggleAdminStatus: vi.fn(),
    createAdminAccount: vi.fn(),
  },
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mocks.useNavigate,
}));

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => mocks.useAuth(),
}));

vi.mock('../../context/ThemeContext', () => ({
  useTheme: () => ({ isDarkMode: false, toggleDarkMode: vi.fn() }),
}));

vi.mock('../../services/adminService', () => ({
  adminService: mocks.adminService,
}));

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: { role: 'superadmin' }, error: null }),
        })),
      })),
    })),
  },
}));

describe('SuperAdminPortal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.adminService.getAdminAccounts.mockResolvedValue([]);
    mocks.adminService.getAdminAuditLogs.mockResolvedValue([]);
  });

  it('renders Main Dashboard button and Sign Out button when authenticated in Phase 1 (Passcode screen)', () => {
    mocks.useAuth.mockReturnValue({
      user: { id: 'admin-1' },
      profile: { role: 'admin' },
      isAuthenticated: true,
      isSuperAdmin: false,
      signIn: mocks.signIn,
      signOut: mocks.signOut,
    });

    render(<SuperAdminPortal />);

    const mainDashboardBtn = screen.getByRole('button', { name: /main dashboard/i });
    expect(mainDashboardBtn).toBeInTheDocument();
    fireEvent.click(mainDashboardBtn);
    expect(mocks.useNavigate).toHaveBeenCalledWith('/');

    const signOutBtn = screen.getByRole('button', { name: /sign out/i });
    expect(signOutBtn).toBeInTheDocument();
    fireEvent.click(signOutBtn);
    expect(mocks.signOut).toHaveBeenCalled();
  });

  it('navigates to /login when handleSignOut is called', async () => {
    mocks.signOut.mockResolvedValue({});
    mocks.useAuth.mockReturnValue({
      user: { id: 'admin-1' },
      profile: { role: 'admin' },
      isAuthenticated: true,
      isSuperAdmin: false,
      signIn: mocks.signIn,
      signOut: mocks.signOut,
    });

    render(<SuperAdminPortal />);

    const signOutBtn = screen.getByRole('button', { name: /sign out/i });
    fireEvent.click(signOutBtn);

    await waitFor(() => {
      expect(mocks.signOut).toHaveBeenCalled();
      expect(mocks.useNavigate).toHaveBeenCalledWith('/login');
    });
  });
});
