import type { NetworkingCard, NetworkingTier, ProfileFields } from '@/services/gql/networking';

/**
 * "Why you match", as sentences.
 *
 * The gateway sends reason CODES (OFFERS_WHAT_YOU_NEED, ...). The codes alone
 * carry no detail, so the detail is rebuilt here from the two profiles the
 * viewer is already allowed to see: their own and the card. A reason whose
 * overlap can no longer be found is rendered with its generic sentence rather
 * than dropped, and an unknown code is ignored (never shown raw).
 */

export type ReasonCode =
  | 'OFFERS_WHAT_YOU_NEED'
  | 'NEEDS_WHAT_YOU_OFFER'
  | 'RELATED_CAPABILITY'
  | 'SHARED_INTEREST'
  | 'SHARED_INDUSTRY'
  | 'SHARED_MARKET'
  | 'SHARED_LANGUAGE'
  | 'COMPATIBLE_FORMAT'
  | 'AVAILABILITY_OVERLAP';

export interface ReasonSentence {
  code: ReasonCode;
  /** Message key under `networking.reasons`. */
  key: string;
  /** Taxonomy codes the sentence is about (empty for a generic sentence). */
  codes: string[];
}

const KNOWN: ReadonlySet<string> = new Set<ReasonCode>([
  'OFFERS_WHAT_YOU_NEED',
  'NEEDS_WHAT_YOU_OFFER',
  'RELATED_CAPABILITY',
  'SHARED_INTEREST',
  'SHARED_INDUSTRY',
  'SHARED_MARKET',
  'SHARED_LANGUAGE',
  'COMPATIBLE_FORMAT',
  'AVAILABILITY_OVERLAP',
]);

const inter = (a: string[], b: string[]) => a.filter((x) => b.includes(x));

function detail(code: ReasonCode, card: NetworkingCard, me: ProfileFields | null): string[] {
  if (!me) return [];
  switch (code) {
    case 'OFFERS_WHAT_YOU_NEED':
      return inter(card.offers, me.needs);
    case 'NEEDS_WHAT_YOU_OFFER':
      return inter(card.needs, me.offers);
    case 'RELATED_CAPABILITY':
      return [...card.offers, ...card.needs].filter((c) => !me.needs.includes(c) && !me.offers.includes(c)).slice(0, 3);
    case 'SHARED_INTEREST':
      return inter(card.interests, me.interests);
    case 'SHARED_INDUSTRY':
      return inter(card.industries, me.industries);
    case 'SHARED_MARKET':
      return inter(card.markets, me.markets);
    case 'SHARED_LANGUAGE':
      return inter(card.languages, me.languages);
    default:
      return [];
  }
}

export function reasonSentences(card: NetworkingCard, me: ProfileFields | null, max = 4): ReasonSentence[] {
  const out: ReasonSentence[] = [];
  for (const raw of card.reasons ?? []) {
    if (!KNOWN.has(raw)) continue;
    const code = raw as ReasonCode;
    const codes = detail(code, card, me).slice(0, 3);
    out.push({ code, key: codes.length > 0 ? code : `${code}_GENERIC`, codes });
    if (out.length >= max) break;
  }
  return out;
}

export const TIER_ORDER: NetworkingTier[] = ['DIRECT_OPPORTUNITY', 'STRONG_FIT', 'SHARED_INTERESTS', 'BROADER_COMPATIBILITY'];

/** Shared interests chips for the big card: every overlap the viewer can see, interests first. */
export function sharedCodes(card: NetworkingCard, me: ProfileFields | null): string[] {
  if (!me) return [];
  const all = [
    ...inter(card.interests, me.interests),
    ...inter(card.industries, me.industries),
    ...inter(card.markets, me.markets),
    ...inter(card.roles, me.roles),
  ];
  return Array.from(new Set(all));
}
