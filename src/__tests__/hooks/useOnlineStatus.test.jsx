import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

describe('useOnlineStatus', () => {
  let originalOnLine;

  beforeEach(() => {
    originalOnLine = navigator.onLine;
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'onLine', {
      value: originalOnLine,
      configurable: true,
    });
  });

  it('initializes from navigator.onLine', async () => {
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      configurable: true,
    });

    const { result } = renderHook(() => useOnlineStatus());

    await waitFor(() => {
      expect(result.current.isOnline).toBe(false);
    });

    expect(result.current.lastChecked).toBe(null);
  });

  it('updates status and timestamp on online and offline events', async () => {
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      configurable: true,
    });

    const { result } = renderHook(() => useOnlineStatus());

    await waitFor(() => {
      expect(result.current.isOnline).toBe(true);
    });

    await act(async () => {
      window.dispatchEvent(new Event('offline'));
    });

    expect(result.current.isOnline).toBe(false);
    expect(result.current.lastChecked).toBeInstanceOf(Date);

    await act(async () => {
      window.dispatchEvent(new Event('online'));
    });

    expect(result.current.isOnline).toBe(true);
    expect(result.current.lastChecked).toBeInstanceOf(Date);
  });

  it('removes event listeners on unmount', async () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useOnlineStatus());

    await waitFor(() => {
      expect(addSpy).toHaveBeenCalledWith('online', expect.any(Function));
    });

    unmount();

    expect(removeSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('offline', expect.any(Function));

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });
});