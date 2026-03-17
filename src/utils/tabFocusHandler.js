// Global tab focus handler - fixes Vite HMR state corruption
let focusTimeout;

export const initTabFocusHandler = () => {
  const handleFocus = () => {
    clearTimeout(focusTimeout);
    focusTimeout = setTimeout(() => {
      // Soft refetch approach first
      window.dispatchEvent(new CustomEvent('tab-refocus'));
      
      // Nuclear option if needed (commented)
      // window.location.reload();
    }, 100);
  };

  window.addEventListener('focus', handleFocus);
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      handleFocus();
    }
  });

  return () => {
    window.removeEventListener('focus', handleFocus);
    clearTimeout(focusTimeout);
  };
};

