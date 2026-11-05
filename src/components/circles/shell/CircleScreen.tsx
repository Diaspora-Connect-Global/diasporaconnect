import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * The body of one circle screen: a column with the redesign's section rhythm.
 * The frame (`CircleFrame`) owns the scrolling, the width and the shared header;
 * this only stacks what the screen shows under its own heading.
 */
export function CircleScreen({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex min-w-0 flex-col gap-5', className)}>{children}</div>;
}

/**
 * The same column as a class string, for the screens that keep their own early
 * returns (loading, error, empty) and so wrap each in the same outer div.
 */
export const CIRCLE_SCREEN_CLASS = 'flex w-full min-w-0 flex-col gap-5';
