'use client';

/**
 * Viewport fix for mobile keyboards
 * Prevents layout shifting when keyboard opens/closes
 */

export function initializeViewportFix() {
  if (typeof window === 'undefined') return;

  // Set initial app height
  const setAppHeight = () => {
    // Use visualViewport if available (better for keyboard scenarios)
    if (window.visualViewport) {
      const vh = window.visualViewport.height;
      document.documentElement.style.setProperty('--app-height', `${vh}px`);
    } else {
      // Fallback to window.innerHeight
      const vh = window.innerHeight;
      document.documentElement.style.setProperty('--app-height', `${vh}px`);
    }
  };

  // Initial set
  setAppHeight();

  // Listen for resize events (but don't update during keyboard open)
  // Only update on actual orientation/window resize
  let resizeTimeout: NodeJS.Timeout;
  const handleResize = () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      // Only update if there's a significant change (orientation change)
      // Don't update for keyboard (which changes visualViewport but not orientation)
      const currentHeight = parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--app-height')
      );
      const newHeight = window.visualViewport?.height || window.innerHeight;
      
      // Only update if height change is significant (> 20% - likely orientation change)
      // Small changes are likely keyboard, so ignore them
      const heightDiff = Math.abs(newHeight - currentHeight);
      const percentChange = (heightDiff / currentHeight) * 100;
      
      if (percentChange > 20) {
        setAppHeight();
      }
    }, 100);
  };

  window.addEventListener('resize', handleResize);
  
  // Also listen to orientationchange
  window.addEventListener('orientationchange', () => {
    setTimeout(setAppHeight, 100);
  });

  // Cleanup function
  return () => {
    window.removeEventListener('resize', handleResize);
    window.removeEventListener('orientationchange', setAppHeight);
  };
}
