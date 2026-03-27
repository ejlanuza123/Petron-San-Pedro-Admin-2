import { renderHook, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSessionManagement } from '../../hooks/useSessionManagement';

const mocks = vi.hoisted(() => ({
  logout: vi.fn(),
}));

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    logout: mocks.logout,
  }),
}));

describe('useSessionManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows inactivity warning before logout and then logs out', () => {
    const { result } = renderHook(() => useSessionManagement());

    expect(result.current.showWarning).toBe(false);

    act(() => {
      vi.advanceTimersByTime(25 * 60 * 1000 + 1);
    });

    expect(result.current.showWarning).toBe(true);

    act(() => {
      vi.advanceTimersByTime(5 * 60 * 1000);
    });

    expect(mocks.logout).toHaveBeenCalledTimes(1);
  });

  it('extendSession clears warning and postpones logout', () => {
    const { result } = renderHook(() => useSessionManagement());

    act(() => {
      vi.advanceTimersByTime(25 * 60 * 1000 + 1);
    });
    expect(result.current.showWarning).toBe(true);

    act(() => {
      result.current.extendSession();
    });
    expect(result.current.showWarning).toBe(false);

    act(() => {
      vi.advanceTimersByTime(4 * 60 * 1000);
    });
    expect(mocks.logout).toHaveBeenCalledTimes(0);
  });
});
