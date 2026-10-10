/**
 * Organiser-supplied links (external registration page, online join link) end up
 * in an `href`. A `javascript:` or `data:` URL there runs script on click, so only
 * plain http(s) links are ever rendered as links.
 */
export function httpUrlOrNull(value?: string | null): string | null {
  const raw = (value ?? '').trim();
  if (!raw) return null;
  try {
    const u = new URL(raw);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : null;
  } catch {
    return null;
  }
}
