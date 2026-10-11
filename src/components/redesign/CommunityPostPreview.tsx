'use client';

import { MessageSquare } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { formatDateProximity } from '@/macros/time';
import { toCdnUrl } from '@/lib/cdn';
import { displayName } from '@/lib/displayName';
import { useImageFallback } from '@/components/ui/ImageWithFallback';
import type { Post } from '@/services/gql/types/postsFeed';

function Avatar({ src, fallback }: { src?: string | null; fallback: string }) {
  const { src: resolved, onError } = useImageFallback(src ? toCdnUrl(src) : undefined, fallback);
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={resolved || fallback} alt="" width={36} height={36} loading="lazy" onError={onError} className="size-9 shrink-0 rounded-full border border-border-subtle object-cover" />;
}

/**
 * A compact post teaser: author, time, a few lines of text, up to two photos and
 * the real reaction / comment totals. It opens the post, where the Happy /
 * Hopeful / Sad reactions live; nothing here invents a count.
 */
export function CommunityPostPreview({ post }: { post: Post }) {
  const t = useTranslations('redesign.postMeta');
  const org = post.authorProfile?.organizationProfile;
  const user = post.authorProfile?.userProfile;
  const isOrg = !!org && post.authorType !== 'USER';
  const rawName = isOrg ? org?.name : user?.name;
  const name = displayName({ displayName: rawName }, t('unknownAuthor'));
  const avatar = isOrg ? org?.logo : user?.avatar;
  const images = (post.attachments ?? [])
    .filter((a) => a.mimeType?.startsWith('image/') || String(a.type ?? '').toUpperCase() === 'IMAGE')
    .map((a) => a.url)
    .filter((u): u is string => !!u)
    .slice(0, 2);
  const when = formatDateProximity(post.createdAt);
  return (
    <article data-testid="community-post-preview" className="flex h-full min-w-0 flex-col gap-3 rounded-xl border border-border-subtle bg-surface-default p-3.5">
      <header className="flex items-center gap-2.5">
        <Avatar src={avatar} fallback={isOrg ? '/GLOBE.png' : '/PROFILE.png'} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-text-primary">{name}</p>
          {when && <p className="truncate text-xs text-muted-foreground">{when}</p>}
        </div>
      </header>
      <p className="line-clamp-4 whitespace-pre-line break-words text-sm text-text-primary">{post.text}</p>
      {images.length > 0 && (
        <div className={`grid gap-1.5 ${images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {images.map((src) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={src} src={toCdnUrl(src)} alt="" width={240} height={160} loading="lazy" decoding="async" className="aspect-[3/2] w-full rounded-lg object-cover" />
          ))}
        </div>
      )}
      <footer className="mt-auto flex items-center justify-between gap-2 pt-1 text-xs text-muted-foreground">
        <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5">
          {(post.engagementCounts?.likes ?? 0) > 0 && <span>{t('reactions', { count: post.engagementCounts.likes })}</span>}
          {(post.engagementCounts?.comments ?? 0) > 0 && (
            <span className="inline-flex items-center gap-1">
              <MessageSquare className="size-3.5" aria-hidden />
              {t('comments', { count: post.engagementCounts.comments })}
            </span>
          )}
        </span>
        <Link href={`/post/${encodeURIComponent(post.id)}`} prefetch={false} className="shrink-0 font-medium text-text-brand hover:underline">
          {t('openPost')}
        </Link>
      </footer>
    </article>
  );
}
