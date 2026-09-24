import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { UserBadge, Tier } from "../custom/userBadge";
import { CaretRightIcon, CheckIcon, InfoIcon, MedalIcon } from "@phosphor-icons/react";
import { LevelGauge } from "../custom/levelGauge";
import { mapTrustScoreToTier } from "@/lib/userTier";
import { useTranslations } from 'next-intl';

interface TrustScoreProps {
  trustScore?: number | string | null;
}

const ALL_TIERS: Tier[] = ["starter", "trusted", "reliable", "elite"];

export function TrustScore({ trustScore }: TrustScoreProps) {
  const t = useTranslations('profile.trustScore');
  const parsedTrustScore = trustScore == null ? 0 : Number(trustScore);
  const normalizedTrustScore = Number.isFinite(parsedTrustScore) ? parsedTrustScore : 0;

  const currentTier = mapTrustScoreToTier(normalizedTrustScore);

  return (
    <Card className="h-full gap-0 py-0 rounded-2xl border-[#E7ECF5] shadow-none">
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-base font-semibold text-[#1B2A5E] dark:text-text-primary">
            <MedalIcon size={20} className="text-[#1F5FD6]" aria-hidden />
            {t('title')}
          </h2>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label={t('aboutLabel')}
                title={t('aboutLabel')}
                className="flex h-8 w-8 items-center justify-center rounded-full text-[#1B2A5E] dark:text-text-primary hover:bg-[#F3F6FC] dark:hover:bg-surface-hover cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5FD6]"
              >
                <CaretRightIcon size={18} weight="bold" aria-hidden />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 rounded-xl">
              <div className="flex gap-2.5 text-sm text-text-primary">
                <InfoIcon size={20} className="shrink-0 text-[#1F5FD6]" aria-hidden />
                <p>{t('description')}</p>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div className="mt-3 flex justify-center">
          <LevelGauge
            score={normalizedTrustScore}
            notEarnedLabel={t('notEarned')}
          />
        </div>

        <ul className="mt-4 grid grid-cols-2 gap-2">
          {ALL_TIERS.map((tier) => {
            const current = tier === currentTier;
            return (
              <li
                key={tier}
                aria-current={current ? 'true' : undefined}
                className={`flex items-center justify-between gap-2 rounded-full px-3 py-1.5 ${
                  current ? 'bg-[#EAF1FD] dark:bg-surface-subtle' : ''
                }`}
              >
                <UserBadge tier={tier} size="sm" showLabel />
                {current && <CheckIcon size={16} weight="bold" className="shrink-0 text-[#1F5FD6]" aria-hidden />}
              </li>
            );
          })}
        </ul>
        {!currentTier && (
          <p className="mt-3 text-sm text-text-secondary text-center">{t('notEarnedHint')}</p>
        )}
      </CardContent>
    </Card>
  );
}
