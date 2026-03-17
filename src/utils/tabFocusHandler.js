// src/utils/tabFocusHandler.js
let lastFocusTime = 0;
let isRefreshing = false;
let refreshCount = 0;
const MAX_REFRESHES = 2;

export const initTabFocusHandler = () => {
  const handleFocus = () => {
    const now = Date.now();
    const timeSinceLastFocus = now - lastFocusTime;
    
    // Reset refresh count if it's been a while
    if (timeSinceLastFocus > 30000) { // 30 seconds
      refreshCount = 0;
    }
    
    // Only trigger if it's been more than 2 seconds since last focus
    if (timeSinceLastFocus > 2000 && !isRefreshing && refreshCount < MAX_REFRESHES) {
      
      lastFocusTime = now;
      isRefreshing = true;
      
      console.log('Tab refocused - checking page health...');
      
      // Give the page a moment to render
      setTimeout(() => {
        try {
          // Check for critical elements
          const root = document.getElementById('root');
          const mainElement = document.querySelector('main');
          const hasContent = mainElement && mainElement.children.length > 0;
          
          console.log('Page health check:', {
            path: window.location.pathname,
            hasRoot: !!root,
            rootChildren: root?.children.length,
            hasMain: !!mainElement,
            mainChildren: mainElement?.children.length,
            hasContent
          });
          
          // If root is empty or main is missing/no content, the app is corrupted
          const isCorrupted = !root || 
                             root.children.length === 0 || 
                             !mainElement || 
                             mainElement.children.length === 0;
          
          if (isCorrupted) {
            console.log('Page is corrupted - attempting recovery...');
            refreshCount++;
            
            if (refreshCount === 1) {
              // First attempt: Try to force React to re-render by manipulating the root
              console.log('Attempt 1: Forcing React re-render');
              
              // Store the current path
              const currentPath = window.location.pathname;
              
              // Force a re-render by temporarily hiding and showing root
              if (root) {
                root.style.display = 'none';
                // Force reflow
                void root.offsetHeight;
                root.style.display = '';
              }
              
              // Dispatch events to wake up React
              window.dispatchEvent(new Event('resize'));
              window.dispatchEvent(new PopStateEvent('popstate'));
              
              // If we're on a specific route, try navigating to it again
              if (currentPath !== '/') {
                window.dispatchEvent(new PopStateEvent('popstate'));
              }
              
              // Check again in 500ms
              setTimeout(() => {
                const mainAfter = document.querySelector('main');
                if (!mainAfter || mainAfter.children.length === 0) {
                  console.log('First attempt failed, will try reload on next focus');
                }
                isRefreshing = false;
              }, 500);
            } 
            else {
              // Second attempt: Hard reload
              console.log('Attempt 2: Hard reloading page');
              window.location.reload();
            }
          } else {
            console.log('Page is healthy');
            refreshCount = 0;
            isRefreshing = false;
          }
        } catch (error) {
          console.error('Error during health check:', error);
          isRefreshing = false;
        }
      }, 300);
    }
  };

  // Listen for focus and visibility changes
  window.addEventListener('focus', handleFocus);
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      handleFocus();
    }
  });

  // Also check on initial load after a delay
  setTimeout(handleFocus, 1000);

  return () => {
    window.removeEventListener('focus', handleFocus);
  };
};