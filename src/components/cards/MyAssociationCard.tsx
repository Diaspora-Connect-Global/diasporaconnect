'use client';

import React from 'react';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { ButtonType1 } from '../custom/button';
import { useTranslations } from 'next-intl';

interface MyAssociationCardProps {
  id: string;
  title?: string;
  description?: string;
  logoIcon?: React.ReactNode;
  avatarUrl?: string | null;
  onMenuClick?: () => void;
  buttonText: string;
  isPending?: boolean;
  onLeaveClick?: () => void;
  onCancelRequestClick?: () => void;
  viewLabel?: string;
  leaveLabel?: string;
  cancelRequestLabel?: string;
}

export function MyAssociationCard({
  title = 'GhanaConnect:Global',
  description = 'Connect with professionals and businesses across Ghana and abroad.',
  logoIcon,
  avatarUrl,
  buttonText,
  id,
  isPending = false,
  onLeaveClick,
  onCancelRequestClick,
  viewLabel,
  leaveLabel,
  cancelRequestLabel,
}: MyAssociationCardProps) {
  const t = useTranslations('home.associations.actions');
  const view = viewLabel ?? t('view');
  const leave = leaveLabel ?? t('leave');
  const cancelRequest = cancelRequestLabel ?? t('cancelRequest');

  return (
    <header className="w-full border-b">
      <div className="max-w-7xl mx-auto px-2 py-3 sm:px-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
              {logoIcon ?? (
                <Image
                  width={32}
                  height={32}
                  src={avatarUrl || '/GLOBE.png'}
                  alt=""
                  className="w-full h-full rounded-full object-cover border-2 border-border-subtle"
                />
              )}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <Link href={`/association/${id}`} prefetch={false}>
                <h1 className="text-text-primary font-label-large hover:text-text-brand truncate">
                  {title}
                </h1>
              </Link>
              <p className="text-text-primary font-body-small text-xs sm:text-sm text-wrap line-clamp-1">
                {description}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link href={`/association/${id}`} prefetch={false}>
              <ButtonType1 className="py-1 px-3 label-medium">
                {view}
              </ButtonType1>
            </Link>
            {isPending && onCancelRequestClick && (
              <ButtonType1
                className="py-1 px-3 label-medium border-border-subtle text-text-secondary"
                onClick={onCancelRequestClick}
              >
                {cancelRequest}
              </ButtonType1>
            )}
            {!isPending && onLeaveClick && (
              <ButtonType1
                className="py-1 px-3 label-medium border-border-subtle text-text-secondary"
                onClick={onLeaveClick}
              >
                {leave}
              </ButtonType1>
            )}
            {!onLeaveClick && !onCancelRequestClick && (
              <span className="label-medium text-text-secondary">{buttonText}</span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}