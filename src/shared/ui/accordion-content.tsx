'use client';

import { cn } from '@/shared/lib/utils';

interface AccordionContentProps {
  isOpen: boolean;
  children: React.ReactNode;
  className?: string;
}

/**
 * AccordionContent - Animated accordion wrapper using CSS grid
 *
 * Uses grid-template-rows animation for smooth height transitions.
 * This approach works better than max-height because it doesn't require
 * knowing the content height in advance.
 */
export function AccordionContent({ isOpen, children, className }: AccordionContentProps) {
  return (
    <div
      className={cn(
        'grid transition-[grid-template-rows] duration-200 ease-out',
        isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
      )}
    >
      <div className={cn('overflow-hidden', className)}>
        {children}
      </div>
    </div>
  );
}
