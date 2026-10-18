'use client';

import { useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Image as ImageIcon, SquarePen, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useImageFallback } from '@/components/ui/ImageWithFallback';
import { toCdnUrl } from '@/lib/cdn';

const CreateGroupDialog = dynamic(
  () => import('@/components/groups/CreateGroupDialog').then((m) => m.CreateGroupDialog),
  { ssr: false },
);

const PostComposerModal = dynamic(() => import('@/components/posts/PostComposerModal'), { ssr: false });

/**
 * "Share an update…" box at the top of the Home and Community feeds. The box, Post and
 * Add photo open the create-post modal; Group opens the create-group dialog.
 */
export function FeedComposer({ avatarUrl }: { avatarUrl?: string | null }) {
  const t = useTranslations('communityPage.composer');
  const { src, onError } = useImageFallback(avatarUrl ? toCdnUrl(avatarUrl) : undefined, '/PROFILE.png');
  const [groupOpen, setGroupOpen] = useState(false);
  const [postOpen, setPostOpen] = useState(false);
  const openerRef = useRef<HTMLElement | null>(null);
  const openPost = (e: React.MouseEvent<HTMLElement>) => {
    openerRef.current = e.currentTarget;
    setPostOpen(true);
  };

  const btn =
    'inline-flex items-center justify-center gap-2 rounded-full border border-border-subtle px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand';

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
            className="min-w-0 flex-1 truncate rounded-full border border-border-subtle bg-surface-subtle px-4 py-2.5 text-left text-sm text-muted-foreground hover:border-border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand"
          >
            {t('prompt')}
          </button>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <button type="button" onClick={openPost} className={btn}>
            <SquarePen className="size-4 text-text-brand" aria-hidden />
            {t('post')}
          </button>
          <button type="button" onClick={openPost} className={btn}>
            <ImageIcon className="size-4 text-text-brand" aria-hidden />
            {t('photo')}
          </button>
          <button type="button" onClick={() => setGroupOpen(true)} className={btn}>
            <Users className="size-4 text-text-brand" aria-hidden />
            {t('group')}
          </button>
        </div>
      </section>

      {postOpen && <PostComposerModal open={postOpen} onOpenChange={setPostOpen} returnFocusTo={openerRef} />}
      {groupOpen && <CreateGroupDialog onClose={() => setGroupOpen(false)} />}
    </>
  );
}
