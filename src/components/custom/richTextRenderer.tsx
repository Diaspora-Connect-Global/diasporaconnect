'use client';

import React from 'react';
import { Link } from '@/i18n/navigation';

/** http(s)://… or www.… — trailing punctuation stripped from the link target. */
const URL_IN_TEXT =
  /https?:\/\/[^\s<>'"()[\]{}]+|www\.[^\s<>'"()[\]{}]+/gi;

function stripTrailingUrlPunctuation(href: string): string {
  return href.replace(/[.,;:!?)]+$/g, '');
}

/**
 * Shorten a URL for display while the link still points at the full target.
 * `https://www.example.com/very/long/path?x=1` → `example.com/very/long/…`
 * Mirrors the link chips Facebook/LinkedIn show instead of raw URLs that can
 * dominate a post's layout.
 */
const URL_DISPLAY_MAX = 42;
function shortenUrlForDisplay(url: string): string {
  let label = url.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/$/, '');
  if (label.length > URL_DISPLAY_MAX) {
    label = `${label.slice(0, URL_DISPLAY_MAX - 1)}…`;
  }
  return label;
}

/**
 * Split a plain-text segment into strings and external `<a>` nodes for URLs.
 */
function linkifyPlainSegment(segment: string, keyBase: string): React.ReactNode[] {
  const text = segment.replace(/\u200B/g, '');
  if (!text) return [];

  const out: React.ReactNode[] = [];
  let last = 0;
  let sub = 0;
  URL_IN_TEXT.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = URL_IN_TEXT.exec(text)) !== null) {
    const full = m[0];
    const trimmed = stripTrailingUrlPunctuation(full);
    if (m.index > last) {
      out.push(text.slice(last, m.index));
    }
    if (trimmed.length > 0) {
      const href = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
      out.push(
        <a
          key={`${keyBase}-url-${sub++}`}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          title={trimmed}
          className="text-text-brand underline decoration-text-brand/50 underline-offset-2 break-words hover:opacity-90"
        >
          {shortenUrlForDisplay(trimmed)}
        </a>,
      );
    }
    if (full.length > trimmed.length) {
      out.push(full.slice(trimmed.length));
    }
    last = m.index + full.length;
  }
  if (last < text.length) {
    out.push(text.slice(last));
  }
  return out.length ? out : [text];
}

/**
 * Map from mention tag (without @) → userId.
 * e.g. { "StephenBedzrah": "user-uuid-123" }
 *
 * When provided, @mentions become clickable links to /{userId}.
 * When omitted, @mentions render as styled (non-linked) pills.
 */
export type MentionMap = Record<string, string>;

/**
 * Build a MentionMap from API mention objects, indexing by both handle AND
 * displayName so the lookup succeeds regardless of which form appears in text.
 */
export function buildMentionMap(
  mentions: { handle: string; displayName?: string | null; entityId: string }[],
): MentionMap | undefined {
  if (!mentions.length) return undefined;
  const map: MentionMap = {};
  for (const m of mentions) {
    map[m.handle] = m.entityId;
    if (m.displayName && m.displayName !== m.handle) {
      map[m.displayName] = m.entityId;
    }
  }
  return map;
}

/**
 * True when `text` is only emoji (plus variation selectors / ZWJ / skin-tone
 * modifiers / whitespace) and short (≤ ~3 emoji). Cards use this to render the
 * post body at a larger size — the "jumbo emoji" treatment Facebook/iMessage
 * apply to emoji-only messages.
 */
const EMOJI_ONLY_RE =
  /^[\p{Extended_Pictographic}️‍\u{1F3FB}-\u{1F3FF}\s]+$/u;
export function isShortEmojiOnly(text: string): boolean {
  const t = (text ?? '').trim();
  if (!t) return false;
  if (!EMOJI_ONLY_RE.test(t)) return false;
  // Count code points (excluding whitespace); ~8 covers up to 3 emoji with
  // modifiers/ZWJ sequences without enlarging long emoji walls.
  const codepoints = [...t.replace(/\s/g, '')];
  return codepoints.length > 0 && codepoints.length <= 8;
}

export interface MentionInputItem {
  entityId: string;
  entityType?: string;
  displayName: string;
  startPosition: number;
  endPosition: number;
}

