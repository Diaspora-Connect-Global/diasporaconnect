/**
 * Display-time guards for the product rule: a user's id — a UUID, or any
 * fragment of one — is never shown to a person, anywhere.
 *
 * Ids stay perfectly usable as React keys, routes and API variables; these
 * helpers only police what ends up as human-readable TEXT.
 *
 * - `displayName(profileLike, fallback)` picks the first real name on a
 *   profile-ish object and never returns an id-shaped string. When nothing
 *   usable exists it returns `fallback`, which callers pass as a translated
 *   neutral label ("Unknown user", "A member", …).
 * - `stripIds(text, replacement)` is the safety net for text that arrives from
 *   the SERVER (AI summaries, system messages, notification copy) and could
 *   have an id interpolated into it. It is meant for generated text, not for
 *   what a person typed.
 * - `looksLikeId(value)` / `containsId(value)` are the predicates behind both.
 */

const HEX = '[0-9a-f]';

/** Canonical 8-4-4-4-12 UUID. */
const UUID_SRC = `${HEX}{8}-${HEX}{4}-${HEX}{4}-${HEX}{4}-${HEX}{12}`;
/** A UUID with its dashes removed. */
const UUID_COMPACT_SRC = `${HEX}{32}`;
/** GDPR erasure tombstone written by the backend (`deleted-user:<sha-prefix>`). */
const TOMBSTONE_SRC = `deleted-user[:_-]${HEX}{6,64}`;
/**
 * A bare id FRAGMENT: 8–31 hex characters containing at least one digit AND at
 * least one letter a–f. Requiring both keeps ordinary words ("deadbeef",
 * "facade") and plain numbers (phone numbers, amounts, years) out of it, while
 * catching the `id.slice(0, 8)` style leaks (`3f9a2b1c`).
 */
// Lookaheads are length-bounded so a long hex blob cannot make the scan quadratic.
const FRAGMENT_SRC = `(?=${HEX}{0,30}[0-9])(?=${HEX}{0,30}[a-f])${HEX}{8,31}`;

/**
 * An optional label glued to the id ("User 3f9a…", "user:3f9a…", "@3f9a…"),
 * consumed with it so "User 3f9a2b1c joined" does not become "User  joined".
 */
const LABEL_SRC = `(?:\\b(?:user|member|sender|author|userid|user_id|id)\\s*[:#_-]?\\s*)?@?`;

const ID_BODY_SRC = `(?:${TOMBSTONE_SRC}|${UUID_SRC}|${UUID_COMPACT_SRC}|${FRAGMENT_SRC})`;

/**
 * Word-ish boundaries on both sides so an id is only matched as a whole token
 * (never the middle of a longer word or number). `\b` alone is not enough for
 * the tombstone, whose body contains `:`.
 */
const ID_IN_TEXT_SRC = `(?<![0-9a-z_])${LABEL_SRC}${ID_BODY_SRC}(?![0-9a-z_])`;

const WHOLE_ID_RE = new RegExp(`^\\s*${LABEL_SRC}${ID_BODY_SRC}\\s*$`, 'i');

function idInTextRe(): RegExp {
    // A fresh instance per call: a shared /g regex carries `lastIndex` between
    // calls and silently skips matches.
    return new RegExp(ID_IN_TEXT_SRC, 'gi');
}

/** True when the WHOLE value is an id (optionally labelled, e.g. "User 3f9a2b1c"). */
export function looksLikeId(value: string | null | undefined): boolean {
    if (typeof value !== 'string') return false;
    const v = value.trim();
    if (!v) return false;
    return WHOLE_ID_RE.test(v);
}

/** True when the value contains an id anywhere. */
export function containsId(value: string | null | undefined): boolean {
    if (typeof value !== 'string' || !value) return false;
    return idInTextRe().test(value);
}

function capitalizeFirst(s: string): string {
    return s ? s.charAt(0).toLocaleUpperCase() + s.slice(1) : s;
}

/**
 * Remove every id-shaped substring from `text`.
 *
 * With a `replacement` (a translated inline label such as "a member") each id
 * is replaced by it — capitalised at the start of a sentence — so generated
 * copy like "3f9a…-… joined the group" still reads "A member joined the group".
 * Without one the id is simply removed and the spacing/punctuation left behind
 * is tidied up.
 */
export function stripIds(text: string | null | undefined, replacement = ''): string {
    if (typeof text !== 'string' || !text) return '';
    if (!containsId(text)) return text;

    const replaced = text.replace(idInTextRe(), (_match, offset: number, whole: string) => {
        if (!replacement) return '';
        const before = whole.slice(0, offset);
        const sentenceStart = /(^|[.!?:\n]\s*)$/.test(before) || /^\s*$/.test(before);
        return sentenceStart ? capitalizeFirst(replacement) : replacement;
    });

    return replaced
        .split('\n')
        .map((line) =>
            line
                // "(  )" / "[]" left behind by a removed id
                .replace(/\(\s*\)|\[\s*\]/g, '')
                // no space before punctuation
                .replace(/[ \t]+([,.;:!?)])/g, '$1')
                // dangling commas/semicolons at the ends of a line ("by , x")
                .replace(/^[ \t]*[,;][ \t]*/, '')
                .replace(/[ \t]*[,;][ \t]*$/, '')
                // a separator the id used to sit between: "a ,  , b" -> "a, b"
                .replace(/,(\s*,)+/g, ',')
                .replace(/[ \t]{2,}/g, ' ')
                .trimEnd(),
        )
        .join('\n')
        .trim();
}

/** Anything that might carry a person's name. All fields optional. */
export interface ProfileLike {
    displayName?: string | null;
    fullName?: string | null;
    name?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    username?: string | null;
    handle?: string | null;
}

function clean(value: string | null | undefined): string {
    const v = typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
    if (!v) return '';
    // A candidate that contains an id is rejected outright rather than
    // "repaired": half a name glued to half an id is still a leak.
    if (containsId(v)) return '';
    return v;
}

/**
 * The best human-readable name for a person, or `fallback`.
 *
 * Order: an explicit display/full name, then first + last, then `@username`.
 * Every candidate is checked for ids, so a backend that stuffs a user id into a
 * name field (it has happened) degrades to the fallback label instead of
 * leaking it.
 */
export function displayName(
    profile: ProfileLike | null | undefined,
    fallback: string,
): string {
    if (!profile) return fallback;

    const explicit = clean(profile.displayName) || clean(profile.fullName) || clean(profile.name);
    if (explicit) return explicit;

    // Checked as a WHOLE: cleaning each part separately would turn a
    // "User" + "3f9a2b1c" pair into the plausible-looking name "User".
    const composed = clean([profile.firstName ?? '', profile.lastName ?? ''].join(' '));
    if (composed) return composed;

    const handle = clean((profile.username ?? profile.handle ?? '').replace(/^@+/, ''));
    if (handle) return `@${handle}`;

    return fallback;
}

/** `displayName` for a bare string (a name field that may hold an id). */
export function safeName(value: string | null | undefined, fallback: string): string {
    return clean(value) || fallback;
}
