'use client';

import React from 'react';

/**
 * Parses post text and renders:
 * - @mentions as LinkedIn-style blue links with subtle background
 * - #hashtags in bold with brand color
 * - Emoji/plain text as-is
 */
export function renderRichText(text: string): React.ReactNode[] {
  // Match @MentionName (one or more word chars — handles names like @StephenBedzrah)
  // Match #HashtagWord (one or more word chars)
  const pattern = /((?:@[\w]+(?:\s[\w]+)?)|(?:#[\w]+))/g;

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
      // Mention — LinkedIn-style: blue text with subtle blue background pill
      parts.push(
        <span
          key={match.index}
          className="text-blue-600 dark:text-blue-400 font-semibold bg-blue-50 dark:bg-blue-500/10 px-1 py-0.5 rounded cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors"
        >
          {token}
        </span>
      );
    } else if (token.startsWith('#')) {
      // Hashtag — bold with brand-ish color
      parts.push(
        <span
          key={match.index}
          className="font-bold text-text-brand cursor-pointer hover:underline"
        >
          {token}
        </span>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

interface RichTextProps {
  text: string;
  className?: string;
}

/**
 * Component wrapper for renderRichText.
 * Renders post content with styled @mentions (blue pill) and #hashtags (bold).
 */
export default function RichText({ text, className = '' }: RichTextProps) {
  return <span className={className}>{renderRichText(text)}</span>;
}
