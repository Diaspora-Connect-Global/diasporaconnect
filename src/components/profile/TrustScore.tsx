import { Card, CardContent } from "@/components/ui/card";
import { UserBadge, Tier } from "../custom/userBadge";
import { InfoIcon } from "@phosphor-icons/react";
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
    <Card className="h-full p-0">
      <CardContent className="p-4 h-full flex flex-col">
        <h2 className="text-lg font-semibold mb-3">{t('title')}</h2>
        <div className="flex-1 min-h-0 flex flex-col justify-between">
          <div className="space-y-3">


            <div className="p-1">

              <LevelGauge
                score={normalizedTrustScore}
                notEarnedLabel={t('notEarned')}
              />


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
            {!currentTier && (
              <p className="text-sm text-text-secondary text-center">{t('notEarnedHint')}</p>
            )}
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
