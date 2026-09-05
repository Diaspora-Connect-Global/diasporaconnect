'use client'
import React from 'react';
import { MoreHorizontalIcon } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from '../../ui/button';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { formatDateProximity } from '@/macros/time';
import { useImageFallback } from '@/components/ui/ImageWithFallback';
import { EntityAvatar } from './EntityAvatar';

/**
 * What kind of entity a notification is ABOUT. Structurally identical to
 * `NotificationSubjectKind` in `useEnrichedNotification`; declared here so the
 * card stays a self-contained presentational component.
 */
export type SubjectKind =
    | 'user'
    | 'community'
    | 'association'
    | 'event'
    | 'opportunity'
    | 'post'
    | 'group';

interface NotificationCardProps {
    /** Main title (e.g. app name or actor). */
    title?: string;
    /** Body text — can be multi-line; keep descriptive. */
    description?: string;
    /** Short label for notification type (e.g. "Like", "Comment", "Connection request"). */
    typeLabel?: string;
    logoIcon?: React.ReactNode;
    /** Actor/avatar image displayed on the left of the row. */
    imageUrl?: string;
    /** When set, the avatar becomes a link to this URL (e.g. actor profile). */
    actorHref?: string;
    /**
     * Picture of the entity the notification is ABOUT — the community, event,
     * group or person the row concerns. Already CDN-rewritten by the caller.
     */
    subjectImageUrl?: string | null;
    /**
     * Name of that entity. Drives the initial-letter fallback, so a community
     * with no logo still renders something specific to itself.
     */
    subjectName?: string | null;
    /** Kind of that entity; only steers the last-resort placeholder. */
    subjectKind?: SubjectKind | null;
    time: string;
    read: boolean;
    onMarkAsRead?: () => void;
    onRemove?: () => void;
    onMenuClick?: () => void;
    /** When set, the row is clickable and navigates (e.g. to post/event). */
    onClick?: () => void;
}

