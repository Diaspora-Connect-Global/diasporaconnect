'use client';

import { toast } from 'sonner';
import { eventRefusal } from '@/lib/eventRefusal';

export const inputClass =
  'w-full min-h-11 rounded-md border-2 border-border-subtle bg-surface-subtle px-3 text-sm text-text-primary focus:outline-none focus:border-border-brand';

export function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm text-text-secondary">{label}</label>
      {children}
      {hint && <p className="text-xs text-text-secondary">{hint}</p>}
    </div>
  );
}

/**
 * Tell the person why a write did not happen. The dark-launch refusal is
 * information ("not available yet"), everything else is an error.
 */
export function reportRefusal(source: unknown, tErr: (key: string) => string): void {
  const r = eventRefusal(source);
  if (r.kind === 'unavailableYet') toast.info(tErr(r.key));
  else toast.error(tErr(r.key));
}

export function EmptyNote({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-dashed border-border-subtle p-4 text-sm text-text-secondary">{children}</p>;
}
