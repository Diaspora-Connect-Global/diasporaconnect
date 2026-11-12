/**
 * Organiser-built event registration forms: the field vocabulary, the four default
 * fields, the answer checks (mirroring the server's, which stays the authority) and
 * small helpers for URLs and server refusals. Pure functions, no React.
 */

export const FIELD_TYPES = ['text', 'textarea', 'email', 'phone', 'number', 'date', 'select', 'multiselect', 'checkbox'] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

export const CHOICE_TYPES: ReadonlySet<string> = new Set(['select', 'multiselect']);

export const MAX_FIELDS = 25;
export const MAX_LABEL = 150;
export const MAX_OPTIONS = 30;
export const MAX_OPTION = 80;
export const MAX_TEXT = 2000;

export type BuiltinId = 'full_name' | 'email' | 'phone' | 'job_title';

export interface DefaultFieldDef {
  id: BuiltinId;
  type: FieldType;
  required: boolean;
  /** The label the server stores (English). Screens show a translated label by id. */
  label: string;
}

/** Canonical definitions: reserved ids, in display order. */
export const DEFAULT_FIELDS: readonly DefaultFieldDef[] = [
  { id: 'full_name', type: 'text', required: true, label: 'Full name' },
  { id: 'email', type: 'email', required: true, label: 'Email address' },
  { id: 'phone', type: 'phone', required: false, label: 'Phone number' },
  { id: 'job_title', type: 'text', required: false, label: 'Job title' },
];

const BUILTIN_IDS: ReadonlySet<string> = new Set(DEFAULT_FIELDS.map((d) => d.id));

export interface FormFieldLike {
  id?: string | null;
  label: string;
  type: string;
  required: boolean;
  options?: string[] | null;
  builtin?: string | null;
}

/** The reserved id of a default field, or null for the organiser's own question. */
export function builtinOf(f: { id?: string | null; builtin?: string | null }): BuiltinId | null {
  const b = f.builtin ?? (f.id && BUILTIN_IDS.has(f.id) ? f.id : null);
  return b && BUILTIN_IDS.has(b) ? (b as BuiltinId) : null;
}

/**
 * Put back the default fields that are missing, each at its canonical place among the
 * defaults that are still there (before the next later one, else after the previous
 * one, else at the top). The organiser's own questions keep their order.
 */
export function withDefaultsRestored<T extends FormFieldLike>(fields: T[], make: (d: DefaultFieldDef) => T): T[] {
  const out = [...fields];
  DEFAULT_FIELDS.forEach((d, i) => {
    if (out.some((f) => builtinOf(f) === d.id)) return;
    const idxOf = (id: BuiltinId) => out.findIndex((f) => builtinOf(f) === id);
    let at = 0;
    const later = DEFAULT_FIELDS.slice(i + 1).map((x) => idxOf(x.id)).filter((x) => x >= 0);
    const earlier = DEFAULT_FIELDS.slice(0, i).map((x) => idxOf(x.id)).filter((x) => x >= 0);
    if (later.length) at = Math.min(...later);
    else if (earlier.length) at = Math.max(...earlier) + 1;
    out.splice(at, 0, make(d));
  });
  return out;
}

export function missingDefaults(fields: FormFieldLike[]): DefaultFieldDef[] {
  return DEFAULT_FIELDS.filter((d) => !fields.some((f) => builtinOf(f) === d.id));
}

// ─── Answers ────────────────────────────────────────────────────────────────────

export type Answer = string | string[];
export type AnswerError = 'required' | 'email' | 'phone' | 'number' | 'date' | 'option' | 'options';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+?[0-9 ()\-.]{6,32}$/;

