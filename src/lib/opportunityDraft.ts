import { safeEmail, safeExternalUrl } from '@/lib/opportunityDisplay';
import { toMajorUnits, toMinorUnits, DEFAULT_CURRENCY } from '@/types/money';
import type { OpportunitySuggestedType } from '@/lib/opportunityDetection';

/**
 * The listing a user attaches to a post from the composer ("job attached").
 *
 * Money: `compensationMin/Max` are INTEGER MINOR UNITS. The ×100 happens once, in
 * `majorInputToMinor`, when the details dialog is saved; everything after (draft storage,
 * the mutation, the feed card) carries minor units. The edit dialog shows them back with
 * `minorToMajorInput`, the display side of that same boundary.
 */
export const OPPORTUNITY_TYPES: readonly OpportunitySuggestedType[] = [
  'EMPLOYMENT', 'CONTRACT', 'VOLUNTEER', 'SCHOLARSHIP', 'GRANT', 'FELLOWSHIP', 'PROGRAM',
];
export const DELIVERY_MODES = ['REMOTE', 'IN_PERSON', 'HYBRID'] as const;
export const COMMITMENT_TYPES = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'ONE_TIME', 'FLEXIBLE', 'PROJECT_BASED', 'ONGOING'] as const;
export const APPLY_METHODS = ['IN_PLATFORM_FORM', 'EXTERNAL_LINK', 'EMAIL_REQUEST'] as const;
/** Platform-supported listing currencies (same set as the money convention). */
export const OPPORTUNITY_CURRENCIES = ['GHS', 'USD', 'EUR', 'GBP', 'NGN', 'KES'] as const;

export type DeliveryMode = (typeof DELIVERY_MODES)[number];
export type CommitmentType = (typeof COMMITMENT_TYPES)[number];
export type ApplyMethod = (typeof APPLY_METHODS)[number];

export const TITLE_MAX = 200;

export interface AttachedOpportunity {
  type: OpportunitySuggestedType;
  title: string;
  location: string;
  deliveryMode: DeliveryMode | '';
  commitmentType: CommitmentType | '';
  /** Integer minor units, or null when no pay is stated. */
  compensationMin: number | null;
  compensationMax: number | null;
  compensationCurrency: string;
  /** YYYY-MM-DD, or '' for none. */
  deadline: string;
  applicationMethod: ApplyMethod;
  externalLink: string;
  applicationEmail: string;
}

/** What the dialog edits: pay as the strings the user typed (major units). */
export interface OpportunityFormValues {
  type: OpportunitySuggestedType;
  title: string;
  location: string;
  deliveryMode: DeliveryMode | '';
  commitmentType: CommitmentType | '';
  payMin: string;
  payMax: string;
  currency: string;
  deadline: string;
  applicationMethod: ApplyMethod;
  externalLink: string;
  applicationEmail: string;
}

export type OpportunityFormErrorKey =
  | 'titleRequired'
  | 'titleTooLong'
  | 'payInvalid'
  | 'payRange'
  | 'deadlinePast'
  | 'deadlineInvalid'
  | 'linkInvalid'
  | 'emailInvalid';
export type OpportunityFormErrors = Partial<Record<'title' | 'pay' | 'deadline' | 'externalLink' | 'applicationEmail', OpportunityFormErrorKey>>;

const CATEGORY_BY_TYPE: Record<OpportunitySuggestedType, string> = {
  EMPLOYMENT: 'EMPLOYMENT_CAREER',
  CONTRACT: 'EMPLOYMENT_CAREER',
  VOLUNTEER: 'VOLUNTEERING_SOCIAL_IMPACT',
  SCHOLARSHIP: 'EDUCATION_TRAINING',
  GRANT: 'FUNDING_GRANTS',
  FELLOWSHIP: 'FELLOWSHIPS_LEADERSHIP',
  PROGRAM: 'EDUCATION_TRAINING',
};
const COMPENSATION_TYPE_BY_TYPE: Record<OpportunitySuggestedType, string> = {
  EMPLOYMENT: 'SALARY',
  CONTRACT: 'SALARY',
  VOLUNTEER: 'STIPEND',
  SCHOLARSHIP: 'GRANT',
  GRANT: 'GRANT',
  FELLOWSHIP: 'STIPEND',
  PROGRAM: 'STIPEND',
};

export const categoryForType = (type: OpportunitySuggestedType): string => CATEGORY_BY_TYPE[type];

