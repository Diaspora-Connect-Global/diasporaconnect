import { useCallback } from 'react';
import { useLocale } from 'next-intl';
import { ALPHA3_TO_ALPHA2 } from '@/lib/countryTimezone';

/**
 * Country values reach the web as ISO 3166 codes in both forms (password signup stores alpha-3,
 * OAuth stores alpha-2). This is the one place that turns them into a name for display.
 * Display only: never use the result as a stored or submitted value.
 */

// Alpha-3 codes missing from the shared table that Intl.DisplayNames can still name.
const EXTRA_ALPHA3: Record<string, string> = {
  ATG: 'AG', DMA: 'DM', GRD: 'GD', HKG: 'HK', KNA: 'KN', MAC: 'MO', MCO: 'MC', MHL: 'MH',
  PRK: 'KP', PRI: 'PR', VAT: 'VA', COK: 'CK', NIU: 'NU', PYF: 'PF', NCL: 'NC', GRL: 'GL',
  GIB: 'GI', GUM: 'GU', REU: 'RE', MTQ: 'MQ', GLP: 'GP', GUF: 'GF', MYT: 'YT', ESH: 'EH',
  SJM: 'SJ', BMU: 'BM', CYM: 'KY', VGB: 'VG', ABW: 'AW', CUW: 'CW', SXM: 'SX', MSR: 'MS',
  FLK: 'FK', FRO: 'FO', IMN: 'IM', JEY: 'JE', GGY: 'GG', ALA: 'AX', ASM: 'AS', AIA: 'AI',
};

const displayNames = new Map<string, Intl.DisplayNames | null>();

function namesFor(locale: string): Intl.DisplayNames | null {
  if (displayNames.has(locale)) return displayNames.get(locale) ?? null;
  let instance: Intl.DisplayNames | null = null;
  try {
    instance = new Intl.DisplayNames([locale], { type: 'region' });
  } catch {
    try {
      instance = new Intl.DisplayNames(['en'], { type: 'region' });
    } catch {
      instance = null;
    }
  }
  displayNames.set(locale, instance);
  return instance;
}

/** Name of an ISO 3166 alpha-2 / alpha-3 code in `locale`. Anything else (a name, an unknown code) is returned as given. */
export function countryName(code: string | null | undefined, locale = 'en'): string {
  const raw = (code ?? '').trim();
  if (!raw) return '';
  let alpha2: string | undefined;
  if (/^[A-Za-z]{2}$/.test(raw)) alpha2 = raw.toUpperCase();
  else if (/^[A-Za-z]{3}$/.test(raw)) {
    const up = raw.toUpperCase();
    alpha2 = ALPHA3_TO_ALPHA2[up] ?? EXTRA_ALPHA3[up];
  }
  if (!alpha2 || alpha2 === 'ZZ') return raw; // ZZ is Intl's "Unknown Region", not a country
  try {
    const name = namesFor(locale)?.of(alpha2);
    // Intl echoes the code back for a region it does not know.
    return name && name !== alpha2 ? name : raw;
  } catch {
    return raw;
  }
}

/**
 * A "City, Country" string from the backend can end in a raw ISO code: user-service joins
 * `[city, residenceCountry]`, so a friend request reads "Accra, GHA". Each comma-separated part
 * that IS a code (all capitals, 2–3 letters) becomes its name; every other part stays as typed,
 * so a city such as "Bo" is never turned into Bolivia.
 */
export function locationWithCountryNames(location: string | null | undefined, locale = 'en'): string {
  const raw = (location ?? '').trim();
  if (!raw) return '';
  return raw
    .split(',')
    .map((part) => {
      const p = part.trim();
      return /^[A-Z]{2,3}$/.test(p) ? countryName(p, locale) : p;
    })
    .filter(Boolean)
    .join(', ');
}

/** `(code) => name` bound to the viewer's next-intl locale. */
export function useCountryName(): (code: string | null | undefined) => string {
  const locale = useLocale();
  return useCallback((code) => countryName(code, locale), [locale]);
}

/** `(location) => location with country names` bound to the viewer's next-intl locale. */
export function useLocationWithCountryNames(): (location: string | null | undefined) => string {
  const locale = useLocale();
  return useCallback((location) => locationWithCountryNames(location, locale), [locale]);
}