function realDate(v: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

/** Same rules as the server. Returns the reason, or null when the answer is acceptable. */
export function validateAnswer(f: FormFieldLike, raw: Answer | undefined): AnswerError | null {
  const options = f.options ?? [];
  if (f.type === 'checkbox') return f.required && raw !== 'true' ? 'required' : null;
  if (f.type === 'multiselect') {
    const v = Array.isArray(raw) ? raw : [];
    if (v.length === 0) return f.required ? 'required' : null;
    return v.every((x) => options.includes(x)) ? null : 'options';
  }
  const v = typeof raw === 'string' ? raw.trim() : '';
  if (!v) return f.required ? 'required' : null;
  switch (f.type) {
    case 'email':
      return v.length <= 254 && EMAIL.test(v) ? null : 'email';
    case 'phone':
      return PHONE.test(v) && v.replace(/\D/g, '').length >= 6 && v.replace(/\D/g, '').length <= 20 ? null : 'phone';
    case 'number':
      return Number.isFinite(Number(v)) ? null : 'number';
    case 'date':
      return realDate(v) ? null : 'date';
    case 'select':
      return options.includes(v) ? null : 'option';
    default:
      return null;
  }
}

/** The wire form of the answers: checkbox → boolean, multiselect → string[], the rest → trimmed string. */
export function answersToJson(fields: FormFieldLike[], responses: Record<string, Answer>): string {
  const out: Record<string, string | string[] | boolean> = {};
  for (const f of fields) {
    const id = f.id ?? '';
    const v = responses[id];
    if (f.type === 'checkbox') out[id] = v === 'true';
    else if (f.type === 'multiselect') out[id] = Array.isArray(v) ? v : [];
    else out[id] = typeof v === 'string' ? v.trim() : '';
  }
  return JSON.stringify(out);
}

/** Display text of a stored answer (choices joined with ", ", checkbox Yes/No). */
export function answerText(f: FormFieldLike, stored: unknown, yes: string, no: string): string {
  if (stored === undefined || stored === null) return '';
  if (f.type === 'checkbox') return stored === true || stored === 'true' ? yes : no;
  if (Array.isArray(stored)) return stored.map(String).join(', ');
  return String(stored);
}

export function parseResponses(json: string | null | undefined): Record<string, unknown> {
  if (!json) return {};
  try {
    const v = JSON.parse(json);
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

// ─── Links ──────────────────────────────────────────────────────────────────────

/** Add https:// when no scheme was typed; accept only http(s). Returns null when unusable. */
export function normaliseRegistrationLink(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  if (/^(javascript|data|vbscript|mailto|tel|file|blob):/i.test(raw)) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    if (!u.hostname.includes('.')) return null;
    return u.toString();
  } catch {
    return null;
  }
}

/** Host without "www.", for "Register on {domain}". */
export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, '');
  } catch {
    return '';
  }
}

// ─── Server refusals ────────────────────────────────────────────────────────────

const CODE_PREFIX = /^[A-Z0-9_]+:\s*/;

/** "EVENT_X: Please answer …" → "Please answer …". */
export function stripCodePrefix(message: string): string {
  return message.replace(CODE_PREFIX, '').trim();
}

/** The first message in an Apollo result or thrown error exactly as the server sent it; '' when none. */
export function rawServerMessageOf(source: unknown): string {
  const seen = new Set<unknown>();
  const walk = (node: unknown, depth: number): string => {
    if (!node || typeof node !== 'object' || depth > 4 || seen.has(node)) return '';
    seen.add(node);
    const n = node as Record<string, unknown>;
    for (const list of [n.errors, n.graphQLErrors]) {
      if (Array.isArray(list)) {
        for (const e of list) {
          const m = (e as { message?: unknown })?.message;
          if (typeof m === 'string' && m.trim()) return m;
        }
      }
    }
    return walk(n.error, depth + 1) || walk(n.cause, depth + 1) || walk(n.networkError, depth + 1);
  };
  const direct = walk(source, 0);
  if (direct) return direct;
  const m = (source as { message?: unknown } | null)?.message;
  return typeof m === 'string' ? m : '';
}

/** The first human message, code prefix stripped; '' when none. */
export function serverMessageOf(source: unknown): string {
  return stripCodePrefix(rawServerMessageOf(source));
}

/** True for a refusal about the registration form or the external-registration rule (its text is meant to be shown). */
export function isFormRefusal(raw: string): boolean {
  return /^EVENT_(REGISTRATION_(FORM_|EXTERNAL)|INVALID_REGISTRATION_LINK)/.test(raw);
}

/** Clean, de-duplicated, bounded option list from the textarea text (one per line). */
export function parseOptions(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of text.split('\n')) {
    const o = line.trim();
    if (o && !seen.has(o)) {
      seen.add(o);
      out.push(o);
    }
  }
  return out;
}

// ─── Where a "Register" click may go ────────────────────────────────────────────

export type RegistrationRoute =
  | { kind: 'external'; url: string }
  | { kind: 'page' }
  | { kind: 'quick' };

/**
 * Entry points other than the event page (list, embassy tabs) may register someone
 * directly only for an event with no questions that registers in-app. An external event
 * sends people to the organiser's site (after the leaving notice); anything with
 * questions goes to the event page's Register tab.
 */
export function registrationRoute(
  e: { registrationMode?: string | null; registrationLink?: string | null; registrationFormFields?: unknown[] | null },
  safeUrl: (v?: string | null) => string | null,
): RegistrationRoute {
  if (e.registrationMode === 'EXTERNAL') {
    const url = safeUrl(e.registrationLink);
    return url ? { kind: 'external', url } : { kind: 'page' };
  }
  return (e.registrationFormFields?.length ?? 0) > 0 ? { kind: 'page' } : { kind: 'quick' };
}