/** First non-empty line of the post, trimmed to the title limit. */
export function titleFromPost(text: string): string {
  const first = text.split(/\r?\n/).map((l) => l.trim()).find(Boolean) ?? '';
  return first.length > TITLE_MAX ? first.slice(0, TITLE_MAX).trimEnd() : first;
}

export function emptyFormValues(postText: string, suggestedType: OpportunitySuggestedType | null): OpportunityFormValues {
  return {
    type: suggestedType ?? 'EMPLOYMENT',
    title: titleFromPost(postText),
    location: '',
    deliveryMode: '',
    commitmentType: '',
    payMin: '',
    payMax: '',
    currency: DEFAULT_CURRENCY,
    deadline: '',
    applicationMethod: 'IN_PLATFORM_FORM',
    externalLink: '',
    applicationEmail: '',
  };
}

/** Parses a typed amount ("1500", "1,500.50", "12,5"); null for blank, NaN for garbage / negatives. */
export function parseMajorInput(raw: string): number | null {
  const v = raw.trim().replace(/\s/g, '');
  if (!v) return null;
  // "12,5" is a decimal comma; "1,500.50" uses commas as thousands separators.
  const normalised = /^\d+,\d{1,2}$/.test(v) ? v.replace(',', '.') : v.replace(/,/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(normalised)) return Number.NaN;
  return Number(normalised);
}

/** THE major -> minor conversion (once, at the dialog's input boundary). */
export function majorInputToMinor(raw: string): number | null {
  const n = parseMajorInput(raw);
  if (n === null || Number.isNaN(n)) return null;
  return toMinorUnits(n);
}

