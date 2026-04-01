"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@apollo/client/react";
import { CREATE_EVENT, PUBLISH_EVENT, type CreateEventData } from "@/services/gql/events";
import { ButtonType2, ButtonType3 } from "@/components/custom/button";
import { TextInput, TextArea, Select } from "@/components/custom/input";
import { Loader2, ChevronLeft, ChevronRight, Globe } from "lucide-react";
import { toast } from "sonner";
import { useUserStore } from "@/store/useUserStore";
import { Link } from "@/i18n/navigation";

const EVENT_CATEGORIES = [
  { value: "Community", label: "Community" },
  { value: "Technology", label: "Technology" },
  { value: "Culture", label: "Culture" },
  { value: "Business", label: "Business" },
  { value: "Education", label: "Education" },
  { value: "Sports", label: "Sports" },
  { value: "Arts", label: "Arts & Entertainment" },
  { value: "Food", label: "Food & Drink" },
  { value: "Health", label: "Health & Wellness" },
  { value: "Other", label: "Other" },
];

const VISIBILITY_OPTIONS = [
  { value: "public", label: "Public — everyone" },
  { value: "community", label: "Community members only" },
  { value: "association", label: "Association members only" },
  { value: "invite_only", label: "Invite only" },
];

const TIMEZONES = [
  { value: "Africa/Accra", label: "Africa/Accra (GMT+0)" },
  { value: "Africa/Lagos", label: "Africa/Lagos (GMT+1)" },
  { value: "Africa/Nairobi", label: "Africa/Nairobi (GMT+3)" },
  { value: "Europe/London", label: "Europe/London" },
  { value: "Europe/Paris", label: "Europe/Paris (CET)" },
  { value: "America/New_York", label: "America/New_York (ET)" },
  { value: "America/Chicago", label: "America/Chicago (CT)" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles (PT)" },
  { value: "UTC", label: "UTC" },
];

const CURRENCIES = [
  { value: "GHS", label: "GHS — Ghana Cedi" },
  { value: "USD", label: "USD — US Dollar" },
  { value: "GBP", label: "GBP — British Pound" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "NGN", label: "NGN — Nigerian Naira" },
  { value: "KES", label: "KES — Kenyan Shilling" },
];

type Step = 1 | 2 | 3;

interface FormData {
  title: string;
  description: string;
  eventCategory: string;
  visibility: string;
  timezone: string;
  startAt: string;
  endAt: string;
  locationType: 'physical' | 'virtual' | 'hybrid';
  venue: string;
  address: string;
  city: string;
  country: string;
  virtualLink: string;
  platform: string;
  isPaid: boolean;
  ticketPriceStr: string;
  currency: string;
  capacityType: 'limited' | 'unlimited';
  capacityStr: string;
  coverImageUrl: string;
  tags: string;
}

const INITIAL: FormData = {
  title: '',
  description: '',
  eventCategory: '',
  visibility: 'public',
  timezone: 'Africa/Accra',
  startAt: '',
  endAt: '',
  locationType: 'physical',
  venue: '',
  address: '',
  city: '',
  country: '',
  virtualLink: '',
  platform: '',
  isPaid: false,
  ticketPriceStr: '',
  currency: 'GHS',
  capacityType: 'unlimited',
  capacityStr: '',
  coverImageUrl: '',
  tags: '',
};

function toIso(localDatetimeStr: string): string {
  if (!localDatetimeStr) return '';
  return new Date(localDatetimeStr).toISOString();
}

export default function CreateEventPage() {
  const router = useRouter();
  const user = useUserStore((s) => s.user);
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormData>(INITIAL);
  const [createdEventId, setCreatedEventId] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  const [createEvent, { loading: creating }] = useMutation<CreateEventData>(CREATE_EVENT);
  const [publishEvent] = useMutation(PUBLISH_EVENT);

  const set = (key: keyof FormData, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // Step validation
  const step1Valid =
    form.title.trim().length > 0 &&
    form.description.trim().length > 0 &&
    form.eventCategory.length > 0 &&
    form.startAt.length > 0 &&
    form.endAt.length > 0 &&
    new Date(form.startAt) < new Date(form.endAt);

  const step2Valid =
    form.locationType === 'physical'
      ? form.city.trim().length > 0
      : form.locationType === 'virtual'
        ? form.virtualLink.trim().length > 0
        : form.city.trim().length > 0 && form.virtualLink.trim().length > 0;

  const step3Valid =
    !form.isPaid || (form.ticketPriceStr.trim().length > 0 && Number(form.ticketPriceStr) > 0);

  const handleCreateDraft = async () => {
    if (!user) { toast.error("Please log in"); return; }
    const ticketPrice = form.isPaid ? Math.round(Number(form.ticketPriceStr) * 100) : undefined;
    const capacity = form.capacityType === 'limited' ? Number(form.capacityStr) : undefined;

    try {
      const { data } = await createEvent({
        variables: {
          input: {
            ownerType: 'user',
            ownerId: user.userId,
            title: form.title.trim(),
            description: form.description.trim(),
            eventCategory: form.eventCategory,
            visibility: form.visibility,
            locationType: form.locationType,
            locationDetails: {
              type: form.locationType,
              venue: form.venue || undefined,
              address: form.address || undefined,
              city: form.city || undefined,
              country: form.country || undefined,
              virtualLink: form.virtualLink || undefined,
              platform: form.platform || undefined,
            },
            startAt: toIso(form.startAt),
            endAt: toIso(form.endAt),
            timezone: form.timezone,
            isPaid: form.isPaid,
            ticketPrice,
            currency: form.isPaid ? form.currency : undefined,
            capacity,
            coverImageUrl: form.coverImageUrl || undefined,
            tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
          },
        },
      });
      const id = data?.createEvent?.id;
      if (!id) throw new Error('No event ID returned');
      setCreatedEventId(id);
      return id;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create event');
      return null;
    }
  };

  const handleSaveDraft = async () => {
    const id = await handleCreateDraft();
    if (id) {
      toast.success('Event saved as draft');
      router.push(`/events/${id}/manage`);
    }
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      const id = createdEventId ?? (await handleCreateDraft());
      if (!id) return;
      await publishEvent({ variables: { id } });
      toast.success('Event published!');
      router.push(`/events/${id}/manage`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to publish');
    } finally {
      setIsPublishing(false);
    }
  };

  const steps = [
    { label: 'Details', num: 1 as Step },
    { label: 'Location', num: 2 as Step },
    { label: 'Pricing', num: 3 as Step },
  ];

  return (
    <div className="h-[calc(100vh-4rem)] lg:w-[60vw] overflow-y-auto scrollbar-hide p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/events" className="text-text-secondary hover:text-text-brand">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className="heading-small">Create Event</h1>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2">
          {steps.map((s, i) => (
            <div key={s.num} className="flex items-center gap-2">
              <button
                onClick={() => step > s.num && setStep(s.num)}
                className={`flex items-center justify-center w-7 h-7 rounded-full text-sm font-medium transition-colors
                  ${step === s.num ? 'bg-surface-brand text-text-white' : step > s.num ? 'bg-surface-brand/20 text-text-brand cursor-pointer' : 'bg-surface-subtle text-text-secondary'}`}
              >
                {s.num}
              </button>
              <span className={`text-sm ${step === s.num ? 'text-text-primary font-medium' : 'text-text-secondary'}`}>
                {s.label}
              </span>
              {i < steps.length - 1 && <div className="w-8 h-px bg-border-subtle mx-1" />}
            </div>
          ))}
        </div>

        {/* Step 1 — Details */}
        {step === 1 && (
          <div className="space-y-4">
            <TextInput
              label="Event Title"
              id="title"
              placeholder="e.g. Community Meetup"
              value={form.title}
              onChange={(v) => set('title', v)}
              required
            />
            <TextArea
              label="Description"
              id="description"
              placeholder="What's the event about?"
              value={form.description}
              onChange={(v) => set('description', v)}
              rows={5}
              required
            />
            <Select
              label="Category"
              id="category"
              value={form.eventCategory}
              onChange={(v) => set('eventCategory', v)}
              options={EVENT_CATEGORIES}
              required
            />
            <div className="grid grid-cols-2 gap-4">
              <TextInput
                label="Start date & time"
                id="startAt"
                type="datetime-local"
                placeholder=""
                value={form.startAt}
                onChange={(v) => set('startAt', v)}
                required
              />
              <TextInput
                label="End date & time"
                id="endAt"
                type="datetime-local"
                placeholder=""
                value={form.endAt}
                onChange={(v) => set('endAt', v)}
                required
              />
            </div>
            {form.startAt && form.endAt && new Date(form.startAt) >= new Date(form.endAt) && (
              <p className="text-xs text-text-danger">End time must be after start time.</p>
            )}
            <Select label="Timezone" id="timezone" value={form.timezone} onChange={(v) => set('timezone', v)} options={TIMEZONES} />
            <Select label="Visibility" id="visibility" value={form.visibility} onChange={(v) => set('visibility', v)} options={VISIBILITY_OPTIONS} />
            <TextInput
              label="Cover image URL (optional)"
              id="coverImageUrl"
              placeholder="https://..."
              value={form.coverImageUrl}
              onChange={(v) => set('coverImageUrl', v)}
            />
            <TextInput
              label="Tags (comma-separated, optional)"
              id="tags"
              placeholder="community, networking, tech"
              value={form.tags}
              onChange={(v) => set('tags', v)}
            />
          </div>
        )}

        {/* Step 2 — Location */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-text-secondary font-medium">Location type</p>
              <div className="flex gap-2">
                {(['physical', 'virtual', 'hybrid'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => set('locationType', t)}
                    className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors
                      ${form.locationType === t ? 'bg-surface-brand text-text-white border-surface-brand' : 'border-border-subtle text-text-secondary hover:text-text-primary'}`}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {(form.locationType === 'physical' || form.locationType === 'hybrid') && (
              <>
                <TextInput label="Venue name" id="venue" placeholder="The Hub" value={form.venue} onChange={(v) => set('venue', v)} />
                <TextInput label="Address" id="address" placeholder="123 Main St" value={form.address} onChange={(v) => set('address', v)} />
                <div className="grid grid-cols-2 gap-4">
                  <TextInput label="City" id="city" placeholder="Accra" value={form.city} onChange={(v) => set('city', v)} required />
                  <TextInput label="Country" id="country" placeholder="Ghana" value={form.country} onChange={(v) => set('country', v)} />
                </div>
              </>
            )}

            {(form.locationType === 'virtual' || form.locationType === 'hybrid') && (
              <>
                <TextInput label="Virtual link" id="virtualLink" placeholder="https://meet.example.com/abc" value={form.virtualLink} onChange={(v) => set('virtualLink', v)} required />
                <TextInput label="Platform" id="platform" placeholder="Zoom, Google Meet, etc." value={form.platform} onChange={(v) => set('platform', v)} />
              </>
            )}
          </div>
        )}

        {/* Step 3 — Pricing & Capacity */}
        {step === 3 && (
          <div className="space-y-5">
            {/* Paid toggle */}
            <div className="flex items-center justify-between p-4 rounded-lg border border-border-subtle">
              <div>
                <p className="font-medium text-text-primary">Paid event</p>
                <p className="text-sm text-text-secondary">Charge attendees for tickets</p>
              </div>
              <button
                onClick={() => set('isPaid', !form.isPaid)}
                className={`relative w-11 h-6 rounded-full transition-colors ${form.isPaid ? 'bg-surface-brand' : 'bg-surface-subtle border border-border-subtle'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${form.isPaid ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            {form.isPaid && (
              <div className="grid grid-cols-2 gap-4">
                <TextInput
                  label="Ticket price"
                  id="ticketPrice"
                  type="number"
                  placeholder="20.00"
                  value={form.ticketPriceStr}
                  onChange={(v) => set('ticketPriceStr', v)}
                  required
                />
                <Select label="Currency" id="currency" value={form.currency} onChange={(v) => set('currency', v)} options={CURRENCIES} />
              </div>
            )}

            {/* Capacity */}
            <div className="space-y-3">
              <p className="text-sm text-text-secondary font-medium">Capacity</p>
              <div className="flex gap-2">
                {(['unlimited', 'limited'] as const).map((ct) => (
                  <button
                    key={ct}
                    onClick={() => set('capacityType', ct)}
                    className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors
                      ${form.capacityType === ct ? 'bg-surface-brand text-text-white border-surface-brand' : 'border-border-subtle text-text-secondary hover:text-text-primary'}`}
                  >
                    {ct.charAt(0).toUpperCase() + ct.slice(1)}
                  </button>
                ))}
              </div>
              {form.capacityType === 'limited' && (
                <TextInput
                  label="Max attendees"
                  id="capacity"
                  type="number"
                  placeholder="100"
                  value={form.capacityStr}
                  onChange={(v) => set('capacityStr', v)}
                  required
                />
              )}
            </div>

            {/* Summary */}
            <div className="rounded-lg border border-border-subtle p-4 space-y-2 bg-surface-subtle">
              <p className="font-medium text-text-primary flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Summary
              </p>
              <p className="text-sm text-text-secondary">{form.title || '—'}</p>
              <p className="text-sm text-text-secondary">{form.eventCategory || '—'} · {form.visibility}</p>
              <p className="text-sm text-text-secondary">
                {form.isPaid ? `${form.currency} ${Number(form.ticketPriceStr || 0).toFixed(2)} / ticket` : 'Free'}
                {' · '}
                {form.capacityType === 'limited' ? `${form.capacityStr} spots` : 'Unlimited'}
              </p>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-2">
          <ButtonType3
            onClick={() => step > 1 ? setStep((step - 1) as Step) : router.push('/events')}
            size="lg"
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </ButtonType3>

          <div className="flex gap-2">
            {step < 3 && (
              <ButtonType2
                onClick={() => setStep((step + 1) as Step)}
                disabled={step === 1 ? !step1Valid : !step2Valid}
                size="lg"
                className="flex items-center gap-1"
              >
                Next <ChevronRight className="w-4 h-4" />
              </ButtonType2>
            )}
            {step === 3 && (
              <>
                <ButtonType3
                  onClick={handleSaveDraft}
                  disabled={creating || !step3Valid}
                  size="lg"
                >
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save draft'}
                </ButtonType3>
                <ButtonType2
                  onClick={handlePublish}
                  disabled={isPublishing || creating || !step3Valid}
                  size="lg"
                  className="flex items-center gap-2"
                >
                  {isPublishing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Publish'}
                </ButtonType2>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
