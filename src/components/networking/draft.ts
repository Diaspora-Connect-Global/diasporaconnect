import type { AvailabilitySlot, FieldFlags, MyParticipation, NetworkingAttendanceFormat, NetworkingVisibility, ProfileFields } from '@/services/gql/networking';

/** Everything the goals editor and the wizard edit, as one plain object. */
export interface NetworkingDraft {
  roles: string[];
  interests: string[];
  needs: string[];
  offers: string[];
  industries: string[];
  markets: string[];
  languages: string[];
  headline: string;
  organization: string;
  locationLabel: string;
  intro: string;
  needsNote: string;
  offersNote: string;
  attendanceFormat: NetworkingAttendanceFormat;
  visibility: NetworkingVisibility;
  fieldFlags: FieldFlags;
  acceptsInterests: boolean;
  openToMeetings: boolean;
  inCircleDiscovery: boolean;
  availability: AvailabilitySlot[];
}

export const DEFAULT_FLAGS: FieldFlags = { organization: true, location: true, availability: true, needsNote: true, offersNote: true };

/*
 * Objects read back from a query carry Apollo's `__typename`, and GraphQL input types reject
 * unknown fields: spreading a loaded `fieldFlags` into Join / Save draft failed with
 * 'Field "__typename" is not defined by type "EventNetworkingFieldFlagsInput"'. Copy only the
 * declared fields whenever a server object is turned into draft or input state.
 */
const plainFlags = (f: FieldFlags): FieldFlags => ({
  organization: f.organization, location: f.location, availability: f.availability, needsNote: f.needsNote, offersNote: f.offersNote,
});
const plainSlots = (slots: AvailabilitySlot[]): AvailabilitySlot[] => slots.map((s) => ({ startAt: s.startAt, endAt: s.endAt }));

export function emptyDraft(): NetworkingDraft {
  return {
    roles: [], interests: [], needs: [], offers: [], industries: [], markets: [], languages: [],
    headline: '', organization: '', locationLabel: '', intro: '', needsNote: '', offersNote: '',
    attendanceFormat: 'EITHER', visibility: 'RECOMMENDED', fieldFlags: { ...DEFAULT_FLAGS },
    acceptsInterests: true, openToMeetings: true, inCircleDiscovery: true, availability: [],
  };
}

export function draftFromParticipation(mp: MyParticipation | null | undefined): NetworkingDraft {
  const base = emptyDraft();
  const p = mp?.participation;
  if (!p) return base;
  const f: Partial<ProfileFields> = p.profile?.fields ?? {};
  return {
    ...base,
    roles: f.roles ?? [], interests: f.interests ?? [], needs: f.needs ?? [], offers: f.offers ?? [],
    industries: f.industries ?? [], markets: f.markets ?? [], languages: f.languages ?? [],
    headline: f.headline ?? '', organization: f.organization ?? '', locationLabel: f.locationLabel ?? '', intro: f.intro ?? '',
    needsNote: f.needsNote ?? '', offersNote: f.offersNote ?? '',
    attendanceFormat: f.attendanceFormat ?? 'EITHER',
    visibility: p.visibility ?? 'RECOMMENDED',
    fieldFlags: p.fieldFlags ? plainFlags(p.fieldFlags) : { ...DEFAULT_FLAGS },
    acceptsInterests: p.acceptsInterests ?? true,
    openToMeetings: p.openToMeetings ?? true,
    inCircleDiscovery: p.inCircleDiscovery ?? true,
    availability: plainSlots(p.availability ?? []),
  };
}

const orNull = (s: string) => (s.trim() ? s.trim() : null);

export function profileInput(d: NetworkingDraft) {
  return {
    headline: orNull(d.headline), organization: orNull(d.organization), locationLabel: orNull(d.locationLabel), intro: orNull(d.intro),
    roles: d.roles, interests: d.interests, needs: d.needs, offers: d.offers, industries: d.industries, markets: d.markets, languages: d.languages,
    needsNote: orNull(d.needsNote), offersNote: orNull(d.offersNote), attendanceFormat: d.attendanceFormat,
  };
}

export function preferencesInput(d: NetworkingDraft) {
  return {
    visibility: d.visibility,
    fieldFlags: plainFlags(d.fieldFlags),
    acceptsInterests: d.acceptsInterests,
    openToMeetings: d.openToMeetings,
    inCircleDiscovery: d.inCircleDiscovery,
  };
}

export type SuggestKind = 'NEEDS' | 'OFFERS' | 'INTERESTS' | 'ROLES' | 'MARKETS';
export interface SuggestResult { codes: string[]; source: 'ai' | 'offline' }
export type SuggestFn = (kind: SuggestKind, text: string) => Promise<SuggestResult>;
