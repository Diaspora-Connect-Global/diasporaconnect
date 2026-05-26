'use client';

import React from 'react';

/**
 * Per-category UI metadata. The backend ai-service classifies posts into
 * the canonical taxonomy (Politics, Tech, Business, ...); this map
 * decides the display label and color the user sees on the card.
 *
 * Editing this table is the single source of truth — changing a label or
 * color here updates every card. Unknown categories fall back to a
 * neutral grey pill (defensive — the backend whitelist should already
 * keep this set closed).
 */
interface CategoryStyle {
  label: string;
  className: string;
}

const CATEGORY_STYLES: Record<string, CategoryStyle> = {
  Politics: { label: 'Politics', className: 'bg-red-600' },
  Tech: { label: 'Tech', className: 'bg-blue-600' },
  Business: { label: 'Business', className: 'bg-amber-700' },
  Culture: { label: 'Culture', className: 'bg-purple-600' },
  Sports: { label: 'Sports', className: 'bg-orange-600' },
  Education: { label: 'Edu', className: 'bg-indigo-600' },
  Health: { label: 'Health', className: 'bg-emerald-600' },
  Entertainment: { label: 'Fun', className: 'bg-pink-600' },
  News: { label: 'News', className: 'bg-slate-700' },
  Jobs: { label: 'Opportunity', className: 'bg-green-600' },
  Community: { label: 'Community', className: 'bg-cyan-600' },
  Religion: { label: 'Faith', className: 'bg-violet-700' },
  Diaspora: { label: 'Diaspora', className: 'bg-teal-600' },
  Travel: { label: 'Travel', className: 'bg-sky-600' },
  Food: { label: 'Food', className: 'bg-rose-500' },
  Family: { label: 'Family', className: 'bg-fuchsia-600' },
  Finance: { label: 'Finance', className: 'bg-yellow-600' },
  Lifestyle: { label: 'Lifestyle', className: 'bg-lime-600' },
  Personal: { label: 'Personal', className: 'bg-zinc-600' },
};

const UNKNOWN_STYLE: CategoryStyle = { label: '', className: 'bg-gray-500' };

export interface CategoryBadgeProps {
  /** Canonical category string from the backend (`post.categories[0]`). */
  category?: string | null;
}

/**
 * Small colored pill rendered above a post card to surface the AI-
 * inferred category. Returns null when:
 *   - `category` is falsy (legacy / in-flight post not yet classified)
 *   - `category === 'Other'` (catch-all class — no useful UX signal)
 *
 * The pill is short by design (≤10 chars) so it can sit on the card
 * without competing with the author name or body text.
 */
export const CategoryBadge: React.FC<CategoryBadgeProps> = ({ category }) => {
  if (!category) return null;
  if (category === 'Other') return null;

  const style = CATEGORY_STYLES[category] ?? {
    ...UNKNOWN_STYLE,
    label: category.length > 10 ? category.slice(0, 10) : category,
  };
  if (!style.label) return null;

  return (
    <span
      className={`inline-flex items-center text-xs font-bold uppercase tracking-wide text-white ${style.className} rounded-md px-3 py-1`}
      aria-label={`Category: ${style.label}`}
    >
      {style.label}
    </span>
  );
};
