'use client';

import { useMemo, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { useUserStore } from '@/store/useUserStore';
import { OpportunityApplicationForm } from '@/components/opportunities/apply/OpportunityApplicationForm';
import { aboutText, opportunityPhase, readableOwnerName } from '@/lib/opportunityDisplay';
import type { Opportunity } from '@/services/gql/types/opportunities';
import OpportunityHero from './OpportunityHero';
import { APPLY_FORM_ID, ApplyCard, ApplyPrimaryAction, FactsCard, PosterCard, applyState } from './OpportunityRail';

const CARD = 'rounded-2xl border border-border-subtle bg-surface-default p-4 shadow-sm sm:p-5';

function Block({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className={CARD}>
      <h2 id={id} className="text-lg font-bold text-text-primary">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

const Prose = ({ text }: { text: string }) => <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-text-primary sm:text-base">{text}</p>;

function Chips({ items, prefix = '' }: { items: string[]; prefix?: string }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((v) => (
        <li key={v} className="rounded-full border border-border-subtle bg-surface-subtle px-3 py-1 text-sm text-text-primary">
          {prefix}
          {v}
        </li>
      ))}
    </ul>
  );
}

const clean = (list?: (string | null | undefined)[] | null) => Array.from(new Set((list ?? []).map((v) => v?.trim()).filter((v): v is string => !!v)));

/**
 * `/opportunities/{id}`: laid out like the event page. A hero with the facts
 * people look for first; then what the poster wrote, in sections (a section with
 * nothing in it is left out) and the application form; beside it, how to apply,
 * the listing at a glance and who posted it. On phones the main action also sits
 * in the hero, and the rail follows the content.
 */
export default function OpportunityDetailView({ item }: { item: Opportunity }) {
  const t = useTranslations('opportunityPage');
  const tOpp = useTranslations('home.opportunities');
  const router = useRouter();
  const viewerId = useUserStore((s) => s.user?.userId ?? null);
  // One clock per render pass, so the hero and the rail agree on "open" vs "closed".
  const now = useMemo(() => new Date(), []);
  const phase = opportunityPhase(item, now);
  const state = applyState(item, phase, viewerId);

  const kind = (item.ownerType ?? item.owner?.type ?? '').toUpperCase();
  const poster =
    readableOwnerName(item.owner?.name) ?? (kind === 'COMMUNITY' ? tOpp('communityPoster') : kind === 'ASSOCIATION' ? tOpp('associationPoster') : t('poster.fallback'));

  const about = aboutText(item.title, item.description);
  const regions = clean(item.eligibilityRegions);
  const skills = clean(item.skills);
  const tags = clean(item.tags).map((tag) => tag.replace(/^#/, ''));
  const blocks: Array<{ id: string; title: string; body: ReactNode }> = [];
  if (about) blocks.push({ id: 'about', title: t('sections.about'), body: <Prose text={about} /> });
  if (item.scope?.trim()) blocks.push({ id: 'scope', title: t('sections.scope'), body: <Prose text={item.scope.trim()} /> });
  if (item.eligibilityCriteria?.trim() || regions.length)
    blocks.push({
      id: 'eligibility',
      title: t('sections.eligibility'),
      body: (
        <div className="space-y-4">
          {item.eligibilityCriteria?.trim() && <Prose text={item.eligibilityCriteria.trim()} />}
          {regions.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-text-secondary">{t('sections.regions')}</h3>
              <Chips items={regions} />
            </div>
          )}
        </div>
      ),
    });
  if (item.benefitsSummary?.trim()) blocks.push({ id: 'benefits', title: t('sections.benefits'), body: <Prose text={item.benefitsSummary.trim()} /> });
  if (skills.length) blocks.push({ id: 'skills', title: t('sections.skills'), body: <Chips items={skills} /> });
  if (tags.length) blocks.push({ id: 'tags', title: t('sections.tags'), body: <Chips items={tags} prefix="#" /> });

  const showForm = state.kind === 'form';
  const hasMain = blocks.length > 0 || showForm;
  const rail = (
    <>
      <ApplyCard item={item} state={state} />
      <FactsCard item={item} />
      <PosterCard item={item} poster={poster} />
    </>
  );

  return (
    <div className="h-app-inner overflow-y-auto scrollbar-hide bg-background">
      <div className="mx-auto w-full space-y-4 px-4 pb-24 pt-4 lg:w-[80vw] lg:px-0 lg:pb-8">
        <button
          type="button"
          onClick={() => (window.history.length > 1 ? router.back() : router.push('/opportunities'))}
          className="inline-flex min-h-11 items-center gap-2 rounded-md text-text-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand"
        >
          <ArrowLeft size={18} aria-hidden />
          <span className="text-sm font-medium">{tOpp('backToOpportunities')}</span>
        </button>

        <OpportunityHero item={item} phase={phase} poster={poster} now={now}>
          {/* Phones show the rail after the content, so the one action that matters sits up here too. */}
          <div className="empty:hidden lg:hidden">
            <ApplyPrimaryAction item={item} state={state} />
          </div>
        </OpportunityHero>

        {hasMain ? (
          <div className="gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem]">
            {/* PublicShell already renders the page's <main>. */}
            <div className="min-w-0 space-y-4">
              {blocks.map((b) => (
                <Block key={b.id} id={`opportunity-${b.id}`} title={b.title}>
                  {b.body}
                </Block>
              ))}
              {showForm && (
                <section id={APPLY_FORM_ID} aria-labelledby="apply-form-title" className={`${CARD} scroll-mt-4`} data-testid="apply-form">
                  <h2 id="apply-form-title" className="text-lg font-bold text-text-primary">{t('apply.formTitle')}</h2>
                  <p className="mb-4 mt-1 text-sm text-text-secondary">
                    <span className="text-text-danger" aria-hidden>*</span> {tOpp('labels.requiredFieldsHint')}
                  </p>
                  <OpportunityApplicationForm item={item} />
                </section>
              )}
            </div>
            <aside className="mt-4 min-w-0 lg:mt-0" aria-label={t('railLabel')}>
              <div className="space-y-4 lg:sticky lg:top-4">{rail}</div>
            </aside>
          </div>
        ) : (
          // Nothing beyond the hero to read: the rail's cards sit side by side instead of beside an empty column.
          <aside className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label={t('railLabel')}>
            {rail}
          </aside>
        )}
      </div>
    </div>
  );
}
