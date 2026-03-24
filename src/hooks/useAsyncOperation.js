import { useCallback } from 'react';
import { useLoading } from '../context/LoadingContext';
import { useError } from '../context/ErrorContext';

/**
 * Hook for managing async operations with loading and error states
 */
export const useAsyncOperation = () => {
  const { setGlobalLoading, setOperationLoading } = useLoading();
  const { setError, clearError } = useError();

  const execute = useCallback(async (
    operation,
    options = {}
  ) => {
    const {
      operationId = 'global',
      errorId = operationId,
      showGlobalLoader = false,
      onSuccess = null,
      onError = null
    } = options;

    try {
      if (showGlobalLoader) {
        setGlobalLoading(true);
      } else {
        setOperationLoading(operationId, true);
      }

      clearError(errorId);
      const result = await operation();

      if (onSuccess) {
        await onSuccess(result);
      }

      return result;
    } catch (error) {
      const errorMessage = error?.message || 'An error occurred';
      console.error(`Operation ${operationId} failed:`, error);

      setError(errorId, {
        title: options.errorTitle || 'Operation Failed',
        message: errorMessage,
        details: error,
        type: 'error'
      });

      if (onError) {
        await onError(error);
      }

      throw error;
    } finally {
      if (showGlobalLoader) {
        setGlobalLoading(false);
      } else {
        setOperationLoading(operationId, false);
      }
    }
  }, [setGlobalLoading, setOperationLoading, setError, clearError]);

  return { execute };
};
