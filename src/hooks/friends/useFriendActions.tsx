import { useTranslations } from 'next-intl';
import { useCallback, useState, useRef } from 'react';
import { toast } from 'sonner';
import { useMutation } from '@apollo/client/react';
import { useRouter } from '@/i18n/navigation';
import { useChatStore } from '@/store/ChatStore';
import {
    SEND_CONNECTION_REQUEST,
    ACCEPT_CONNECTION,
    REJECT_CONNECTION,
    GET_MY_CONNECTIONS,
    GET_ALL_PENDING_CONNECTIONS,
    SEARCH_USERS,
    SendConnectionRequestResponse,
    AcceptConnectionResponse,
    RejectConnectionResponse,
    CANCEL_CONNECTION,
    CancelConnectionResponse,
    REMOVE_FRIEND,
    RemoveFriendResponse,
} from '@/services/gql/connection';
import { RECOMMENDED_PEOPLE } from '@/services/gql/postsFeed';
import {
    BLOCK_USER,
    GET_BLOCKED_USERS,
    BlockUserResponse,
} from '@/services/gql/users';

interface UseFriendActionsOptions {
    searchQuery?: string;
    isSearching?: boolean;
    onConnectionAction?: () => void;
}

export const useFriendActions = (options?: UseFriendActionsOptions) => {
    const t = useTranslations('friends');
    const router = useRouter();
    const { searchQuery = '', isSearching = false, onConnectionAction } = options || {};
    
    // Use ref to get latest values in refetchQueries closure
    const searchStateRef = useRef({ searchQuery, isSearching });
    searchStateRef.current = { searchQuery, isSearching };

    // Loading states for each action type
    const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});

    // Helper to set loading state for a specific action
    const setActionLoading = (actionKey: string, isLoading: boolean) => {
        setLoadingStates(prev => ({ ...prev, [actionKey]: isLoading }));
    };

    // Build refetch queries dynamically based on whether we're searching
    const buildRefetchQueries = (includeConnections = false) => {
        const { searchQuery: currentSearchQuery, isSearching: currentIsSearching } = searchStateRef.current;
        const queries = [];
        
        if (includeConnections) {
            queries.push({ query: GET_MY_CONNECTIONS });
        }
        
        // Phase 3 PYMK unification — refresh the recommendation-service
        // feed (was `GET_FRIEND_SUGGESTIONS` against the retired
        // user-service heuristic). Same surface, same trigger points.
        //
        // Refetch BY OPERATION NAME (string), not by `{query, variables}`,
        // so EVERY active `RecommendedPeople` observer is refreshed —
        // the home widget uses `limit: 3`, FriendListModal uses
        // `limit: 10`, and the legacy refetch path used `limit: 20`.
        // Each combination is a separate Apollo cache entry; passing only
        // `{query, variables: {limit: 20}}` would invalidate just one of
        // the three. The operation-name form covers all of them in a
        // single entry.
        queries.push('RecommendedPeople' as unknown as { query: typeof RECOMMENDED_PEOPLE; variables: { limit: number } });
        
        // If actively searching, also refetch search results
        if (currentIsSearching && currentSearchQuery.length > 0) {
            queries.push({
                query: SEARCH_USERS,
                variables: {
                    searchUsersInput: {
                        query: currentSearchQuery,
                        limit: 20,
                        offset: 0,
                    }
                }
            });
        }
        
        return queries;
    };

    // GraphQL Mutations - Connections
    const [sendConnectionRequest] = useMutation<SendConnectionRequestResponse>(
        SEND_CONNECTION_REQUEST,
        {
            refetchQueries: () => [
                { query: GET_MY_CONNECTIONS },
                { query: GET_ALL_PENDING_CONNECTIONS, variables: { limit: 100, offset: 0 } },
                ...buildRefetchQueries(),
            ],
            awaitRefetchQueries: true,
        }
    );

    const [acceptConnection] = useMutation<AcceptConnectionResponse>(
        ACCEPT_CONNECTION,
        {
            refetchQueries: () => [
                { query: GET_MY_CONNECTIONS },
                { query: GET_ALL_PENDING_CONNECTIONS, variables: { limit: 100, offset: 0 } },
                ...buildRefetchQueries(),
            ],
            awaitRefetchQueries: true,
        }
    );

    const [rejectConnection] = useMutation<RejectConnectionResponse>(
        REJECT_CONNECTION,
        {
            refetchQueries: () => [
                { query: GET_MY_CONNECTIONS },
                { query: GET_ALL_PENDING_CONNECTIONS, variables: { limit: 100, offset: 0 } },
                ...buildRefetchQueries(),
            ],
            awaitRefetchQueries: true,
        }
    );

    const [cancelConnection] = useMutation<CancelConnectionResponse>(
        CANCEL_CONNECTION,
        {
            refetchQueries: () => [
                { query: GET_ALL_PENDING_CONNECTIONS, variables: { limit: 100, offset: 0 } },
                ...buildRefetchQueries(),
            ],
            awaitRefetchQueries: true,
        }
    );

    const [removeFriendMutation] = useMutation<RemoveFriendResponse>(
        REMOVE_FRIEND,
        {
            refetchQueries: () => [
                { query: GET_MY_CONNECTIONS },
                ...buildRefetchQueries(true),
            ],
            awaitRefetchQueries: true,
        }
    );

    // GraphQL Mutations - Blocking
    const [blockUserMutation] = useMutation<BlockUserResponse>(
        BLOCK_USER,
        {
            refetchQueries: () => [
                { query: GET_MY_CONNECTIONS },
                { query: GET_BLOCKED_USERS },
                ...buildRefetchQueries(),
            ],
            awaitRefetchQueries: true,
        }
    );

    /** Open direct messages with this user (peer userId, not connectionId). */
    const sendMessage = useCallback(
        (peerUserId: string) => {
            const id = peerUserId?.trim();
            if (!id) {
                toast.error(t('toasts.cannotOpenChat'));
                return;
            }
            useChatStore.getState().setActiveChat({ id, type: 'direct' });
            sessionStorage.setItem('activeChat', JSON.stringify({ id, type: 'direct' }));
            toast.success(t('toasts.openingChat'));
            router.push('/chat?t=direct&ct=direct');
        },
        [router, t]
    );

    const addFriend = useCallback(async (userId: string) => {
        const actionKey = `addFriend-${userId}`;
        setActionLoading(actionKey, true);

        try {
            const { data } = await sendConnectionRequest({
                variables: {
                    input: {
                        receiverId: userId,
                    },
                },
            });

            if (data?.sendConnectionRequest.success) {
                toast.success(t('toasts.requestSent'));
                onConnectionAction?.();
            } else {
                toast.error(data?.sendConnectionRequest.message || 'Failed to send request');
            }
        } catch (error) {
            console.error('Error sending friend request:', error);
            toast.error('Failed to send friend request');
        } finally {
            setActionLoading(actionKey, false);
        }
    }, [t, sendConnectionRequest, onConnectionAction]);

    const acceptRequest = useCallback(async (connectionId: string) => {
        const actionKey = `acceptRequest-${connectionId}`;
        setActionLoading(actionKey, true);

        try {
            const { data } = await acceptConnection({
                variables: {
                    input: {
                        connectionId,
                    },
                },
            });

            if (data?.acceptConnection.success) {
                toast.success(t('toasts.friendAccepted'));
                onConnectionAction?.();
            } else {
                toast.error(data?.acceptConnection.message || 'Failed to accept request');
            }
        } catch (error) {
            console.error('Error accepting friend request:', error);
            toast.error('Failed to accept friend request');
        } finally {
            setActionLoading(actionKey, false);
        }
    }, [t, acceptConnection, onConnectionAction]);

    const ignoreRequest = useCallback(async (connectionId: string) => {
        const actionKey = `ignoreRequest-${connectionId}`;
        setActionLoading(actionKey, true);

        try {
            const { data } = await rejectConnection({
                variables: {
                    input: {
                        connectionId,
                    },
                },
            });

            if (data?.rejectConnection.success) {
                toast.success(t('toasts.requestIgnored'));
                onConnectionAction?.();
            } else {
                toast.error(data?.rejectConnection.message || 'Failed to ignore request');
            }
        } catch (error) {
            console.error('Error ignoring friend request:', error);
            toast.error('Failed to ignore friend request');
        } finally {
            setActionLoading(actionKey, false);
        }
    }, [t, rejectConnection, onConnectionAction]);

    const cancelRequest = useCallback(async (connectionId: string) => {
        const actionKey = `cancelRequest-${connectionId}`;
        setActionLoading(actionKey, true);

        console.log('Cancelling friend request with connectionId:', connectionId);
        try {
            const { data } = await cancelConnection({
                variables: {
                    input: {
                        connectionId,
                    },
                },
            });

            if (data?.cancelConnection.success) {
                toast.success(t('toasts.requestCancelled'));
                onConnectionAction?.();
            } else {
                toast.error(data?.cancelConnection.message || 'Failed to cancel request');
            }
        } catch (error) {
            console.error('Error canceling friend request:', error);
            toast.error('Failed to cancel friend request');
        } finally {
            setActionLoading(actionKey, false);
        }
    }, [t, cancelConnection, onConnectionAction]);

    const removeFriend = useCallback(async (connectionId: string) => {
        const actionKey = `removeFriend-${connectionId}`;
        setActionLoading(actionKey, true);

        try {
            const { data } = await removeFriendMutation({
                variables: {
                    input: {
                        connectionId,
                    },
                },
            });

            if (data?.removeFriend.success) {
                toast.success(t('toasts.friendRemoved'));
                onConnectionAction?.();
            } else {
                toast.error(data?.removeFriend.message || 'Failed to remove friend');
            }
        } catch (error) {
            console.error('Error removing friend:', error);
            toast.error('Failed to remove friend');
        } finally {
            setActionLoading(actionKey, false);
        }
    }, [t, removeFriendMutation, onConnectionAction]);

    const blockFriend = useCallback(async (userId: string) => {
        const actionKey = `blockFriend-${userId}`;
        setActionLoading(actionKey, true);

        try {
            const { data } = await blockUserMutation({
                variables: {
                    input: {
                        blockedId: userId,
                    },
                },
            });

            if (data?.blockUser.success) {
                toast.success(t('toasts.friendBlocked'));
                onConnectionAction?.();
            } else {
                toast.error(data?.blockUser.message || 'Failed to block user');
            }
        } catch (error) {
            console.error('Error blocking user:', error);
            toast.error('Failed to block user');
        } finally {
            setActionLoading(actionKey, false);
        }
    }, [t, blockUserMutation, onConnectionAction]);

    // Helper function to check if a specific action is loading
    const isActionLoading = useCallback((actionType: string, id: string) => {
        return loadingStates[`${actionType}-${id}`] || false;
    }, [loadingStates]);

    return {
        sendMessage,
        addFriend,
        acceptRequest,
        ignoreRequest,
        cancelRequest,
        removeFriend,
        blockFriend,
        isActionLoading,
        t,
    };
};