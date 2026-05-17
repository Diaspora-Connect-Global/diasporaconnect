import { useTranslations } from 'next-intl';
import React from 'react';
import Image from 'next/image';
import { formatDateOnly } from '@/macros/time';
import { AccessBadges } from '@/components/cards/AccessBadges';
import type { AccessProfile } from '@/types/membership';

interface AboutCommunityProps {
  members: number;
  createdDate: string;
  visibility: string;
  description: string;
  access?: AccessProfile;
}

export default function AboutCommunity({
  members,
  createdDate,
  visibility,
  description,
  access,
}: AboutCommunityProps) {
  const t = useTranslations('static');
  return (
    <div className="flex justify-center items-center my-4">
      <div className="lg:max-w-72 w-full lg:min-h-74 bg-surface-default rounded-lg shadow-sm p-4 flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-text-primary">{t("about")}</h2>
        {access && <AccessBadges access={access} size="detail" />}
        <div className="flex items-center gap-2 text-text-secondary mb-1">
          <Image src="/MEMBERS.svg" alt="Members" width={16} height={16} />
          <span>{members}</span>
          <span>{t("members")}</span>
        </div>
        <div className="flex gap-2">
          <Image src="/CALENDAR.svg" alt="Calendar" width={16} height={16} />
          <div className="text-text-secondary">{formatDateOnly(createdDate)}</div>
          <Image src="/PUBLIC.svg" alt="Visibility" width={16} height={16} />
          <span className="text-text-secondary">{visibility}</span>
        </div>
        <div>
          <p className="text-sm text-text-primary">{description}</p>
        </div>
      </div>
    </div>
  );
}
