// src/utils/tabFocusHandler.js
let lastFocusTime = 0;
let isRefreshing = false;
let refreshCount = 0;
const MAX_REFRESHES = 3; // Prevent infinite refresh loops

export const initTabFocusHandler = () => {
  const handleFocus = () => {
    const now = Date.now();
    const timeSinceLastFocus = now - lastFocusTime;
    
    // Reset refresh count if it's been a while
    if (timeSinceLastFocus > 30000) { // 30 seconds
      refreshCount = 0;
    }
    
    // Only trigger if:
    // 1. It's been more than 5 seconds since last focus
    // 2. We haven't exceeded max refreshes
    // 3. We're not already refreshing
    // 4. We're not on login/register pages
    if (timeSinceLastFocus > 5000 && 
        !isRefreshing && 
        refreshCount < MAX_REFRESHES &&
        !window.location.pathname.includes('/login') &&
        !window.location.pathname.includes('/register')) {
      
      lastFocusTime = now;
      isRefreshing = true;
      
      console.log('Tab refocused - checking page health...');
      
      // Give the page a moment to render
      setTimeout(() => {
        try {
          // Check if the page is actually broken
          const mainContent = document.querySelector('main');
          const outlet = document.querySelector('main > *');
          const hasButtons = document.querySelectorAll('button').length > 0;
          
          console.log('Page health check:', {
            path: window.location.pathname,
            hasMain: !!mainContent,
            mainChildren: mainContent?.children.length,
            hasOutlet: !!outlet,
            outletType: outlet?.constructor?.name,
            hasButtons,
            timestamp: new Date().toISOString()
          });
          
          // Determine if page is broken
          const isBroken = !mainContent || 
                          mainContent.children.length === 0 || 
                          (!hasButtons && window.location.pathname !== '/login');
          
          if (isBroken) {
            console.log('Page appears corrupted - attempting recovery...');
            refreshCount++;
            
            // Try different recovery strategies based on refresh count
            if (refreshCount === 1) {
              // First attempt: Force a re-render by dispatching events
              console.log('Attempt 1: Dispatching re-render events');
              window.dispatchEvent(new Event('resize'));
              document.body.style.display = 'none';
              document.body.style.display = '';
              
              // Try to force React to re-render
              const root = document.getElementById('root');
              if (root) {
                root.style.display = 'none';
                root.style.display = '';
              }
              
              // Don't reload yet, give it a chance
              isRefreshing = false;
            } 
            else if (refreshCount === 2) {
              // Second attempt: Navigate to current route again
              console.log('Attempt 2: Re-navigating to current route');
              window.dispatchEvent(new PopStateEvent('popstate'));
              isRefreshing = false;
            }
            else {
              // Final attempt: Hard reload
              console.log('Attempt 3: Hard reloading page');
              window.location.reload();
            }
          } else {
            console.log('Page is healthy');
            refreshCount = 0; // Reset counter on healthy page
            isRefreshing = false;
          }
        } catch (error) {
          console.error('Error during health check:', error);
          isRefreshing = false;
        }
      }, 500); // Give it half a second to render
    }
  };

  // Listen for focus and visibility changes
  window.addEventListener('focus', handleFocus);
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      handleFocus();
    }
  });

  // Also check on initial load
  setTimeout(handleFocus, 1000);

  return () => {
    window.removeEventListener('focus', handleFocus);
  };
};