'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { truncateAtWord } from '@/lib/truncateText';
import { cn } from '@/lib/utils';

/**
 * A description that shows a short preview and reveals the rest on demand.
 *
 * ## Why character-count truncation rather than `line-clamp`
 *
 * `line-clamp-n` hides the overflow but gives you no way to know whether
 * anything was actually hidden, so a "Show more" rendered next to it either
 * appears on text that already fits (a control that does nothing) or needs a
 * `ResizeObserver` measuring scrollHeight against clientHeight — which is a
 * layout read on every resize, is wrong on the server, and flickers on first
 * paint. Counting characters is deterministic, SSR-safe, and lets the toggle
 * exist *only* when there is genuinely more to see.
 *
 * `truncateAtWord` is reused rather than `slice()` so the preview never ends
 * mid-word or half-way through a URL, matching how post bodies already collapse
 * in the feed.
 */
export interface ExpandableTextProps {
  text: string;
  /** Characters shown before the fold. */
  limit?: number;
  /** Typography + colour for the text itself. */
  className?: string;
}

export function ExpandableText({ text, limit = 180, className }: ExpandableTextProps) {
  const t = useTranslations('actions');
  const [expanded, setExpanded] = useState(false);

  const { text: preview, truncated } = truncateAtWord(text, limit);

  return (
    <p className={cn('whitespace-pre-wrap break-words', className)}>
      {expanded || !truncated ? text : `${preview}… `}
      {truncated && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          // `inline` so it flows as the last word of the paragraph rather than
          // dropping to its own line and adding vertical space to a block whose
          // entire purpose is to take up less of it.
          className="label-small inline text-text-brand hover:underline"
        >
          {expanded ? t('showLess') : t('showMore')}
        </button>
      )}
    </p>
  );
}

export default ExpandableText;
