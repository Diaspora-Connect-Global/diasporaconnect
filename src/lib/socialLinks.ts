/**
 * Profile "Socials": platform metadata + a client-side PREVIEW of the server's
 * link normalisation.
 *
 * The server (user-service `social-link-normalizer.ts`) is authoritative — it
 * decides what is stored and refuses bad input with a `code`. This port only
 * powers the instant "this will be saved as …" preview in the add/edit form, so
 * a drift between the two can only make the preview wrong, never the data.
 * Keep the rules in step when either side changes.
 */

export const SOCIAL_PLATFORMS = [
  'X',
  'INSTAGRAM',
  'FACEBOOK',
  'LINKEDIN',
  'TIKTOK',
  'YOUTUBE',
  'GITHUB',
  'THREADS',
  'SNAPCHAT',
  'TELEGRAM',
  'WEBSITE',
] as const;

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];
export type SocialLinkStatus = 'PENDING' | 'CONFIRMED' | 'UNCONFIRMED' | 'NOT_FOUND';

export interface SocialLink {
  id: string;
  platform: SocialPlatform;
  url: string;
  handle: string;
  status: SocialLinkStatus;
  title?: string | null;
  imageUrl?: string | null;
  siteName?: string | null;
  checkedAt?: string | null;
}

export const SOCIAL_LINK_REFUSAL_CODES = [
  'INVALID_URL',
  'WRONG_PLATFORM',
  'LIMIT_REACHED',
  'DUPLICATE',
  'NOT_FOUND',
  'RATE_LIMITED',
] as const;
export type SocialLinkRefusal = (typeof SOCIAL_LINK_REFUSAL_CODES)[number];

export interface SocialLinkResult {
  success: boolean;
  code?: string | null;
  message?: string | null;
  link?: SocialLink | null;
  retryAt?: string | null;
}

export const MAX_SOCIAL_LINKS = 10;
export const MAX_WEBSITE_LINKS = 3;

/** Human platform names — brand names, not translated. */
export const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  X: 'X (Twitter)',
  INSTAGRAM: 'Instagram',
  FACEBOOK: 'Facebook',
  LINKEDIN: 'LinkedIn',
  TIKTOK: 'TikTok',
  YOUTUBE: 'YouTube',
  GITHUB: 'GitHub',
  THREADS: 'Threads',
  SNAPCHAT: 'Snapchat',
  TELEGRAM: 'Telegram',
  WEBSITE: 'Website',
};

/** Example input shown as the field placeholder. */
export const PLATFORM_PLACEHOLDERS: Record<SocialPlatform, string> = {
  X: '@username or x.com/username',
  INSTAGRAM: '@username or instagram.com/username',
  FACEBOOK: 'username or facebook.com/username',
  LINKEDIN: 'linkedin.com/in/your-name',
  TIKTOK: '@username or tiktok.com/@username',
  YOUTUBE: '@handle or youtube.com/@handle',
  GITHUB: 'username or github.com/username',
  THREADS: '@username or threads.com/@username',
  SNAPCHAT: 'username or snapchat.com/add/username',
  TELEGRAM: '@username or t.me/username',
  WEBSITE: 'https://your-site.com',
};

const HOSTS: Record<Exclude<SocialPlatform, 'WEBSITE'>, readonly string[]> = {
  X: ['x.com', 'www.x.com', 'mobile.x.com', 'twitter.com', 'www.twitter.com', 'mobile.twitter.com'],
  INSTAGRAM: ['instagram.com', 'www.instagram.com', 'm.instagram.com'],
  FACEBOOK: ['facebook.com', 'www.facebook.com', 'm.facebook.com', 'web.facebook.com', 'mbasic.facebook.com', 'fb.com', 'www.fb.com'],
  LINKEDIN: ['linkedin.com', 'www.linkedin.com'],
  TIKTOK: ['tiktok.com', 'www.tiktok.com', 'm.tiktok.com'],
  YOUTUBE: ['youtube.com', 'www.youtube.com', 'm.youtube.com'],
  GITHUB: ['github.com', 'www.github.com'],
  THREADS: ['threads.net', 'www.threads.net', 'threads.com', 'www.threads.com'],
  SNAPCHAT: ['snapchat.com', 'www.snapchat.com'],
  TELEGRAM: ['t.me', 'www.t.me', 'telegram.me', 'www.telegram.me'],
};

function isPlatformHost(platform: SocialPlatform, host: string): boolean {
  if (platform === 'WEBSITE') return false;
  const h = host.toLowerCase().replace(/\.$/, '');
  return HOSTS[platform].includes(h) || (platform === 'LINKEDIN' && /^[a-z]{2}\.linkedin\.com$/.test(h));
}