/** Display side of the same boundary: pre-fills the dialog when an attached job is edited. */
export function minorToMajorInput(minor: number | null): string {
  if (minor == null) return '';
  const major = toMajorUnits(minor);
  return Number.isInteger(major) ? String(major) : major.toFixed(2);
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Local calendar date as YYYY-MM-DD (for the `min` of the deadline field). */
export function todayIso(now: Date = new Date()): string {
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${m}-${d}`;
}

export function validateOpportunityForm(v: OpportunityFormValues, now: Date = new Date()): OpportunityFormErrors {
  const errors: OpportunityFormErrors = {};
  const title = v.title.trim();
  if (!title) errors.title = 'titleRequired';
  else if (title.length > TITLE_MAX) errors.title = 'titleTooLong';

  const min = parseMajorInput(v.payMin);
  const max = parseMajorInput(v.payMax);
  if ((min !== null && Number.isNaN(min)) || (max !== null && Number.isNaN(max))) errors.pay = 'payInvalid';
  else if (min !== null && max !== null && min > max) errors.pay = 'payRange';

  if (v.deadline) {
    if (!DATE_RE.test(v.deadline) || Number.isNaN(new Date(`${v.deadline}T00:00:00`).getTime())) errors.deadline = 'deadlineInvalid';
    else if (v.deadline < todayIso(now)) errors.deadline = 'deadlinePast';
  }

  if (v.applicationMethod === 'EXTERNAL_LINK' && !safeExternalUrl(v.externalLink)) errors.externalLink = 'linkInvalid';
  if (v.applicationMethod === 'EMAIL_REQUEST' && !safeEmail(v.applicationEmail)) errors.applicationEmail = 'emailInvalid';
  return errors;
}

/** Form values -> the attached job (call only when `validateOpportunityForm` found no errors). */
export function toAttached(v: OpportunityFormValues): AttachedOpportunity {
  return {
    type: v.type,
    title: v.title.trim(),
    location: v.location.trim(),
    deliveryMode: v.deliveryMode,
    commitmentType: v.commitmentType,
    compensationMin: majorInputToMinor(v.payMin),
    compensationMax: majorInputToMinor(v.payMax),
    compensationCurrency: v.currency,
    deadline: v.deadline,
    applicationMethod: v.applicationMethod,
    externalLink: v.applicationMethod === 'EXTERNAL_LINK' ? (safeExternalUrl(v.externalLink) ?? '') : '',
    applicationEmail: v.applicationMethod === 'EMAIL_REQUEST' ? v.applicationEmail.trim() : '',
  };
}

export function toFormValues(a: AttachedOpportunity): OpportunityFormValues {
  return {
    type: a.type,
    title: a.title,
    location: a.location,
    deliveryMode: a.deliveryMode,
    commitmentType: a.commitmentType,
    payMin: minorToMajorInput(a.compensationMin),
    payMax: minorToMajorInput(a.compensationMax),
    currency: a.compensationCurrency,
    deadline: a.deadline,
    applicationMethod: a.applicationMethod,
    externalLink: a.externalLink,
    applicationEmail: a.applicationEmail,
  };
}

/**
 * Stored data is untrusted (it comes from localStorage): accept only values this form could
 * have produced, otherwise drop the job rather than post something malformed.
 */
export function parseAttachedOpportunity(raw: unknown): AttachedOpportunity | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const str = (x: unknown) => (typeof x === 'string' ? x : '');
  const oneOf = <T extends string>(list: readonly T[], x: unknown): T | null => (list as readonly string[]).includes(x as string) ? (x as T) : null;
  const minor = (x: unknown) => (typeof x === 'number' && Number.isSafeInteger(x) && x > 0 ? x : null);

  const type = oneOf(OPPORTUNITY_TYPES, r.type);
  const method = oneOf(APPLY_METHODS, r.applicationMethod);
  const title = str(r.title).trim();
  if (!type || !method || !title || title.length > TITLE_MAX) return null;
  const currency = oneOf(OPPORTUNITY_CURRENCIES, r.compensationCurrency) ?? DEFAULT_CURRENCY;
  const deadline = DATE_RE.test(str(r.deadline)) ? str(r.deadline) : '';
  const result: AttachedOpportunity = {
    type,
    title,
    location: str(r.location).slice(0, 200),
    deliveryMode: oneOf(DELIVERY_MODES, r.deliveryMode) ?? '',
    commitmentType: oneOf(COMMITMENT_TYPES, r.commitmentType) ?? '',
    compensationMin: minor(r.compensationMin),
    compensationMax: minor(r.compensationMax),
    compensationCurrency: currency,
    deadline,
    applicationMethod: method,
    externalLink: safeExternalUrl(str(r.externalLink)) ?? '',
    applicationEmail: safeEmail(str(r.applicationEmail)) ?? '',
  };
  if (method === 'EXTERNAL_LINK' && !result.externalLink) return null;
  if (method === 'EMAIL_REQUEST' && !result.applicationEmail) return null;
  return result;
}

/** Shape of the gateway's CreateOpportunityInput for a USER-owned, public listing. */
export function buildCreateOpportunityInput(a: AttachedOpportunity, postText: string, userId: string) {
  const hasPay = a.compensationMin != null || a.compensationMax != null;
  return {
    ownerType: 'USER',
    ownerId: userId,
    type: a.type,
    category: categoryForType(a.type),
    title: a.title,
    description: postText.trim(),
    visibility: 'PUBLIC',
    applicationMethod: a.applicationMethod,
    ...(a.location && { location: a.location }),
    ...(a.deliveryMode && { deliveryMode: a.deliveryMode }),
    ...(a.commitmentType && { commitmentType: a.commitmentType }),
    // A blank link or email is left out (undefined), never sent as an empty string.
    ...(a.applicationMethod === 'EXTERNAL_LINK' && a.externalLink.trim() && { externalLink: a.externalLink.trim() }),
    ...(a.applicationMethod === 'EMAIL_REQUEST' && a.applicationEmail.trim() && { applicationEmail: a.applicationEmail.trim() }),
    ...(a.compensationMin != null && { compensationMin: a.compensationMin }),
    ...(a.compensationMax != null && { compensationMax: a.compensationMax }),
    ...(hasPay && { compensationCurrency: a.compensationCurrency, compensationType: COMPENSATION_TYPE_BY_TYPE[a.type] }),
    ...(a.deadline && { deadline: `${a.deadline}T23:59:59.000Z` }),
  };
}

export type OpportunityPostRefusal = 'ownerMismatch' | 'postFailed' | 'rateLimited' | 'selfApply';

/**
 * Maps a gateway refusal (errorPolicy 'all' resolves with it; a thrown Apollo error carries
 * it too) to the translated toast key. Null when no known code is present.
 */
export function opportunityRefusal(resultOrError: unknown): OpportunityPostRefusal | null {
  const r = resultOrError as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  const lists = [r?.error?.errors, r?.errors, r?.graphQLErrors, r?.error?.graphQLErrors, r?.cause?.errors];
  const codes: string[] = [];
  for (const list of lists) {
    if (Array.isArray(list)) for (const e of list) codes.push(String(e?.extensions?.code ?? e?.code ?? ''));
  }
  if (codes.includes('OPPORTUNITY_POST_OWNER_MISMATCH')) return 'ownerMismatch';
  if (codes.includes('OPPORTUNITY_SELF_APPLY')) return 'selfApply';
  if (codes.some((c) => c.includes('RATE_LIMIT'))) return 'rateLimited';
  if (codes.includes('OPPORTUNITY_POST_FAILED')) return 'postFailed';
  return null;
}
