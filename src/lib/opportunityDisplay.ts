/**
 * Display rules for an opportunity, shared by its page and cards. Pure functions
 * (no React), so they are unit-tested in e2e/lib.
 */

const LOOKS_LIKE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-|^[0-9a-f]{16,}$/i;

/** The poster's name as given, or null when there is none or it is an id (ids are never shown). */
export function readableOwnerName(name?: string | null): string | null {
  const n = name?.trim();
  return n && !LOOKS_LIKE_ID.test(n) ? n : null;
}

/**
 * The application link, only when it is http(s). `externalLink` is typed by the
 * poster, and a `javascript:` or `data:` URL must never become a link or a
 * window.open target.
 */
export function safeExternalUrl(raw?: string | null): string | null {
  const v = raw?.trim();
  if (!v) return null;
  try {
    const url = new URL(v);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}

/**
 * The application email, only when it is a plain address. It is typed by the
 * poster and becomes a `mailto:` link, so `a@b.com?bcc=x@y.com` would silently
 * copy someone else on the applicant's message.
 */
export function safeEmail(raw?: string | null): string | null {
  const v = raw?.trim();
  return v && /^[^\s@?&#%,;:<>()]+@[^\s@?&#%,;:<>()]+\.[^\s@?&#%,;:<>()]+$/.test(v) ? v : null;
}

/** The host to name next to "Apply on website", without a leading `www.`. */
export function externalHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

export const toDate = (iso?: string | null): Date | null => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
};

const DAY = 86_400_000;
/** "Closing soon" = this many days or fewer left. */
export const CLOSING_SOON_DAYS = 7;

/** Whole days from now until the deadline (0 = it ends today, negative = it has passed). */
export function daysUntil(deadline: Date, now: Date): number {
  if (deadline.getTime() < now.getTime()) return -1;
  return Math.floor((deadline.getTime() - now.getTime()) / DAY);
}

export type OpportunityPhase = 'open' | 'closingSoon' | 'closed';

/**
 * Whether people can still apply: closed when the poster closed it (or it was
 * archived) or the deadline has passed; "closing soon" in its last week.
 */
export function opportunityPhase(o: { status?: string | null; closedAt?: string | null; deadline?: string | null }, now: Date): OpportunityPhase {
  const status = (o.status ?? '').toUpperCase();
  if (status === 'CLOSED' || status === 'ARCHIVED' || toDate(o.closedAt)) return 'closed';
  const deadline = toDate(o.deadline);
  if (!deadline) return 'open';
  const days = daysUntil(deadline, now);
  if (days < 0) return 'closed';
  return days <= CLOSING_SOON_DAYS ? 'closingSoon' : 'open';
}

/** Text worth its own "About" block: the description, unless it says nothing beyond the title. */
export function aboutText(title?: string | null, description?: string | null): string | null {
  const d = description?.trim();
  if (!d) return null;
  const norm = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();
  return norm(d) === norm(title ?? '') && d.length <= 120 ? null : d;
}
