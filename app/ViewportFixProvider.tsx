'use client';

import { useEffect } from 'react';
import { initializeViewportFix } from './viewport-fix';

export function ViewportFixProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const cleanup = initializeViewportFix();
    return cleanup;
  }, []);

  return <>{children}</>;
}
