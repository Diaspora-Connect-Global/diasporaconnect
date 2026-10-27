/**
 * Where a post draft lives in this browser. Drafts are per signed-in user so that on a
 * shared computer nobody opens the composer to find someone else's half-written post
 * (or their photos). The user id never appears in a key: it is hashed first.
 */

export const DRAFT_KEY_PREFIX = 'cpd:v2:';
export const DRAFT_DB_NAME = 'diaspora-cpd-v2';
/** Pre-2026-10-27 storage: one draft for the whole browser, whoever wrote it. */
export const LEGACY_DRAFT_KEYS = ['cpd_text', 'cpd_visibility'] as const;
export const LEGACY_DRAFT_DB_NAME = 'diaspora-cpd';

/** FNV-1a (32-bit) of the user id, base 36 — stable, short, not reversible to the id at a glance. */
export function draftOwnerKey(userId: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < userId.length; i++) {
    h ^= userId.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

export function draftMetaKey(owner: string): string {
  return `${DRAFT_KEY_PREFIX}${owner}`;
}

/** IndexedDB keys of one owner's files sort together: `${owner}:${attachmentId}`. */
export function draftFileKey(owner: string, attachmentId: string): string {
  return `${owner}:${attachmentId}`;
}

export function draftFileRange(owner: string): { lower: string; upper: string } {
  return { lower: `${owner}:`, upper: `${owner}:￿` };
}
