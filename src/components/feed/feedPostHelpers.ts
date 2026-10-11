import type { Post as ApiPost } from '@/services/gql/types/postsFeed';
import { resolveUserTier } from '@/lib/userTier';

// Per-post `blurFor` lookup cache. `post.blurByUrl` is precomputed once in
// `normalizeFeedPost` and keeps a stable reference for the life of the post
// object, so caching the bound lookup against it yields a reference-stable
// `blurFor` function across home-page re-renders — which preserves the
// FeedCardWithReply React.memo (a fresh closure per render would defeat it).
const EMPTY_BLUR_MAP: Record<string, string> = {};
const blurForCache = new WeakMap<
  Record<string, string>,
  (url: string) => string | undefined
>();
export function getBlurFor(
  blurByUrl: Record<string, string> | undefined,
): (url: string) => string | undefined {
  const map = blurByUrl ?? EMPTY_BLUR_MAP;
  let fn = blurForCache.get(map);
  if (!fn) {
    fn = (url: string) => map[url];
    blurForCache.set(map, fn);
  }
  return fn;
}

// Per-post `dimsFor` lookup cache. Mirrors `getBlurFor` above: `post.dimsByUrl`
// is precomputed once in `normalizeFeedPost` and keeps a stable reference for
// the life of the post object, so caching the bound lookup against it yields a
// reference-stable `dimsFor` function per post across home-page re-renders —
// which preserves the FeedCardWithReply React.memo (a fresh closure per render
// would defeat it).
const EMPTY_DIMS_MAP: Record<string, { width?: number; height?: number }> = {};
const dimsForCache = new WeakMap<
  Record<string, { width?: number; height?: number }>,
  (url: string) => { width?: number; height?: number } | undefined
>();
export function getDimsFor(
  dimsByUrl: Record<string, { width?: number; height?: number }> | undefined,
): (url: string) => { width?: number; height?: number } | undefined {
  const map = dimsByUrl ?? EMPTY_DIMS_MAP;
  let fn = dimsForCache.get(map);
  if (!fn) {
    fn = (url: string) => map[url];
    dimsForCache.set(map, fn);
  }
  return fn;
}


export function getProfileData(post: ApiPost) {
  const orgProfile = post.authorProfile?.organizationProfile;
  if (post.authorType === 'COMMUNITY' && orgProfile) {
    return {
      name: orgProfile.name,
      avatar: orgProfile.logo || '/GLOBE.png',
      tier: undefined,
      isVerified: orgProfile.isVerified,
      isVip: false,
      type: 'Community' as const,
    };
  }
  if (post.authorType === 'ASSOCIATION' && orgProfile) {
    return {
      name: orgProfile.name,
      avatar: orgProfile.logo || '/GLOBE.png',
      tier: undefined,
      isVerified: orgProfile.isVerified,
      isVip: false,
      type: 'Association' as const,
    };
  }
  // Handle organization posts (authorType === 'ORG')
  if (post.authorType === 'ORG' && orgProfile) {
    return {
      name: orgProfile.name,
      avatar: orgProfile.logo || '/GLOBE.png',
      tier: undefined,
      isVerified: orgProfile.isVerified,
      isVip: false,
      type: 'Organization' as const
    };
  }
  // Handle user posts (authorType === 'USER')
  else if (post.authorType === 'USER' && post.authorProfile?.userProfile) {
    return {
      name: post.authorProfile.userProfile.name,
      avatar: post.authorProfile.userProfile.avatar || '/PROFILE.png',
      tier: resolveUserTier({
        tier: (post.authorProfile.userProfile as { tier?: string }).tier,
        verificationTier: post.authorProfile.userProfile.verificationTier,
      }),
      isVerified: post.authorProfile.userProfile.verificationTier !== 'unverified' && 
                  post.authorProfile.userProfile.verificationTier !== 'NONE',
      isVip: post.authorProfile.userProfile.isVip,
      type: 'User' as const
    };
  }

  // Fallback for unknown or missing data
  return {
    name: 'Unknown User',
    avatar: '/PROFILE.png',
    tier: undefined,
    isVerified: false,
    isVip: false,
    type: 'User' as const
  };
}
