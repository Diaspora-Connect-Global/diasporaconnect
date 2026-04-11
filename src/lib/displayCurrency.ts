const SUPPORTED_DISPLAY_CURRENCIES = ['GHS', 'USD', 'EUR', 'GBP'] as const;

type SupportedDisplayCurrency = (typeof SUPPORTED_DISPLAY_CURRENCIES)[number];

const EURO_COUNTRY_CODES = new Set([
  'AT', 'BE', 'CY', 'DE', 'EE', 'ES', 'FI', 'FR', 'GR', 'HR', 'IE',
  'IT', 'LT', 'LU', 'LV', 'MT', 'NL', 'PT', 'SI', 'SK',
]);

const CURRENCY_BY_COUNTRY: Record<string, SupportedDisplayCurrency> = {
  GH: 'GHS',
  US: 'USD',
  GB: 'GBP',
};

const CURRENCY_BY_LANGUAGE: Record<string, SupportedDisplayCurrency> = {
  fr: 'EUR',
  de: 'EUR',
  it: 'EUR',
  es: 'EUR',
  pt: 'EUR',
};

const COUNTRY_NAME_TO_CODE: Array<{ keywords: string[]; code: string }> = [
  { keywords: ['ghana'], code: 'GH' },
  { keywords: ['united states', 'usa', 'us', 'america'], code: 'US' },
  { keywords: ['united kingdom', 'uk', 'great britain', 'britain', 'england', 'scotland', 'wales'], code: 'GB' },
  { keywords: ['france'], code: 'FR' },
  { keywords: ['germany', 'deutschland'], code: 'DE' },
  { keywords: ['italy', 'italia'], code: 'IT' },
  { keywords: ['spain', 'espana'], code: 'ES' },
  { keywords: ['netherlands', 'holland'], code: 'NL' },
  { keywords: ['belgium'], code: 'BE' },
  { keywords: ['austria'], code: 'AT' },
  { keywords: ['portugal'], code: 'PT' },
  { keywords: ['ireland'], code: 'IE' },
  { keywords: ['greece'], code: 'GR' },
  { keywords: ['finland'], code: 'FI' },
  { keywords: ['luxembourg'], code: 'LU' },
  { keywords: ['slovakia'], code: 'SK' },
  { keywords: ['slovenia'], code: 'SI' },
  { keywords: ['latvia'], code: 'LV' },
  { keywords: ['lithuania'], code: 'LT' },
  { keywords: ['estonia'], code: 'EE' },
  { keywords: ['cyprus'], code: 'CY' },
  { keywords: ['malta'], code: 'MT' },
  { keywords: ['croatia'], code: 'HR' },
];

function normalizeCurrencyInput(raw?: string | null): SupportedDisplayCurrency | null {
  if (!raw) return null;
  const value = raw.trim().toUpperCase();

  if (SUPPORTED_DISPLAY_CURRENCIES.includes(value as SupportedDisplayCurrency)) {
    return value as SupportedDisplayCurrency;
  }

  const compact = raw.trim().toLowerCase().replace(/\s+/g, ' ');
  if (compact === 'cedis' || compact === 'cedi' || compact === 'ghana cedis') return 'GHS';
  if (compact === 'dollar' || compact === 'dollars' || compact === 'usd' || compact === 'us dollar') return 'USD';
  if (compact === 'euro' || compact === 'euros' || compact === 'eur') return 'EUR';
  if (compact === 'pound' || compact === 'pounds' || compact === 'pound sterling' || compact === 'sterling' || compact === 'gbp') return 'GBP';

  return null;
}

function toCountryCode(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const normalized = trimmed.toLowerCase().replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim();

  if (/^[a-z]{2}$/i.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  for (const entry of COUNTRY_NAME_TO_CODE) {
    if (entry.keywords.some((keyword) => normalized.includes(keyword))) {
      return entry.code;
    }
  }

  const twoLetter = trimmed.slice(0, 2).toUpperCase();
  return twoLetter.length === 2 ? twoLetter : null;
}

function getCurrencyFromCountry(countryCode?: string | null): SupportedDisplayCurrency | null {
  const code = toCountryCode(countryCode);
  if (!code) return null;
  if (EURO_COUNTRY_CODES.has(code)) return 'EUR';
  return CURRENCY_BY_COUNTRY[code] ?? null;
}

function getCountryFromLocale(locale?: string | null): string | null {
  if (!locale) return null;
  const parts = locale.replace('_', '-').split('-');
  if (parts.length < 2) return null;
  return toCountryCode(parts[1]);
}

function getCurrencyFromLocaleLanguage(locale?: string | null): SupportedDisplayCurrency | null {
  if (!locale) return null;
  const language = locale.replace('_', '-').split('-')[0]?.toLowerCase();
  if (!language) return null;
  return CURRENCY_BY_LANGUAGE[language] ?? null;
}

export function getStoredDisplayCurrencyPreference(): SupportedDisplayCurrency | null {
  if (typeof window === 'undefined') return null;

  const candidateKeys = ['preferredCurrency', 'currencyPreference', 'displayCurrency', 'currency'];
  for (const key of candidateKeys) {
    const fromLocalStorage = window.localStorage.getItem(key);
    const normalizedFromLocalStorage = normalizeCurrencyInput(fromLocalStorage);
    if (normalizedFromLocalStorage) return normalizedFromLocalStorage;

    const fromSessionStorage = window.sessionStorage.getItem(key);
    const normalizedFromSessionStorage = normalizeCurrencyInput(fromSessionStorage);
    if (normalizedFromSessionStorage) return normalizedFromSessionStorage;
  }

  return null;
}

export function resolveDisplayCurrency(options: {
  preferredCurrency?: string | null;
  residenceCountry?: string | null;
  countryOfOrigin?: string | null;
  locale?: string | null;
}): SupportedDisplayCurrency {
  const fromPreferred = normalizeCurrencyInput(options.preferredCurrency);
  if (fromPreferred) return fromPreferred;

  const fromResidence = getCurrencyFromCountry(options.residenceCountry);
  if (fromResidence) return fromResidence;

  const fromOrigin = getCurrencyFromCountry(options.countryOfOrigin);
  if (fromOrigin) return fromOrigin;

  const fromLocale = getCurrencyFromCountry(getCountryFromLocale(options.locale));
  if (fromLocale) return fromLocale;

  const fromLocaleLanguage = getCurrencyFromLocaleLanguage(options.locale);
  if (fromLocaleLanguage) return fromLocaleLanguage;

  return 'USD';
}

export function formatAmountWithCurrency(value: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
