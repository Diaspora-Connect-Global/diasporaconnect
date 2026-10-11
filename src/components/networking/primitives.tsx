'use client';

import { useTranslations } from 'next-intl';
import { Check, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { NetworkingTier } from '@/services/gql/networking';

/** A static chip (taxonomy label, shared interest). */
export function Chip({ children, tone = 'default', className = '' }: { children: React.ReactNode; tone?: 'default' | 'brand' | 'success'; className?: string }) {
  const tones = {
    default: 'bg-surface-subtle text-muted-foreground border-border-subtle',
    brand: 'bg-surface-brand-subtle text-text-brand border-border-brand/30',
    success: 'bg-surface-success text-text-success border-border-success/30',
  } as const;
  return <span className={`inline-flex min-h-6 items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${tones[tone]} ${className}`}>{children}</span>;
}

/** A selected value with a real remove button (24px+ target, labelled). */
export function RemovableChip({ label, onRemove, removeLabel }: { label: string; onRemove: () => void; removeLabel: string }) {
  return (
    <span className="inline-flex min-h-8 items-center gap-1 rounded-full border border-border-brand/30 bg-surface-brand-subtle py-0.5 pl-3 pr-1 text-sm font-medium text-text-brand">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={removeLabel}
        className="inline-flex size-6 items-center justify-center rounded-full hover:bg-surface-brand-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand"
      >
        <X className="size-3.5" aria-hidden />
      </button>
    </span>
  );
}

export function initialsOf(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

export function PersonAvatar({ name, url, className = 'size-14' }: { name?: string | null; url?: string | null; className?: string }) {
  return (
    <Avatar className={className}>
      {url ? <AvatarImage src={url} alt="" /> : null}
      <AvatarFallback className="bg-surface-brand-subtle font-semibold text-text-brand">{initialsOf(name)}</AvatarFallback>
    </Avatar>
  );
}

/** The match tier as words. Never a percentage. */
export function TierBadge({ tier, mutualFit }: { tier?: NetworkingTier | null; mutualFit?: boolean }) {
  const t = useTranslations('networking.tier');
  if (!tier) return null;
  const tone = tier === 'DIRECT_OPPORTUNITY' || tier === 'STRONG_FIT' ? 'success' : tier === 'SHARED_INTERESTS' ? 'brand' : 'default';
  return (
    <span data-testid="tier-badge" data-tier={tier} className="inline-flex flex-wrap items-center gap-1">
      <Chip tone={tone}>
        {tone === 'success' && <Check className="mr-1 size-3" aria-hidden />}
        {t(tier)}
      </Chip>
      {mutualFit && <Chip tone="success">{t('mutualFit')}</Chip>}
    </span>
  );
}

export function SectionCard({
  title,
  subtitle,
  icon,
  action,
  children,
  id,
  className = '',
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  id?: string;
  className?: string;
}) {
  const hid = id ? `${id}-title` : undefined;
  return (
    <section aria-labelledby={hid} id={id} className={`rounded-2xl border border-border-subtle bg-surface-default p-4 sm:p-5 ${className}`}>
      <div className="flex items-start gap-3">
        {icon && <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-brand-subtle text-text-brand">{icon}</div>}
        <div className="min-w-0 flex-1">
          <h2 id={hid} className="text-base font-semibold text-text-primary sm:text-lg">{title}</h2>
          {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** Circular progress from the REAL profile completeness (0..100). */
export function CompletenessRing({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, Math.round(Number.isFinite(value) ? value : 0)));
  const r = 30;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative size-20 shrink-0" role="img" aria-label={`${v}%`}>
      <svg viewBox="0 0 72 72" className="size-full -rotate-90" aria-hidden>
        <circle cx="36" cy="36" r={r} fill="none" strokeWidth="7" className="stroke-surface-brand-light" />
        <circle cx="36" cy="36" r={r} fill="none" strokeWidth="7" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)} className="stroke-text-brand" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-base font-bold text-text-primary">{v}%</span>
    </div>
  );
}

export function InlineNotice({ children, tone = 'info', testId }: { children: React.ReactNode; tone?: 'info' | 'warning' | 'danger'; testId?: string }) {
  const tones = {
    info: 'border-border-info bg-surface-info text-text-primary',
    warning: 'border-border-warning bg-surface-warning text-text-primary',
    danger: 'border-border-danger bg-surface-danger text-text-primary',
  } as const;
  return (
    <div role="status" data-testid={testId} className={`rounded-xl border px-4 py-3 text-sm ${tones[tone]}`}>
      {children}
    </div>
  );
}

export const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand focus-visible:ring-offset-1';
