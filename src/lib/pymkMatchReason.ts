/**
 * PYMK match-reason copy ladder.
 *
 * Shared between `FriendListModal` (Suggested tab) and the home-page
 * `PeopleYouMayKnow` widget so the wording stays consistent across
 * surfaces. The recommender returns:
 *  - `mutualConnectionNames` (first 2-3 names) + `mutualConnectionCount`
 *    (full length, used for the "+ N more" suffix).
 *  - `sharedCommunityNames` (first 1-2 communities).
 *  - `matchReason` — a single retriever-source tag.
 *
 * The ladder picks the first non-empty signal in priority order. If
 * everything is empty we return `''` and the caller decides whether to
 * show a generic fallback or nothing at all.
 */
export interface PymkMatchReasonInput {
  mutualConnectionNames?: string[] | null;
  mutualConnectionCount?: number | null;
  sharedCommunityNames?: string[] | null;
  matchReason?: string | null;
}

export function pymkMatchReason(input: PymkMatchReasonInput): string {
  const mutualNames = input.mutualConnectionNames ?? [];
  const mutualCount = input.mutualConnectionCount ?? mutualNames.length;
  const communityNames = input.sharedCommunityNames ?? [];
  const reason = (input.matchReason ?? '').trim();

  // 1. Mutual connections — LinkedIn-style "You both know X, Y + 3 more".
  if (mutualNames.length > 0) {
    const lead = mutualNames[0];
    const second = mutualNames[1] ? `, ${mutualNames[1]}` : '';
    const extra = mutualCount > 2 ? ` + ${mutualCount - 2} more` : '';
    return `You both know ${lead}${second}${extra}`;
  }

  // 2. Shared communities / associations — "Also in X, Y".
  if (communityNames.length > 0) {
    const lead = communityNames[0];
    const second = communityNames[1] ? `, ${communityNames[1]}` : '';
    return `Also in ${lead}${second}`;
  }

  // 3-6. Retriever-source tag fallbacks.
  switch (reason) {
    case 'diaspora_pair':
      return 'Same diaspora community';
    case 'same_city':
      return 'Lives in your city';
    case 'engaged_my_content':
      return 'Engaged with your posts';
    case 'i_engaged_their_content':
      return 'You engaged with their posts';
    default:
      return '';
  }
}
