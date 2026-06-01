/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useState } from 'react';
import { FileIcon, Link2, Music } from 'lucide-react';
import { useQuery } from '@apollo/client/react';
import { GET_POST, type GetPostData } from '@/services/gql/postsFeed';
import { classifyUrl, extractPostIdFromUrl, extractYouTubeVideoId, getFileNameFromUrl } from '@/lib/urlPreview';

type OgData = { title?: string; description?: string; imageUrl?: string; siteName?: string; loading: boolean };

function useLinkPreviewOg(url: string, enabled: boolean): OgData {
  const [state, setState] = useState<OgData>(() => ({ loading: enabled }));
  useEffect(() => {
    if (!enabled || !url?.trim()) {
      setState((s) => (s.loading === false ? s : { loading: false }));
      return;
    }
    let cancelled = false;
    const encoded = encodeURIComponent(url.trim());
    fetch(`/api/link-preview?url=${encoded}`)
      .then((r) => (r.ok ? r.json() : {}))
      .then((data: { title?: string; description?: string; imageUrl?: string; siteName?: string }) => {
        if (cancelled) return;
        setState({
          title: data.title,
          description: data.description,
          imageUrl: data.imageUrl,
          siteName: data.siteName,
          loading: false,
        });
      })
      .catch(() => {
        if (!cancelled) setState((s) => (s.loading === false ? s : { loading: false }));
      });
    return () => {
      cancelled = true;
    };
  }, [url, enabled]);
  return state;
}

export interface LinkPreviewCardProps {
  url: string;
  className?: string;
  /** 'compact' (default, chat) caps card width; 'feed' renders a full-width Facebook-style card. */
  variant?: 'compact' | 'feed';
}

function getDomain(url: string): string | null {
  try {
    const parsed = url.startsWith('http') ? new URL(url) : new URL(url, 'https://dummy.com');
    return parsed.hostname === 'dummy.com' ? null : parsed.hostname;
  } catch {
    return null;
  }
}

function truncateUrl(url: string, maxLen: number = 48): string {
  if (url.length <= maxLen) return url;
  return url.slice(0, maxLen - 3) + '...';
}

/** Returns true when content is a single valid URL (for showing as link card). */
export function isLinkOnlyContent(content: string | undefined): boolean {
  const t = content?.trim();
  if (!t || (!t.startsWith('http://') && !t.startsWith('https://'))) return false;
  try {
    new URL(t);
    return true;
  } catch {
    return false;
  }
}

/** First image or video attachment URL for post preview. */
function getPostPreviewUrl(post: GetPostData['post']): string | null {
  const attachments = post?.attachments?.filter((a) => a.url) ?? [];
  const firstImage = attachments.find((a) => a.mimeType?.startsWith('image/'));
  const firstVideo = attachments.find((a) => a.mimeType?.startsWith('video/'));
  return (firstImage?.url ?? firstVideo?.url) ?? null;
}

