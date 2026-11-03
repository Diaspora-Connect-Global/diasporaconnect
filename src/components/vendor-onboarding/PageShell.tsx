import type { ReactNode } from 'react';

/** Scrolling page shell shared by every redesigned screen: hero/content column, optional right rail at `lg`. */
export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="h-app-inner overflow-y-auto scrollbar-hide bg-background">
      <div className="mx-auto w-full space-y-5 px-4 py-4 pb-10 lg:w-[80vw] lg:px-0 lg:py-6">{children}</div>
    </div>
  );
}

/** Form/content column (left) plus rail (right at `lg`; below the form on phones). */
export function ContentWithRail({ children, rail }: { children: ReactNode; rail: ReactNode }) {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_19rem]">
      <div className="min-w-0 lg:col-start-1 lg:row-start-1">{children}</div>
      <div className="min-w-0 lg:col-start-2 lg:row-start-1">
        <div className="space-y-5 lg:sticky lg:top-0">{rail}</div>
      </div>
    </div>
  );
}
