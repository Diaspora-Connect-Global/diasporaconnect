'use client';

import React from 'react';

/**
 * Parses post text and renders:
 * - @mentions in blue
 * - #hashtags in bold
 * - Emoji/plain text as-is
 */
export function renderRichText(text: string): React.ReactNode[] {
  // Regex to match @mentions and #hashtags
  // @mention: starts with @ followed by word characters (letters, digits, underscore)
  // #hashtag: starts with # followed by word characters (letters, digits, underscore)
  const pattern = /([@#][\w]+)/g;

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
      // Mention — render in blue
      parts.push(
        <span key={match.index} className="text-blue-500 cursor-pointer hover:underline">
          {token}
        </span>
      );
    } else if (token.startsWith('#')) {
      // Hashtag — render in bold
      parts.push(
        <span key={match.index} className="font-bold cursor-pointer hover:underline">
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
 * Renders post content with styled @mentions (blue) and #hashtags (bold).
 */
export default function RichText({ text, className = '' }: RichTextProps) {
  return <span className={className}>{renderRichText(text)}</span>;
}
