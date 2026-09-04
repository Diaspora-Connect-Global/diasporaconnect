'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useSearchParams } from 'next/navigation';
import { Link, usePathname } from '@/i18n/navigation';
import { readMutationOutcome, refusalMessageKey } from '@/lib/mutationOutcome';
import Image from 'next/image';
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  CheckCircle,
  Share2,
  CalendarPlus,
  UserPlus,
  Ticket,
  Eye,
  Mail,
  Phone,
  BadgeCheck,
  Building2,
  Video,
  Navigation,
  MessageSquare,
  GraduationCap,
  Globe,
  Briefcase,
  Heart,
  Copy,
  Loader2,
  Info,
  ChevronDown,
  Download,
  CalendarClock,
  Link2,
  MessageCircle,
  Send,
  Share,
  type LucideIcon,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  GET_EVENT,
  REGISTER_EVENT,
  CANCEL_REGISTRATION,
  getEventLocationDisplay,
  type Event,
  type GetEventData,
  type RegisterEventData,
  type CancelRegistrationData,
  type RegistrationFormField,
} from '@/services/gql/events';
import type { EmbassyProfile } from '../embassyData';
import type { EmbassyViewProps } from '../types';
import { useIsEmbassy } from '../communityVariant';

// ─── Sub-tabs ─────────────────────────────────────────────────────────────────

type SubTabKey = 'about' | 'agenda' | 'speakers' | 'venue' | 'attendees' | 'faqs';

// ─── Date / time helpers (native Date — no date-fns) ─────────────────────────

function parseDate(iso?: string | null): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Square date badge parts, e.g. { weekday: 'SAT', day: '28', month: 'JUN' }. */
function badgeParts(iso?: string | null): { weekday: string; day: string; month: string } {
  const d = parseDate(iso);
  if (!d) return { weekday: '', day: '', month: '' };
  return {
    weekday: d.toLocaleString(undefined, { weekday: 'short' }).toUpperCase(),
    day: d.toLocaleString(undefined, { day: '2-digit' }),
    month: d.toLocaleString(undefined, { month: 'short' }).toUpperCase(),
  };
}

function formatLongDate(iso?: string | null): string {
  const d = parseDate(iso);
  if (!d) return '';
  return d.toLocaleString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** "2:00 PM – 5:00 PM" (or just the start when there is no end). */
function formatTimeRange(startIso?: string | null, endIso?: string | null): string {
  const start = parseDate(startIso);
  if (!start) return '';
  const startStr = start.toLocaleString(undefined, { hour: 'numeric', minute: '2-digit' });
  const end = parseDate(endIso);
  if (!end) return startStr;
  const endStr = end.toLocaleString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${startStr} – ${endStr}`;
}

/** ICS uses UTC basic format: 20260628T140000Z. */
function toIcsUtc(iso?: string | null): string {
  const d = parseDate(iso);
  if (!d) return '';
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function icsEscape(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

/**
 * Build a Google Calendar "render" URL. Dates use the same UTC basic format the
 * `.ics` export uses via `toIcsUtc`. When the event has no end time we fall back
 * to the start so Google still creates a valid (zero-length) entry.
 */
function googleCalendarUrl(event: Event): string {
  const start = toIcsUtc(event.startAt);
  const end = toIcsUtc(event.endAt) || start;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${start}/${end}`,
    details: event.description ?? '',
    location: getEventLocationDisplay(event),
  });
  return `https://www.google.com/calendar/render?${params.toString()}`;
}

// ─── Share URLs (mirrors SharePostModal patterns) ─────────────────────────────

function currentUrl(): string {
  if (typeof window === 'undefined') return '';
  return window.location.href;
}

interface ShareTarget {
  name: string;
  bg: string;
  getUrl: (url: string) => string;
  icon: React.ReactNode;
}
/**
 * Single source of truth for the "Share Event" channels. Consumed by BOTH the
 * right-rail social block and the header Share dialog so they stay in sync.
 * Each `getUrl` receives the bare event URL — these share the *link* (distinct
 * from "Invite Friends", which shares a personalised invite message).
 */
