import type { NetworkingTaxonomyKind, TaxonomyItem } from '@/services/gql/networking';

/**
 * Taxonomy codes look like `capability.market_access`. The gateway hands back a
 * `labelKey` for each, but a CAPABILITY label has separate `.need` / `.offer`
 * keys that cannot nest beside the plain one in a message file, so labels are
 * resolved by CODE under `networking.tax.<code with "." → "_">` instead.
 * A code with no translation falls back to a humanised form of itself, so a
 * code added to the backend later still renders as something readable.
 */

export const KIND_BY_PREFIX: Record<string, NetworkingTaxonomyKind> = {
  role: 'ROLE',
  interest: 'INTEREST',
  capability: 'CAPABILITY',
  industry: 'INDUSTRY',
  market: 'MARKET',
  language: 'LANGUAGE',
};

export function taxonomyMessageKey(code: string): string {
  return `tax.${code.replace('.', '_')}`;
}

export function humanizeCode(code: string): string {
  const tail = code.includes('.') ? code.slice(code.indexOf('.') + 1) : code;
  const words = tail.replace(/_/g, ' ').trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : code;
}

export type LabelFn = (code: string) => string;

/**
 * Build a label function from a next-intl translator scoped to `networking`.
 * Languages use the browser's own language names (22 languages x 5 locales
 * would otherwise be hand-translated twice over).
 */
export function makeLabeler(
  t: { (key: string): string; has: (key: string) => boolean },
  locale: string,
): LabelFn {
  let names: Intl.DisplayNames | null = null;
  try {
    names = new Intl.DisplayNames([locale], { type: 'language' });
  } catch {
    names = null;
  }
  return (code: string) => {
    if (code.startsWith('language.')) {
      const iso = code.slice('language.'.length);
      try {
        const n = names?.of(iso);
        if (n && n !== iso) return n.charAt(0).toUpperCase() + n.slice(1);
      } catch {
        /* fall through */
      }
      return iso.toUpperCase();
    }
    const key = taxonomyMessageKey(code);
    return t.has(key) ? t(key) : humanizeCode(code);
  };
}

export function itemsOfKind(items: TaxonomyItem[], kind: NetworkingTaxonomyKind): TaxonomyItem[] {
  return items
    .filter((i) => (i.kind ?? KIND_BY_PREFIX[i.code.split('.')[0]]) === kind)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

/** Drop codes the active taxonomy no longer knows (stale drafts must not send them back). */
export function keepKnown(codes: string[], items: TaxonomyItem[]): string[] {
  const known = new Set(items.map((i) => i.code));
  return codes.filter((c) => known.has(c));
}
