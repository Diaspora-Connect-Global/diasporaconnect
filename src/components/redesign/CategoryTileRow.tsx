import type { LucideIcon } from 'lucide-react';
import { TONE_CLASS } from '@/components/more/MoreLinkCard';
import type { MoreTone } from '@/components/more/moreLinks';

export type CategoryTile = { key: string; label: string; icon: LucideIcon; tone: MoreTone; active?: boolean };

/**
 * A row of round icon tiles (Discover categories). Tiles are toggle buttons:
 * the page decides what a selection does, and `active` says which are on.
 */
export function CategoryTileRow({ label, tiles, onSelect }: { label: string; tiles: readonly CategoryTile[]; onSelect: (key: string) => void }) {
  return (
    <nav aria-label={label} className="rounded-2xl border border-border-subtle bg-surface-default p-2 shadow-sm">
      <ul className="grid grid-cols-3 gap-y-1 sm:grid-cols-6 sm:divide-x sm:divide-border-subtle">
        {tiles.map(({ key, label: text, icon: Icon, tone, active }) => (
          <li key={key}>
            <button
              type="button"
              aria-pressed={!!active}
              onClick={() => onSelect(key)}
              className={`flex w-full flex-col items-center gap-2 rounded-xl px-2 py-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand sm:text-sm ${
                active ? 'bg-surface-brand-subtle text-text-brand' : 'text-text-primary hover:bg-surface-subtle'
              }`}
            >
              <span className={`grid size-11 place-items-center rounded-full sm:size-12 ${TONE_CLASS[tone]}`}>
                <Icon className="size-5" strokeWidth={1.75} aria-hidden />
              </span>
              {text}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
