/**
 * Email format checks for signup / sign-in fields (live validation).
 * Matches prior app regex: local@domain.tld with at least one dot in the domain part.
 */
export function isValidEmailFormat(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * When to show an invalid-format hint (avoid nagging on the first one or two characters).
 */
export function shouldShowEmailFormatError(raw: string): boolean {
  const s = raw.trim();
  if (!s || isValidEmailFormat(s)) return false;
  return s.includes('@') || s.length >= 8;
}
