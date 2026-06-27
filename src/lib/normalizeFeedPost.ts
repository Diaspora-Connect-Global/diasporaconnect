import type {
  Attachment,
  AuthorProfile,
  EngagementCounts,
  FeedPostFragment,
  Post,
  PostVisibility,
  UserEngagement,
} from '@/services/gql/types/postsFeed';
import { getFileNameFromUrl } from '@/lib/urlPreview';
import { toCdnUrl } from '@/lib/cdn';

export interface PostDocument {
  url: string;
  fileName: string;
  mimeType: string;
  size?: number;
}

function isImage(a: Attachment): boolean {
  return a.mimeType?.startsWith('image/') || String(a.type ?? '').toUpperCase() === 'IMAGE';
}

function isVideo(a: Attachment): boolean {
  return a.mimeType?.startsWith('video/') || String(a.type ?? '').toUpperCase() === 'VIDEO';
}

/**
 * Splits a post's attachments into the shapes the feed cards consume:
 * - images / videos: URL string arrays (existing card props)
 * - documents: everything else (DOCUMENT / AUDIO) as file-card descriptors
 */
export function splitPostAttachments(attachments?: Attachment[]): {
  images: string[];
  videos: string[];
  documents: PostDocument[];
} {
  const list = attachments ?? [];
  const images = list.filter(isImage).map((a) => a.url || '').filter(Boolean);
  const videos = list.filter(isVideo).map((a) => a.url || '').filter(Boolean);
  const documents = list
    .filter((a) => !isImage(a) && !isVideo(a) && a.url)
    .map((a) => ({
      url: a.url!,
      fileName: getFileNameFromUrl(a.url || a.objectKey || ''),
      mimeType: a.mimeType ?? 'application/octet-stream',
      size: a.size || undefined,
    }));
  return { images, videos, documents };
}

function mapAttachments(raw: FeedPostFragment['attachments']): Attachment[] | undefined {
  if (!raw?.length) return undefined;
  return raw.map((a, i) => ({
    id: a.id ?? `att-${i}`,
    objectKey: a.objectKey ?? '',
    // Render-time CDN rewrite: stored GCS URLs are served via the CDN when
    // NEXT_PUBLIC_CDN_URL is set (no-op otherwise).
    url: a.url ? toCdnUrl(a.url) : undefined,
    type: a.type ?? 'IMAGE',
    mimeType: a.mimeType ?? 'application/octet-stream',
    size: 0,
    // Populated once the backend emits these (see Attachment LQIP follow-up);
    // until then they are undefined and PostImage falls back to a shimmer.
    width: a.width ?? undefined,
    height: a.height ?? undefined,
    blurDataUrl: a.blurDataUrl ?? undefined,
  }));
}

/**
 * Maps API Post (FullPost) to the UI `Post` shape used by feed cards.
 * Collapses COMMUNITY / ASSOCIATION authors into `authorType: 'ORG'` for existing UI helpers.
 */
export function normalizeFeedPost(p: FeedPostFragment): Post {
  const text = (p.text ?? p.content ?? '') || '';
  const at = (p.authorType ?? '').toUpperCase();
  const isOrgAuthor =
    at === 'ORG' ||
    at === 'COMMUNITY' ||
    at === 'ASSOCIATION' ||
    at === 'ORGANIZATION';

  const engagementCounts: EngagementCounts = {
    likes: p.engagementCounts?.likes ?? 0,
    comments: p.engagementCounts?.comments ?? 0,
    shares: p.engagementCounts?.shares ?? 0,
    saves: p.engagementCounts?.saves ?? 0,
  };

  const userEngagement: UserEngagement = {
    hasLiked: p.userEngagement?.hasLiked ?? false,
    hasSaved: p.userEngagement?.hasSaved ?? false,
    hasShared: p.userEngagement?.hasShared ?? false,
  };

  let authorProfile: AuthorProfile | undefined;

  if (isOrgAuthor && p.authorProfile?.organizationProfile) {
    const o = p.authorProfile.organizationProfile;
    authorProfile = {
      organizationProfile: {
        name: o.name ?? p.author?.displayName ?? 'Organization',
        logo: toCdnUrl(o.logoUrl ?? ''),
        isVerified: (o.verificationTier ?? '') !== '' && (o.verificationTier ?? 'NONE') !== 'NONE',
      },
    };
  } else if (p.authorProfile?.userProfile) {
    const u = p.authorProfile.userProfile;
    const display = u.displayName || u.name || p.author?.displayName || '';
    const avatar = toCdnUrl(u.avatarUrl || '');
    authorProfile = {
      userProfile: {
        name: display,
        avatar,
        isVip: u.isVip ?? false,
        verificationTier: u.verificationTier ?? 'NONE',
      },
    };
  } else if (p.author) {
    authorProfile = {
      userProfile: {
        name: p.author.displayName ?? 'Unknown',
        avatar: toCdnUrl(p.author.avatarUrl ?? ''),
        isVip: false,
        verificationTier: 'NONE',
      },
    };
  }

  return {
    id: p.id,
    text,
    authorId: p.authorId,
    authorType: isOrgAuthor ? 'ORG' : 'USER',
    authorProfile,
    createdAt: p.createdAt,
    visibility: (p.visibility ?? 'PUBLIC') as PostVisibility,
    attachments: mapAttachments(p.attachments),
    mentions: p.mentions,
    engagementCounts,
    userEngagement,
    categories: p.categories ?? undefined,
    aiTopics: p.aiTopics ?? undefined,
  };
}
