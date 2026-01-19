'use client';

import { Button } from '@/components/ui/button';
import { Share2 } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Share button for copying the current route URL to clipboard
 * with toast notification on success/failure
 */
export function ShareButton() {
  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard', {
        description: 'Share this URL to share your route',
        duration: 3000,
      });
    } catch {
      // Fallback for older browsers or permission issues
      toast.error('Failed to copy link', {
        description: 'Please copy the URL from your browser address bar',
        duration: 4000,
      });
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleShare}>
      <Share2 className="w-4 h-4 mr-2" />
      Share
    </Button>
  );
}
