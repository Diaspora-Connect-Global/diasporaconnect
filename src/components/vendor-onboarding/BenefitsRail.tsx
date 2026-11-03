import { BadgeCheck, Banknote, Rocket, ShieldCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { RailCard } from '@/components/redesign/RailCard';
import { ICON_CHIP_CLASS } from '@/components/more/MoreLinkCard';

const ITEMS: Array<{ key: 'start' | 'escrow' | 'payouts' | 'verification'; icon: LucideIcon }> = [
  { key: 'start', icon: Rocket },
  { key: 'escrow', icon: ShieldCheck },
  { key: 'payouts', icon: Banknote },
  { key: 'verification', icon: BadgeCheck },
];

/** What a vendor account actually gives you, in the platform's own terms (no stats, no testimonials). */
export function BenefitsRail() {
  const t = useTranslations('vendorOnboarding.rail');
  return (
    <RailCard id="vendor-rail-title" title={t('title')} testId="vendor-rail">
      <ul className="space-y-3">
        {ITEMS.map(({ key, icon: Icon }) => (
          <li key={key} className="flex items-start gap-3">
            <span className={`grid size-10 shrink-0 place-items-center rounded-full ${ICON_CHIP_CLASS}`}>
              <Icon className="size-5" strokeWidth={1.75} aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-text-primary">{t(`${key}.title`)}</span>
              <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{t(`${key}.description`)}</span>
            </span>
          </li>
        ))}
      </ul>
    </RailCard>
  );
}
