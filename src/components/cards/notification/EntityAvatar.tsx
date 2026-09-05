'use client';

import { cn } from '@/lib/utils';

/**
 * Initial-letter avatar for a notification's subject entity.
 *
 * The notification list used to fall back to `/GLOBE.png` for everything that
 * was not a person, so a screenful of communities, events, groups and requests
 * rendered as the same Ghana-flag globe repeated twenty times. This is the
 * fallback for a subject that has a NAME but no picture: one glyph on a
 * name-derived colour, which at least tells the reader that two adjacent rows
 * are about two different things.
 *
 * Purely decorative — see the `aria-hidden` note on the rendered element.
 */

/* ------------------------------------------------------------------ *
 * Palette
 *
 * Deliberately NOT the semantic surface tokens: `surface-danger` /
 * `surface-success` etc. carry meaning ("this row is an error", "this row
 * succeeded") and a community would inherit that meaning by accident. These
 * are neutral identity hues instead.
 *
 * Each entry pins BOTH themes explicitly. The app's dark mode is class-based
 * (`.dark` on an ancestor, see globals.css `@custom-variant dark`), so a
 * light-only pair such as `bg-blue-100 text-blue-800` would keep its pale
 * background on a #191919 page — a bright disc punched into a dark row.
 * Light renders a deep hue on a pale tint, dark inverts it; measured contrast
 * is 6.4:1–8.0:1 in light and 8.1:1–9.3:1 in dark, i.e. every combination
 * clears WCAG AA (4.5:1) for the small glyph, in both themes.
 *
 * Written as complete literal class strings on purpose: Tailwind scans source
 * text, so a computed `bg-${hue}-100` would produce classes that are never
 * emitted and discs that render transparent.
 * ------------------------------------------------------------------ */
const PALETTE = [
    'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
    'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100',
    'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100',
    'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-100',
    'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-100',
    'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-100',
] as const;

/**
 * FNV-1a (32-bit). Any stable hash would do; what matters is that it is a pure
 * function of the name, so "Better Africa Today" is the same colour on every
 * row, on every device, and on both the server and the client render (a
 * random or index-based colour would hydrate to a different disc).
 */
function hashName(seed: string): number {
    let h = 0x811c9dc5;
    for (let i = 0; i < seed.length; i += 1) {
        h ^= seed.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
}

/**
 * Seed used for the colour. Case and surrounding whitespace are not identity —
 * "Better Africa Today" and "better africa today " are the same community and
 * must not get two different colours. NFC keeps a composed and a decomposed
 * spelling of the same accented name on the same colour too.
 */
function colourSeed(name: string): string {
    return name.normalize('NFC').trim().toLowerCase();
}

/**
 * Grapheme splitter.
 *
 * `name.charAt(0)` is wrong here: it returns half a surrogate pair for a
 * non-BMP character (an emoji renders as a replacement box) and severs a
 * combining mark from its base letter. `Intl.Segmenter` is the correct tool,
 * but Firefox only shipped it in v125, so the code-point fallback still has to
 * exist — it is `Array.from`, not `charAt`, so the surrogate-pair half of the
 * problem is fixed in BOTH paths and the two only diverge on multi-code-point
 * clusters.
 *
 * The locale is pinned to 'en' rather than left to the runtime default: server
 * and browser can disagree about the default locale, and a differing glyph
 * would be a hydration mismatch.
 */
let segmenter: Intl.Segmenter | null | undefined;
function graphemes(input: string): string[] {
    if (segmenter === undefined) {
        segmenter =
            typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function'
                ? new Intl.Segmenter('en', { granularity: 'grapheme' })
                : null;
    }
    if (!segmenter) return Array.from(input);
    return Array.from(segmenter.segment(input), (s) => s.segment);
}

/** Matches a grapheme that STARTS with a letter or a digit, in any script. */
const STARTS_WITH_ALPHANUMERIC = /^[\p{L}\p{N}]/u;
const IS_WHITESPACE = /^\s$/u;

/**
 * The glyph shown on the disc.
 *
 * Rules, in order:
 *  1. the first grapheme that starts with a letter or digit, uppercased —
 *     so «Ubuntu Collective» and "🌍 Ghana Network" render U and G, not a
 *     quote mark and a globe;
 *  2. failing that (a name made only of symbols), the first non-blank grapheme
 *     as-is — an emoji-only name renders its emoji, which is still recognisable
 *     and still distinguishes one row from the next;
 *  3. failing that, '?' — never an empty disc.
 *
 * `toUpperCase` is used rather than `toLocaleUpperCase` on purpose: the latter
 * depends on the runtime's default locale (Turkish i → İ), which would make the
 * glyph differ between server and client.
 */
export function entityInitial(name: string): string {
    const clusters = graphemes(name.normalize('NFC').trim());

    const alphanumeric = clusters.find((g) => STARTS_WITH_ALPHANUMERIC.test(g));
    if (alphanumeric) {
        const upper = alphanumeric.toUpperCase();
        // Uppercasing can expand one code point into two ('ß' → 'SS', 'ﬁ' → 'FI');
        // trim those back to one glyph. Multi-code-point clusters (a Devanagari
        // syllable, an accented letter) are left whole — slicing them would drop
        // the vowel sign or the accent.
        if (Array.from(alphanumeric).length === 1) {
            return Array.from(upper)[0] ?? upper;
        }
        return upper;
    }

    const visible = clusters.find((g) => !IS_WHITESPACE.test(g));
    return visible ?? '?';
}

export interface EntityAvatarProps {
    /** Display name of the entity the row is about. Blank names are the caller's problem. */
    name: string;
    /**
     * Sizing/shape utilities. Defaults match the notification row's picture
     * exactly (`size-full rounded-full border-2 border-border-subtle`) so
     * swapping between the two never shifts the row.
     */
    className?: string;
}

export function EntityAvatar({ name, className }: EntityAvatarProps) {
    const tone = PALETTE[hashName(colourSeed(name)) % PALETTE.length];

    return (
        <span
            // Decorative. The row's own heading already says the entity's name,
            // so announcing the disc as well would read a bare letter — "B" —
            // in the middle of the sentence.
            aria-hidden="true"
            className={cn(
                'flex h-full w-full select-none items-center justify-center overflow-hidden',
                'rounded-full border-2 border-border-subtle',
                'text-sm font-semibold leading-none sm:text-base',
                tone,
                className,
            )}
        >
            {entityInitial(name)}
        </span>
    );
}
