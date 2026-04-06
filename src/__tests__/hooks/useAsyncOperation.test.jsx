import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAsyncOperation } from '../../hooks/useAsyncOperation';

const mocks = vi.hoisted(() => ({
  setGlobalLoading: vi.fn(),
  setOperationLoading: vi.fn(),
  setError: vi.fn(),
  clearError: vi.fn(),
  retryAsync: vi.fn(),
}));

vi.mock('../../context/LoadingContext', () => ({
  useLoading: () => ({
    setGlobalLoading: (...args) => mocks.setGlobalLoading(...args),
    setOperationLoading: (...args) => mocks.setOperationLoading(...args),
  }),
}));

vi.mock('../../context/ErrorContext', () => ({
  useError: () => ({
    setError: (...args) => mocks.setError(...args),
    clearError: (...args) => mocks.clearError(...args),
  }),
}));

vi.mock('../../utils/retry', () => ({
  isRetryableError: () => false,
  retryAsync: (...args) => mocks.retryAsync(...args),
}));

describe('useAsyncOperation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('executes successful operation with operation-scoped loader', async () => {
    const onSuccess = vi.fn();
    const operation = vi.fn().mockResolvedValue({ ok: true });
    mocks.retryAsync.mockImplementation(async (fn) => fn());

    const { result } = renderHook(() => useAsyncOperation());

    let value;
    await act(async () => {
      value = await result.current.execute(operation, {
        operationId: 'orders-fetch',
        retries: 1,
        onSuccess,
      });
    });

    expect(mocks.setOperationLoading).toHaveBeenCalledWith('orders-fetch', true);
    expect(mocks.setOperationLoading).toHaveBeenCalledWith('orders-fetch', false);
    expect(mocks.clearError).toHaveBeenCalledWith('orders-fetch');
    expect(onSuccess).toHaveBeenCalledWith({ ok: true });
    expect(value).toEqual({ ok: true });
  });

  it('handles failure path and reports error', async () => {
    const operationError = new Error('network down');
    const onError = vi.fn();
    const operation = vi.fn().mockRejectedValue(operationError);
    mocks.retryAsync.mockImplementation(async (fn) => fn());

    const { result } = renderHook(() => useAsyncOperation());

    await expect(
      result.current.execute(operation, {
        operationId: 'orders-save',
        errorTitle: 'Save Failed',
        onError,
      })
    ).rejects.toThrow('network down');

    expect(mocks.setError).toHaveBeenCalledWith(
      'orders-save',
      expect.objectContaining({
        title: 'Save Failed',
        message: 'network down',
      })
    );
    expect(onError).toHaveBeenCalledWith(operationError);
  });

  it('calls onSuccess callback when operation succeeds', async () => {
    const onSuccess = vi.fn();
    const operation = vi.fn().mockResolvedValue({ status: 'ok' });
    mocks.retryAsync.mockImplementation(async (fn) => fn());

    const { result } = renderHook(() => useAsyncOperation());

    await act(async () => {
      await result.current.execute(operation, {
        operationId: 'create-order',
        onSuccess,
      });
    });

    expect(onSuccess).toHaveBeenCalledWith({ status: 'ok' });
  });

  it('respects retries option and passes to retryAsync', async () => {
    const operation = vi.fn().mockResolvedValue({ done: true });
    mocks.retryAsync.mockImplementation(async (fn) => fn());

    const { result } = renderHook(() => useAsyncOperation());

    await act(async () => {
      await result.current.execute(operation, {
        operationId: 'test-op',
        retries: 3,
      });
    });

    expect(mocks.retryAsync).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ maxRetries: 3 })
    );
  });

  it('uses global loader when showGlobalLoader is true', async () => {
    const operation = vi.fn().mockResolvedValue('done');
    mocks.retryAsync.mockImplementation(async (fn) => fn());

    const { result } = renderHook(() => useAsyncOperation());

    await act(async () => {
      await result.current.execute(operation, {
        operationId: 'global-op',
        showGlobalLoader: true,
      });
    });

    expect(mocks.setGlobalLoading).toHaveBeenCalledWith(true);
    expect(mocks.setGlobalLoading).toHaveBeenCalledWith(false);
  });
});
