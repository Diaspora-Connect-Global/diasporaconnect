/**
 * Pure helpers behind the group-chat Daily Summary card. No React here, so the
 * logic is unit-testable on its own (see e2e/chat/daily-summary.spec.ts).
 */

/** The digest pieces the card renders when it has no topic bulletins. */
export interface ParsedDigest {
    /** YYYY-MM-DD, or null when the body carried no dated header. */
    digestDate: string | null;
    overview: string;
    keyPoints: string[];
    actionItems: string[];
    messageCount: number | null;
}

const HEADER_RE = /^daily summary\s*[·•:-]\s*(\d{4}-\d{2}-\d{2})\s*$/i;
const FOOTER_RE = /^\(based on (\d+) messages?\.?\)$/i;
const ACTIONS_RE = /^action items\s*:?$/i;
const BULLET_RE = /^[-*•]\s+(.*)$/;

/**
 * Parse the plain-text body of the digest SYSTEM message the backend posts
 * into the group:
 *
 *   Daily summary · 2026-09-24
 *   <overview>
 *   - <key point>
 *   Action items:
 *   - <action item>
 *   (Based on 12 messages.)
 *
 * Returns null when the text is not in that shape, so the caller renders it
 * verbatim instead of guessing. The English header/footer are recognised and
 * dropped: the card renders its own translated equivalents.
 */
export function parseDigestBody(content: string | null | undefined): ParsedDigest | null {
    if (typeof content !== 'string') return null;
    const lines = content
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
    if (lines.length === 0) return null;

    const header = HEADER_RE.exec(lines[0]);
    if (!header) return null;

    const out: ParsedDigest = {
        digestDate: header[1],
        overview: '',
        keyPoints: [],
        actionItems: [],
        messageCount: null,
    };
    const overview: string[] = [];
    let inActions = false;

    for (const line of lines.slice(1)) {
        const footer = FOOTER_RE.exec(line);
        if (footer) {
            out.messageCount = Number(footer[1]);
            continue;
        }
        if (ACTIONS_RE.test(line)) {
            inActions = true;
            continue;
        }
        const bullet = BULLET_RE.exec(line);
        if (bullet) {
            const item = bullet[1].trim();
            if (item) (inActions ? out.actionItems : out.keyPoints).push(item);
            continue;
        }
        overview.push(line);
    }
    out.overview = overview.join('\n');
    return out;
}

/** The minimum a message needs for jump resolution. */
export interface JumpableMessage {
    id: string;
    replyToId?: string | null;
}

export interface JumpResolution {
    /** Message to scroll to (a main-thread message), or null if none is loaded. */
    targetId: string | null;
    /** Every loaded main-thread message to highlight. */
    highlightIds: string[];
    /** Referenced ids not present in what is loaded. */
    missingIds: string[];
}

/**
 * Map a topic's referenced message ids onto what the thread actually renders.
 *
 * Replies are not rendered in the main thread (they live in the replies side
 * panel), so a referenced reply resolves to its parent. The jump target is the
 * first referenced id (they are chronological) that resolves; highlights are
 * de-duplicated and keep that order.
 */
export function resolveJumpTargets(
    referencedIds: readonly string[],
    loaded: readonly JumpableMessage[],
): JumpResolution {
    const byId = new Map(loaded.map((m) => [m.id, m]));
    const highlight: string[] = [];
    const seen = new Set<string>();
    const missing: string[] = [];

    for (const id of referencedIds) {
        const msg = byId.get(id);
        if (!msg) {
            missing.push(id);
            continue;
        }
        // One hop is enough: replies to replies are not a thing in this UI.
        const mainId = msg.replyToId && byId.has(msg.replyToId) ? msg.replyToId : msg.replyToId ? null : msg.id;
        if (!mainId) {
            missing.push(id);
            continue;
        }
        if (!seen.has(mainId)) {
            seen.add(mainId);
            highlight.push(mainId);
        }
    }

    return { targetId: highlight[0] ?? null, highlightIds: highlight, missingIds: missing };
}

/**
 * Locale-formatted digest day. The date is a calendar day (UTC digest day), so
 * it is formatted in UTC — formatting it in the viewer's zone would show the
 * previous day for everyone west of Greenwich.
 */
export function formatDigestDate(digestDate: string | null | undefined, locale: string): string {
    if (!digestDate || !/^\d{4}-\d{2}-\d{2}$/.test(digestDate)) return digestDate ?? '';
    const d = new Date(`${digestDate}T00:00:00Z`);
    if (Number.isNaN(d.getTime())) return digestDate;
    try {
        return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(d);
    } catch {
        return digestDate;
    }
}
