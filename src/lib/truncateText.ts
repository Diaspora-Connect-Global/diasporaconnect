/**
 * Smart, word-boundary-aware truncation for post/comment text.
 *
 * Plain `text.slice(0, n)` cuts mid-word and — worse for rich text — can slice
 * through a `@mention`, `#hashtag`, or URL token, leaving a broken half-link
 * that the rich-text renderer then mis-parses. This backs the cut up to the
 * nearest safe boundary so the visible (collapsed) text always ends on a whole
 * token. Mirrors Facebook/LinkedIn "See more": the collapsed preview never
 * shows a half-word.
 */

const DEFAULT_LIMIT = 200;
/** Don't back up past this fraction of the limit, or short posts lose too much. */
const MIN_KEEP_RATIO = 0.6;

/** True if the character can appear inside a token we must not split. */
function isTokenChar(ch: string): boolean {
  // word chars, plus the glue that holds mentions/hashtags/URLs together
  return /[\w@#./:?&=%~+\-​]/.test(ch);
}

export interface TruncateResult {
  text: string;
  truncated: boolean;
}

/**
 * Truncate `input` to roughly `limit` characters, backing up to the last
 * whitespace so no word/mention/hashtag/URL token is cut in half.
 *
 * @returns the (possibly shortened) text and whether truncation occurred.
 *          The caller appends its own ellipsis / "Show more" affordance.
 */
export function truncateAtWord(input: string, limit: number = DEFAULT_LIMIT): TruncateResult {
  const text = input ?? '';
  if (text.length <= limit) return { text, truncated: false };

  let end = limit;

  // If we'd cut inside a token, walk back to the boundary before it.
  if (isTokenChar(text[end] ?? '') && isTokenChar(text[end - 1] ?? '')) {
    let i = end;
    while (i > 0 && isTokenChar(text[i - 1]!)) i--;
    end = i;
  }

  // Prefer the last whitespace so we end on a clean word boundary.
  const lastSpace = text.lastIndexOf(' ', end);
  const lastNewline = text.lastIndexOf('\n', end);
  const boundary = Math.max(lastSpace, lastNewline);
  if (boundary >= Math.floor(limit * MIN_KEEP_RATIO)) {
    end = boundary;
  }

  return { text: text.slice(0, end).trimEnd(), truncated: true };
}
