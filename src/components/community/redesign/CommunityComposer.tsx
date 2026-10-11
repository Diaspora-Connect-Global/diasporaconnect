'use client';

import { Image as ImageIcon, SquarePen } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useImageFallback } from '@/components/ui/ImageWithFallback';
import { toCdnUrl } from '@/lib/cdn';

/** "Share an update…" box. Posting happens on the create-post page, which both buttons open. */
export function CommunityComposer({ avatarUrl }: { avatarUrl?: string | null }) {
  const t = useTranslations('communityPage.composer');
  const { src, onError } = useImageFallback(avatarUrl ? toCdnUrl(avatarUrl) : undefined, '/PROFILE.png');
  const btn = 'inline-flex items-center justify-center gap-2 rounded-full border border-border-subtle px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand';
  return (
    <section data-testid="community-composer" className="rounded-2xl border border-border-subtle bg-surface-default p-4 shadow-sm">
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src || '/PROFILE.png'} alt="" width={40} height={40} onError={onError} className="size-10 shrink-0 rounded-full border border-border-subtle object-cover" />
        <Link href="/create-post" prefetch={false} className="min-w-0 flex-1 truncate rounded-full border border-border-subtle bg-surface-subtle px-4 py-2.5 text-sm text-muted-foreground hover:border-border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand">
          {t('prompt')}
        </Link>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Link href="/create-post" prefetch={false} className={btn}>
          <SquarePen className="size-4 text-text-brand" aria-hidden />
          {t('post')}
        </Link>
        <Link href="/create-post" prefetch={false} className={btn}>
          <ImageIcon className="size-4 text-text-brand" aria-hidden />
          {t('photo')}
        </Link>
      </div>
    </section>
  );
}
