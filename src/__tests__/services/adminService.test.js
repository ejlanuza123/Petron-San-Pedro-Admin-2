// src/__tests__/services/adminService.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRpc = vi.fn();
const mockFrom = vi.fn();
const mockSignUp = vi.fn();
const mockGetUser = vi.fn();

vi.mock('../../lib/supabase', () => ({
  supabase: {
    rpc: (...args) => mockRpc(...args),
    from: (...args) => mockFrom(...args),
    auth: {
      signUp: (...args) => mockSignUp(...args),
      getUser: (...args) => mockGetUser(...args),
    },
  },
}));

import { adminService } from '../../services/adminService';

// ─── getAdminAccounts ──────────────────────────────────────────────────────────

describe('adminService.getAdminAccounts', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns RPC data when RPC succeeds with non-empty array', async () => {
    const rpcResult = [{ id: 'a1', full_name: 'Admin One', role: 'admin' }];
    mockRpc.mockResolvedValue({ data: rpcResult, error: null });

    const result = await adminService.getAdminAccounts();
    expect(result).toEqual(rpcResult);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('falls back to profiles table when RPC returns empty array', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });

    const mockOrder = vi.fn().mockResolvedValue({ data: [{ id: 'a2' }], error: null });
    const mockIn = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ in: mockIn });
    mockFrom.mockReturnValue({ select: mockSelect });

    const result = await adminService.getAdminAccounts();
    expect(mockFrom).toHaveBeenCalledWith('profiles');
    expect(result).toEqual([{ id: 'a2' }]);
  });

  it('falls back to profiles table when RPC returns an error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: new Error('rpc failed') });

    const mockOrder = vi.fn().mockResolvedValue({ data: [{ id: 'a3' }], error: null });
    const mockIn = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ in: mockIn });
    mockFrom.mockReturnValue({ select: mockSelect });

    const result = await adminService.getAdminAccounts();
    expect(result).toEqual([{ id: 'a3' }]);
  });

  it('throws when fallback profiles query also fails', async () => {
    mockRpc.mockResolvedValue({ data: null, error: new Error('rpc failed') });

    const mockOrder = vi.fn().mockResolvedValue({ data: null, error: new Error('profiles failed') });
    const mockIn = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ in: mockIn });
    mockFrom.mockReturnValue({ select: mockSelect });

    await expect(adminService.getAdminAccounts()).rejects.toThrow('profiles failed');
  });

  it('returns empty array from profiles when data is null and no error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });

    const mockOrder = vi.fn().mockResolvedValue({ data: null, error: null });
    const mockIn = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ in: mockIn });
    mockFrom.mockReturnValue({ select: mockSelect });

    const result = await adminService.getAdminAccounts();
    expect(result).toEqual([]);
  });
});

// ─── createAdminAccount ────────────────────────────────────────────────────────

describe('adminService.createAdminAccount', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls supabase.auth.signUp with correct credentials', async () => {
    const newUser = { id: 'u-new' };
    mockSignUp.mockResolvedValue({ data: { user: newUser }, error: null });

    const mockUpsert = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ upsert: mockUpsert });

    await adminService.createAdminAccount({
      email: 'new@admin.com',
      password: 'secret123',
      full_name: 'New Admin',
      role: 'admin',
    });

    expect(mockSignUp).toHaveBeenCalledWith({
      email: 'new@admin.com',
      password: 'secret123',
      options: { data: { full_name: 'New Admin', role: 'admin' } },
    });
  });

  it('upserts the profiles row after successful auth signup', async () => {
    const newUser = { id: 'u-new' };
    mockSignUp.mockResolvedValue({ data: { user: newUser }, error: null });

    const mockUpsert = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ upsert: mockUpsert });

    await adminService.createAdminAccount({
      email: 'new@admin.com',
      password: 'secret123',
      full_name: 'New Admin',
      role: 'admin',
    });

    expect(mockFrom).toHaveBeenCalledWith('profiles');
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'u-new',
        email: 'new@admin.com',
        full_name: 'New Admin',
        role: 'admin',
        is_active: true,
      })
    );
  });

  it('throws when auth signUp fails', async () => {
    mockSignUp.mockResolvedValue({ data: {}, error: new Error('auth failed') });
    await expect(
      adminService.createAdminAccount({ email: 'x@y.com', password: 'pw', full_name: 'X', role: 'admin' })
    ).rejects.toThrow('auth failed');
  });

  it('throws when profile upsert fails', async () => {
    mockSignUp.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    const mockUpsert = vi.fn().mockResolvedValue({ error: new Error('upsert failed') });
    mockFrom.mockReturnValue({ upsert: mockUpsert });

    await expect(
      adminService.createAdminAccount({ email: 'x@y.com', password: 'pw', full_name: 'X', role: 'admin' })
    ).rejects.toThrow('upsert failed');
  });

  it('returns the new user object on success', async () => {
    const newUser = { id: 'u-new', email: 'new@admin.com' };
    mockSignUp.mockResolvedValue({ data: { user: newUser }, error: null });
    mockFrom.mockReturnValue({ upsert: vi.fn().mockResolvedValue({ error: null }) });

    const result = await adminService.createAdminAccount({
      email: 'new@admin.com', password: 'pw', full_name: 'Admin', role: 'admin',
    });
    expect(result).toEqual(newUser);
  });
});

