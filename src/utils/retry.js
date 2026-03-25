const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const isRetryableError = (error) => {
  const message = String(error?.message || '').toLowerCase();
  return (
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('timeout') ||
    message.includes('too many requests') ||
    message.includes('429') ||
    message.includes('502') ||
    message.includes('503') ||
    message.includes('504')
  );
};

export const retryAsync = async (
  operation,
  {
    maxRetries = 2,
    initialDelayMs = 400,
    shouldRetry = isRetryableError,
    onRetry
  } = {}
) => {
  let attempt = 0;

  while (true) {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= maxRetries || !shouldRetry(error)) {
        throw error;
      }

      attempt += 1;
      const delay = initialDelayMs * (2 ** (attempt - 1));

      if (onRetry) {
        onRetry({ attempt, delay, error });
      }

      await sleep(delay);
    }
  }
};
