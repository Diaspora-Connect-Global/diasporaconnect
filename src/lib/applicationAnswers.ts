/**
 * An application's `customAnswers` arrives as a JSON string of { fieldKey: answer }.
 * Returns label/value pairs for display; anything that is not a flat object of
 * scalars (or is not JSON at all) yields no rows rather than a broken page.
 */
export function parseCustomAnswers(raw: string | null | undefined): Array<{ label: string; value: string }> {
  if (!raw || typeof raw !== 'string') return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return [];
  const rows: Array<{ label: string; value: string }> = [];
  for (const [key, val] of Object.entries(parsed as Record<string, unknown>)) {
    if (val === null || val === undefined) continue;
    const value = typeof val === 'string' ? val.trim() : typeof val === 'number' || typeof val === 'boolean' ? String(val) : '';
    if (!value) continue;
    rows.push({ label: humaniseKey(key), value });
  }
  return rows;
}

/** `years_of_experience` / `yearsOfExperience` -> "Years of experience". */
export function humaniseKey(key: string): string {
  const spaced = key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_\-.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  return spaced ? spaced.charAt(0).toUpperCase() + spaced.slice(1) : key;
}