const SHARE_TARGETS: ReadonlyArray<ShareTarget> = [
  {
    name: 'Facebook',
    bg: 'bg-[#1877F2]',
    getUrl: (url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    icon: (
      <svg viewBox="0 0 24 24" className="size-5 fill-white" aria-hidden>
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  {
    name: 'X',
    bg: 'bg-black',
    getUrl: (url) => `https://x.com/intent/post?url=${encodeURIComponent(url)}`,
    icon: (
      <svg viewBox="0 0 24 24" className="size-4 fill-white" aria-hidden>
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.74l7.73-8.835L1.254 2.25H8.08l4.26 5.632zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    name: 'WhatsApp',
    bg: 'bg-[#25D366]',
    getUrl: (url) => `https://wa.me/?text=${encodeURIComponent(url)}`,
    icon: (
      <svg viewBox="0 0 24 24" className="size-5 fill-white" aria-hidden>
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
    ),
  },
  {
    name: 'LinkedIn',
    bg: 'bg-[#0A66C2]',
    getUrl: (url) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    icon: (
      <svg viewBox="0 0 24 24" className="size-5 fill-white" aria-hidden>
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z" />
      </svg>
    ),
  },
  {
    name: 'Email',
    bg: 'bg-text-secondary',
    getUrl: (url) => `mailto:?body=${encodeURIComponent(url)}`,
    icon: <Mail className="size-5 text-white" aria-hidden />,
  },
];

// ─── Category visuals ─────────────────────────────────────────────────────────

interface Tone {
  ring: string;
  fg: string;
}
const TONES: Record<string, Tone> = {
  green: { ring: 'bg-green-50', fg: 'text-green-600' },
  blue: { ring: 'bg-blue-50', fg: 'text-blue-600' },
  orange: { ring: 'bg-orange-50', fg: 'text-orange-600' },
  purple: { ring: 'bg-purple-50', fg: 'text-purple-600' },
  rose: { ring: 'bg-rose-50', fg: 'text-rose-500' },
  teal: { ring: 'bg-teal-50', fg: 'text-teal-600' },
  brand: { ring: 'bg-surface-subtle', fg: 'text-text-brand' },
};

interface EmbassyEventDetailProps {
  eventId: string;
  community: EmbassyViewProps['community'];
  profile: EmbassyProfile;
}

/**
 * Rich detail screen for a single event. Lives inside the Events tab and is
 * reached via `?tab=events&event=<id>`.
 *
 * Real data comes from `getEvent(id)`: title, description, start/end, category,
 * location, capacity, registrationCount, isPaid, isRegistered, tags, timezone.
 * The organizer card is the owning `community`. Sections with no backend
 * source (Agenda, Speakers, FAQs, attendee avatars, ratings) render graceful
 * empty states rather than fabricated content.
 */
export function EmbassyEventDetail({ eventId, community, profile }: EmbassyEventDetailProps) {
  const t = useTranslations('community.embassy.events.detail');
  // Root-scoped on purpose: `refusalMessageKey` returns a FULLY QUALIFIED
  // key path (e.g. 'events.errors.not_found'), so it must be handed to an
  // UNSCOPED translator or next-intl prefixes the scope and resolves nothing.
  const tRoot = useTranslations();
  const isEmbassyVariant = useIsEmbassy();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [subTab, setSubTab] = useState<SubTabKey>('about');
  const [copied, setCopied] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [registerFormOpen, setRegisterFormOpen] = useState(false);
  const [formAnswers, setFormAnswers] = useState<Record<string, string | boolean>>({});

  const { data, loading, refetch } = useQuery<GetEventData>(GET_EVENT, {
    variables: { id: eventId },
    fetchPolicy: 'cache-and-network',
  });
  const event = data?.getEvent ?? null;

  const [registerMutation, { loading: registering }] = useMutation<RegisterEventData>(REGISTER_EVENT);
  const [cancelMutation, { loading: cancelling }] =
    useMutation<CancelRegistrationData>(CANCEL_REGISTRATION);

  /** Back link to the events grid (drops the `event` param, keeps the rest). */
  const backHref = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', 'events');
    params.delete('event');
    const query: Record<string, string> = {};
    params.forEach((value, name) => {
      query[name] = value;
    });
    return { pathname, query };
  }, [pathname, searchParams]);

  // ── Register / cancel ──────────────────────────────────────────────────────

  /**
   * Core registration call. Honours the waitlist: when the backend returns a
   * `waitlistPosition`, the user joined the waitlist rather than being confirmed,
   * so we surface a distinct toast. `formResponsesJson` is sent only when a
   * registration form was completed.
   */
  async function submitRegistration(formResponsesJson?: string) {
    if (!event) return;
    try {
      const res = await registerMutation({
        variables: {
          input: { eventId, ...(formResponsesJson ? { formResponsesJson } : {}) },
        },
      });

      // Check mutation outcome when errorPolicy: 'all' makes refusals resolve as success
      const outcome = readMutationOutcome(res, (d) => d.registerForEvent);
      if (!outcome.ok) {
        const key = refusalMessageKey(outcome.message, 'events.errors');
        toast.error(tRoot(key));
        return;
      }

      const waitlistPosition = res.data?.registerForEvent.waitlistPosition;
      if (waitlistPosition != null) {
        toast.success(t('toastWaitlisted', { position: waitlistPosition }));
      } else {
        toast.success(t('toastRegistered'));
      }
      setRegisterFormOpen(false);
      setFormAnswers({});
      await refetch();
    } catch (err) {
      // Network error or exception
      toast.error(tRoot('events.errors.failed'));
    }
  }

  /**
   * Entry point for the primary Register button (free events). When the event
   * defines a registration form we collect those answers in a dialog first;
   * otherwise we register directly.
   */
  function handleRegister() {
    if (!event) return;
    // Defence in depth: never fire the mutation unless the event is open (or the
    // user is joining the waitlist). The disabled button states normally prevent
    // reaching here, but guard regardless of how this is invoked.
    if (String(event.status).toUpperCase() !== 'PUBLISHED') {
      toast.error(t('toastNotAccepting'));
      return;
    }
    if (event.registrationFormFields && event.registrationFormFields.length > 0) {
      setFormAnswers({});
      setRegisterFormOpen(true);
      return;
    }
    void submitRegistration();
  }

  /** Validate required fields, then submit the collected form answers. */
  function handleSubmitRegistrationForm() {
    if (!event?.registrationFormFields) return;
    const missing = event.registrationFormFields.find((field) => {
      if (!field.required) return false;
      const value = formAnswers[field.id];
      if (typeof value === 'boolean') return value === false;
      return value == null || String(value).trim() === '';
    });
    if (missing) {
      toast.error(t('toastFormRequired', { field: missing.label }));
      return;
    }
    void submitRegistration(JSON.stringify(formAnswers));
  }

  async function handleCancel() {
    if (!event?.myRegistrationId) return;
    try {
      const res = await cancelMutation({ variables: { registrationId: event.myRegistrationId } });

      // Check mutation outcome when errorPolicy: 'all' makes refusals resolve as success
      const outcome = readMutationOutcome(res, (d) => d.cancelEventRegistration);
      if (!outcome.ok) {
        const key = refusalMessageKey(outcome.message, 'events.errors');
        toast.error(tRoot(key));
        return;
      }

      toast.success(t('toastCancelled'));
      await refetch();
    } catch {
      toast.error(tRoot('events.errors.failed'));
    }
  }

  // ── Add to calendar (.ics) ─────────────────────────────────────────────────

  function handleAddToCalendar() {
    if (!event) return;
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Diaspoplug//Embassy Events//EN',
      'BEGIN:VEVENT',
      `UID:${event.id}@diaspoplug`,
      `DTSTAMP:${toIcsUtc(new Date().toISOString())}`,
      `DTSTART:${toIcsUtc(event.startAt)}`,
      event.endAt ? `DTEND:${toIcsUtc(event.endAt)}` : '',
      `SUMMARY:${icsEscape(event.title)}`,
      event.description ? `DESCRIPTION:${icsEscape(event.description)}` : '',
      `LOCATION:${icsEscape(getEventLocationDisplay(event))}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].filter(Boolean);
    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'event'}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ── Share ──────────────────────────────────────────────────────────────────

  /** Native share when available (shares the bare link), else open the dialog. */
  async function handleShare() {
    const url = currentUrl();
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ url, title: event?.title });
        return;
      } catch {
        // user cancelled or unsupported — fall through to the dialog
      }
    }
    setShareOpen(true);
  }

  async function handleCopyLink() {
    const url = currentUrl();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(t('toastLinkCopied'));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t('toastLinkFailed'));
    }
  }

  function openShare(getUrl: (u: string) => string) {
    const url = currentUrl();
    if (!url) return;
    window.open(getUrl(url), '_blank', 'noopener,noreferrer');
  }

  // ── Invite friends (distinct from Share: a personalised invite message) ──────

  /** "You're invited to {title} on {date}. Join here: {url}". */
  function inviteMessage(): string {
    return t('inviteMessage', {
      title: event?.title ?? '',
      date: formatLongDate(event?.startAt),
      url: currentUrl(),
    });
  }

  /** Native share of the invite (title + message + url) when available. */
  async function handleInviteShare() {
    const url = currentUrl();
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: event?.title, text: inviteMessage(), url });
        return;
      } catch {
        // user cancelled or unsupported — fall through to the dialog
      }
    }
    setInviteOpen(true);
  }

  /** Copy the full invite message (not just the bare URL). */
  async function handleCopyInvite() {
    try {
      await navigator.clipboard.writeText(inviteMessage());
      toast.success(t('toastInviteCopied'));
    } catch {
      toast.error(t('toastLinkFailed'));
    }
  }

  // ── Loading / not-found ────────────────────────────────────────────────────

  if (loading && !event) {
    return (
      <div className="mx-auto max-w-6xl px-3 py-6 lg:px-6">
        <p className="body-small text-text-secondary">{t('loading')}</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="mx-auto max-w-6xl px-3 py-6 lg:px-6">
        <Link
          href={backHref}
          scroll={false}
          className="label-medium inline-flex items-center gap-1 text-text-brand"
        >
          <ChevronLeft className="size-4" aria-hidden />
          {t('breadcrumbEvents')}
        </Link>
        <p className="body-small mt-6 text-text-secondary">{t('notFound')}</p>
      </div>
    );
  }

  // ── Derived display values (all real) ──────────────────────────────────────

  const badge = badgeParts(event.startAt);
  const isVirtual = event.locationType === 'virtual' || event.locationDetails?.type === 'virtual';
  const loc = event.locationDetails;
  const addressText =
    [loc?.venueName, loc?.address, loc?.city, loc?.country].filter(Boolean).join(', ') ||
    getEventLocationDisplay(event);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressText)}`;

  const capacity = event.capacity ?? null;
  const isUnlimited = !capacity || capacity === 0;
  const going = typeof event.registrationCount === 'number' ? event.registrationCount : 0;
  const registered = Boolean(event.isRegistered || event.myRegistrationId);
  const { ring: catRing, fg: catFg } = categoryVisual(event.eventCategory).tone;

  // Capacity / waitlist. `availableSpots`: null = unlimited, 0 = full.
  const hasCapacity = capacity != null && capacity > 0;
  const isFull = hasCapacity && event.availableSpots != null && event.availableSpots <= 0;
  // The backend `status` is uppercase (DRAFT | PUBLISHED | CANCELLED | COMPLETED);
  // compare case-insensitively since the local TS type is lowercase.
  const isPublished = String(event.status).toUpperCase() === 'PUBLISHED';
  // Only open for registration when published, the backend hasn't explicitly
  // refused, and there's room. `canRegister` alone is unreliable (it has
  // returned true for DRAFT events), so the published gate is authoritative.
  const acceptingRegistrations = isPublished && event.canRegister !== false && !isFull;
  // When the event is full but still published & allowed, the next registration
  // goes to the waitlist — label the action accordingly.
  const wouldWaitlist = isPublished && isFull && event.canRegister !== false;
  // Disabled states for users who aren't already registered:
  //  - not published (DRAFT/CANCELLED/COMPLETED) → "Registration not open"
  //  - published but full and not waitlisting → "Event Full"
  const showRegistrationClosed = !registered && !isPublished;
  const showEventFull = !registered && isPublished && isFull && !wouldWaitlist;

  const subTabs: ReadonlyArray<{ key: SubTabKey; label: string }> = [
    { key: 'about', label: t('tabAbout') },
    { key: 'agenda', label: t('tabAgenda') },
    { key: 'speakers', label: t('tabSpeakers') },
    { key: 'venue', label: t('tabVenue') },
    { key: 'attendees', label: t('tabAttendees', { count: going }) },
    { key: 'faqs', label: t('tabFaqs') },
  ];

  const organizerHref = `/community/${community.id}`;
  const isEmbassy = Boolean(community.communityType?.isEmbassy);
  const organizerAvatar = community.avatarUrl || profile.flagUrl || '/GLOBE.png';
  const contactEmail = community.contactEmail || profile.email;
  const contactPhone = community.contactPhone || profile.phone;

  return (
    <div className="mx-auto max-w-6xl px-3 py-6 lg:px-6">
      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-1 caption-medium text-text-secondary">
        <Link
          href={backHref}
          scroll={false}
          className="label-medium inline-flex items-center gap-1 text-text-brand hover:underline"
        >
          <ChevronLeft className="size-4" aria-hidden />
          {t('breadcrumbEvents')}
        </Link>
        <ChevronRight className="size-3.5" aria-hidden />
        <span className="truncate text-text-primary">{t('breadcrumbDetail')}</span>
      </div>

      {/* Header card */}
      <Card className="overflow-hidden border-border-subtle">
        {event.coverImageUrl && (
          <div className="relative h-44 w-full bg-surface-subtle sm:h-56">
            <Image
              src={event.coverImageUrl}
              alt={event.title}
              fill
              sizes="(max-width: 1024px) 100vw, 1024px"
              className="object-cover"
            />
          </div>
        )}
        <CardContent className="p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            {/* Square date badge */}
            <div className="flex size-20 flex-shrink-0 flex-col items-center justify-center rounded-xl border border-border-subtle bg-surface-brand-subtle text-center">
              <span className="caption-small font-semibold text-text-brand">{badge.weekday}</span>
              <span className="heading-xsmall leading-none text-text-primary">{badge.day}</span>
              <span className="caption-small font-semibold text-text-secondary">{badge.month}</span>
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="heading-xsmall text-text-primary">{event.title}</h1>
              {/* Category + price chips */}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {event.eventCategory && (
                  <span className={`caption-small inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${catRing} ${catFg}`}>
                    {event.eventCategory}
                  </span>
                )}
                <span
                  className={`caption-small inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${
                    event.isPaid ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600'
                  }`}
                >
                  <Ticket className="size-3" aria-hidden />
                  {event.isPaid ? t('paid') : t('free')}
                </span>
              </div>

              {event.description && (
                <p className="body-small mt-3 text-text-secondary">{event.description}</p>
              )}

              {/* 4-up meta row */}
              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Meta icon={CalendarDays} tone="blue" label={t('metaDate')} value={formatLongDate(event.startAt)} />
                <Meta
                  icon={Clock}
                  tone="purple"
                  label={t('metaTime')}
                  value={
                    <>
                      {formatTimeRange(event.startAt, event.endAt)}
                      {event.timezone ? (
                        <span className="caption-small block text-text-secondary">{event.timezone}</span>
                      ) : null}
                    </>
                  }
                />
                <Meta
                  icon={isVirtual ? Video : MapPin}
                  tone="green"
                  label={t('metaLocation')}
                  value={isVirtual ? loc?.platform || loc?.virtualLink || t('virtual') : addressText}
                />
                <Meta
                  icon={Users}
                  tone="orange"
                  label={t('metaCapacity')}
                  value={
                    <>
                      {isUnlimited ? t('unlimited') : t('seats', { count: capacity ?? 0 })}
                      <span className="caption-small block text-text-secondary">
                        {t('going', { count: going })}
                      </span>
                    </>
                  }
                />
              </div>

              {/* Action buttons */}
              <div className="mt-5 flex flex-wrap items-center gap-2">
                {/* 1 — Register (free inline / paid link / waitlist / full) */}
                {registered ? (
                  <>
                    <span className="label-medium inline-flex items-center gap-1.5 rounded-lg bg-green-50 px-4 py-2.5 text-green-600">
                      <CheckCircle className="size-4" aria-hidden />
                      {t('registered')}
                    </span>
                    <button
                      type="button"
                      onClick={handleCancel}
                      disabled={cancelling}
                      className="label-medium inline-flex items-center gap-1.5 rounded-lg border border-border-subtle px-4 py-2.5 text-text-secondary transition-colors hover:bg-surface-subtle disabled:opacity-60"
                    >
                      {cancelling ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                      {t('cancelRegistration')}
                    </button>
                  </>
                ) : showRegistrationClosed ? (
                  <button
                    type="button"
                    disabled
                    className="label-medium inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg bg-surface-subtle px-4 py-2.5 text-text-secondary opacity-80"
                  >
                    <Info className="size-4" aria-hidden />
                    {t('registrationClosed')}
                  </button>
                ) : showEventFull ? (
                  <button
                    type="button"
                    disabled
                    className="label-medium inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg bg-surface-subtle px-4 py-2.5 text-text-secondary opacity-80"
                  >
                    <Users className="size-4" aria-hidden />
                    {t('eventFull')}
                  </button>
                ) : event.isPaid ? (
                  <Link
                    href={`/events/${event.id}`}
                    className="label-medium inline-flex items-center gap-1.5 rounded-lg bg-surface-brand px-4 py-2.5 text-text-white transition-colors hover:opacity-90"
                  >
                    <Ticket className="size-4" aria-hidden />
                    {t('register')}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={handleRegister}
                    disabled={registering || (!acceptingRegistrations && !wouldWaitlist)}
                    className="label-medium inline-flex items-center gap-1.5 rounded-lg bg-surface-brand px-4 py-2.5 text-text-white transition-colors hover:opacity-90 disabled:opacity-60"
                  >
                    {registering ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : (
                      <CheckCircle2 className="size-4" aria-hidden />
                    )}
                    {wouldWaitlist ? t('joinWaitlist') : t('register')}
                  </button>
                )}

                {/* 2 — Add to calendar (.ics download or Google Calendar) */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="label-medium inline-flex items-center gap-1.5 rounded-lg border border-border-subtle px-4 py-2.5 text-text-secondary transition-colors hover:bg-surface-subtle"
                    >
                      <CalendarPlus className="size-4" aria-hidden />
                      {t('addToCalendar')}
                      <ChevronDown className="size-3.5" aria-hidden />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    <DropdownMenuItem onSelect={handleAddToCalendar}>
                      <Download className="size-4" aria-hidden />
                      {t('calendarDownload')}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() =>
                        window.open(googleCalendarUrl(event), '_blank', 'noopener,noreferrer')
                      }
                    >
                      <CalendarClock className="size-4" aria-hidden />
                      {t('calendarGoogle')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* 3 — Share event (bare link to social networks) */}
                <button
                  type="button"
                  onClick={handleShare}
                  className="label-medium inline-flex items-center gap-1.5 rounded-lg border border-border-subtle px-4 py-2.5 text-text-secondary transition-colors hover:bg-surface-subtle"
                >
                  <Share2 className="size-4" aria-hidden />
                  {t('shareEvent')}
                </button>

                {/* 4 — Invite friends (personalised invite via personal channels) */}
                <button
                  type="button"
                  onClick={handleInviteShare}
                  className="label-medium inline-flex items-center gap-1.5 rounded-lg border border-border-subtle px-4 py-2.5 text-text-secondary transition-colors hover:bg-surface-subtle"
                >
                  <UserPlus className="size-4" aria-hidden />
                  {t('inviteFriends')}
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sub-tabs */}
      <div className="mt-5 border-b border-border-subtle">
        <ul className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
          {subTabs.map((tab) => {
            const active = tab.key === subTab;
            return (
              <li key={tab.key} className="flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setSubTab(tab.key)}
                  aria-current={active ? 'true' : undefined}
                  className={`whitespace-nowrap border-b-2 px-3 py-3 label-medium transition-colors ${
                    active
                      ? 'border-border-brand text-text-brand'
                      : 'border-transparent text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {tab.label}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Body */}
      <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_20rem]">
        {/* LEFT — sub-tab content */}
        <div className="min-w-0 space-y-6">
          {subTab === 'about' && (
            <AboutSection event={event} community={community} contactEmail={contactEmail} t={t} />
          )}
          {subTab === 'venue' && (
            <VenueSection event={event} isVirtual={isVirtual} addressText={addressText} mapsUrl={mapsUrl} t={t} />
          )}
          {subTab === 'attendees' && (
            <Card className="border-border-subtle">
              <CardContent className="p-5">
                <h2 className="label-large text-text-primary">{t('attendeesTitle')}</h2>
                <div className="mt-4 flex items-center gap-3 rounded-lg border border-border-subtle bg-surface-subtle p-4">
                  <span className="flex size-11 flex-shrink-0 items-center justify-center rounded-full bg-blue-50">
                    <Users className="size-5 text-blue-600" aria-hidden />
                  </span>
                  <div>
                    <p className="label-medium text-text-primary">{t('attendeesGoing', { count: going })}</p>
                    <p className="caption-medium text-text-secondary">{t('attendeesNote')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          {subTab === 'agenda' && (
            <EmptyState icon={CalendarDays} title={t('agendaEmptyTitle')} body={t('agendaEmptyBody')} />
          )}
          {subTab === 'speakers' && (
            <EmptyState icon={Users} title={t('speakersEmptyTitle')} body={t('speakersEmptyBody')} />
          )}
          {subTab === 'faqs' && (
            <EmptyState icon={Info} title={t('faqsEmptyTitle')} body={t('faqsEmptyBody')} />
          )}
        </div>

        {/* RIGHT rail */}
        <aside className="space-y-6">
          {/* Organizer */}
          <Card className="border-border-subtle">
            <CardContent className="p-5">
              <h3 className="label-large mb-3 text-text-primary">{t('organizerTitle')}</h3>
              <div className="flex items-center gap-3">
                <span className="relative size-12 flex-shrink-0 overflow-hidden rounded-full bg-surface-subtle">
                  <Image src={organizerAvatar} alt={community.name} fill className="object-cover" />
                </span>
                <div className="min-w-0">
                  <p className="label-medium flex items-center gap-1 truncate text-text-primary">
                    {community.name}
                    {isEmbassy && <BadgeCheck className="size-4 flex-shrink-0 text-blue-600" aria-hidden />}
                  </p>
                  <p className="caption-small text-text-secondary">
                    {isEmbassyVariant ? t('organizerType') : 'Community Organizer'}
                  </p>
                </div>
              </div>
              <Link
                href={organizerHref}
                className="label-medium mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-border-brand bg-surface-default py-2 text-text-brand transition-colors hover:bg-surface-subtle"
              >
                <Building2 className="size-4" aria-hidden />
                {t('viewOrganizer')}
              </Link>
            </CardContent>
          </Card>

          {/* Event Information */}
          <Card className="border-border-subtle">
            <CardContent className="p-5">
              <h3 className="label-large mb-3 text-text-primary">{t('infoTitle')}</h3>
              <ul className="space-y-3">
                <InfoRow icon={GraduationCap} label={t('infoEventType')} value={event.eventCategory || t('na')} />
                <InfoRow icon={Eye} label={t('infoVisibility')} value={visibilityLabel(event.visibility, t)} />
                <InfoRow icon={Ticket} label={t('infoTicketPrice')} value={event.isPaid ? t('paid') : t('free')} />
                {contactEmail && (
                  <li className="flex items-start justify-between gap-3">
                    <span className="caption-medium flex items-center gap-2 text-text-secondary">
                      <Mail className="size-4 flex-shrink-0" aria-hidden />
                      {t('infoContact')}
                    </span>
                    <a href={`mailto:${contactEmail}`} className="caption-medium min-w-0 truncate text-text-brand hover:underline">
                      {contactEmail}
                    </a>
                  </li>
                )}
                {contactPhone && (
                  <li className="flex items-start justify-between gap-3">
                    <span className="caption-medium flex items-center gap-2 text-text-secondary">
                      <Phone className="size-4 flex-shrink-0" aria-hidden />
                      {t('infoPhone')}
                    </span>
                    <a href={`tel:${contactPhone}`} className="caption-medium text-text-brand hover:underline">
                      {contactPhone}
                    </a>
                  </li>
                )}
              </ul>
            </CardContent>
          </Card>

          {/* Location */}
          {!isVirtual && (
            <Card className="border-border-subtle">
              <CardContent className="p-5">
                <h3 className="label-large mb-3 text-text-primary">{t('locationTitle')}</h3>
                <div className="flex h-32 w-full flex-col items-center justify-center rounded-lg border border-border-subtle bg-surface-subtle text-center">
                  <MapPin className="size-7 text-text-brand" aria-hidden />
                  <p className="caption-medium mt-2 px-4 text-text-secondary">{addressText}</p>
                </div>
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="label-medium mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-border-brand bg-surface-default py-2 text-text-brand transition-colors hover:bg-surface-subtle"
                >
                  <Navigation className="size-4" aria-hidden />
                  {t('getDirections')}
                </a>
              </CardContent>
            </Card>
          )}

          {/* Share */}
          <Card className="border-border-subtle">
            <CardContent className="p-5">
              <h3 className="label-large mb-3 text-text-primary">{t('shareTitle')}</h3>
              <div className="flex flex-wrap gap-3">
                {SHARE_TARGETS.map((s) => (
                  <button
                    key={s.name}
                    type="button"
                    onClick={() => openShare(s.getUrl)}
                    aria-label={s.name}
                    className={`flex size-10 flex-shrink-0 items-center justify-center rounded-full shadow-sm transition-opacity hover:opacity-90 ${s.bg}`}
                  >
                    {s.icon}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={handleCopyLink}
                className="label-medium mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-border-subtle py-2 text-text-secondary transition-colors hover:bg-surface-subtle"
              >
                {copied ? (
                  <CheckCircle className="size-4 text-green-600" aria-hidden />
                ) : (
                  <Copy className="size-4" aria-hidden />
                )}
                {copied ? t('linkCopied') : t('copyLink')}
              </button>
            </CardContent>
          </Card>
        </aside>
      </div>

      {/* Registration form dialog */}
      <Dialog open={registerFormOpen} onOpenChange={setRegisterFormOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('registerFormTitle')}</DialogTitle>
            <DialogDescription>{t('registerFormDescription', { title: event.title })}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {(event.registrationFormFields ?? []).map((field) => (
              <RegistrationField
                key={field.id}
                field={field}
                value={formAnswers[field.id]}
                onChange={(value) =>
                  setFormAnswers((prev) => ({ ...prev, [field.id]: value }))
                }
              />
            ))}
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setRegisterFormOpen(false)}
              className="label-medium rounded-lg border border-border-subtle px-4 py-2.5 text-text-secondary transition-colors hover:bg-surface-subtle"
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              onClick={handleSubmitRegistrationForm}
              disabled={registering}
              className="label-medium inline-flex items-center justify-center gap-1.5 rounded-lg bg-surface-brand px-4 py-2.5 text-text-white transition-colors hover:opacity-90 disabled:opacity-60"
            >
              {registering ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              {wouldWaitlist ? t('joinWaitlist') : t('register')}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share event dialog (bare link → social networks) */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('shareDialogTitle')}</DialogTitle>
            <DialogDescription>{t('shareDialogDescription')}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-3 py-2">
            {SHARE_TARGETS.map((s) => (
              <button
                key={s.name}
                type="button"
                onClick={() => openShare(s.getUrl)}
                aria-label={s.name}
                className="flex flex-col items-center gap-1.5"
              >
                <span
                  className={`flex size-11 items-center justify-center rounded-full shadow-sm transition-opacity hover:opacity-90 ${s.bg}`}
                >
                  {s.icon}
                </span>
                <span className="caption-small text-text-secondary">{s.name}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleCopyLink}
            className="label-medium inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-border-subtle py-2.5 text-text-secondary transition-colors hover:bg-surface-subtle"
          >
            {copied ? (
              <CheckCircle className="size-4 text-green-600" aria-hidden />
            ) : (
              <Link2 className="size-4" aria-hidden />
            )}
            {copied ? t('linkCopied') : t('copyLink')}
          </button>
        </DialogContent>
      </Dialog>

      {/* Invite friends dialog (personalised message → personal channels) */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('inviteDialogTitle')}</DialogTitle>
            <DialogDescription>{t('inviteDialogDescription')}</DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-border-subtle bg-surface-subtle p-3">
            <p className="caption-medium whitespace-pre-line text-text-secondary">{inviteMessage()}</p>
          </div>
          <div className="space-y-2 py-1">
            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <button
                type="button"
                onClick={handleInviteShare}
                className="label-medium inline-flex w-full items-center gap-2 rounded-lg bg-surface-brand px-4 py-2.5 text-text-white transition-colors hover:opacity-90"
              >
                <Share className="size-4" aria-hidden />
                {t('inviteNativeShare')}
              </button>
            )}
            <button
              type="button"
              onClick={() =>
                window.open(
                  `https://wa.me/?text=${encodeURIComponent(inviteMessage())}`,
                  '_blank',
                  'noopener,noreferrer',
                )
              }
              className="label-medium inline-flex w-full items-center gap-2 rounded-lg border border-border-subtle px-4 py-2.5 text-text-primary transition-colors hover:bg-surface-subtle"
            >
              <MessageCircle className="size-4 text-[#25D366]" aria-hidden />
              {t('inviteWhatsApp')}
            </button>
            <a
              href={`mailto:?subject=${encodeURIComponent(
                t('inviteEmailSubject', { title: event.title }),
              )}&body=${encodeURIComponent(inviteMessage())}`}
              className="label-medium inline-flex w-full items-center gap-2 rounded-lg border border-border-subtle px-4 py-2.5 text-text-primary transition-colors hover:bg-surface-subtle"
            >
              <Mail className="size-4 text-text-secondary" aria-hidden />
              {t('inviteEmail')}
            </a>
            <a
              href={`sms:?&body=${encodeURIComponent(inviteMessage())}`}
              className="label-medium inline-flex w-full items-center gap-2 rounded-lg border border-border-subtle px-4 py-2.5 text-text-primary transition-colors hover:bg-surface-subtle"
            >
              <Send className="size-4 text-text-secondary" aria-hidden />
              {t('inviteSms')}
            </a>
            <button
              type="button"
              onClick={handleCopyInvite}
              className="label-medium inline-flex w-full items-center gap-2 rounded-lg border border-border-subtle px-4 py-2.5 text-text-primary transition-colors hover:bg-surface-subtle"
            >
              <Copy className="size-4 text-text-secondary" aria-hidden />
              {t('inviteCopy')}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Registration form field ──────────────────────────────────────────────────

function RegistrationField({
  field,
  value,
  onChange,
}: {
  field: RegistrationFormField;
  value: string | boolean | undefined;
  onChange: (value: string | boolean) => void;
}) {
  const type = (field.type ?? 'text').toLowerCase();
  const inputClass =
    'mt-1.5 w-full rounded-lg border border-border-subtle bg-surface-default px-3 py-2 body-small text-text-primary outline-none focus:border-border-brand';
  const label = (
    <span className="label-medium text-text-primary">
      {field.label}
      {field.required && <span className="text-text-brand"> *</span>}
    </span>
  );

  // Checkbox — boolean value.
  if (type === 'checkbox') {
    return (
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={value === true}
          onChange={(e) => onChange(e.target.checked)}
          className="size-4 rounded border-border-subtle"
        />
        {label}
      </label>
    );
  }

  // Select / radio / multiselect — render an option list as a <select>.
  if (
    (type === 'select' || type === 'radio' || type === 'multiselect') &&
    field.options &&
    field.options.length > 0
  ) {
    return (
      <label className="block">
        {label}
        <select
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        >
          <option value="" disabled>
            —
          </option>
          {field.options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </label>
    );
  }

  // Textarea.
  if (type === 'textarea') {
    return (
      <label className="block">
        {label}
        <textarea
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className={inputClass}
        />
      </label>
    );
  }

  // Default inputs: text / email / number / date.
  const htmlType =
    type === 'email' || type === 'number' || type === 'date' ? type : 'text';
  return (
    <label className="block">
      {label}
      <input
        type={htmlType}
        value={typeof value === 'string' ? value : ''}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      />
    </label>
  );
}

// ─── About section ────────────────────────────────────────────────────────────

const WHO_SHOULD_ATTEND: ReadonlyArray<{ icon: LucideIcon; tone: string; key: string }> = [
  { icon: Globe, tone: 'blue', key: 'whoDiaspora' },
  { icon: Users, tone: 'green', key: 'whoCommunity' },
  { icon: Briefcase, tone: 'orange', key: 'whoProfessionals' },
  { icon: Heart, tone: 'rose', key: 'whoFamilies' },
];

function AboutSection({
  event,
  community,
  contactEmail,
  t,
}: {
  event: Event;
  community: EmbassyEventDetailProps['community'];
  contactEmail?: string | null;
  t: ReturnType<typeof useTranslations>;
}) {
  // Highlights: derive from real `tags` when present, else sensible static items.
  const highlights: string[] =
    event.tags && event.tags.length > 0
      ? event.tags
      : [t('highlightNetworking'), t('highlightLearn'), t('highlightCommunity')];

  const paragraphs = (event.description ?? '')
    .split(/\n{2,}|\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <Card className="border-border-subtle">
      <CardContent className="space-y-5 p-5">
        <section>
          <h2 className="label-large text-text-primary">{t('aboutTitle')}</h2>
          {paragraphs.length > 0 ? (
            <div className="mt-2 space-y-2">
              {paragraphs.map((p, i) => (
                <p key={i} className="body-small text-text-secondary">
                  {p}
                </p>
              ))}
            </div>
          ) : (
            <p className="body-small mt-2 text-text-secondary">
              {t('aboutFallback', { name: community.name })}
            </p>
          )}
        </section>

        {/* Event Highlights (checklist) */}
        <section>
          <h3 className="label-medium text-text-primary">{t('highlightsTitle')}</h3>
          <ul className="mt-2 space-y-2">
            {highlights.map((item) => (
              <li key={item} className="flex items-start gap-2 caption-large text-text-secondary">
                <CheckCircle2 className="mt-0.5 size-4 flex-shrink-0 text-green-600" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* Who Should Attend (icon grid) */}
        <section>
          <h3 className="label-medium text-text-primary">{t('whoTitle')}</h3>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {WHO_SHOULD_ATTEND.map(({ icon: Icon, tone, key }) => {
              const c = TONES[tone] ?? TONES.brand;
              return (
                <div key={key} className="flex items-center gap-3 rounded-lg border border-border-subtle p-3">
                  <span className={`flex size-9 flex-shrink-0 items-center justify-center rounded-lg ${c.ring}`}>
                    <Icon className={`size-4 ${c.fg}`} aria-hidden />
                  </span>
                  <span className="caption-large text-text-primary">{t(key)}</span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Contact organizer */}
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border-subtle bg-surface-brand-subtle p-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="size-4 flex-shrink-0 text-text-brand" aria-hidden />
            <p className="caption-medium text-text-secondary">{t('contactOrganizerPrompt')}</p>
          </div>
          {contactEmail && (
            <a
              href={`mailto:${contactEmail}`}
              className="label-medium flex-shrink-0 rounded-lg border border-border-brand bg-surface-default px-3 py-1.5 text-text-brand transition-colors hover:bg-surface-subtle"
            >
              {t('contactOrganizer')}
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Venue section ────────────────────────────────────────────────────────────

function VenueSection({
  event,
  isVirtual,
  addressText,
  mapsUrl,
  t,
}: {
  event: Event;
  isVirtual: boolean;
  addressText: string;
  mapsUrl: string;
  t: ReturnType<typeof useTranslations>;
}) {
  const loc = event.locationDetails;
  return (
    <Card className="border-border-subtle">
      <CardContent className="space-y-4 p-5">
        <h2 className="label-large text-text-primary">{t('venueTitle')}</h2>
        {isVirtual ? (
          <div className="flex items-start gap-3 rounded-lg border border-border-subtle bg-surface-subtle p-4">
            <span className="flex size-10 flex-shrink-0 items-center justify-center rounded-lg bg-teal-50">
              <Video className="size-5 text-teal-600" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="label-medium text-text-primary">{t('venueVirtual')}</p>
              <p className="caption-medium text-text-secondary">
                {loc?.platform || t('venueVirtualPlatform')}
              </p>
              {loc?.virtualLink && (
                <a
                  href={loc.virtualLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="caption-medium mt-1 inline-block break-all text-text-brand hover:underline"
                >
                  {loc.virtualLink}
                </a>
              )}
            </div>
          </div>
        ) : (
          <>
            <ul className="space-y-2">
              {loc?.venueName && <VenueRow label={t('venueName')} value={loc.venueName} />}
              {loc?.address && <VenueRow label={t('venueAddress')} value={loc.address} />}
              {loc?.city && <VenueRow label={t('venueCity')} value={loc.city} />}
              {loc?.country && <VenueRow label={t('venueCountry')} value={loc.country} />}
              {!loc?.venueName && !loc?.address && !loc?.city && !loc?.country && (
                <VenueRow label={t('venueLocation')} value={addressText} />
              )}
            </ul>
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="label-medium inline-flex items-center gap-1.5 rounded-lg border border-border-brand bg-surface-default px-4 py-2 text-text-brand transition-colors hover:bg-surface-subtle"
            >
              <Navigation className="size-4" aria-hidden />
              {t('getDirections')}
            </a>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function VenueRow({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className="caption-small w-20 flex-shrink-0 text-text-secondary">{label}</span>
      <span className="caption-large text-text-primary">{value}</span>
    </li>
  );
}

// ─── Small building blocks ────────────────────────────────────────────────────

function EmptyState({ icon: Icon, title, body }: { icon: LucideIcon; title: string; body: string }) {
  return (
    <Card className="border-border-subtle">
      <CardContent className="flex flex-col items-center justify-center px-4 py-12 text-center">
        <span className="mb-3 flex size-12 items-center justify-center rounded-full bg-surface-subtle">
          <Icon className="size-6 text-text-secondary" aria-hidden />
        </span>
        <p className="body-small text-text-primary">{title}</p>
        <p className="caption-medium mt-1 text-text-secondary">{body}</p>
      </CardContent>
    </Card>
  );
}

function Meta({
  icon: Icon,
  tone,
  label,
  value,
}: {
  icon: LucideIcon;
  tone: string;
  label: string;
  value: React.ReactNode;
}) {
  const c = TONES[tone] ?? TONES.brand;
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border-subtle p-3">
      <span className={`flex size-9 flex-shrink-0 items-center justify-center rounded-lg ${c.ring}`}>
        <Icon className={`size-4 ${c.fg}`} aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="caption-small text-text-secondary">{label}</p>
        <p className="caption-large min-w-0 font-medium text-text-primary">{value}</p>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <li className="flex items-center justify-between gap-3">
      <span className="caption-medium flex items-center gap-2 text-text-secondary">
        <Icon className="size-4 flex-shrink-0" aria-hidden />
        {label}
      </span>
      <span className="caption-medium min-w-0 truncate text-text-primary">{value}</span>
    </li>
  );
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function categoryVisual(category?: string | null): { tone: Tone } {
  const cat = (category ?? '').toLowerCase();
  if (cat.includes('cultural') || cat.includes('culture')) return { tone: TONES.purple };
  if (cat.includes('community')) return { tone: TONES.blue };
  if (cat.includes('education')) return { tone: TONES.orange };
  if (cat.includes('webinar') || cat.includes('online')) return { tone: TONES.teal };
  return { tone: TONES.brand };
}

function visibilityLabel(
  visibility: Event['visibility'] | undefined,
  t: ReturnType<typeof useTranslations>,
): string {
  switch (visibility) {
    case 'public':
      return t('visibilityPublic');
    case 'community':
      return t('visibilityCommunity');
    case 'association':
      return t('visibilityAssociation');
    case 'invite_only':
      return t('visibilityInvite');
    default:
      return t('na');
  }
}

export default EmbassyEventDetail;
