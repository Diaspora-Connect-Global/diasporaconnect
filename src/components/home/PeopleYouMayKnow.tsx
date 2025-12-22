'use client';

import { ChevronRight } from "lucide-react";
import PeopleYouMayKnowCard from "../cards/PeopleYouMayKnowCard";
import { useTranslations } from 'next-intl';
import { Link } from "@/i18n/navigation";
import { useQuery } from "@apollo/client/react";
import { GET_FRIEND_SUGGESTIONS, GetFriendSuggestionsResponse } from "@/services/gql/connection";
import { Skeleton } from "@/components/ui/skeleton";
import { useFriendActions } from "@/hooks/friends/useFriendActions";
import { useState } from "react";

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
    const { addFriend } = useFriendActions();
    
    // Track which user is currently being added
    const [loadingUserId, setLoadingUserId] = useState<string | null>(null);

    // Query friend suggestions - limit to 3 for homepage
    const { data, loading, refetch } = useQuery<GetFriendSuggestionsResponse>(
        GET_FRIEND_SUGGESTIONS,
        {
            variables: { limit: 3 },
            fetchPolicy: 'cache-and-network',
        }
    );

    const suggestions = data?.getFriendSuggestions.suggestions || [];

    const handleAddFriend = async (userId: string) => {
        setLoadingUserId(userId); // Set loading state for this specific user
        
        try {
            await addFriend(userId);
            // Success toast is handled in the hook
            
            // Refetch suggestions after adding a friend to update the list
            setTimeout(() => {
                refetch();
            }, 500); // Small delay to allow backend to update
        } catch (error) {
            console.error('Error adding friend:', error);
            // Error toast is handled in the hook
        } finally {
            setLoadingUserId(null); // Clear loading state
        }
    };

    return (
        <div className="space-y-[3.2rem]"> {/* 32px equivalent */}
            <div className="space-y-[1.2rem]"> {/* 12px equivalent */}
                <p className="caption-large">{t('peopleYouMayKnow')}</p>
                <div className="space-y-[1.6rem]"> {/* 16px equivalent */}
                    {loading ? (
                        // Show 5 skeleton loaders while loading
                        <>
                            <FriendSuggestionSkeleton />
                            <FriendSuggestionSkeleton />
                            <FriendSuggestionSkeleton />
                            <FriendSuggestionSkeleton />
                            <FriendSuggestionSkeleton />
                        </>
                    ) : suggestions.length === 0 ? (
                        // Show empty state
                        <p className="text-text-secondary text-sm text-center py-4">
                            {t('noSuggestions') || 'No friend suggestions available'}
                        </p>
                    ) : (
                        // Show actual suggestions
                        suggestions.map((suggestion) => (
                            <PeopleYouMayKnowCard
                                key={suggestion.profile.userId}
                                profileImage={suggestion.profile.avatarUrl || "https://github.com/shadcn.png"}
                                name={`${suggestion.profile.firstName} ${suggestion.profile.lastName}`}
                                mutualConnections={suggestion.mutualConnectionsCount}
                                onAddFriend={() => handleAddFriend(suggestion.profile.userId)}
                                isLoading={loadingUserId === suggestion.profile.userId}
                            />
                        ))
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
