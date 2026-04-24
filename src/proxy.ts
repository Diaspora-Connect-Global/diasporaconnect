import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest, NextResponse } from 'next/server';

const intlMiddleware = createMiddleware(routing);

const SUPPORTED_LOCALES = new Set(routing.locales);

const COUNTRY_TO_LOCALE: Record<string, string> = {
  DE: 'de',
  AT: 'de',
  CH: 'de',
  IT: 'it',
  FR: 'fr',
  BE: 'fr',
  LU: 'fr',
  NL: 'nl',
};

function getLocaleFromPath(pathname: string): string | null {
  const segments = pathname.split('/').filter(Boolean);
  const first = segments[0]?.toLowerCase();
  if (!first) return null;
  return SUPPORTED_LOCALES.has(first as (typeof routing.locales)[number]) ? first : null;
}

function normalizeLocale(locale?: string | null): string | null {
  if (!locale) return null;
  const normalized = locale.toLowerCase().trim();
  if (SUPPORTED_LOCALES.has(normalized as (typeof routing.locales)[number])) return normalized;
  return null;
}

function localeFromAcceptLanguage(headerValue?: string | null): string | null {
  if (!headerValue) return null;
  const candidates = headerValue
    .split(',')
    .map((entry) => entry.split(';')[0]?.trim().toLowerCase())
    .filter(Boolean) as string[];
  for (const candidate of candidates) {
    const base = candidate.split('-')[0];
    if (base && SUPPORTED_LOCALES.has(base as (typeof routing.locales)[number])) return base;
  }
  return null;
}

function localeFromCountry(countryCode?: string | null): string | null {
  if (!countryCode) return null;
  const code = countryCode.trim().toUpperCase();
  const locale = COUNTRY_TO_LOCALE[code];
  return locale ? normalizeLocale(locale) : null;
}

function detectCountryFromHeaders(req: NextRequest): string | null {
  return (
    req.headers.get('x-vercel-ip-country') ??
    req.headers.get('cf-ipcountry') ??
    req.headers.get('x-country-code') ??
    null
  );
}

function withLocalePrefix(pathname: string, locale: string): string {
  if (pathname === '/') return `/${locale}`;
  return `/${locale}${pathname}`;
}

export default function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // Priority 1: locale already in URL — let next-intl handle it
  const localeInPath = getLocaleFromPath(pathname);
  if (localeInPath) {
    const response = intlMiddleware(req);
    response.cookies.set('preferredLocale', localeInPath, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    });
    return response;
  }

  // Priority 2: saved preference → browser language → IP country → default
  const detectedLocale =
    normalizeLocale(
      req.cookies.get('preferredLocale')?.value ?? req.cookies.get('NEXT_LOCALE')?.value ?? null,
    ) ??
    localeFromAcceptLanguage(req.headers.get('accept-language')) ??
    localeFromCountry(detectCountryFromHeaders(req)) ??
    routing.defaultLocale;

  const url = req.nextUrl.clone();
  url.pathname = withLocalePrefix(pathname, detectedLocale);
  url.search = search;

  const response = NextResponse.redirect(url);
  response.cookies.set('preferredLocale', detectedLocale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  });
  response.cookies.set('NEXT_LOCALE', detectedLocale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  });
  return response;
}

export const config = {
  matcher: '/((?!api|trpc|_next|_vercel|.*\\..*).*)',
};
