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

export function getStoredDisplayCurrencyPreference(): SupportedDisplayCurrency | null {
  if (typeof window === 'undefined') return null;

  const candidateKeys = ['preferredCurrency', 'currencyPreference', 'displayCurrency', 'currency'];
  for (const key of candidateKeys) {
    const value = window.localStorage.getItem(key);
    const normalized = normalizeCurrencyInput(value);
    if (normalized) return normalized;
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
