'use client';

import { Link2 } from 'lucide-react';
import { useQuery } from '@apollo/client/react';
import { GET_POST, type GetPostData } from '@/services/gql/postsFeed';

export interface LinkPreviewCardProps {
  url: string;
  className?: string;
}

function getDomain(url: string): string | null {
  try {
    const parsed = url.startsWith('http') ? new URL(url) : new URL(url, 'https://dummy.com');
    return parsed.hostname === 'dummy.com' ? null : parsed.hostname;
  } catch {
    return null;
  }
}

/** Extract post ID from a post URL path (e.g. /en/post/abc-123 or https://domain.com/en/post/abc-123). */
function extractPostIdFromUrl(url: string): string | null {
  try {
    const path = url.startsWith('http') ? new URL(url).pathname : url.split('?')[0];
    const match = path.match(/\/(?:post|posts)\/([a-zA-Z0-9-]+)/);
    return match ? match[1] : null;
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

export function LinkPreviewCard({ url, className = '' }: LinkPreviewCardProps) {
  const domain = getDomain(url);
  if (!domain) return null;

  const postId = extractPostIdFromUrl(url);
  const { data: postData } = useQuery<GetPostData>(GET_POST, {
    variables: { id: postId! },
    skip: !postId,
  });
  const previewUrl = postData?.post ? getPostPreviewUrl(postData.post) : null;
  const postText = postData?.post?.text?.trim() ?? null;
  const textSnippet = postText ? (postText.length > 120 ? postText.slice(0, 120) + '...' : postText) : null;

  const displayUrl = truncateUrl(url);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`block rounded-xl border border-border-subtle bg-surface-subtle/50 hover:bg-surface-subtle transition-colors overflow-hidden max-w-[min(100%,16rem)] ${className}`}
    >
      {/* Preview: image/video, or post text snippet, or link icon - same height in all cases */}
      <div className="relative aspect-square w-full overflow-hidden bg-surface-default flex items-center justify-center">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : textSnippet ? (
          <p className="p-3 text-sm text-text-primary line-clamp-4 leading-relaxed w-full text-left overflow-hidden">
            {textSnippet}
          </p>
        ) : (
          <Link2 className="w-8 h-8 text-text-tertiary flex-shrink-0" />
        )}
      </div>
      <div className="p-2.5 min-w-0">
        <p className="text-xs font-medium text-text-tertiary truncate">{domain}</p>
        <p className="text-sm text-text-primary truncate" title={url}>
          {displayUrl}
        </p>
      </div>
    </a>
  );
}
