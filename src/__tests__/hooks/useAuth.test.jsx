import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { useAuth } from '../../hooks/useAuth';
import { AuthContext } from '../../context/AuthContext';

describe('useAuth', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('throws when used outside AuthProvider', () => {
    expect(() => renderHook(() => useAuth())).toThrow(
      'useAuth must be used within an AuthProvider'
    );
  });

  it('sets timeoutReached after loading timeout and stops loading state', () => {
    const wrapper = ({ children }) => (
      <AuthContext.Provider
        value={{
          user: null,
          profile: null,
          loading: true,
          error: null,
          signIn: vi.fn(),
          signOut: vi.fn(),
          isAuthenticated: false,
        }}
      >
        {children}
      </AuthContext.Provider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.loading).toBe(true);
    expect(result.current.timeoutReached).toBe(false);

    act(() => {
      vi.advanceTimersByTime(15001);
    });

    expect(result.current.timeoutReached).toBe(true);
    expect(result.current.loading).toBe(false);
    expect(result.current.isAuthenticated).toBe(false);
  });
});
