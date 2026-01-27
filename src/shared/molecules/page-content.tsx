'use client';

import { cn } from '@/shared/lib/utils';

interface PageContentProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * PageContent - Standard wrapper for page content
 *
 * Provides consistent padding and gap for all app pages.
 * Use this as the root element in page components.
 *
 * @example
 * ```tsx
 * export default function MyPage() {
 *   return (
 *     <PageContent>
 *       <PageHeader title="My Page" />
 *       <MyContent />
 *     </PageContent>
 *   );
 * }
 * ```
 */
export function PageContent({ children, className }: PageContentProps) {
  return (
    <div className={cn('flex flex-col gap-4 sm:gap-6 p-4 sm:p-6', className)}>
      {children}
    </div>
  );
}
