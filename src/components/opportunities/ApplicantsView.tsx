'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { ArrowLeft, FileText, Mail, MapPin, Phone } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Link } from '@/i18n/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ACCEPT_APPLICATION, GET_APPLICATIONS, GET_OPPORTUNITY_HEADER, REJECT_APPLICATION } from '@/services/gql/opportunities';
import { displayName } from '@/lib/displayName';
import { httpUrlOrNull } from '@/lib/safeUrl';
import { parseCustomAnswers } from '@/lib/applicationAnswers';

const PAGE = 20;
const MAX_LIMIT = 200;

interface ApplicantProfile {
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  location?: string | null;
  city?: string | null;
  countryOfOrigin?: string | null;
  residenceCountry?: string | null;
}
interface ApplicationRow {
  id: string;
  status: string;
  createdAt: string;
  reviewNotes?: string | null;
  coverLetter?: string | null;
  customAnswers?: string | null;
  applicationFiles?: Array<{ path: string; filename: string; mimeType: string; sizeBytes: number; url?: string | null }> | null;
  applicantProfile?: ApplicantProfile | null;
}
interface ApplicationsData {
  getApplications: { total: number; applications: ApplicationRow[] };
}
interface HeaderData {
  getOpportunity: { id: string; title: string; status: string; applicationCount?: number | null } | null;
}

const PILL: Record<string, string> = {
  PENDING: 'bg-surface-info text-text-info',
  REVIEWING: 'bg-surface-info text-text-info',
  ACCEPTED: 'bg-surface-success text-text-success',
  REJECTED: 'bg-surface-danger text-text-danger',
  WITHDRAWN: 'border border-border-subtle bg-surface-default text-text-secondary',
};
const DECIDED = new Set(['ACCEPTED', 'REJECTED', 'WITHDRAWN']);

const initials = (name: string) =>
  name.split(' ').filter(Boolean).slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join('') || '?';

