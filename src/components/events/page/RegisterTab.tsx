'use client';

import { useMemo, useState } from 'react';
import { useLazyQuery, useMutation } from '@apollo/client/react';
import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { toast } from 'sonner';
import { ArrowLeft, Check, Crown, Minus, Plus, Tag, Ticket, User, X } from 'lucide-react';
import Step2 from '@/app/[locale]/(protected)/(main)/(home)/events/[id]/Step2';
import { ButtonType2 } from '@/components/custom/button';
import { Spinner } from '@/components/ui/spinner';
import {
  VALIDATE_PROMO_CODE,
  getEventLocationDisplay,
  type ValidatePromoCodeData,
} from '@/services/gql/events';
import {
  REGISTER_FOR_EVENT,
  type EventPageEvent,
  type RegisterForEventData,
  type RegistrationStatusGQL,
} from '@/services/gql/eventsM2';
import {
  CONFIRM_PAYMENT_INTENT,
  MY_PAYMENT_METHODS,
  type ConfirmPaymentIntentResponse,
  type MyPaymentMethodsResponse,
} from '@/services/gql/payments';
import {
  EVENT_NETWORKING_SAVE_DRAFT,
  type EventNetworkingSaveDraftData,
} from '@/services/gql/eventPageNetworking';
import { openPaystackMobileMoney } from '@/lib/paystack';
import { isMobileMoneySupported } from '@/types/money';
import { eventCodeOf, eventRefusal, hasErrors } from '@/lib/eventRefusal';
import { formatInZone } from '@/lib/eventCalendar';
import { eventFormat } from '@/lib/eventFormat';
import { canStartRegistration, type RegistrationUiState } from '@/lib/eventRegistrationState';
import { useUserStore } from '@/store/useUserStore';
import { canJoinFromEvent, type OrganiserView } from './organiser';
import type { JoinOutcome } from './OrganiserCard';
import NetworkingDraftSection, { EMPTY_DRAFT, draftIsEmpty, type NetworkingDraft } from './NetworkingDraftSection';
import RegistrationFields from './RegistrationFields';
import { useEventNetworking, useNetworkingTaxonomy } from './useEventNetworking';

/** Version of the consent text shown below; stored with the registration as the "terms hash". */
export const EVENT_TERMS_VERSION = 'event-terms-2026-10';

const SOURCES = new Set([
  'DIRECT', 'EVENT_PAGE', 'COMMUNITY_PAGE', 'FEED', 'SEARCH', 'DISCOVER', 'NOTIFICATION', 'EMAIL', 'SHARE_LINK', 'QR_CODE', 'INVITE', 'OTHER',
]);

export interface RegistrationResult {
  status: RegistrationStatusGQL | null;
  waitlistPosition: number | null;
  /** Set when a payment was needed and did not complete. The registration itself exists. */
  paymentFailed: boolean;
  /** Present only when the person ticked the organiser-community box. Separate from `status` on purpose. */
  join: JoinOutcome | null;
  /** What happened to the optional networking draft: null = none was filled in. */
  networkingDraft: 'saved' | 'unavailableYet' | 'failed' | null;
}

type Standing = 'card' | 'mobile' | null;

const parsePaymentIntentId = (secret?: string | null): string | null => {
  if (!secret) return null;
  const i = secret.indexOf('_secret_');
  return i > 0 ? secret.slice(0, i) : null;
};

