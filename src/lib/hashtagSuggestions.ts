/**
 * Pure helpers behind the composer's #hashtag suggestions.
 *
 * A tag is what post-feed-service extracts from a post body: `#` followed by
 * 1–100 ASCII letters, digits or underscores (`hashtag-extraction.domain-service.ts`).
 * Suggesting anything else would offer a tag the backend then silently drops.
 */

const TAG_BODY = /^[A-Za-z0-9_]{1,100}$/;
const TAG_CHAR = /[A-Za-z0-9_]/;

/** Trending tags as the gateway returns them → unique, valid, without the leading '#'. */
export function normaliseHashtagPool(tags: ReadonlyArray<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const pool: string[] = [];
  for (const raw of tags) {
    const tag = (raw ?? '').trim().replace(/^#+/, '');
    if (!TAG_BODY.test(tag)) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    pool.push(tag);
  }
  return pool;
}

/** Tags starting with what was typed first, then tags merely containing it; case-insensitive. */
export function filterHashtagSuggestions(pool: readonly string[], query: string, limit = 6): string[] {
  const q = query.toLowerCase();
  if (!q) return pool.slice(0, limit);
  const starts: string[] = [];
  const contains: string[] = [];
  for (const tag of pool) {
    const t = tag.toLowerCase();
    if (t.startsWith(q)) starts.push(tag);
    else if (t.includes(q)) contains.push(tag);
  }
  return [...starts, ...contains].slice(0, limit);
}

/**
 * The `#` the caret is currently completing, if any: it must open a word (start of text
 * or after whitespace) and everything between it and the caret must be tag characters.
 */
export function findHashtagTrigger(text: string, cursor: number): { start: number; query: string } | null {
  let i = cursor - 1;
  while (i >= 0 && TAG_CHAR.test(text[i])) i--;
  if (i < 0 || text[i] !== '#') return null;
  if (i > 0 && !/\s/.test(text[i - 1])) return null;
  const query = text.slice(i + 1, cursor);
  if (query.length > 100) return null;
  return { start: i, query };
}