export function LinkPreviewCard({ url, className = '', variant = 'compact' }: LinkPreviewCardProps) {
  const trimmed = url?.trim() ?? '';
  const isFeed = variant === 'feed';

  // Validate up-front WITHOUT early-returning, so the hooks below always run
  // in a stable order (Rules of Hooks).
  let isValid = false;
  try {
    if (trimmed) {
      new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
      isValid = true;
    }
  } catch {
    isValid = false;
  }

  const kind = isValid ? classifyUrl(trimmed) : 'website';
  const domain = isValid ? getDomain(trimmed) : null;
  const postId = isValid ? extractPostIdFromUrl(trimmed) : null;

  const og = useLinkPreviewOg(trimmed, isValid && kind === 'website');

  const { data: postData } = useQuery<GetPostData>(GET_POST, {
    variables: { id: postId ?? '' },
    skip: !isValid || kind !== 'post' || !postId,
    errorPolicy: 'ignore',
  });

  const [ogImgFailed, setOgImgFailed] = useState(false);

  if (!isValid) return null;
  const previewUrl = postData?.post ? getPostPreviewUrl(postData.post) : null;
  const postText = postData?.post?.text?.trim() ?? null;
  const textSnippet = postText ? (postText.length > 120 ? postText.slice(0, 120) + '...' : postText) : null;
  const displayUrl = truncateUrl(trimmed);

  // Image: inline image (same style as MessageAttachments)
  if (kind === 'image') {
    return (
      <a
        href={trimmed}
        target="_blank"
        rel="noopener noreferrer"
        className={`block rounded-2xl max-w-full overflow-hidden ${className}`}
      >
        <img
          src={trimmed || undefined}
          alt=""
          className="rounded-2xl max-w-full h-auto max-h-80 object-contain"
        />
      </a>
    );
  }

  // Video: inline video with controls
  if (kind === 'video') {
    return (
      <div className={`rounded-2xl overflow-hidden max-w-full bg-black/10 ${className}`}>
        <video
          src={trimmed || undefined}
          controls
          className="max-w-full max-h-80 w-full"
          preload="metadata"
        />
      </div>
    );
  }

  // YouTube: thumbnail preview card
  if (kind === 'youtube') {
    const videoId = extractYouTubeVideoId(trimmed);
    if (!videoId) return null;
    const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    return (
      <a
        href={trimmed}
        target="_blank"
        rel="noopener noreferrer"
        className={`block rounded-xl border border-border-subtle bg-surface-subtle/50 hover:bg-surface-subtle transition-colors overflow-hidden ${
          isFeed ? 'w-full max-w-full' : 'max-w-[min(100%,18rem)]'
        } ${className}`}
      >
        <div className="relative aspect-video w-full overflow-hidden bg-surface-default">
          <img
            src={thumbnailUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        </div>
        <div className="p-2.5 min-w-0">
          <p className="text-xs font-medium text-text-tertiary truncate">YouTube</p>
          <p className="text-sm text-text-primary truncate" title={trimmed}>
            {truncateUrl(trimmed, 44)}
          </p>
        </div>
      </a>
    );
  }

  // Document or audio: file card with icon + link
  if (kind === 'document' || kind === 'audio') {
    const fileName = getFileNameFromUrl(trimmed);
    const Icon = kind === 'audio' ? Music : FileIcon;
    return (
      <a
        href={trimmed}
        target="_blank"
        rel="noopener noreferrer"
        className={`flex items-center gap-3 rounded-xl border border-border-subtle bg-surface-hover hover:bg-surface-default transition-colors max-w-full p-3 ${className}`}
      >
        <Icon className="w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0 text-text-tertiary" />
        <div className="min-w-0 flex-1">
          <span className="text-sm font-medium text-text-primary truncate block">{fileName}</span>
        </div>
      </a>
    );
  }

  // Post: existing GET_POST preview card (full card only when we have preview content)
  if (kind === 'post' && domain) {
    const hasPreview = !!(previewUrl || textSnippet);
    if (hasPreview) {
      return (
        <a
          href={trimmed}
          target="_blank"
          rel="noopener noreferrer"
          className={`block rounded-xl border border-border-subtle bg-surface-subtle/50 hover:bg-surface-subtle transition-colors overflow-hidden ${
            isFeed ? 'w-full max-w-full' : 'max-w-[min(100%,16rem)]'
          } ${className}`}
        >
          <div className="relative aspect-square w-full overflow-hidden bg-surface-default flex items-center justify-center">
            {previewUrl ? (
              <img
                src={previewUrl || undefined}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <p className="p-3 text-sm text-text-primary line-clamp-4 leading-relaxed w-full text-left overflow-hidden">
                {textSnippet}
              </p>
            )}
          </div>
          <div className="p-2.5 min-w-0">
            <p className="text-xs font-medium text-text-tertiary truncate">{domain}</p>
            <p className="text-sm text-text-primary truncate" title={trimmed}>
              {displayUrl}
            </p>
          </div>
        </a>
      );
    }
    // Post with no preview: compact link row
    return (
      <a
        href={trimmed}
        target="_blank"
        rel="noopener noreferrer"
        className={`flex items-center gap-2.5 rounded-xl border border-border-subtle bg-surface-subtle/50 hover:bg-surface-subtle transition-colors max-w-full p-2.5 min-w-0 ${className}`}
      >
        <Link2 className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 text-text-tertiary" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-text-tertiary truncate">{domain}</p>
          <p className="text-sm text-text-primary truncate" title={trimmed}>
            {displayUrl}
          </p>
        </div>
      </a>
    );
  }

  // Website: OG rich card when API returns data, else compact row
  if (!domain) return null;
  const hasOg = !og.loading && (og.title || og.description || og.imageUrl);

  if (hasOg) {
    const showImg = !!og.imageUrl && !ogImgFailed;
    const footer = (og.siteName ?? domain) ?? '';
    return (
      <a
        href={trimmed}
        target="_blank"
        rel="noopener noreferrer"
        className={`block rounded-xl border border-border-subtle bg-surface-subtle/50 hover:bg-surface-subtle transition-colors overflow-hidden ${
          isFeed ? 'w-full max-w-full' : 'max-w-[min(100%,18rem)]'
        } ${className}`}
      >
        {showImg && (
          <div className="relative aspect-video w-full overflow-hidden bg-surface-default">
            <img
              src={og.imageUrl || undefined}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              onError={() => setOgImgFailed(true)}
            />
          </div>
        )}
        <div className={isFeed ? 'p-3 min-w-0' : 'p-2.5 min-w-0'}>
          <p className="text-[0.7rem] font-medium uppercase tracking-wide text-text-tertiary truncate">{footer}</p>
          {og.title && (
            <p
              className={`font-semibold text-text-primary mt-0.5 ${isFeed ? 'text-sm line-clamp-2' : 'text-sm truncate'}`}
              title={og.title}
            >
              {og.title}
            </p>
          )}
          {og.description && (
            <p className="text-xs text-text-tertiary line-clamp-2 mt-0.5" title={og.description}>
              {og.description}
            </p>
          )}
        </div>
      </a>
    );
  }

  return (
    <a
      href={trimmed}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-2.5 rounded-xl border border-border-subtle bg-surface-subtle/50 hover:bg-surface-subtle transition-colors max-w-full p-2.5 min-w-0 ${className}`}
    >
      <Link2 className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 text-text-tertiary" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-text-tertiary truncate">{domain}</p>
        <p className="text-sm text-text-primary truncate" title={trimmed}>
          {displayUrl}
        </p>
      </div>
    </a>
  );
}