// ─── updateAdminRole ───────────────────────────────────────────────────────────

describe('adminService.updateAdminRole', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updates the role in the profiles table', async () => {
    const mockSingle = vi.fn().mockResolvedValue({ data: { id: 'a1', role: 'superadmin' }, error: null });
    const mockEq = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: mockSingle }) });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ update: mockUpdate });

    const result = await adminService.updateAdminRole('a1', 'superadmin');
    expect(mockFrom).toHaveBeenCalledWith('profiles');
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ role: 'superadmin' }));
    expect(result).toEqual({ id: 'a1', role: 'superadmin' });
  });

  it('throws when update fails', async () => {
    const mockSingle = vi.fn().mockResolvedValue({ data: null, error: new Error('update error') });
    const mockEq = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: mockSingle }) });
    mockFrom.mockReturnValue({ update: vi.fn().mockReturnValue({ eq: mockEq }) });

    await expect(adminService.updateAdminRole('a1', 'admin')).rejects.toThrow('update error');
  });
});

// ─── toggleAdminStatus ─────────────────────────────────────────────────────────

describe('adminService.toggleAdminStatus', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sets is_active to true when toggling active', async () => {
    const mockSingle = vi.fn().mockResolvedValue({ data: { id: 'a2', is_active: true }, error: null });
    const mockEq = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: mockSingle }) });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ update: mockUpdate });

    await adminService.toggleAdminStatus('a2', true);
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ is_active: true }));
  });

  it('sets is_active to false when suspending', async () => {
    const mockSingle = vi.fn().mockResolvedValue({ data: { id: 'a2', is_active: false }, error: null });
    const mockEq = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: mockSingle }) });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ update: mockUpdate });

    await adminService.toggleAdminStatus('a2', false);
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ is_active: false }));
  });

  it('throws when toggle fails', async () => {
    const mockSingle = vi.fn().mockResolvedValue({ data: null, error: new Error('toggle error') });
    const mockEq = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: mockSingle }) });
    mockFrom.mockReturnValue({ update: vi.fn().mockReturnValue({ eq: mockEq }) });

    await expect(adminService.toggleAdminStatus('a2', false)).rejects.toThrow('toggle error');
  });
});

// ─── getAdminAuditLogs ─────────────────────────────────────────────────────────

describe('adminService.getAdminAuditLogs', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns audit logs on success', async () => {
    const logs = [{ id: 'log1', action: 'login' }];
    const mockLimit = vi.fn().mockResolvedValue({ data: logs, error: null });
    const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });
    mockFrom.mockReturnValue({ select: mockSelect });

    const result = await adminService.getAdminAuditLogs();
    expect(mockFrom).toHaveBeenCalledWith('audit_logs');
    expect(result).toEqual(logs);
  });

  it('returns empty array when Supabase returns an error', async () => {
    const mockLimit = vi.fn().mockResolvedValue({ data: null, error: new Error('audit failed') });
    const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });
    mockFrom.mockReturnValue({ select: mockSelect });

    const result = await adminService.getAdminAuditLogs();
    expect(result).toEqual([]);
  });

  it('returns empty array when an exception is thrown', async () => {
    mockFrom.mockImplementation(() => { throw new Error('unexpected'); });
    const result = await adminService.getAdminAuditLogs();
    expect(result).toEqual([]);
  });

  it('returns empty array when data is null', async () => {
    const mockLimit = vi.fn().mockResolvedValue({ data: null, error: null });
    const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });
    mockFrom.mockReturnValue({ select: mockSelect });

    const result = await adminService.getAdminAuditLogs();
    expect(result).toEqual([]);
  });
});
