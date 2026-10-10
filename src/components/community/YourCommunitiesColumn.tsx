'use client';

import { useTranslations } from 'next-intl';
import { ChevronRight } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { MyCommunityCard } from '@/components/cards/MyCommunityCard';
import { PendingRequestCard } from '@/components/cards/PendingRequestCard';
import { toCdnUrl } from '@/lib/cdn';
import { useImageFallback } from '@/components/ui/ImageWithFallback';

export type JoinedCommunity = {
  id: string;
  name: string;
  description?: string | null;
  avatarUrl?: string | null;
  communityType?: { name: string; isEmbassy: boolean } | null;
};

export type JoinedAssociation = { id: string; name: string; avatarUrl?: string | null };

export type PendingCommunityRequest = { id: string; entityId: string; entityName: string };

/** How many associations the column lists before "Discover associations" takes over. */
const ASSOCIATION_PREVIEW = 5;

function AssociationRow({ association }: { association: JoinedAssociation }) {
  const { src, onError } = useImageFallback(association.avatarUrl ? toCdnUrl(association.avatarUrl) : undefined, '/ASSOCIATION.png');
  return (
    <li>
      <Link
        href={`/association/${encodeURIComponent(association.id)}`}
        prefetch={false}
        className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm text-text-primary transition-colors hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src || '/ASSOCIATION.png'} alt="" onError={onError} className="size-8 shrink-0 rounded-full border border-border-subtle object-cover" />
        <span className="min-w-0 flex-1 truncate">{association.name}</span>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      </Link>
    </li>
  );
}

/**
 * Left column of the Community page: what the viewer belongs to. It took over
 * the lists the old left sidebar held — joined communities, pending join
 * requests and associations — and stacks above the main content on phones.
 *
 * Purely presentational: the page owns the queries (so ONE page loader covers
 * them) and the cancel-request mutation.
 */
export function YourCommunitiesColumn({
  communities,
  pendingRequests,
  associations,
  onCancelRequest,
  cancelling,
}: {
  communities: readonly JoinedCommunity[];
  pendingRequests: readonly PendingCommunityRequest[];
  associations: readonly JoinedAssociation[];
  onCancelRequest: (communityId: string) => Promise<void> | void;
  cancelling: boolean;
}) {
  const t = useTranslations('community');
  const tAssociations = useTranslations('home.associations');

  return (
    <aside
      aria-labelledby="your-communities-heading"
      data-testid="your-communities"
      className="min-w-0 space-y-4 py-3 lg:sticky lg:top-0 lg:max-h-[calc(92svh-1rem)] lg:overflow-y-auto scrollbar-hide"
    >
      <h2 id="your-communities-heading" className="text-2xl font-bold text-text-primary">
        {t('yourCommunities.title')}
      </h2>

      <section aria-labelledby="your-communities-joined" className="rounded-xl bg-surface-default p-3">
        <h3 id="your-communities-joined" className="px-1 pb-1 text-sm font-semibold text-text-primary">
          {t('yourCommunities.communities')}
        </h3>
        {communities.length ? (
          <div className="max-h-[300px] overflow-y-auto scrollbar-hide lg:max-h-none">
            {communities.map((community) => (
              <MyCommunityCard
                key={community.id}
                id={community.id}
                title={community.name}
                description={community.description || ''}
                avatarUrl={toCdnUrl(community.avatarUrl)}
                communityType={community.communityType}
              />
            ))}
          </div>
        ) : (
          <p className="px-1 py-4 text-sm text-muted-foreground">{t('yourCommunities.empty')}</p>
        )}
      </section>

      {pendingRequests.length > 0 && (
        <section aria-labelledby="your-communities-pending" className="rounded-xl bg-surface-default p-3">
          <h3 id="your-communities-pending" className="px-1 pb-1 text-sm font-semibold text-text-primary">
            {t('pendingRequestsTitle')}
          </h3>
          <div className="max-h-[300px] overflow-y-auto scrollbar-hide">
            {pendingRequests.map((req) => (
              <PendingRequestCard
                key={req.id}
                name={req.entityName}
                href={`/community/${req.entityId}`}
                pendingLabel={t('pendingBadge')}
                cancelLabel={t('actions.cancelRequest')}
                confirmTitle={t('cancelRequestTitle')}
                confirmDescription={t('cancelRequestConfirm', { name: req.entityName })}
                onCancel={() => onCancelRequest(req.entityId)}
                cancelling={cancelling}
              />
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="your-communities-associations" className="rounded-xl bg-surface-default p-3">
        <h3 id="your-communities-associations" className="px-1 pb-1 text-sm font-semibold text-text-primary">
          {tAssociations('myAssociationsTitle')}
        </h3>
        {associations.length ? (
          <ul>
            {associations.slice(0, ASSOCIATION_PREVIEW).map((association) => (
              <AssociationRow key={association.id} association={association} />
            ))}
          </ul>
        ) : (
          <p className="px-1 py-2 text-sm text-muted-foreground">{tAssociations('noneJoined')}</p>
        )}
        <Link
          href="/association"
          prefetch={false}
          className="mt-1 inline-flex items-center gap-1 rounded-md px-1 py-1 text-sm font-medium text-text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand"
        >
          {tAssociations('discover')}
          <ChevronRight className="size-4" aria-hidden />
        </Link>
      </section>
    </aside>
  );
}