function platformForHost(host: string): SocialPlatform | null {
  return SOCIAL_PLATFORMS.find((p) => p !== 'WEBSITE' && isPlatformHost(p, host)) ?? null;
}

const RESERVED: Partial<Record<SocialPlatform, readonly string[]>> = {
  X: ['home', 'i', 'intent', 'search', 'explore', 'hashtag', 'share', 'settings', 'messages', 'notifications', 'login', 'signup', 'tos', 'privacy', 'compose'],
  INSTAGRAM: ['p', 'reel', 'reels', 'explore', 'stories', 'accounts', 'tv', 'direct', 'about', 'legal', 'developer'],
  GITHUB: ['settings', 'login', 'logout', 'join', 'marketplace', 'explore', 'topics', 'features', 'about', 'pricing', 'sponsors', 'apps', 'notifications', 'issues', 'pulls', 'search', 'trending', 'collections', 'events', 'new', 'orgs', 'organizations', 'site', 'security', 'enterprise', 'contact', 'codespaces'],
  TELEGRAM: ['joinchat', 'addstickers', 'addemoji', 'share', 'proxy', 'socks', 'setlanguage', 'addtheme', 'login', 'iv', 's', 'c'],
};

// No lookbehind / \p{} literals: the app targets ES2017.
const IG_HANDLE = /^(?!.*\.\.)(?!\.)(?!.*\.$)[A-Za-z0-9._]{1,30}$/;
const HANDLE_RULES: Partial<Record<SocialPlatform, RegExp>> = {
  X: /^[A-Za-z0-9_]{1,15}$/,
  INSTAGRAM: IG_HANDLE,
  THREADS: IG_HANDLE,
  TIKTOK: /^[A-Za-z0-9_.]{2,24}$/,
  GITHUB: /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/,
  SNAPCHAT: /^[A-Za-z][A-Za-z0-9._-]{2,14}$/,
  TELEGRAM: /^[A-Za-z][A-Za-z0-9_]{3,31}$/,
};
const LINKEDIN_SLUG = new RegExp('^[\\p{L}\\p{N}_-]{3,100}$', 'u');
const TRACKING = ['fbclid', 'gclid', 'dclid', 'gbraid', 'wbraid', 'msclkid', 'yclid', 'twclid', 'ttclid', 'igshid', 'igsh', 'si', 'mc_cid', 'mc_eid', '_ga', '_gl', 'ref_src', 'ref_url', 'mkt_tok', 'spm', 'share_id'];

export type PreviewResult =
  | { ok: true; url: string; handle: string }
  | { ok: false; code: 'INVALID_URL' | 'WRONG_PLATFORM' }
  | { ok: false; code: 'EMPTY' };

function segments(url: URL): string[] {
  return url.pathname
    .split('/')
    .filter(Boolean)
    .map((s) => {
      try {
        return decodeURIComponent(s);
      } catch {
        return s;
      }
    });
}

