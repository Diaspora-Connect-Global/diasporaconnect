'use client';

import { useTranslations } from 'next-intl';

const LOOKS_LIKE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Words for an opportunity's codes (type, field, work mode, commitment, pay
 * kind). An unknown code gives '' and its row is left out; a raw code
 * (`EMPLOYMENT_CAREER`) is never shown.
 */
export function useOpportunityLabels() {
  const t = useTranslations('opportunityPage');
  const tr = useTranslations('redesign');
  const own = (key: string) => (t.has(key) ? t(key) : '');
  const shared = (key: string) => (tr.has(key) ? tr(key) : '');
  return {
    type: (type?: string | null, category?: string | null) =>
      category === 'REAL_ESTATE_INFRASTRUCTURE' && !type ? tr('kinds.realEstate') : (type && shared(`opportunityTypes.${type}`)) || tr('kinds.opportunity'),
    category: (category?: string | null) => (category ? own(`categories.${category}`) : ''),
    deliveryMode: (mode?: string | null) => (mode ? own(`deliveryModes.${mode}`) : ''),
    commitment: (c?: string | null) => (c ? shared(`commitmentTypes.${c}`) : ''),
    compensationType: (c?: string | null) => (c ? own(`compensationTypes.${c}`) : ''),
    /** Where: the location as written, else "Remote" for remote/online work. A location that is an id is not shown. */
    place: (location?: string | null, mode?: string | null) => {
      const l = location?.trim();
      if (l && !LOOKS_LIKE_ID.test(l)) return l;
      return mode === 'REMOTE' || mode === 'ONLINE' ? tr('remote') : '';
    },
  };
}