/** `/opportunities/{id}/applicants` — read applications to your listing and accept or reject them. Never shows ids. */
export function ApplicantsView({ opportunityId }: { opportunityId: string }) {
  const t = useTranslations('opportunities.applicants');
  const format = useFormatter();
  const [limit, setLimit] = useState(PAGE);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  const header = useQuery<HeaderData>(GET_OPPORTUNITY_HEADER, { variables: { id: opportunityId } });
  const { data, loading, error, refetch } = useQuery<ApplicationsData>(GET_APPLICATIONS, {
    variables: { input: { opportunityId, limit, offset: 0 } },
    fetchPolicy: 'cache-and-network',
  });
  const [accept, { loading: accepting }] = useMutation<{ acceptApplication: boolean }>(ACCEPT_APPLICATION);
  const [reject, { loading: rejecting }] = useMutation<{ rejectApplication: boolean }>(REJECT_APPLICATION);
  const busy = accepting || rejecting;

  const rows = useMemo(() => data?.getApplications.applications ?? [], [data]);
  const total = data?.getApplications.total ?? 0;
  const selected = rows.find((r) => r.id === selectedId) ?? null;
  const nameOf = (p?: ApplicantProfile | null) =>
    displayName({ firstName: [p?.firstName, p?.middleName].filter(Boolean).join(' '), lastName: p?.lastName }, t('unknownApplicant'));

  const decide = async (kind: 'accept' | 'reject') => {
    if (!selected || busy) return;
    const text = notes.trim() || undefined;
    try {
      const res = kind === 'accept'
        ? await accept({ variables: { id: selected.id, notes: text } })
        : await reject({ variables: { id: selected.id, reason: text } });
      const ok = kind === 'accept'
        ? (res.data as { acceptApplication?: boolean } | null | undefined)?.acceptApplication
        : (res.data as { rejectApplication?: boolean } | null | undefined)?.rejectApplication;
      // errorPolicy 'all': a refusal resolves with data null / false.
      if (ok !== true) {
        toast.error(t('decisionFailed'));
        return;
      }
      toast.success(kind === 'accept' ? t('accepted') : t('rejected'));
      setNotes('');
      await refetch();
    } catch {
      toast.error(t('decisionFailed'));
    }
  };

  const opp = header.data?.getOpportunity;
  const answers = parseCustomAnswers(selected?.customAnswers);

  return (
    <div className="h-app-inner overflow-y-auto scrollbar-hide bg-background">
      <div className="mx-auto w-full px-4 py-4 pb-10 lg:w-[80vw] lg:px-0 lg:py-6">
        <Link href="/opportunities/mine" className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand">
          <ArrowLeft className="size-4" aria-hidden />
          {t('back')}
        </Link>
        <header className="mt-1">
          <h1 className="break-words text-2xl font-bold text-text-primary sm:text-3xl">{t('title')}</h1>
          {opp?.title && <p className="mt-0.5 break-words text-sm text-text-secondary">{opp.title}</p>}
        </header>

        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]" aria-busy={loading}>
          <section aria-labelledby="applicants-list-title" className="min-w-0">
            <h2 id="applicants-list-title" className="mb-2 text-sm font-semibold text-text-secondary">{t('listTitle', { count: total })}</h2>
            {error && !data ? (
              <div role="alert" className="rounded-xl border border-border-subtle bg-surface-danger p-4 text-sm text-text-danger">
                {t('loadFailed')}{' '}
                <button type="button" onClick={() => refetch()} className="font-semibold underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand">{t('retry')}</button>
              </div>
            ) : loading && !data ? (
              <p className="text-sm text-text-secondary">{t('loading')}</p>
            ) : rows.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border-subtle p-6 text-center text-sm text-text-secondary">{t('empty')}</p>
            ) : (
              <ul className="space-y-2">
                {rows.map((r) => {
                  const name = nameOf(r.applicantProfile);
                  const active = r.id === selectedId;
                  return (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => { setSelectedId(r.id); setNotes(''); }}
                        aria-current={active ? 'true' : undefined}
                        data-testid="applicant-row"
                        className={`flex min-h-14 w-full min-w-0 items-center gap-3 rounded-xl border p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand ${active ? 'border-border-brand bg-surface-brand-light/40' : 'border-border-subtle bg-surface-default hover:bg-surface-subtle'}`}
                      >
                        <Avatar className="size-10">
                          {r.applicantProfile?.avatarUrl && <AvatarImage src={r.applicantProfile.avatarUrl} alt="" />}
                          <AvatarFallback>{initials(name)}</AvatarFallback>
                        </Avatar>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-text-primary">{name}</span>
                          <span className="block truncate text-xs text-text-secondary">{format.dateTime(new Date(r.createdAt), { dateStyle: 'medium' })}</span>
                        </span>
                        <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold ${PILL[r.status] ?? PILL.PENDING}`}>
                          {t.has(`status.${r.status}`) ? t(`status.${r.status}`) : r.status}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            {rows.length > 0 && rows.length < total && limit < MAX_LIMIT && (
              <button type="button" onClick={() => setLimit((l) => Math.min(l + PAGE, MAX_LIMIT))} className="mt-3 min-h-11 w-full rounded-full border border-border-subtle px-4 text-sm font-semibold text-text-primary hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand">
                {t('loadMore')}
              </button>
            )}
          </section>

          <section aria-labelledby="applicant-detail-title" aria-live="polite" className="min-w-0 rounded-2xl border border-border-subtle bg-surface-default p-4">
            {!selected ? (
              <p id="applicant-detail-title" className="text-sm text-text-secondary">{t('selectPrompt')}</p>
            ) : (
              <div className="space-y-4">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar className="size-12">
                    {selected.applicantProfile?.avatarUrl && <AvatarImage src={selected.applicantProfile.avatarUrl} alt="" />}
                    <AvatarFallback>{initials(nameOf(selected.applicantProfile))}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <h3 id="applicant-detail-title" className="break-words text-lg font-bold text-text-primary">{nameOf(selected.applicantProfile)}</h3>
                    <p className="text-xs text-text-secondary">{t('appliedOn', { date: format.dateTime(new Date(selected.createdAt), { dateStyle: 'long' }) })}</p>
                  </div>
                </div>

                <ul className="space-y-1 text-sm text-text-primary">
                  {selected.applicantProfile?.email && (
                    <li className="flex min-w-0 items-center gap-2"><Mail className="size-4 shrink-0 text-text-secondary" aria-hidden /><a href={`mailto:${selected.applicantProfile.email}`} className="min-w-0 truncate text-text-brand hover:underline">{selected.applicantProfile.email}</a></li>
                  )}
                  {selected.applicantProfile?.phone && (
                    <li className="flex min-w-0 items-center gap-2"><Phone className="size-4 shrink-0 text-text-secondary" aria-hidden /><span className="min-w-0 truncate">{selected.applicantProfile.phone}</span></li>
                  )}
                  {(selected.applicantProfile?.city || selected.applicantProfile?.location) && (
                    <li className="flex min-w-0 items-center gap-2"><MapPin className="size-4 shrink-0 text-text-secondary" aria-hidden /><span className="min-w-0 truncate">{selected.applicantProfile?.city || selected.applicantProfile?.location}</span></li>
                  )}
                </ul>

                {selected.coverLetter?.trim() && (
                  <div>
                    <h4 className="mb-1 text-sm font-semibold text-text-primary">{t('coverLetter')}</h4>
                    <p className="whitespace-pre-wrap break-words text-sm text-text-primary">{selected.coverLetter}</p>
                  </div>
                )}

                {answers.length > 0 && (
                  <div>
                    <h4 className="mb-1 text-sm font-semibold text-text-primary">{t('answers')}</h4>
                    <dl className="space-y-2">
                      {answers.map((a) => (
                        <div key={a.label}>
                          <dt className="text-xs font-medium text-text-secondary">{a.label}</dt>
                          <dd className="whitespace-pre-wrap break-words text-sm text-text-primary">{a.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}

                <div>
                  <h4 className="mb-1 text-sm font-semibold text-text-primary">{t('files')}</h4>
                  {(selected.applicationFiles ?? []).length === 0 ? (
                    <p className="text-sm text-text-secondary">{t('noFiles')}</p>
                  ) : (
                    <ul className="space-y-1">
                      {(selected.applicationFiles ?? []).map((f) => {
                        const href = httpUrlOrNull(f.url);
                        return (
                          <li key={f.path} className="flex min-w-0 items-center gap-2 text-sm">
                            <FileText className="size-4 shrink-0 text-text-secondary" aria-hidden />
                            {href ? (
                              <a href={href} target="_blank" rel="noopener noreferrer" className="min-w-0 truncate text-text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand">
                                {f.filename}<span className="sr-only"> {t('opensInNewTab')}</span>
                              </a>
                            ) : (
                              <span className="min-w-0 truncate text-text-secondary">{f.filename} ({t('fileUnavailable')})</span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                {selected.reviewNotes?.trim() && DECIDED.has(selected.status) && (
                  <p className="rounded-lg bg-surface-subtle p-3 text-sm text-text-primary"><span className="font-semibold">{t('yourNotes')}:</span> {selected.reviewNotes}</p>
                )}

                {!DECIDED.has(selected.status) && (
                  <div className="space-y-2 border-t border-border-subtle pt-4">
                    <label htmlFor="decision-notes" className="block text-sm font-medium text-text-primary">{t('notesLabel')}</label>
                    <textarea
                      id="decision-notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      maxLength={1000}
                      rows={3}
                      className="w-full rounded-lg border border-border-subtle bg-surface-default px-3 py-2 text-base text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand"
                    />
                    <p className="text-xs text-text-secondary">{t('notesHint')}</p>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <button type="button" onClick={() => decide('accept')} disabled={busy} className="min-h-11 rounded-full bg-surface-brand px-5 text-sm font-semibold text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand focus-visible:ring-offset-2 disabled:opacity-60">
                        {t('accept')}
                      </button>
                      <button type="button" onClick={() => decide('reject')} disabled={busy} className="min-h-11 rounded-full border border-border-subtle px-5 text-sm font-semibold text-text-danger hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand disabled:opacity-60">
                        {t('reject')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
