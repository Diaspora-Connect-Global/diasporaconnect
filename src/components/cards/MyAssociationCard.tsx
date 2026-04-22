'use client';

import React from 'react';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { ChevronRight, MoreHorizontalIcon } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ButtonType3 } from '@/components/custom/button';
import { useTranslations } from 'next-intl';

interface MyAssociationCardProps {
  id: string;
  title?: string;
  description?: string;
  logoIcon?: React.ReactNode;
  avatarUrl?: string | null;
  onMenuClick?: () => void;
  buttonText?: string;
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
  const tCommon = useTranslations('common');
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
                  alt={title}
                  className="w-full h-full rounded-full object-cover border-2 border-border-subtle"
                />
              )}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <Link href={`/association/${id}`} prefetch={false}>
                <h1 className="text-text-primary label-large hover:text-text-brand truncate">
                  {title}
                </h1>
              </Link>
              <p className="text-text-primary body-small text-xs sm:text-sm text-wrap line-clamp-1">
                {description}
              </p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <ButtonType3
                className="p-1 min-w-0"
                aria-label={tCommon('openMenu')}
              >
                <MoreHorizontalIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              </ButtonType3>
            </DropdownMenuTrigger>

            <DropdownMenuContent className="bg-surface-default min-w-[200px]">
              <DropdownMenuItem asChild className="body-large text-text-primary flex justify-between items-center">
                <Link href={`/association/${id}`} prefetch={false} className="flex w-full items-center justify-between">
                  <span>{view}</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {isPending && onCancelRequestClick ? (
                <DropdownMenuItem
                  onSelect={onCancelRequestClick}
                  className="body-large text-text-primary flex justify-between items-center"
                >
                  <span>{cancelRequest}</span>
                </DropdownMenuItem>
              ) : onLeaveClick ? (
                <DropdownMenuItem
                  onSelect={onLeaveClick}
                  className="body-large text-text-primary flex justify-between items-center"
                >
                  <span>{leave}</span>
                </DropdownMenuItem>
              ) : buttonText ? (
                <DropdownMenuItem
                  disabled
                  className="body-large text-text-secondary flex justify-between items-center"
                >
                  <span>{buttonText}</span>
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}