export function NotificationCard({
    title,
    description = "",
    typeLabel,
    logoIcon,
    imageUrl,
    actorHref,
    subjectImageUrl,
    subjectName,
    subjectKind,
    time = "3d",
    read = true,
    onMarkAsRead,
    onRemove,
    onClick,
}: NotificationCardProps) {
    const t = useTranslations('notification');
    const tCommon = useTranslations('common');

    // Two independent "this URL 404'd" flags, each reset when its own src
    // changes. Only the `failed` half of the hook is used: its built-in
    // `/PROFILE.png` swap is the wrong fallback here — a broken community logo
    // should degrade to that community's initial, not to a person silhouette.
    const { onError: onSubjectImageError, failed: subjectImageFailed } =
        useImageFallback(subjectImageUrl);
    const { onError: onActorImageError, failed: actorImageFailed } =
        useImageFallback(imageUrl);

    /* --------------------------------------------------------------- *
     * Which picture the row shows, in order:
     *
     *   1. `logoIcon`         — caller-supplied escape hatch, wins outright.
     *   2. `subjectImageUrl`  — the real picture of the thing this row is about.
     *   3. `subjectName`      — its initial on a name-derived colour.
     *   4. `imageUrl`         — the actor's avatar (the pre-existing path; still
     *                           the right answer for a person-centred row whose
     *                           subject fields have not resolved).
     *   5. a generic asset    — now the RARE case: a system notice with no
     *                           subject entity at all ("Here's what you missed").
     *
     * A picture that 404s at runtime drops to the NEXT rule rather than leaving
     * a broken-image glyph, which is why 2 and 4 are gated on their fail flags.
     * --------------------------------------------------------------- */
    const trimmedSubjectName = (subjectName || '').trim();
    const subjectSrc = subjectImageUrl && !subjectImageFailed ? subjectImageUrl : null;
    const showEntityAvatar = !subjectSrc && trimmedSubjectName.length > 0;
    const actorSrc =
        !subjectSrc && !showEntityAvatar && imageUrl && !actorImageFailed ? imageUrl : null;
    // The globe is a Ghana-flag world icon: fine for a platform announcement,
    // wrong for a person, so a known-person subject keeps the silhouette.
    const genericSrc = subjectKind === 'user' ? '/PROFILE.png' : '/GLOBE.png';

    // Plain <img>, not next/image: these are arbitrary remote entity pictures
    // and `next.config.ts` allows a narrow set of hosts through the optimizer
    // (cdn.diaspoplug.net, storage.googleapis.com/diaspoplug-media/**), so a
    // community logo stored anywhere else would fail the row outright instead
    // of degrading. Same call the app already makes in AvatarGroup and
    // CircleImagery; at 32–40px the optimizer buys nothing anyway.
    const imageClass = 'w-full h-full rounded-full object-cover border-2 border-border-subtle';

    const handleMarkAsRead = (event: Event) => {
        event.preventDefault();
        if (onMarkAsRead) {
            onMarkAsRead();
        }
    };

    const handleRemove = (event: Event) => {
        event.preventDefault();
        if (onRemove) {
            onRemove();
        }
    };

    return (
        <header className="w-full border-b">
            <div className="lg:max-w-7xl mx-auto px-2 py-3 sm:px-4">
                <div className="flex items-center justify-between gap-2">
                    {/* Left section — avatar (optionally linkable) + row body (optionally clickable) */}
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                        {(() => {
                            const avatar = (
                                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                                    {logoIcon ?? (subjectSrc ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={subjectSrc}
                                            // Decorative: the row's title already names the entity.
                                            alt=""
                                            onError={onSubjectImageError}
                                            className={imageClass}
                                        />
                                    ) : showEntityAvatar ? (
                                        <EntityAvatar name={trimmedSubjectName} />
                                    ) : actorSrc ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={actorSrc}
                                            alt=""
                                            onError={onActorImageError}
                                            className={imageClass}
                                        />
                                    ) : (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={genericSrc}
                                            alt=""
                                            className={imageClass}
                                        />
                                    ))}
                                </div>
                            );
                            if (actorHref) {
                                return (
                                    <Link
                                        href={actorHref}
                                        onClick={(e) => e.stopPropagation()}
                                        className="flex-shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-surface-brand"
                                        aria-label={title}
                                    >
                                        {avatar}
                                    </Link>
                                );
                            }
                            return avatar;
                        })()}

                        <div
                            role={onClick ? 'button' : undefined}
                            tabIndex={onClick ? 0 : undefined}
                            onClick={onClick}
                            onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
                            className={`flex flex-col min-w-0 flex-1 gap-0.5 ${onClick ? 'cursor-pointer' : ''}`}
                        >
                            <div className="flex items-center gap-2 flex-wrap">
                                {typeLabel && (
                                    <span className="text-text-secondary caption-medium uppercase tracking-wide">
                                        {typeLabel}
                                    </span>
                                )}
                                <span className="text-text-tertiary body-small text-xs">
                                    {formatDateProximity(time)}
                                </span>
                            </div>
                            {title && (
                                <h2 className="text-text-primary label-large text-sm sm:text-base truncate">
                                    {title}
                                </h2>
                            )}
                            {description && (
                                <p className="text-text-primary body-small text-xs sm:text-sm text-wrap line-clamp-2">
                                    {description}
                                </p>
                            )}
                        </div>
                    </div>

                    <div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <div>
                                    <Button 
                                        className='bg-surface-default border-0 shadow-none text-text-primary p-1' 
                                        variant="outline" 
                                        aria-label={tCommon('openMenu')} 
                                        size="icon-sm"
                                    >
                                        <MoreHorizontalIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                                    </Button>
                                </div>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className='bg-surface-default min-w-[200px]'>
                                {!read && onMarkAsRead && (
                                    <>
                                        <DropdownMenuItem 
                                            onSelect={handleMarkAsRead} 
                                            className='body-large text-text-primary flex justify-between items-center'
                                        >
                                            <span>
                                                {t('markasread')}
                                            </span>
                                        </DropdownMenuItem>
                                        {onRemove && <DropdownMenuSeparator />}
                                    </>
                                )}
                                {onRemove && (
                                    <DropdownMenuItem 
                                        onSelect={handleRemove} 
                                        className='text-text-danger body-large'
                                    >
                                        {t('remove')}
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <div className='flex justify-end'>
                            {!read && (
                                <div
                                    className="w-2 h-2 bg-surface-brand rounded-full flex-shrink-0"
                                    aria-label={tCommon('unread')}
                                    title={tCommon('unread')}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
