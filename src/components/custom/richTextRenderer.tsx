'use client';

import React from 'react';
import Link from 'next/link';

/**
 * Map from mention tag (without @) → userId.
 * e.g. { "StephenBedzrah": "user-uuid-123" }
 *
 * When provided, @mentions become clickable links to /{userId}.
 * When omitted, @mentions render as styled (non-linked) pills.
 */
export type MentionMap = Record<string, string>;

/**
 * Parses post text and renders:
 * - @mentions as LinkedIn-style blue links (with profile navigation when mentionMap is provided)
 * - #hashtags in bold with brand color
 * - Emoji/plain text as-is
 *
 * @param text - The raw post text
 * @param mentionMap - Optional map of mention tag → userId for making mentions clickable links
 */
export function renderRichText(
  text: string,
  mentionMap?: MentionMap,
): React.ReactNode[] {
  // Match @MentionName followed by zero-width space or space/end
  // The zero-width space (\u200B) marks the end of a completed mention
  const pattern = /((?:@[\w\s-]+(?=\u200B|\s|$))|(?:#[\w]+))/g;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const token = match[1];
    if (token.startsWith('@')) {
      const tag = token.slice(1).trim(); // strip @ and trim
      const userId = mentionMap?.[tag];

      if (userId) {
        // Linked mention — navigates to the user's profile
        parts.push(
          <Link
            key={match.index}
            href={`/${userId}`}
            className="inline text-blue-600 dark:text-blue-400 font-semibold bg-blue-50 dark:bg-blue-500/10 px-1 py-0.5 rounded hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors no-underline"
          >
            {token}
          </Link>,
        );
      } else {
        // Unlinked mention — styled pill without navigation
        parts.push(
          <span
            key={match.index}
            className="text-blue-600 dark:text-blue-400 font-semibold bg-blue-50 dark:bg-blue-500/10 px-1 py-0.5 rounded cursor-default"
          >
            {token}
          </span>,
        );
      }
    } else if (token.startsWith('#')) {
      // Hashtag — bold with brand-ish color
      parts.push(
        <span
          key={match.index}
          className="font-bold text-text-brand cursor-pointer hover:underline"
        >
          {token}
        </span>,
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text (filter out zero-width spaces for display)
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex).replace(/\u200B/g, ''));
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
 * Renders post content with styled @mentions (blue pill, optionally linked) and #hashtags (bold).
 */
export default function RichText({ text, mentionMap, className = '' }: RichTextProps) {
  return <span className={className}>{renderRichText(text, mentionMap)}</span>;
}
