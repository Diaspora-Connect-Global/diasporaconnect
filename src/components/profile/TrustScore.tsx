import { Card, CardContent } from "@/components/ui/card";
import { UserBadge, Tier } from "../custom/userBadge";
import { InfoIcon } from "@phosphor-icons/react";
import { LevelGauge } from "../custom/levelGauge";
import { useTranslations } from 'next-intl';

interface TrustScoreProps {

  trustScore?: number | string | null;

}

const ALL_TIERS: Tier[] = ["starter", "trusted", "reliable", "elite"];

// Upper bound (inclusive) of each tier; aligned with backend deriveTrustTier.
// Scores below 20 don't get any badge — they have to be earned via real activity.
const TIER_THRESHOLDS: Record<Tier, number> = {
  starter: 39,
  trusted: 64,
  reliable: 84,
  elite: 100,
};

const BADGE_FLOOR_SCORE = 20;

function getTierFromScore(score: number): Tier | undefined {
  if (score < BADGE_FLOOR_SCORE) return undefined;
  for (const tier of ALL_TIERS) {
    if (score <= TIER_THRESHOLDS[tier]) return tier;
  }
  return "elite";
}

export function TrustScore({ trustScore }: TrustScoreProps) {
  const t = useTranslations('profile.trustScore');
  const parsedTrustScore = trustScore == null ? 0 : Number(trustScore);
  const normalizedTrustScore = Number.isFinite(parsedTrustScore) ? parsedTrustScore : 0;

  const currentTier = getTierFromScore(normalizedTrustScore);

  return (
    <Card className="h-full p-0">
      <CardContent className="p-4 h-full flex flex-col">
        <h2 className="text-lg font-semibold mb-3">{t('title')}</h2>
        <div className="flex-1 min-h-0 flex flex-col justify-between">
          <div className="space-y-3">


            <div className="p-1">

              <LevelGauge score={normalizedTrustScore} />


            </div>

            <div className="grid grid-cols-2 gap-4">
              {ALL_TIERS.map((tier) => (
                <div
                  key={tier}
                  className={tier === currentTier ? "ring-2 ring-offset-1 ring-current rounded-md p-0.5" : undefined}
                >
                  <UserBadge
                    tier={tier}
                    size={tier === currentTier ? "md" : "sm"}
                    showLabel
                  />
                </div>
              ))}
            </div>
            <div className="bg-surface-info text-text-info flex p-2 space-x-2 rounded-md">
              <InfoIcon size={32} />
              <p>{t('description')}</p>
            </div>

          </div>


        </div>
      </CardContent>
    </Card>
  );
}