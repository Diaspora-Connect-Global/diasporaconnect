/* eslint-disable @typescript-eslint/no-unused-vars */
// components/TrustScore.tsx
import { Card, CardContent } from "@/components/ui/card";
import { UserBadge } from "../custom/userBadge";
import {  InfoIcon } from "@phosphor-icons/react";
import { LevelGauge } from "../custom/levelGauge";
import { useTranslations } from 'next-intl';

interface TrustScoreProps {
  data: {
    score: number;
    maxScore: number;
    levels: {
      starter: boolean;
      trusted: boolean;
      reliable: boolean;
      elite: boolean;
    };
    showDescription: boolean;
  };
  onLevelChange?: (level: keyof TrustScoreProps['data']['levels'], checked: boolean) => void;
}

export function TrustScore({ data, onLevelChange }: TrustScoreProps) {
  const t = useTranslations('profile.trustScore');
  
  return (
    <Card className="h-full p-0">
      <CardContent className="p-4 h-full flex flex-col">
        <h2 className="text-lg font-semibold mb-3">{t('title')}</h2>
        <div className="flex-1 min-h-0 flex flex-col justify-between">
          <div className="space-y-3">
            

            <div className="p-1">
              {/* 10 points → Starter */}
              <LevelGauge score={99} />


            </div>

            <div className="grid grid-cols-2 gap-4">
              <UserBadge tier="starter" showLabel />
              <UserBadge tier="trusted" showLabel />
              <UserBadge tier="reliable" showLabel />
              <UserBadge tier="elite" showLabel />
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