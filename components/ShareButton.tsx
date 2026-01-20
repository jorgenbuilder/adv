'use client';

import { useCallback, useState } from 'react';
import { Share2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

/**
 * ShareButton component that overlays the map in the bottom left corner.
 * When clicked, it copies the current URL to the clipboard.
 *
 * Features:
 * - Compact button on mobile (40px), larger on desktop (56px)
 * - Positioned in bottom left as overlay
 * - Visual feedback on successful copy
 * - Uses toast notification for confirmation
 */
export function ShareButton() {
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(async () => {
    try {
      const url = window.location.href;

      // Try the modern clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = url;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }

      setCopied(true);
      toast.success('Link copied to clipboard');

      // Reset the copied state after 2 seconds
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy URL:', error);
      toast.error('Failed to copy link');
    }
  }, []);

  return (
    <Button
      onClick={handleShare}
      variant="secondary"
      className="
        h-10 w-10 md:h-14 md:w-14 rounded-full
        shadow-lg
        bg-background/95 backdrop-blur-sm
        hover:bg-background
        active:scale-95
        transition-all
        touch-manipulation
      "
      aria-label={copied ? 'Link copied' : 'Share this map'}
    >
      {copied ? (
        <Check className="h-5 w-5 md:h-6 md:w-6 text-green-600" />
      ) : (
        <Share2 className="h-5 w-5 md:h-6 md:w-6" />
      )}
    </Button>
  );
}