export default function RegisterTab({
  event,
  organiser,
  state,
  signedIn,
  onDone,
}: {
  event: EventPageEvent;
  organiser: OrganiserView | null;
  state: RegistrationUiState;
  signedIn: boolean;
  onDone: (result: RegistrationResult) => void | Promise<void>;
}) {
  const t = useTranslations('eventPage.register');
  const tOrg = useTranslations('eventPage.organiser');
  const tErr = useTranslations('eventPage.errors');
  const tStates = useTranslations('eventPage.rail.states');
  const tPay = useTranslations('home.events.payment');
  const locale = useLocale();
  const search = useSearchParams();
  const user = useUserStore((s) => s.user);

  const tickets = useMemo(() => event.tickets ?? [], [event.tickets]);
  const [ticketId, setTicketId] = useState<string | undefined>(() => tickets.find((x) => x.availableQuantity !== 0)?.id ?? tickets[0]?.id);
  const ticket = tickets.find((x) => x.id === ticketId) ?? tickets[0];
  const [quantity, setQuantity] = useState(1);
  const [responses, setResponses] = useState<Record<string, string | string[]>>({});
  const [format, setFormat] = useState<'IN_PERSON' | 'ONLINE' | ''>('');
  const [terms, setTerms] = useState(false);
  // Deliberately unticked: registering never makes anyone a member.
  const [joinOrganiser, setJoinOrganiser] = useState(false);
  const [method, setMethod] = useState<Standing>(null);
  const [promoInput, setPromoInput] = useState('');
  const [promo, setPromo] = useState<{ code: string; discountCents: number } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [draft, setDraft] = useState<NetworkingDraft>(EMPTY_DRAFT);
  const networking = useEventNetworking(event.id, signedIn);
  const taxonomy = useNetworkingTaxonomy(event.id, signedIn && networking.available);
  const showDraft = networking.available && taxonomy.length > 0;
  const [saveDraft] = useMutation<EventNetworkingSaveDraftData>(EVENT_NETWORKING_SAVE_DRAFT);

  const [registerForEvent] = useMutation<RegisterForEventData>(REGISTER_FOR_EVENT);
  const [confirmPaymentIntent] = useMutation<ConfirmPaymentIntentResponse>(CONFIRM_PAYMENT_INTENT);
  const [fetchMethods] = useLazyQuery<MyPaymentMethodsResponse>(MY_PAYMENT_METHODS, { fetchPolicy: 'network-only' });
  const [validatePromo, { loading: validating }] = useLazyQuery<ValidatePromoCodeData>(VALIDATE_PROMO_CODE, { fetchPolicy: 'no-cache' });

  const currency = (ticket?.currency || event.currency || 'GHS').toUpperCase();
  const unitCents = event.isPaid ? (ticket?.priceInCents ?? 0) : 0;
  const subtotalCents = quantity * unitCents;
  const discountedCents = Math.max(0, subtotalCents - (promo?.discountCents ?? 0));
  const feeCents = event.isPaid ? Math.round(discountedCents * 0.1) : 0;
  const totalCents = discountedCents + feeCents;
  const money = (cents: number) => {
    try {
      return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(cents / 100);
    } catch {
      return `${currency} ${(cents / 100).toFixed(2)}`;
    }
  };

  const hybrid = eventFormat(event.locationType) === 'hybrid';
  const fields = event.registrationFormFields ?? [];
  const formOk = fields.every((f) => {
    if (!f.required) return true;
    const v = responses[f.id];
    if (f.type === 'multiselect') return Array.isArray(v) && v.length > 0;
    if (f.type === 'checkbox') return v === 'true';
    return typeof v === 'string' && v.trim().length > 0;
  });
  const needsPaymentMethod = event.isPaid && totalCents > 0;
  const missing: string[] = [];
  if (quantity < 1) missing.push(t('missing.quantity'));
  if (!formOk) missing.push(t('missing.form'));
  if (hybrid && !format) missing.push(t('missing.format'));
  if (needsPaymentMethod && !method) missing.push(t('missing.payment'));
  if (!terms) missing.push(t('missing.terms'));
  const canSubmit = missing.length === 0 && !submitting && canStartRegistration(state);

  const applyPromo = async () => {
    const code = promoInput.trim();
    if (!code) return;
    setPromoError(null);
    try {
      const res = await validatePromo({ variables: { eventId: event.id, code, totalAmountCents: subtotalCents } });
      const v = res.data?.validatePromoCode;
      if (v?.valid) {
        setPromo({ code, discountCents: v.discountAmountCents });
        setPromoInput('');
      } else {
        setPromoError(t('promo.invalid'));
      }
    } catch {
      setPromoError(t('promo.failed'));
    }
  };

  const pay = async (secret: string): Promise<boolean> => {
    const intentId = parsePaymentIntentId(secret);
    if (!intentId) return false;
    try {
      if (method === 'mobile') {
        if (!user?.email) return false;
        const { reference } = await openPaystackMobileMoney({
          email: user.email,
          amountInPesewas: totalCents,
          currency,
        });
        const r = await confirmPaymentIntent({ variables: { input: { payment_intent_id: intentId, payment_method_id: reference, provider: 'PAYSTACK' } } });
        return Boolean(r.data) && !hasErrors(r);
      }
      const { data } = await fetchMethods();
      const cards = (data?.myPaymentMethods?.payment_methods ?? []).filter((m) => m.provider === 'STRIPE' && m.type === 'card');
      const card = cards.find((m) => Boolean(m.is_primary)) ?? cards[0];
      if (!card) return false;
      const r = await confirmPaymentIntent({ variables: { input: { payment_intent_id: intentId, payment_method_id: card.id, provider: 'STRIPE' } } });
      return Boolean(r.data) && !hasErrors(r);
    } catch {
      return false;
    }
  };

  /** Best effort and separate from the registration: a refused draft never reads as a failed registration. */
  const persistDraft = async (): Promise<'saved' | 'unavailableYet' | 'failed'> => {
    try {
      const res = await saveDraft({
        variables: {
          eventId: event.id,
          profile: {
            industries: draft.industries,
            interests: draft.interests,
            offers: draft.offers,
            needs: draft.needs,
            intro: draft.note.trim() || undefined,
          },
        },
      });
      if (res.data?.eventNetworkingSaveDraft && !hasErrors(res)) return 'saved';
      return eventCodeOf(res) === 'EVENT_NETWORKING_FEATURE_UNAVAILABLE' ? 'unavailableYet' : 'failed';
    } catch (err) {
      return eventCodeOf(err) === 'EVENT_NETWORKING_FEATURE_UNAVAILABLE' ? 'unavailableYet' : 'failed';
    }
  };

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const sourceParam = (search.get('source') ?? '').toUpperCase();
      const invite = search.get('invite')?.trim().slice(0, 64) || undefined;
      const source = SOURCES.has(sourceParam) ? sourceParam : invite ? 'INVITE' : 'EVENT_PAGE';
      const formResponsesJson = fields.length
        ? JSON.stringify(Object.fromEntries(fields.map((f) => [f.id, responses[f.id] ?? (f.type === 'multiselect' ? [] : '')])))
        : undefined;
      const offerJoin = Boolean(organiser && canJoinFromEvent(organiser));
      const result = await registerForEvent({
        variables: {
          input: {
            eventId: event.id,
            ticketId: event.isPaid ? ticketId : undefined,
            quantity,
            promoCode: promo?.code,
            formResponsesJson,
            attendanceFormat: hybrid && format ? format : undefined,
            source,
            inviteCode: invite,
            termsAccepted: true,
            termsHash: EVENT_TERMS_VERSION,
            joinOrganiserCommunity: offerJoin && joinOrganiser ? true : undefined,
          },
        },
      });
      const data = result.data?.registerForEvent;
      if (!data?.registrationId) {
        const refusal = eventRefusal(result);
        toast.error(tErr(refusal.key));
        return;
      }
      let paymentFailed = false;
      if (data.paymentIntentClientSecret) paymentFailed = !(await pay(data.paymentIntentClientSecret));
      if (paymentFailed) toast.error(tPay('paymentFailed'));
      const j = data.organiserCommunityJoin;
      const networkingDraft = showDraft && !draftIsEmpty(draft) ? await persistDraft() : null;
      await onDone({
        status: data.registrationStatus ?? null,
        waitlistPosition: data.waitlistPosition ?? null,
        paymentFailed,
        join: j ? { kind: 'result', status: j.status, requiresPayment: j.requiresPayment } : null,
        networkingDraft,
      });
    } catch (err) {
      toast.error(tErr(eventRefusal(err).key));
    } finally {
      setSubmitting(false);
    }
  };

  if (!signedIn) {
    return (
      <div className="rounded-2xl border border-border-subtle bg-surface-default p-6 text-center space-y-3">
        <p className="text-text-primary">{t('signInPrompt')}</p>
        <Link href="/signin" className="inline-block text-text-brand font-medium hover:underline">{t('signIn')}</Link>
      </div>
    );
  }

  if (!canStartRegistration(state)) {
    return (
      <div className="rounded-2xl border border-border-subtle bg-surface-default p-6 space-y-2" data-testid="register-unavailable">
        <p className="font-medium text-text-primary">{tStates(state, { date: event.registrationOpensAt ? formatInZone(event.registrationOpensAt, locale, event.timezone) : '' })}</p>
      </div>
    );
  }

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ');
  const showOrganiserBox = organiser && canJoinFromEvent(organiser);
  const submitLabel = state === 'full'
    ? t('submit.waitlist')
    : event.requiresApproval
      ? t('submit.requestApproval')
      : event.isPaid
        ? t('submit.paid')
        : t('submit.free');

  // Sections are numbered as they appear: a hybrid-only or networking-only step that is not
  // shown never leaves a gap in the numbers.
  let n = 0;
  const next = () => ++n;
  const ticketIcons = [User, Ticket, Crown];
  const cardClass = (on: boolean, soldOut: boolean) =>
    `relative flex min-h-11 flex-col gap-1 rounded-xl border p-4 text-left text-sm ${on ? 'border-border-brand bg-surface-info' : 'border-border-subtle bg-surface-default'} ${soldOut ? 'opacity-50' : 'cursor-pointer'}`;

  return (
    <div className="space-y-4" data-testid="register-tab">
      {state === 'full' && <p className="rounded-xl bg-surface-warning p-3 text-sm text-text-warning">{t('fullNote')}</p>}
      {event.requiresApproval && state !== 'full' && <p className="rounded-xl bg-surface-subtle p-3 text-sm text-text-secondary">{t('approvalNote')}</p>}

      <div className="space-y-6 rounded-2xl border border-border-subtle bg-surface-default p-4 sm:p-6">
        <header className="flex items-start gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-surface-info text-text-brand"><Ticket className="size-6" aria-hidden /></span>
          <div>
            <h2 className="text-xl font-bold text-text-primary">{t('heading')}</h2>
            <p className="text-sm text-text-secondary">{t('headingSub', { title: event.title })}</p>
          </div>
        </header>

        <section aria-labelledby="reg-attendee" className="space-y-3 border-t border-border-subtle pt-5">
          <div>
            <h3 id="reg-attendee" className="text-base font-bold text-text-primary">{next()}. {t('attendee')}</h3>
            <p className="text-sm text-text-secondary">{t('attendeeSub')}</p>
          </div>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="min-w-0 rounded-lg border border-border-subtle bg-surface-subtle/50 px-3 py-2">
              <dt className="text-xs text-text-secondary">{t('name')}</dt>
              <dd className="break-words text-sm text-text-primary">{fullName || '—'}</dd>
            </div>
            <div className="min-w-0 rounded-lg border border-border-subtle bg-surface-subtle/50 px-3 py-2">
              <dt className="text-xs text-text-secondary">{t('email')}</dt>
              <dd className="break-all text-sm text-text-primary">{user?.email || '—'}</dd>
            </div>
          </dl>
          <p className="text-xs text-text-secondary">{t('attendeeNote')}</p>
          <RegistrationFields
            fields={event.registrationFormFields ?? []}
            responses={responses}
            onChange={(id, v) => setResponses((p) => ({ ...p, [id]: v }))}
          />
        </section>

        <section aria-labelledby="reg-type" className="space-y-3 border-t border-border-subtle pt-5">
          <div>
            <h3 id="reg-type" className="text-base font-bold text-text-primary">{next()}. {t('type.title')}</h3>
            <p className="text-sm text-text-secondary">{t('type.sub')}</p>
          </div>
          <fieldset className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <legend className="sr-only">{t('ticketTypes')}</legend>
            {(tickets.length > 0 ? tickets : [null]).map((x, i) => {
              const Icon = ticketIcons[i % ticketIcons.length];
              const soldOut = x?.availableQuantity === 0;
              const on = x ? ticketId === x.id : true;
              const price = x ? (event.isPaid && x.priceInCents > 0 ? money(x.priceInCents) : tPay('free')) : event.isPaid ? money(unitCents) : tPay('free');
              return (
                <label key={x?.id ?? 'general'} className={cardClass(on, Boolean(soldOut))}>
                  <input
                    type="radio"
                    name="ticket"
                    className="sr-only"
                    checked={on}
                    disabled={soldOut || tickets.length <= 1}
                    onChange={() => x && setTicketId(x.id)}
                  />
                  <Icon className="size-5 text-text-brand" aria-hidden />
                  <span className="font-semibold text-text-primary">{x?.name ?? t('type.general')}{soldOut ? ` · ${t('soldOut')}` : ''}</span>
                  {x?.description && <span className="text-xs text-text-secondary">{x.description}</span>}
                  <span className="mt-1 font-semibold text-text-primary">{price}</span>
                  {on && <span className="absolute right-3 top-3 grid size-5 place-items-center rounded-full bg-surface-brand text-text-white"><Check className="size-3" aria-hidden /></span>}
                </label>
              );
            })}
          </fieldset>
          <div className="flex items-center gap-3 text-sm text-text-primary">
            <span id="reg-qty-label">{t('quantity')}</span>
            <div className="flex h-11 items-center rounded-full border border-border-brand px-2" role="group" aria-labelledby="reg-qty-label">
              <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} disabled={quantity <= 1} aria-label={t('decrease')} className="grid size-9 place-items-center rounded-full text-text-brand disabled:opacity-50"><Minus className="size-4" aria-hidden /></button>
              <span className="w-8 text-center" data-testid="quantity-value" aria-live="polite">{quantity}</span>
              <button type="button" onClick={() => setQuantity((q) => q + 1)} aria-label={t('increase')} className="grid size-9 place-items-center rounded-full text-text-brand"><Plus className="size-4" aria-hidden /></button>
            </div>
          </div>

          {event.isPaid && (
            <div className="space-y-3 rounded-xl border border-border-subtle p-4" aria-labelledby="reg-summary" role="group">
              <h4 id="reg-summary" className="font-semibold text-text-primary">{t('summary.title')}</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span>{ticket?.name ?? tPay('ticketTypeRegular')} × {quantity}</span><span>{money(subtotalCents)}</span></div>
                {promo && <div className="flex justify-between text-text-success"><span>{t('summary.discount', { code: promo.code })}</span><span>−{money(promo.discountCents)}</span></div>}
                <div className="flex justify-between"><span>{tPay('serviceFee')}</span><span>{money(feeCents)}</span></div>
                <div className="flex justify-between border-t border-border-subtle pt-2 font-semibold"><span>{tPay('total')}</span><span>{money(totalCents)}</span></div>
              </div>
              {promo ? (
                <div className="flex items-center justify-between rounded-md bg-surface-subtle px-3 py-2 text-sm text-text-success">
                  <span className="flex items-center gap-2"><Tag className="size-4" aria-hidden />{t('promo.applied', { code: promo.code })}</span>
                  <button type="button" onClick={() => setPromo(null)} aria-label={t('promo.remove')} className="p-1 text-text-secondary hover:text-text-danger"><X className="size-4" /></button>
                </div>
              ) : (
                <div className="space-y-1">
                  <label htmlFor="promo-code" className="text-sm text-text-secondary">{t('promo.label')}</label>
                  <div className="flex gap-2">
                    <input id="promo-code" value={promoInput} onChange={(e) => { setPromoInput(e.target.value); setPromoError(null); }} onKeyDown={(e) => e.key === 'Enter' && applyPromo()} className="h-11 flex-1 rounded-md border-2 border-border-subtle bg-surface-subtle px-3 text-sm focus:outline-none" />
                    <button type="button" onClick={applyPromo} disabled={validating || !promoInput.trim()} className="h-11 rounded-md bg-surface-brand px-4 text-sm text-text-white disabled:opacity-50">
                      {validating ? <Spinner className="size-4" /> : t('promo.apply')}
                    </button>
                  </div>
                  {promoError && <p className="text-xs text-text-danger">{promoError}</p>}
                </div>
              )}
              {needsPaymentMethod && (
                <Step2 openMethod={method} onOpenMethodChange={setMethod} mobileMoneyAvailable={isMobileMoneySupported(currency)} currency={currency} />
              )}
            </div>
          )}
        </section>

        {hybrid && (
          <section aria-labelledby="reg-format" className="space-y-3 border-t border-border-subtle pt-5">
            <div>
              <h3 id="reg-format" className="text-base font-bold text-text-primary">{next()}. {t('format.label')}</h3>
              <p className="text-sm text-text-secondary">{t('format.sub')}</p>
            </div>
            <fieldset className="grid gap-3 sm:grid-cols-2">
              <legend className="sr-only">{t('format.label')}</legend>
              {(['IN_PERSON', 'ONLINE'] as const).map((f) => (
                <label key={f} className={cardClass(format === f, false)}>
                  <input type="radio" name="attendance-format" checked={format === f} onChange={() => setFormat(f)} className="sr-only" />
                  <span className="font-semibold text-text-primary">{t(f === 'IN_PERSON' ? 'format.inPerson' : 'format.online')}</span>
                  <span className="text-xs text-text-secondary">{f === 'IN_PERSON' ? getEventLocationDisplay(event) : t('format.onlineSub')}</span>
                  {format === f && <span className="absolute right-3 top-3 grid size-5 place-items-center rounded-full bg-surface-brand text-text-white"><Check className="size-3" aria-hidden /></span>}
                </label>
              ))}
            </fieldset>
          </section>
        )}

        {showDraft && <NetworkingDraftSection number={next()} taxonomy={taxonomy} draft={draft} onChange={setDraft} />}

        <section aria-labelledby="reg-terms" className="space-y-4 border-t border-border-subtle pt-5">
          <h3 id="reg-terms" className="text-base font-bold text-text-primary">{next()}. {t('terms.title')}</h3>
          <label className="flex cursor-pointer items-start gap-3 text-sm text-text-primary">
            <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-0.5 size-5 accent-surface-brand" data-testid="terms-checkbox" />
            <span>
              {t.rich('terms.label', {
                tos: (c) => <Link href="/terms" className="text-text-brand underline">{c}</Link>,
                privacy: (c) => <Link href="/privacy" className="text-text-brand underline">{c}</Link>,
              })}
            </span>
          </label>

          {organiser && organiser.standing === 'none' && (
            showOrganiserBox ? (
              <label className="flex cursor-pointer items-start gap-3 text-sm text-text-primary">
                <input type="checkbox" checked={joinOrganiser} onChange={(e) => setJoinOrganiser(e.target.checked)} className="mt-0.5 size-5 accent-surface-brand" data-testid="join-organiser-checkbox" />
                <span>
                  {organiser.needsApproval ? t('joinOrganiser.labelRequest', { name: organiser.entity.name }) : t('joinOrganiser.label', { name: organiser.entity.name })}
                  <span className="block text-xs text-text-secondary">{t('joinOrganiser.note')}</span>
                </span>
              </label>
            ) : (
              <p className="text-sm text-text-secondary" data-testid="join-organiser-link">
                {organiser.paid ? tOrg('paid', { name: organiser.entity.name }) : tOrg('inviteOnly', { name: organiser.entity.name })}{' '}
                <Link href={organiser.href} className="font-medium text-text-brand hover:underline">{tOrg('openCommunity', { name: organiser.entity.name })}</Link>
              </p>
            )
          )}
        </section>

        {!canSubmit && missing.length > 0 && (
          <p className="text-sm text-text-secondary" data-testid="register-missing">{t('missing.intro')} {missing.join(' · ')}</p>
        )}
        <div className="flex flex-col-reverse items-stretch gap-3 border-t border-border-subtle pt-5 sm:flex-row sm:items-center sm:justify-between">
          <Link href={`/events/${event.id}`} className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-text-brand hover:underline">
            <ArrowLeft className="size-4" aria-hidden />{t('backToEvent')}
          </Link>
          <ButtonType2 onClick={submit} disabled={!canSubmit} size="lg" className="sm:min-w-56" data-testid="register-submit">
            {submitting ? <Spinner className="mx-auto size-5" /> : submitLabel}
          </ButtonType2>
        </div>
      </div>
    </div>
  );
}
