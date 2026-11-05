import type { ReactNode } from 'react';

import { CircleScreen } from './CircleScreen';
import { CircleScreenHeading } from './CircleScreenHeading';

/**
 * A circle screen that is one form: the shared heading, an optional notice
 * above, and the form on a redesign card. Centred at a reading measure (a form
 * stretched across a desktop is harder to fill in, not easier).
 */
export function CircleFormScreen({
  title,
  subtitle,
  notice,
  children,
}: {
  title: string;
  subtitle?: string;
  notice?: ReactNode;
  children: ReactNode;
}) {
  return (
    <CircleScreen className="mx-auto max-w-2xl">
      <CircleScreenHeading title={title} subtitle={subtitle} />
      {notice}
      <div className="rounded-2xl border border-border-subtle bg-surface-default p-4 shadow-sm sm:p-6">{children}</div>
    </CircleScreen>
  );
}
