'use client';

import { Button } from '@/components/ui/button';

/**
 * Share button for copying the current route URL to clipboard
 */

export function ShareButton() {
  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      // TODO: Add toast notification
    } catch {
      // Fallback for older browsers
      console.error('Failed to copy URL');
    }
  };

  return (
    <Button variant="outline" onClick={handleShare}>
      Share
    </Button>
  );
}
