'use client';

import { useState, type ReactNode } from 'react';
import Image from 'next/image';
import { ArrowLeft, ChevronLeft, ChevronRight, Minus, Plus, ShieldCheck, type LucideIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

export const CARD = 'rounded-2xl border border-border-subtle bg-surface-default p-4 shadow-sm sm:p-5';

/** Page frame shared by the product and service views: scroll area, width, back button, content + sticky rail. */
export function DetailShell({ backLabel, onBack, children }: { backLabel: string; onBack: () => void; children: ReactNode }) {
  return (
    <div className="h-app-inner overflow-y-auto scrollbar-hide bg-background">
      <div className="mx-auto w-full space-y-4 px-4 pb-24 pt-4 lg:w-[80vw] lg:px-0 lg:pb-10">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-11 items-center gap-2 rounded-md text-text-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand"
        >
          <ArrowLeft size={18} aria-hidden />
          <span className="text-sm font-medium">{backLabel}</span>
        </button>
        {children}
      </div>
    </div>
  );
}

export function DetailColumns({ main, rail, railLabel }: { main: ReactNode; rail: ReactNode; railLabel: string }) {
  return (
    <div className="gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="min-w-0 space-y-4">{main}</div>
      <aside className="mt-4 min-w-0 lg:mt-0" aria-label={railLabel}>
        <div className="space-y-4 lg:sticky lg:top-4">{rail}</div>
      </aside>
    </div>
  );
}

export function SectionCard({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className={CARD}>
      <h2 id={id} className="text-lg font-bold text-text-primary">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function Chips({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((v) => (
        <li key={v} className="rounded-full border border-border-subtle bg-surface-subtle px-3 py-1 text-sm text-text-primary">{v}</li>
      ))}
    </ul>
  );
}

/** Reassurance line for the rail. It states how the platform works (escrow is created with every order). */
export function EscrowNote() {
  const t = useTranslations('marketplacePage');
  return (
    <div className="flex items-start gap-3 rounded-xl bg-surface-success p-3 text-text-success">
      <ShieldCheck className="mt-0.5 size-5 shrink-0" aria-hidden />
      <div className="min-w-0">
        <p className="text-sm font-semibold">{t('escrowTitle')}</p>
        <p className="text-xs leading-relaxed">{t('escrowText')}</p>
      </div>
    </div>
  );
}

/**
 * The listing's own photos only. With none, one icon tile says so; the old view
 * repeated an empty frame four times as if there were four photos.
 */
export function Gallery({ images, name, Icon }: { images: string[]; name: string; Icon: LucideIcon }) {
  const t = useTranslations('marketplacePage');
  const photos = images.filter((src) => typeof src === 'string' && src.startsWith('http'));
  const [index, setIndex] = useState(0);
  const current = photos[Math.min(index, Math.max(photos.length - 1, 0))];
  const step = (d: number) => setIndex((i) => (i + d + photos.length) % photos.length);

  return (
    <div role="group" aria-label={t('galleryLabel', { name })} className="space-y-3">
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-border-subtle bg-surface-subtle">
        {current ? (
          <Image key={current} src={current} alt={name} fill priority sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-text-tertiary">
            <div className="flex flex-col items-center gap-2">
              <Icon className="size-16" strokeWidth={1.25} aria-hidden />
              <span className="text-xs">{t('noPhoto')}</span>
            </div>
          </div>
        )}
        {photos.length > 1 && (
          <>
            <button type="button" onClick={() => step(-1)} aria-label={t('previousPhoto')} className="absolute left-3 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full border border-border-subtle bg-surface-default/90 text-text-secondary hover:text-text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand">
              <ChevronLeft className="size-5" aria-hidden />
            </button>
            <button type="button" onClick={() => step(1)} aria-label={t('nextPhoto')} className="absolute right-3 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full border border-border-subtle bg-surface-default/90 text-text-secondary hover:text-text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand">
              <ChevronRight className="size-5" aria-hidden />
            </button>
          </>
        )}
      </div>
      {photos.length > 1 && (
        <ul className="flex gap-2 overflow-x-auto pb-1">
          {photos.map((src, i) => (
            <li key={`${src}-${i}`} className="shrink-0">
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={t('thumbnail', { n: i + 1 })}
                aria-current={i === index}
                className={`relative block h-14 w-20 overflow-hidden rounded-lg border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand ${i === index ? 'border-border-brand' : 'border-border-subtle'}`}
              >
                <Image src={src} alt="" fill sizes="80px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Seller names are never ids. The listing API gives only a vendor id, so the line shows only when a real name is passed. */
export const LOOKS_LIKE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-|^[0-9a-f]{16,}$/i;
export const readableSeller = (s?: string): string => (s && !LOOKS_LIKE_ID.test(s.trim()) ? s.trim() : '');

/** Quantity control. Labels come from the existing `marketplace` namespace. */
export function QuantityStepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const t = useTranslations('marketplace');
  const btn = 'grid size-11 place-items-center rounded-full text-text-brand hover:bg-surface-brand-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand';
  return (
    <div role="group" aria-label={t('quantity')} className="inline-flex items-center rounded-full border border-border-brand bg-surface-default">
      <button type="button" onClick={() => onChange(Math.max(1, value - 1))} className={btn} aria-label={t('decreaseQuantity')}>
        <Minus className="size-4" strokeWidth={2} aria-hidden />
      </button>
      <span aria-live="polite" className="min-w-[2.5rem] text-center text-base font-semibold text-text-primary">{value}</span>
      <button type="button" onClick={() => onChange(value + 1)} className={btn} aria-label={t('increaseQuantity')}>
        <Plus className="size-4" strokeWidth={2} aria-hidden />
      </button>
    </div>
  );
}
