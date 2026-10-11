'use client';

import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import TagPicker from './TagPicker';
import PersonCard, { type CardActionHandlers } from './PersonCard';
import { focusRing } from './primitives';
import { itemsOfKind, type LabelFn } from '@/lib/networkingTaxonomy';
import type { DirectoryFilter, NetworkingCard, ProfileFields, TaxonomyItem } from '@/services/gql/networking';

export type FilterField = keyof DirectoryFilter;
export const FILTER_FIELDS: Array<{ field: FilterField; kind: 'ROLE' | 'INTEREST' | 'CAPABILITY' | 'INDUSTRY' | 'MARKET' | 'LANGUAGE' }> = [
  { field: 'needs', kind: 'CAPABILITY' },
  { field: 'offers', kind: 'CAPABILITY' },
  { field: 'industries', kind: 'INDUSTRY' },
  { field: 'markets', kind: 'MARKET' },
  { field: 'interests', kind: 'INTEREST' },
  { field: 'roles', kind: 'ROLE' },
  { field: 'languages', kind: 'LANGUAGE' },
];

export function isValidFilterField(v: string | null | undefined): v is FilterField {
  return FILTER_FIELDS.some((f) => f.field === v);
}

export default function DirectoryView({
  eventId,
  cards,
  me,
  labelOf,
  taxonomy,
  filter,
  onFilter,
  hasMore,
  loading,
  onLoadMore,
  actionsFor,
  focusField,
}: {
  eventId: string;
  cards: NetworkingCard[];
  me: ProfileFields | null;
  labelOf: LabelFn;
  taxonomy: TaxonomyItem[];
  filter: DirectoryFilter;
  onFilter: (next: DirectoryFilter) => void;
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
  actionsFor?: (card: NetworkingCard) => CardActionHandlers | undefined;
  focusField?: FilterField | null;
}) {
  const t = useTranslations('networking.directory');
  const active = FILTER_FIELDS.filter((f) => (filter[f.field]?.length ?? 0) > 0).length;
  const visible = cards.filter((c) => !c.isSelf);
  return (
    <div data-testid="directory" className="space-y-4">
      <details open={active > 0 || Boolean(focusField)} className="rounded-2xl border border-border-subtle bg-surface-default p-4">
        <summary className={`min-h-6 cursor-pointer text-sm font-semibold text-text-primary ${focusRing}`}>
          {t('filters')}{active > 0 ? ` (${active})` : ''}
        </summary>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {FILTER_FIELDS.map(({ field, kind }) => (
            <TagPicker
              key={field}
              testId={`filter-${field}`}
              label={t(`field.${field}`)}
              placeholder={t('pick')}
              items={itemsOfKind(taxonomy, kind)}
              value={filter[field] ?? []}
              onChange={(v) => onFilter({ ...filter, [field]: v })}
              labelOf={labelOf}
            />
          ))}
        </div>
        {active > 0 && (
          <button type="button" onClick={() => onFilter({})} className={`mt-3 inline-flex min-h-9 items-center rounded-full border border-border-subtle px-4 text-sm text-text-primary ${focusRing}`}>{t('reset')}</button>
        )}
      </details>

      {visible.length === 0 && !loading ? (
        <p data-testid="directory-empty" className="rounded-2xl border border-dashed border-border-subtle bg-surface-default p-8 text-center text-sm text-muted-foreground">{active > 0 ? t('emptyFiltered') : t('empty')}</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
          {visible.map((c) => (
            <li key={c.handle}>
              <PersonCard eventId={eventId} card={c} me={me} labelOf={labelOf} actions={actionsFor?.(c)} />
            </li>
          ))}
        </ul>
      )}
      {loading && <Loader2 className="mx-auto size-5 animate-spin text-text-brand" aria-label={t('loading')} />}
      {hasMore && !loading && (
        <div className="text-center">
          <button type="button" onClick={onLoadMore} data-testid="directory-more" className={`inline-flex min-h-11 items-center rounded-full border border-border-brand px-6 text-sm font-medium text-text-brand ${focusRing}`}>{t('loadMore')}</button>
        </div>
      )}
    </div>
  );
}