/** Instant, offline preview of what the server will store. */
export function previewSocialLink(platform: SocialPlatform, rawInput: string): PreviewResult {
  const raw = rawInput.trim();
  if (!raw) return { ok: false, code: 'EMPTY' };
  if (raw.length > 2048 || /[\u0000-\u001f\u007f\s]/.test(raw)) return { ok: false, code: 'INVALID_URL' };

  const hostPart = raw.split(/[/?#]/, 1)[0];
  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw);
  const looksUrl =
    hasScheme ||
    raw.startsWith('//') ||
    /^www\./i.test(raw) ||
    (raw.includes('/') ? hostPart.includes('.') : platform === 'WEBSITE' ? hostPart.includes('.') : isPlatformHost(platform, hostPart) || platformForHost(hostPart) !== null);

  let url: URL | null = null;
  let handle: string | null = null;
  if (looksUrl) {
    if (hasScheme && !/^https:/i.test(raw)) return { ok: false, code: 'INVALID_URL' };
    try {
      url = new URL(hasScheme ? raw : `https://${raw.replace(/^\/\//, '')}`);
    } catch {
      return { ok: false, code: 'INVALID_URL' };
    }
    if (url.username || url.password || (url.port && url.port !== '443')) return { ok: false, code: 'INVALID_URL' };
  } else {
    handle = raw.replace(/^@/, '');
  }

  if (platform === 'WEBSITE') {
    if (!url) return { ok: false, code: 'INVALID_URL' };
    const host = url.hostname.toLowerCase();
    if (!host.includes('.') || /^\d+(\.\d+){3}$/.test(host) || host.startsWith('[') || /\.(local|internal|localhost)$/.test(host)) {
      return { ok: false, code: 'INVALID_URL' };
    }
    if (platformForHost(host)) return { ok: false, code: 'WRONG_PLATFORM' };
    url.hash = '';
    for (const k of Array.from(url.searchParams.keys())) {
      if (k.toLowerCase().startsWith('utm_') || TRACKING.includes(k.toLowerCase())) url.searchParams.delete(k);
    }
    const path = url.pathname === '/' ? '' : url.pathname.replace(/\/$/, '');
    return { ok: true, url: url.toString(), handle: `${host.replace(/^www\./, '')}${path}` };
  }

  if (url && !isPlatformHost(platform, url.hostname)) return { ok: false, code: 'WRONG_PLATFORM' };
  const segs = url ? segments(url) : [];

  if (platform === 'LINKEDIN') {
    let kind = 'in';
    let slug = handle;
    if (url) {
      if ((segs[0] === 'in' || segs[0] === 'company') && segs[1]) {
        kind = segs[0];
        slug = segs[1];
      } else return { ok: false, code: 'INVALID_URL' };
    }
    if (!slug || !LINKEDIN_SLUG.test(slug)) return { ok: false, code: 'INVALID_URL' };
    return { ok: true, url: `https://www.linkedin.com/${kind}/${encodeURIComponent(slug)}`, handle: kind === 'company' ? `company/${slug}` : slug };
  }

  if (platform === 'YOUTUBE') {
    const h = url ? segs[0] ?? '' : handle ?? '';
    if (url && h === 'channel' && /^UC[A-Za-z0-9_-]{22}$/.test(segs[1] ?? '')) {
      return { ok: true, url: `https://www.youtube.com/channel/${segs[1]}`, handle: `channel/${segs[1]}` };
    }
    if (!url && /^UC[A-Za-z0-9_-]{22}$/.test(h)) return { ok: true, url: `https://www.youtube.com/channel/${h}`, handle: `channel/${h}` };
    if (url && (h === 'c' || h === 'user') && segs[1]) return { ok: true, url: `https://www.youtube.com/${h}/${segs[1]}`, handle: `${h}/${segs[1]}` };
    const name = h.replace(/^@/, '');
    if ((url && !h.startsWith('@')) || !/^[A-Za-z0-9._-]{3,30}$/.test(name)) return { ok: false, code: 'INVALID_URL' };
    return { ok: true, url: `https://www.youtube.com/@${name}`, handle: `@${name}` };
  }

  if (platform === 'FACEBOOK') {
    if (url && segs[0] === 'profile.php') {
      const id = url.searchParams.get('id') ?? '';
      return /^\d{5,20}$/.test(id) ? { ok: true, url: `https://www.facebook.com/profile.php?id=${id}`, handle: id } : { ok: false, code: 'INVALID_URL' };
    }
    const name = url ? segs[0] ?? '' : handle ?? '';
    if (!url && /^\d{5,20}$/.test(name)) return { ok: true, url: `https://www.facebook.com/profile.php?id=${name}`, handle: name };
    if (!/^(?!\d+$)[A-Za-z0-9.]{2,50}$/.test(name)) return { ok: false, code: 'INVALID_URL' };
    return { ok: true, url: `https://www.facebook.com/${name}`, handle: name };
  }

  let h = handle;
  if (url) {
    if (platform === 'TIKTOK' || platform === 'THREADS') h = segs[0]?.startsWith('@') ? segs[0].slice(1) : null;
    else if (platform === 'SNAPCHAT') h = segs[0] === 'add' && segs[1] ? segs[1] : segs[0]?.startsWith('@') ? segs[0].slice(1) : null;
    else h = segs[0] && !(RESERVED[platform] ?? []).includes(segs[0].toLowerCase()) ? segs[0].replace(/^@/, '') : null;
  }
  if (!h || (RESERVED[platform] ?? []).includes(h.toLowerCase()) || !HANDLE_RULES[platform]?.test(h)) {
    return { ok: false, code: 'INVALID_URL' };
  }
  const lower = h.toLowerCase();
  const urls: Record<string, string> = {
    X: `https://x.com/${lower}`,
    INSTAGRAM: `https://www.instagram.com/${lower}/`,
    TIKTOK: `https://www.tiktok.com/@${lower}`,
    GITHUB: `https://github.com/${lower}`,
    THREADS: `https://www.threads.com/@${lower}`,
    SNAPCHAT: `https://www.snapchat.com/add/${lower}`,
    TELEGRAM: `https://t.me/${lower}`,
  };
  return { ok: true, url: urls[platform], handle: platform === 'GITHUB' ? lower : `@${lower}` };
}

/** Only ever render https URLs as links (defence in depth — the server already guarantees it). */
export function isSafeHttpsUrl(value: string | null | undefined): value is string {
  if (!value) return false;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}
