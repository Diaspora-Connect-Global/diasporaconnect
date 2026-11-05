import type { ReactNode } from 'react';

export interface CircleScreenHeadingProps {
  /** The screen's one `h1`. */
  title: string;
  /** One line under it. */
  subtitle?: ReactNode;
  /** Controls on the right (search, a primary action…). They wrap under the title on a phone. */
  actions?: ReactNode;
  id?: string;
}

/**
 * The heading row every circle screen opens with: the title as the page's single
 * `h1` in the redesign type scale, a one-line description, and the screen's
 * controls. It replaces the back-arrow-plus-title rows each screen drew for
 * itself; the shared header above it already says where you are and links home.
 */
export function CircleScreenHeading({ title, subtitle, actions, id }: CircleScreenHeadingProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 id={id} className="text-2xl font-bold leading-tight text-text-primary sm:text-3xl">
          {title}
        </h1>
        {subtitle ? <p className="mt-1 text-sm text-text-secondary sm:text-base">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex min-w-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