/**
 * Build structured mention inputs (with positions) from text and a MentionMap.
 * Used when sending comments/posts to pass resolved mention data to the backend.
 */
export function buildMentionInputsFromText(
  text: string,
  mentionMap: MentionMap | undefined,
): MentionInputItem[] {
  if (!mentionMap || !text) return [];
  const inputs: MentionInputItem[] = [];
  for (const [displayName, entityId] of Object.entries(mentionMap)) {
    const pattern = `@${displayName}`;
    let idx = text.indexOf(pattern);
    while (idx !== -1) {
      inputs.push({ entityId, entityType: 'USER', displayName, startPosition: idx, endPosition: idx + pattern.length });
      idx = text.indexOf(pattern, idx + 1);
    }
  }
  return inputs;
}

/**
 * Parses post text and renders:
 * - http(s):// and www. URLs as external links (opens new tab)
 * - @mentions as brand-styled links (with profile navigation when mentionMap is provided)
 * - #hashtags in bold with brand color
 * - Emoji/plain text as-is
 *
 * @param text - The raw post text
 * @param mentionMap - Optional map of mention tag → userId for making mentions clickable links
 * @param compactLayout - If true, no padding on mentions/hashtags so layout matches plain text (for textarea overlay alignment)
 */
export function renderRichText(
  text: string,
  mentionMap?: MentionMap,
  compactLayout?: boolean,
  onMentionClick?: (name: string) => void,
): React.ReactNode[] {
  // Match @MentionName followed by zero-width space or space/end
  // The zero-width space (\u200B) marks the end of a completed mention
  const pattern = /((?:@[\w\s-]+(?=\u200B|\s|$))|(?:#[\w]+))/g;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  // When compactLayout, use no padding so character positions match textarea (cursor alignment)
  const mentionClass = compactLayout
    ? 'text-text-brand font-semibold cursor-default'
    : 'text-text-brand font-semibold bg-surface-brand-subtle px-1 py-0.5 rounded cursor-default';
  const linkClass = compactLayout
    ? 'inline text-text-brand font-semibold no-underline cursor-pointer'
    : 'inline text-text-brand font-semibold bg-surface-brand-subtle px-1 py-0.5 rounded hover:bg-surface-brand-subtle/80 transition-colors no-underline cursor-pointer';

  while ((match = pattern.exec(text)) !== null) {
    // Add text before the match (with URL autolink)
    if (match.index > lastIndex) {
      parts.push(...linkifyPlainSegment(text.slice(lastIndex, match.index), `pre-${lastIndex}`));
    }

    const token = match[1];
    if (token.startsWith('@')) {
      const tag = token.slice(1).trim(); // strip @ and trim
      const userId = mentionMap?.[tag];

      const displayName = token.slice(1); // strip leading @
      if (userId) {
        parts.push(
          <Link
            key={match.index}
            href={`/${userId}`}
            className={linkClass}
          >
            {displayName}
          </Link>,
        );
      } else if (onMentionClick) {
        parts.push(
          <span
            key={match.index}
            className={linkClass}
            onClick={(e) => { e.stopPropagation(); onMentionClick(tag); }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onMentionClick(tag); } }}
          >
            {displayName}
          </span>,
        );
      } else {
        parts.push(
          <span
            key={match.index}
            className={mentionClass}
          >
            {displayName}
          </span>,
        );
      }
    } else if (token.startsWith('#')) {
      // Hashtag — link to feed filtered by this tag (tag without #)
      const tagSlug = token.slice(1);
      parts.push(
        <Link
          key={match.index}
          href={`/feed?hashtag=${encodeURIComponent(tagSlug)}`}
          className="font-bold text-text-brand hover:underline no-underline"
        >
          {token}
        </Link>,
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // Remaining text after last @/# token (with URL autolink)
  if (lastIndex < text.length) {
    parts.push(...linkifyPlainSegment(text.slice(lastIndex), `tail-${lastIndex}`));
  }

  return parts;
}

interface RichTextProps {
  text: string;
  mentionMap?: MentionMap;
  className?: string;
}

/**
 * Component wrapper for renderRichText.
 * Renders post content with clickable URLs, styled @mentions (brand pill, optionally linked), and #hashtags (bold).
 */
export default function RichText({ text, mentionMap, className = '' }: RichTextProps) {
  return <span className={className}>{renderRichText(text, mentionMap)}</span>;
}
