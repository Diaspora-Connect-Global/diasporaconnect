'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { FilePen } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useImageFallback } from '@/components/ui/ImageWithFallback';
import { toCdnUrl } from '@/lib/cdn';
import { hasPostDraft } from '@/hooks/usePostDraft';
import { useUserStore } from '@/store/useUserStore';

const PostComposerModal = dynamic(() => import('@/components/posts/PostComposerModal'), { ssr: false });

/**
 * "Share an update…" box at the top of the Home feed; it opens the create-post modal.
 * (The Post / Add photo / Group buttons under it were removed on 2026-10-27 at the owner's
 * request: the first two opened this same modal, and groups are created from Chat.)
 */
export function FeedComposer({ avatarUrl }: { avatarUrl?: string | null }) {
  const t = useTranslations('communityPage.composer');
  const { src, onError } = useImageFallback(avatarUrl ? toCdnUrl(avatarUrl) : undefined, '/PROFILE.png');
  const [postOpen, setPostOpen] = useState(false);
  const userId = useUserStore((s) => s.user?.userId ?? null);
  // Re-checked whenever the composer closes: a saved draft turns the prompt into "Continue your draft".
  const [hasDraft, setHasDraft] = useState(false);
  useEffect(() => {
    if (!postOpen) setHasDraft(hasPostDraft(userId));
  }, [postOpen, userId]);
  const openerRef = useRef<HTMLElement | null>(null);
  const openPost = (e: React.MouseEvent<HTMLElement>) => {
    openerRef.current = e.currentTarget;
    setPostOpen(true);
  };

  return (
    <>
      <section data-testid="feed-composer" className="rounded-2xl border border-border-subtle bg-surface-default p-4 shadow-sm">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src || '/PROFILE.png'}
            alt=""
            width={40}
            height={40}
            onError={onError}
            className="size-10 shrink-0 rounded-full border border-border-subtle object-cover"
          />
          <button
            type="button"
            onClick={openPost}
            className={`min-w-0 flex-1 truncate rounded-full border px-4 py-2.5 text-left text-sm hover:border-border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand ${
              hasDraft ? 'border-border-brand bg-surface-info font-medium text-text-brand' : 'border-border-subtle bg-surface-subtle text-muted-foreground'
            }`}
          >
            {hasDraft ? (
              <span className="inline-flex items-center gap-2">
                <FilePen className="size-4 shrink-0" aria-hidden />
                {t('continueDraft')}
              </span>
            ) : (
              t('prompt')
            )}
          </button>
        </div>
      </section>

      {postOpen && <PostComposerModal open={postOpen} onOpenChange={setPostOpen} returnFocusTo={openerRef} />}
    </>
  );
}
