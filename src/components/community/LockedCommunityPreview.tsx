'use client';

import { Lock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { ButtonType1, ButtonType2 } from '@/components/custom/button';
import AccessBadges from '@/components/cards/AccessBadges';
import { CommunityTypeBadge } from '@/components/cards/CommunityTypeBadge';
import { resolveLockedAction } from '@/lib/communityLock';
import { toCdnUrl } from '@/lib/cdn';
import {
  toJoinPolicy,
  type AccessProfile,
  type PaymentType,
  type Visibility,
} from '@/types/membership';

export interface LockedCommunityPreviewProps {
  kind: 'community' | 'association';
  name: string;
  description?: string | null;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  /** `null`/absent → the count is not shown (never rendered as 0). */
  memberCount?: number | null;
  visibility?: string | null;
  joinPolicy?: string | null;
  paymentType?: string | null;
  /** Integer minor units; ÷100 happens inside AccessBadges. */
  priceAmount?: number | null;
  priceCurrency?: string | null;
  membershipStatus?: string | null;
  /** Communities only (associations carry a `{id,name}` type the badge cannot use). */
  communityType?: { name: string; isEmbassy: boolean } | null;
  /** Opens the page's existing join / request / payment flow. */
  onJoinClick: () => void;
  /** The page's existing cancel-request handler. */
  onCancelRequest: () => void;
  joinLoading?: boolean;
  cancelLoading?: boolean;
}

/**
 * What a non-member sees of a gated community/association: identity and ONE
 * action that matches how the entity admits people. Nothing here reads content;
 * the parent must not mount (or must skip) any content query while this shows.
 *
 * A PRIVATE entity gets the MINIMAL card: name, imagery, visibility/join-policy
 * badges (with the price only when joining is paid) and the action — no
 * description, member count or type badge. The server already withholds those
 * fields for private entities; the component does not render them even if a
 * value slipped through.
 */
export function LockedCommunityPreview(props: LockedCommunityPreviewProps) {
  const {
    kind, name, description, avatarUrl, bannerUrl, memberCount, onJoinClick, onCancelRequest,
    joinLoading = false, cancelLoading = false,
  } = props;
  const t = useTranslations('lockedCommunity');
  const tJoin = useTranslations('home.joinModal');

  const action = resolveLockedAction(props);
  const minimal = (props.visibility ?? '').toUpperCase() === 'PRIVATE';
  const hasPrice = props.paymentType && props.paymentType !== 'NONE';
  const access: AccessProfile | undefined = props.visibility
    ? {
        visibility: (props.visibility === 'PRIVATE' ? 'PRIVATE' : 'PUBLIC') as Visibility,
        joinPolicy: toJoinPolicy(props.joinPolicy),
        paymentType: (props.paymentType ?? 'NONE') as PaymentType,
        price:
          hasPrice && props.priceAmount
            ? { amountInCents: props.priceAmount, currency: props.priceCurrency ?? 'GHS' }
            : undefined,
      }
    : undefined;

  const banner = toCdnUrl(bannerUrl);
  const avatar = toCdnUrl(avatarUrl) || '/GLOBE.png';

  return (
    <div className="flex min-h-[60vh] items-start justify-center p-4">
      <section
        aria-labelledby="locked-community-name"
        data-testid="locked-community-preview"
        data-action={action}
        className="w-full max-w-xl overflow-hidden rounded-lg border border-border-disabled bg-surface-default shadow-md"
      >
        {banner ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={banner} alt="" aria-hidden="true" className="h-32 w-full object-cover" />
        ) : (
          <div aria-hidden="true" className="h-16 w-full bg-surface-alt" />
        )}
        <div className="flex flex-col gap-4 p-6">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatar}
              alt=""
              width={64}
              height={64}
              className="h-16 w-16 flex-shrink-0 rounded-full border border-border-subtle object-cover"
            />
            <div className="min-w-0">
              <h1 id="locked-community-name" className="text-xl font-semibold text-text-primary break-words">
                {name}
              </h1>
              {!minimal && memberCount != null && (
                <p className="text-sm text-text-secondary">
                  {memberCount === 1 ? tJoin('membersOne') : tJoin('membersOther', { count: memberCount })}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1">
            {!minimal && props.communityType && (
              <CommunityTypeBadge communityType={props.communityType} size="card" />
            )}
            {access && <AccessBadges access={access} size="card" />}
          </div>

          {!minimal && description && (
            <p className="text-sm text-text-secondary whitespace-pre-line">{description}</p>
          )}

          <p className="flex items-center gap-2 text-sm text-text-secondary">
            <Lock className="size-4 flex-shrink-0" aria-hidden="true" />
            {minimal
              ? kind === 'community'
                ? t('privateNoteCommunity')
                : t('privateNoteAssociation')
              : t('previewNote')}
          </p>

          <div className="flex flex-col items-start gap-2" data-testid="locked-community-action">
            {action === 'request' && (
              <ButtonType2 onClick={onJoinClick} disabled={joinLoading} size="lg">
                {t('requestToJoin')}
              </ButtonType2>
            )}
            {action === 'pay' && (
              <ButtonType2 onClick={onJoinClick} disabled={joinLoading} size="lg">
                {t('payToJoin')}
              </ButtonType2>
            )}
            {action === 'inviteOnly' && (
              <p role="status" className="text-sm font-medium text-text-primary">{t('inviteOnly')}</p>
            )}
            {action === 'pending' && (
              <>
                <p role="status" className="text-sm font-medium text-text-primary">{t('pendingTitle')}</p>
                <p className="text-sm text-text-secondary">{t('pendingHint')}</p>
                <ButtonType1 onClick={onCancelRequest} disabled={cancelLoading}>
                  {t('cancelRequest')}
                </ButtonType1>
              </>
            )}
            {action === 'banned' && (
              <p role="status" className="text-sm font-medium text-text-primary">
                {kind === 'community' ? t('bannedCommunity') : t('bannedAssociation')}
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

export default LockedCommunityPreview;

export interface SignInToViewCommunityProps {
  kind: 'community' | 'association';
}

/**
 * What a signed-OUT visitor sees when a community/association page resolves to
 * nothing. The server answers a PRIVATE entity exactly like a missing one for
 * anonymous callers (its existence is not disclosed), so this copy must hold
 * for both: "it may be private — sign in". Uses the same sign-in / sign-up
 * links as the public top bar.
 */
export function SignInToViewCommunity({ kind }: SignInToViewCommunityProps) {
  const t = useTranslations('lockedCommunity');
  const tCommon = useTranslations('common');
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <section
        aria-labelledby="sign-in-to-view-title"
        data-testid="sign-in-to-view"
        className="w-full max-w-md rounded-lg border border-border-disabled bg-surface-default p-6 text-center shadow-md"
      >
        <Lock className="mx-auto mb-3 size-8 text-text-secondary" aria-hidden="true" />
        <h1 id="sign-in-to-view-title" className="mb-2 text-xl font-semibold text-text-primary">
          {kind === 'community' ? t('signInTitleCommunity') : t('signInTitleAssociation')}
        </h1>
        <p className="mb-6 text-sm text-text-secondary">{t('signInBody')}</p>
        <div className="flex justify-center gap-3">
          <Link
            href="/signin"
            className="rounded-full px-4 py-2 text-sm font-semibold text-text-primary transition-colors hover:bg-surface-subtle"
          >
            {tCommon('signIn')}
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-text-brand px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            {tCommon('signUp')}
          </Link>
        </div>
      </section>
    </div>
  );
}
