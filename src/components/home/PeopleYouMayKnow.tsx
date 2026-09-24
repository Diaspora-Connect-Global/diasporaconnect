'use client';

import { ChevronRight, UserPlus } from "lucide-react";
import PeopleYouMayKnowCard from "../cards/PeopleYouMayKnowCard";
import { EmptyState } from "@/components/feedback";
import { useTranslations } from 'next-intl';
import { Link } from "@/i18n/navigation";
import { useQuery } from "@apollo/client/react";
import { RECOMMENDED_PEOPLE } from "@/services/gql/postsFeed";
import type { RecommendedPeopleData } from "@/services/gql/types/recommendation";
import { Skeleton } from "@/components/ui/skeleton";
import { useFriendActions } from "@/hooks/friends/useFriendActions";
import { useState } from "react";
import { pymkMatchReason } from "@/lib/pymkMatchReason";
import { toCdnUrl } from "@/lib/cdn";

// Loading skeleton for friend suggestions
function FriendSuggestionSkeleton() {
    return (
        <div className="h-[2.5rem] flex space-x-6 items-center justify-between">
            <div className="flex items-center gap-[0.5rem]">
                <Skeleton className="h-[1.5rem] w-[1.5rem] rounded-full" />
                <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-32" />
                </div>
            </div>
            <Skeleton className="h-6 w-16" />
        </div>
    );
}

export function PeopleYouMayKnow() {
    const t = useTranslations('home');
    const tActions = useTranslations('actions');
    const tFeedback = useTranslations('feedback');
    const { addFriend } = useFriendActions();

    // Track which user is currently being added
    const [loadingUserId, setLoadingUserId] = useState<string | null>(null);
    // People the viewer just sent a request to. Hidden immediately on
    // click (optimistic) and kept hidden, so the card can't linger or
    // flash back while the list refetches; restored only if the send fails.
    const [requestedIds, setRequestedIds] = useState<Set<string>>(() => new Set());

    // Phase 2: PYMK is now sourced from recommendation-service via
    // `recommendedPeople`. The gateway server-hydrates the user `Profile`
    // and resolves community names for `sharedCommunityIds`, so a single
    // round-trip carries everything the card needs. The old
    // `GET_FRIEND_SUGGESTIONS` path (user-service heuristic) is gone.
    const { data, loading } = useQuery<RecommendedPeopleData>(
        RECOMMENDED_PEOPLE,
        {
            variables: { limit: 3 },
            fetchPolicy: 'network-only',
        }
    );

    // Relationship filtering (friends, pending either way, blocked, self)
    // is enforced server-side in recommendation-service. The only
    // client-side filter is the viewer's own just-sent requests, so the
    // card disappears the moment they click.
    const suggestions = (data?.recommendedPeople?.items ?? []).filter(
        (s) => !requestedIds.has(s.profile.userId),
    );

    const handleAddFriend = async (userId: string) => {
        setLoadingUserId(userId);
        setRequestedIds((prev) => new Set(prev).add(userId));
        try {
            // Success/error toasts are handled in the hook.
            // On success the mutation's refetchQueries has already
            // refreshed every RecommendedPeople observer; keep the id
            // hidden regardless so the card can never flash back.
            const sent = await addFriend(userId);
            if (!sent) {
                setRequestedIds((prev) => {
                    const next = new Set(prev);
                    next.delete(userId);
                    return next;
                });
            }
        } finally {
            setLoadingUserId(null);
        }
    };

    return (
        <div className="space-y-[3.2rem]"> {/* 32px equivalent */}
            <div className="space-y-[1.2rem]"> {/* 12px equivalent */}
                <p className="caption-large">{t('peopleYouMayKnow')}</p>
                <div className="space-y-[1.6rem]"> {/* 16px equivalent */}
                    {loading ? (
                        <>
                            <FriendSuggestionSkeleton />
                            <FriendSuggestionSkeleton />
                            <FriendSuggestionSkeleton />
                            <FriendSuggestionSkeleton />
                            <FriendSuggestionSkeleton />
                        </>
                    ) : suggestions.length === 0 ? (
                        <EmptyState
                            size="sm"
                            icon={UserPlus}
                            title={tFeedback('empty.people.title')}
                            description={tFeedback('empty.people.description')}
                        />
                    ) : (
                        suggestions.map((suggestion) => {
                            // Phase 3 match-reason ladder (shared with
                            // `FriendListModal` Suggested tab) — picks the most
                            // informative signal in order: mutual connections →
                            // shared communities → diaspora pair → same city →
                            // engagement. Falls back to a generic copy when the
                            // recommender supplies none.
                            const reasonCopy = pymkMatchReason({
                                mutualConnectionNames: suggestion.mutualConnectionNames,
                                mutualConnectionCount: suggestion.mutualConnectionCount,
                                sharedCommunityNames: suggestion.sharedCommunityNames,
                                matchReason: suggestion.matchReason,
                            }) || (t('suggestedForYou') || 'Suggested for you');
                            const displayName = `${suggestion.profile.firstName ?? ''} ${suggestion.profile.lastName ?? ''}`.trim() || 'Member';
                            // Defensive cast — `trustScore`/`trustTier` are
                            // landing on `ProfileSummary` in a parallel GQL
                            // sweep; types may not be updated yet.
                            const profileWithTrust = suggestion.profile as typeof suggestion.profile & {
                                trustScore?: number;
                                trustTier?: string;
                            };
                            return (
                                <PeopleYouMayKnowCard
                                    key={suggestion.profile.userId}
                                    userId={suggestion.profile.userId}
                                    profileImage={toCdnUrl(suggestion.profile.avatarUrl)}
                                    name={displayName}
                                    matchReason={reasonCopy}
                                    trustScore={profileWithTrust.trustScore}
                                    onAddFriend={() => handleAddFriend(suggestion.profile.userId)}
                                    isLoading={loadingUserId === suggestion.profile.userId}
                                />
                            );
                        })
                    )}
                </div>
            </div>
            <div className="flex justify-between">
                <p className="caption-large text-text-primary whitespace-nowrap">{t('events.near')}</p>
                <Link href="/events">
                    <div className="label-medium text-text-brand flex text-center justify-end items-end">
                        <p className="whitespace-nowrap">{tActions('seemore')}</p>
                        <ChevronRight size={20} />
                    </div>
                </Link>
            </div>
        </div>
    );
}
