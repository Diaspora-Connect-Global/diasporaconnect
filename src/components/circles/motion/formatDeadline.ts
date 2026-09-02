/**
 * Spell a motion's PINNED `closesAt` for display.
 *
 * Two forms, because the deadline is stated twice on the screen and the two
 * readings want different weight: the countdown line is a glanceable
 * "Closes Fri, 6 PM", while the callout is a sentence a member has to actually
 * absorb ("…vote by Friday, 6:00 PM, nothing changes").
 *
 * Returns an empty string for a missing or unparseable value so callers can
 * omit the line rather than print "Invalid Date".
 */
export function formatDeadline(
  closesAt: string | null | undefined,
  locale: string,
  style: 'short' | 'long' = 'short',
): string {
  if (!closesAt) return '';

  const date = new Date(closesAt);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat(
    locale,
    style === 'long'
      ? { weekday: 'long', hour: 'numeric', minute: '2-digit' }
      : { weekday: 'short', hour: 'numeric' },
  ).format(date);
}
