/**
 * Filters of a category page. They live in the URL (`?type=GRANT&loc=Accra&sort=closing`)
 * so a view can be shared; each one is sent to the list query, none is cosmetic.
 */

/** Opportunity types the server accepts (the list query takes one at a time). */
export const TYPE_KEYS = ['EMPLOYMENT', 'CONTRACT', 'PROGRAM', 'INITIATIVE', 'SCHOLARSHIP', 'FELLOWSHIP', 'GRANT', 'INVESTMENT', 'VOLUNTEER'] as const;
export type CategoryType = (typeof TYPE_KEYS)[number];

export type CategorySort = 'newest' | 'closing';

export const parseType = (raw: string | null): CategoryType | null => (TYPE_KEYS as readonly string[]).includes(raw ?? '') ? (raw as CategoryType) : null;
export const parseSort = (raw: string | null): CategorySort => (raw === 'closing' ? 'closing' : 'newest');

/** The only sort keys opportunity-service accepts here; anything else is refused and trips the gateway's circuit breaker. */
export const SORT_INPUT: Record<CategorySort, { sortBy: 'CREATED_AT' | 'DEADLINE'; sortOrder: 'ASC' | 'DESC' }> = {
    newest: { sortBy: 'CREATED_AT', sortOrder: 'DESC' },
    closing: { sortBy: 'DEADLINE', sortOrder: 'ASC' },
};

export const PAGE_SIZE = 24;
export const MAX_LIMIT = 96;
