'use client';

import { useMutation } from '@apollo/client/react';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { CheckCircle2, ExternalLink, Lock, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from '@/i18n/navigation';
import { UserBadge } from '@/components/custom/userBadge';
import { resolveUserTier } from '@/lib/userTier';
import { compensationParts } from '@/lib/compensation';
import { externalHost, safeExternalUrl, toDate, type OpportunityPhase } from '@/lib/opportunityDisplay';
import { GET_OPPORTUNITY, GET_USER_APPLICATIONS, WITHDRAW_APPLICATION } from '@/services/gql/opportunities';
import type { Opportunity } from '@/services/gql/types/opportunities';
import { useOpportunityLabels } from './useOpportunityLabels';

const CARD = 'rounded-2xl border border-border-subtle bg-surface-default p-4 shadow-sm sm:p-5';
const PRIMARY =
  'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-surface-brand px-5 py-2.5 text-sm font-semibold text-text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand focus-visible:ring-offset-2';

export type ApplyState =
  | { kind: 'owner' }
  | { kind: 'closed' }
  | { kind: 'applied'; applicationId: string | null }
  | { kind: 'signIn' }
  | { kind: 'form' }
  | { kind: 'external'; url: string }
  | { kind: 'email'; email: string }
  | { kind: 'none' };

/** What the viewer can do here, in order: manage (own listing) → closed → already applied → sign in → the listing's apply method. */
export function applyState(item: Opportunity, phase: OpportunityPhase, viewerId: string | null): ApplyState {
  if (viewerId && item.ownerType === 'USER' && item.ownerId === viewerId) return { kind: 'owner' };
  if (phase === 'closed') return { kind: 'closed' };
  if (item.hasCurrentUserApplied) return { kind: 'applied', applicationId: item.currentUserApplicationId ?? null };
  const method = item.applicationMethod;
  if (method === 'EXTERNAL_LINK') {
    const url = safeExternalUrl(item.externalLink);
    return url ? { kind: 'external', url } : { kind: 'none' };
  }
  if (method === 'EMAIL_REQUEST') {
    const email = item.applicationEmail?.trim();
    return email ? { kind: 'email', email } : { kind: 'none' };
  }
  // In-platform (or unset, which the backend treats as in-platform) needs an account.
  return viewerId ? { kind: 'form' } : { kind: 'signIn' };
}

export const APPLY_FORM_ID = 'apply-form';

function scrollToForm() {
  const form = document.getElementById(APPLY_FORM_ID);
  form?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  form?.querySelector<HTMLElement>('input, textarea, select')?.focus({ preventScroll: true });
}

/** The one button that matters, shared by the rail and the phone hero. Null when there is nothing to do. */
export function ApplyPrimaryAction({ item, state }: { item: Opportunity; state: ApplyState }) {
  const t = useTranslations('opportunityPage.apply');
  switch (state.kind) {
    case 'owner':
      return (
        <Link href={`/opportunities/${encodeURIComponent(item.id)}/applicants`} className={PRIMARY} data-testid="apply-primary">
          {t('manage')}
        </Link>
      );
    case 'signIn':
      return (
        <Link href="/signin" className={PRIMARY} data-testid="apply-primary">
          {t('signIn')}
        </Link>
      );
    case 'form':
      return (
        <button type="button" onClick={scrollToForm} className={PRIMARY} data-testid="apply-primary">
          {t('applyNow')}
        </button>
      );
    case 'external':
      return (
        <a href={state.url} target="_blank" rel="noopener noreferrer" className={PRIMARY} data-testid="apply-primary">
          {t('applyOnSite')}
          <ExternalLink className="size-4" aria-hidden />
          <span className="sr-only">{t('opensInNewTab')}</span>
        </a>
      );
    case 'email':
      return (
        <a href={`mailto:${state.email}`} className={PRIMARY} data-testid="apply-primary">
          <Mail className="size-4" aria-hidden />
          {t('applyByEmail')}
        </a>
      );
    default:
      return null;
  }
}

/** "How to apply": the state in words, the main action, and (once applied) withdraw. */
export function ApplyCard({ item, state }: { item: Opportunity; state: ApplyState }) {
  const t = useTranslations('opportunityPage.apply');
  const tToasts = useTranslations('home.opportunities.toasts');
  const [withdraw, { loading: withdrawing }] = useMutation<{ withdrawApplication: boolean }>(WITHDRAW_APPLICATION, {
    refetchQueries: [
      { query: GET_USER_APPLICATIONS, variables: { limit: 50, offset: 0 } },
      { query: GET_OPPORTUNITY, variables: { id: item.id } },
    ],
  });

  const onWithdraw = async (applicationId: string) => {
    if (withdrawing) return;
    try {
      const result = await withdraw({ variables: { applicationId } });
      // errorPolicy 'all': a refusal resolves with data: null / false.
      if (!result?.data?.withdrawApplication) {
        toast.error(tToasts('withdrawError'));
        return;
      }
      toast.success(tToasts('withdrawSuccess'));
    } catch {
      toast.error(tToasts('withdrawError'));
    }
  };

  const note: Record<ApplyState['kind'], string> = {
    owner: t('ownerNote'),
    closed: t('closedNote'),
    applied: t('appliedNote'),
    signIn: t('signInNote'),
    form: t('formNote'),
    external: state.kind === 'external' ? t('externalNote', { host: externalHost(state.url) }) : '',
    email: state.kind === 'email' ? t('emailNote', { email: state.email }) : '',
    none: t('noneNote'),
  };

  return (
    <section aria-labelledby="apply-card-title" className={CARD} data-testid="apply-card">
      <h2 id="apply-card-title" className="text-base font-bold text-text-primary">
        {state.kind === 'owner' ? t('ownerTitle') : t('title')}
      </h2>
      {state.kind === 'applied' && (
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-surface-success px-3 py-1 text-xs font-semibold text-text-success" data-testid="applied-badge">
          <CheckCircle2 className="size-4" aria-hidden />
          {t('applied')}
        </p>
      )}
      {state.kind === 'closed' && (
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-surface-subtle px-3 py-1 text-xs font-semibold text-text-secondary">
          <Lock className="size-3.5" aria-hidden />
          {t('closed')}
        </p>
      )}
      <p className="mt-2 break-words text-sm text-text-secondary">{note[state.kind]}</p>
      <div className="mt-4 space-y-2 empty:hidden">
        <ApplyPrimaryAction item={item} state={state} />
        {state.kind === 'applied' && state.applicationId && (
          <button
            type="button"
            onClick={() => onWithdraw(state.applicationId!)}
            disabled={withdrawing}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-border-subtle px-5 py-2.5 text-sm font-medium text-text-danger transition-colors hover:bg-surface-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand disabled:opacity-50"
          >
            {withdrawing ? t('withdrawing') : t('withdraw')}
          </button>
        )}
      </div>
    </section>
  );
}

/** "At a glance": every fact the listing has, in words. A fact it does not have is left out. */
export function FactsCard({ item }: { item: Opportunity }) {
  const t = useTranslations('opportunityPage');
  const format = useFormatter();
  const locale = useLocale();
  const labels = useOpportunityLabels();
  const pay = compensationParts(item.compensationMin, item.compensationMax, item.compensationCurrency, locale);
  const payKind = labels.compensationType(item.compensationType);
  const payText = !pay ? (item.compensationType === 'NONE' ? payKind : '') : `${pay.kind === 'range' ? `${pay.min} – ${pay.max}` : pay.kind === 'from' ? t('payFrom', { amount: pay.min }) : t('payUpTo', { amount: pay.max })}${payKind && item.compensationType !== 'NONE' ? ` · ${payKind}` : ''}`;
  const deadline = toDate(item.deadline);
  const posted = toDate(item.publishedAt) ?? toDate(item.createdAt);
  const rows: Array<[string, string]> = [
    [t('facts.type'), labels.type(item.type, item.category)],
    [t('facts.category'), labels.category(item.category)],
    [t('facts.workMode'), labels.deliveryMode(item.deliveryMode)],
    [t('facts.commitment'), labels.commitment(item.commitmentType)],
    [t('facts.pay'), payText],
    [t('facts.location'), labels.place(item.location, item.deliveryMode)],
    [t('facts.duration'), item.duration?.trim() ?? ''],
    [t('facts.deadline'), deadline ? format.dateTime(deadline, { dateStyle: 'medium' }) : t('deadline.none')],
    [t('facts.posted'), posted ? format.dateTime(posted, { dateStyle: 'medium' }) : ''],
    [t('facts.applicants'), typeof item.applicationCount === 'number' && item.applicationCount > 0 ? t('facts.applicantsCount', { count: item.applicationCount }) : ''],
  ];
  return (
    <section aria-labelledby="facts-title" className={CARD} data-testid="facts-card">
      <h2 id="facts-title" className="text-base font-bold text-text-primary">{t('facts.title')}</h2>
      <dl className="mt-3 divide-y divide-border-subtle text-sm">
        {rows
          .filter(([, v]) => !!v)
          .map(([k, v]) => (
            <div key={k} className="flex items-start justify-between gap-4 py-2.5">
              <dt className="shrink-0 text-text-secondary">{k}</dt>
              <dd className="min-w-0 break-words text-right font-medium text-text-primary">{v}</dd>
            </div>
          ))}
      </dl>
    </section>
  );
}

/** Who posted it: a name (never an id), what kind of poster, and their trust tier when there is one. */
export function PosterCard({ item, poster }: { item: Opportunity; poster: string }) {
  const t = useTranslations('opportunityPage.poster');
  const owner = item.owner as (Opportunity['owner'] & { trustScore?: number; trustTier?: string; avatarUrl?: string | null }) | undefined | null;
  const tier = resolveUserTier({ tier: owner?.trustTier, trustScore: owner?.trustScore });
  const kind = (item.ownerType ?? owner?.type ?? '').toUpperCase();
  const avatar = owner?.avatarUrl && /^https:\/\//i.test(owner.avatarUrl) ? owner.avatarUrl : null;
  return (
    <section aria-labelledby="poster-title" className={CARD} data-testid="poster-card">
      <h2 id="poster-title" className="text-base font-bold text-text-primary">{t('title')}</h2>
      <div className="mt-3 flex min-w-0 items-center gap-3">
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar} alt="" width={44} height={44} loading="lazy" decoding="async" className="size-11 shrink-0 rounded-full object-cover" />
        ) : (
          <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-full bg-surface-brand-subtle text-base font-semibold text-text-brand">
            {poster.charAt(0).toUpperCase()}
          </span>
        )}
        <div className="min-w-0">
          <p className="flex min-w-0 items-center gap-1 font-semibold text-text-primary">
            <span className="truncate">{poster}</span>
            {tier && <UserBadge tier={tier} size="xs" />}
          </p>
          {t.has(`kinds.${kind}`) && <p className="text-xs text-text-secondary">{t(`kinds.${kind}`)}</p>}
        </div>
      </div>
    </section>
  );
}
