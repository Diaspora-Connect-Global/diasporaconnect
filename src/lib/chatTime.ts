/**
 * Chat-specific time/date formatting helpers, separated from `@/macros/time` so they
 * can be shared between chat components without pulling in unrelated formatters.
 */

/** Stable string key for grouping messages by calendar day in a given timezone. */
export function getMessageDateKey(dateStr: string, timeZone: string): string {
    return new Date(dateStr).toLocaleDateString("en-US", { timeZone });
}

/**
 * Friendly label for a date separator: "Today", "Yesterday", or e.g. "Mar 14, 2026".
 * Always evaluated in the supplied timezone so cross-DST boundaries don't shift the label.
 */
export function getDateLabel(dateStr: string, timeZone: string): string {
    const date = new Date(dateStr);
    const todayKey = new Date().toLocaleDateString("en-US", { timeZone });
    const yesterdayKey = new Date(Date.now() - 864e5).toLocaleDateString("en-US", { timeZone });
    const msgKey = getMessageDateKey(dateStr, timeZone);
    if (msgKey === todayKey) return "Today";
    if (msgKey === yesterdayKey) return "Yesterday";
    return date.toLocaleDateString("en-US", { timeZone, year: "numeric", month: "short", day: "numeric" });
}

/** "9:41 AM" style time-only label in the supplied timezone. */
export function formatTimeOnly(dateStr: string, timeZone: string): string {
    return new Date(dateStr).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone,
    });
}
