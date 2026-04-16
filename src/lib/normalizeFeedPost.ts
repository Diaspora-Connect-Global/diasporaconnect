import type {
  Attachment,
  AuthorProfile,
  EngagementCounts,
  FeedPostFragment,
  Post,
  UserEngagement,
} from '@/services/gql/types/postsFeed';

function mapAttachments(raw: FeedPostFragment['attachments']): Attachment[] | undefined {
  if (!raw?.length) return undefined;
  return raw.map((a, i) => ({
    id: a.id ?? `att-${i}`,
    objectKey: a.objectKey ?? '',
    url: a.url ?? undefined,
    type: a.type ?? 'IMAGE',
    mimeType: a.mimeType ?? 'application/octet-stream',
    size: 0,
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
        logo: o.logoUrl ?? '',
        isVerified: (o.verificationTier ?? '') !== '' && (o.verificationTier ?? 'NONE') !== 'NONE',
      },
    };
  } else if (p.authorProfile?.userProfile) {
    const u = p.authorProfile.userProfile;
    const display = u.displayName || u.name || p.author?.displayName || '';
    const avatar = u.avatarUrl || '';
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
        avatar: p.author.avatarUrl ?? '',
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
    attachments: mapAttachments(p.attachments),
    engagementCounts,
    userEngagement,
  };
}
