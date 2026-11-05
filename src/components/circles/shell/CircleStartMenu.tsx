'use client';

import { ChevronDown, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

/**
 * "Start something": a project, a challenge or a motion.
 *
 * Deliberately NOT gated on role or entitlement here. Whether an action needs a
 * vote is a per-kind governance rule and whether a slot is free is an
 * entitlement read; both are answered ON the destination screen, where there is
 * room to explain them. Hiding the menu would teach a member the feature does
 * not exist, and the header does not load either query, so a gate here would be
 * a guess.
 */
export function CircleStartMenu({ circleId, className }: { circleId: string; className?: string }) {
  const t = useTranslations('circles');
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-surface-brand px-4 py-2 text-sm font-semibold text-text-white transition-opacity hover:opacity-90',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface-default',
            className,
          )}
        >
          <Plus aria-hidden="true" className="size-4" />
          {t('actions.startSomething')}
          <ChevronDown aria-hidden="true" className="size-3.5 opacity-80" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[200px] bg-surface-default">
        <DropdownMenuItem asChild className="body-medium text-text-primary">
          <Link href={`/circles/${circleId}/projects/new`}>{t('newProject.cta')}</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="body-medium text-text-primary">
          <Link href={`/circles/${circleId}/challenges/new`}>{t('newChallenge.cta')}</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="body-medium text-text-primary">
          <Link href={`/circles/${circleId}/motions/new`}>{t('newMotion.cta')}</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
