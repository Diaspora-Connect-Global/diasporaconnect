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
    fieldFlags: p.fieldFlags ?? { ...DEFAULT_FLAGS },
    acceptsInterests: p.acceptsInterests ?? true,
    openToMeetings: p.openToMeetings ?? true,
    inCircleDiscovery: p.inCircleDiscovery ?? true,
    availability: p.availability ?? [],
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
    fieldFlags: { ...d.fieldFlags },
    acceptsInterests: d.acceptsInterests,
    openToMeetings: d.openToMeetings,
    inCircleDiscovery: d.inCircleDiscovery,
  };
}

export type SuggestKind = 'NEEDS' | 'OFFERS' | 'INTERESTS' | 'ROLES' | 'MARKETS';
export interface SuggestResult { codes: string[]; source: 'ai' | 'offline' }
export type SuggestFn = (kind: SuggestKind, text: string) => Promise<SuggestResult>;
