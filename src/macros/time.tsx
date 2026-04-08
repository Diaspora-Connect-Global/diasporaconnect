type TimeFormatOptions = {
    locale?: string;
    timeZone?: string;
};

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const isValidDate = (date: Date) => !Number.isNaN(date.getTime());

const resolveTimeZone = (timeZone?: string) => {
    if (timeZone) {
        try {
            new Intl.DateTimeFormat(undefined, { timeZone });
            return timeZone;
        } catch {
            // fallback below
        }
    }
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
};

const getDayNumberInTimeZone = (date: Date, timeZone: string) => {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(date);

    const year = Number(parts.find((p) => p.type === 'year')?.value);
    const month = Number(parts.find((p) => p.type === 'month')?.value);
    const day = Number(parts.find((p) => p.type === 'day')?.value);

    return Math.floor(Date.UTC(year, month - 1, day) / MS_PER_DAY);
};

export const formatDateProximity = (dateString: string, options: TimeFormatOptions = {}) => {
    const date = new Date(dateString);
    if (!isValidDate(date)) return '';

    const now = new Date();
    const timeZone = resolveTimeZone(options.timeZone);
    const diffTime = now.getTime() - date.getTime();

    const todayDayNumber = getDayNumberInTimeZone(now, timeZone);
    const dateDayNumber = getDayNumberInTimeZone(date, timeZone);
    const diffDayCount = todayDayNumber - dateDayNumber;

    if (diffDayCount <= 0) {
        if (diffTime < 0) return 'Just now';
        const diffSeconds = Math.floor(diffTime / 1000);
        const diffMinutes = Math.floor(diffSeconds / 60);
        const diffHours = Math.floor(diffMinutes / 60);

        if (diffSeconds < 60) return 'Just now';
        if (diffMinutes < 60) return `${diffMinutes}m ago`;
        return `${diffHours}h ago`;
    }

    if (diffDayCount === 1) return 'Yesterday';

    if (diffDayCount < 7) {
        return `${diffDayCount}d ago`;
    } else if (diffDayCount < 30) {
        const weeks = Math.floor(diffDayCount / 7);
        return `${weeks}w ago`;
    } else if (diffDayCount < 365) {
        const months = Math.floor(diffDayCount / 30);
        return `${months}mo ago`;
    } else {
        const years = Math.floor(diffDayCount / 365);
        return `${years}y ago`;
    }
};

export function formatChatTimestamp(dateString: string | Date, options: TimeFormatOptions = {}): string {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    if (!isValidDate(date)) return '';

    return date.toLocaleString(options.locale, {
        timeZone: resolveTimeZone(options.timeZone),
        day: 'numeric',
        month: 'short',
        year: '2-digit',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}
export function formatDateOnly(dateString: string | Date, options: TimeFormatOptions = {}): string {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    if (!isValidDate(date)) return '';

    return date.toLocaleString(options.locale, {
        timeZone: resolveTimeZone(options.timeZone),
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    });
}