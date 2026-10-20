/**
 * "A post may not be empty": visible text or at least one attachment.
 * Mirrors the server rule (post-feed-service `post-content.ts`), which is
 * authoritative; this only gives instant feedback.
 *
 * Not content: whitespace, zero-width / invisible formatting characters, and
 * empty markup (`<p></p>`, `&nbsp;`). A written mention (`@maria`) is content.
 */
const INVISIBLE =
  /[­͏؜ᅟᅠ឴឵᠋-᠎​-‏‪-‮⁠-⁯ㅤ︀-️﻿ﾠ]/g;
const MARKUP = /<[^>]*>|&nbsp;|&#160;|&#xA0;/gi;

export const POST_EMPTY_CODE = 'POST_EMPTY';

export function hasMeaningfulPostText(text: string | null | undefined): boolean {
  if (typeof text !== 'string' || text.length === 0) return false;
  return text.replace(MARKUP, '').replace(INVISIBLE, '').trim().length > 0;
}

/** True when a post may be submitted: meaningful text OR at least one attachment. */
export function canSubmitPost(text: string | null | undefined, attachmentCount: number): boolean {
  return hasMeaningfulPostText(text) || attachmentCount > 0;
}

/**
 * True when a mutation result (errorPolicy 'all' resolves with the error) or a
 * thrown Apollo error carries the server's `POST_EMPTY` refusal.
 */
export function isPostEmptyRefusal(resultOrError: unknown): boolean {
  const r = resultOrError as any;
  const lists = [
    r?.error?.errors,
    r?.errors,
    r?.graphQLErrors,
    r?.error?.graphQLErrors,
    r?.cause?.errors,
  ];
  for (const list of lists) {
    if (Array.isArray(list) && list.some((e) => e?.extensions?.code === POST_EMPTY_CODE || e?.code === POST_EMPTY_CODE)) {
      return true;
    }
  }
  return false;
}
