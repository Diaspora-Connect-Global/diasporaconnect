import { useTranslations } from 'next-intl';
import { useCallback } from 'react';
import { toast } from 'sonner';
import { useMutation } from '@apollo/client/react';
import {
    SEND_CONNECTION_REQUEST,
    ACCEPT_CONNECTION,
    REJECT_CONNECTION,
    GET_MY_CONNECTIONS,
    GET_PENDING_CONNECTIONS,
    SendConnectionRequestResponse,
    AcceptConnectionResponse,
    RejectConnectionResponse,
    CANCEL_CONNECTION,
    CancelConnectionResponse,
} from '@/services/gql/connection';
import {
    BLOCK_USER,
    GET_BLOCKED_USERS,
    BlockUserResponse,
} from '@/services/gql/users';

export const useFriendActions = () => {
    const t = useTranslations('friends');

    // GraphQL Mutations - Connections
    const [sendConnectionRequest] = useMutation<SendConnectionRequestResponse>(
        SEND_CONNECTION_REQUEST,
        {
            refetchQueries: [{ query: GET_MY_CONNECTIONS }],
        }
    );

    const [acceptConnection] = useMutation<AcceptConnectionResponse>(
        ACCEPT_CONNECTION,
        {
            refetchQueries: [
                { query: GET_MY_CONNECTIONS },
                { query: GET_PENDING_CONNECTIONS },
            ],
        }
    );

    const [rejectConnection] = useMutation<RejectConnectionResponse>(
        REJECT_CONNECTION,
        {
            refetchQueries: [{ query: GET_PENDING_CONNECTIONS }],
        }
    );
    const [cancelConnection] = useMutation<CancelConnectionResponse>(
        CANCEL_CONNECTION,
        {
            refetchQueries: [{ query: GET_PENDING_CONNECTIONS }],
        }
    );

    // GraphQL Mutations - Blocking
    const [blockUserMutation] = useMutation<BlockUserResponse>(
        BLOCK_USER,
        {
            refetchQueries: [
                { query: GET_MY_CONNECTIONS },
                { query: GET_BLOCKED_USERS },
            ],
        }
    );

    const sendMessage = useCallback(async (userId: string) => {
        console.log('Opening chat with user:', userId);
        toast.success(t('toasts.openingChat'));
        // TODO: Implement chat navigation
        // await router.push(`/messages/${userId}`);
    }, [t]);

    const addFriend = useCallback(async (userId: string) => {
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
            } else {
                toast.error(data?.sendConnectionRequest.message || 'Failed to send request');
            }
        } catch (error) {
            console.error('Error sending friend request:', error);
            toast.error('Failed to send friend request');
        }
    }, [t, sendConnectionRequest]);

    const acceptRequest = useCallback(async (connectionId: string) => {
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
            } else {
                toast.error(data?.acceptConnection.message || 'Failed to accept request');
            }
        } catch (error) {
            console.error('Error accepting friend request:', error);
            toast.error('Failed to accept friend request');
        }
    }, [t, acceptConnection]);

    const ignoreRequest = useCallback(async (connectionId: string) => {
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
            } else {
                toast.error(data?.rejectConnection.message || 'Failed to ignore request');
            }
        } catch (error) {
            console.error('Error ignoring friend request:', error);
            toast.error('Failed to ignore friend request');
        }
    }, [t, rejectConnection]);

    const cancelRequest = useCallback(async (connectionId: string) => {
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
            } else {
                toast.error(data?.cancelConnection.message || 'Failed to cancel request');
            }
        } catch (error) {
            console.error('Error canceling friend request:', error);
            toast.error('Failed to cancel friend request');
        }
    }, [t, cancelConnection]);

    const removeFriend = useCallback(async (connectionId: string) => {
        try {
            // Using rejectConnection to remove/delete the connection
            const { data } = await rejectConnection({
                variables: {
                    input: {
                        connectionId,
                    },
                },
            });

            if (data?.rejectConnection.success) {
                toast.success(t('toasts.friendRemoved'));
            } else {
                toast.error(data?.rejectConnection.message || 'Failed to remove friend');
            }
        } catch (error) {
            console.error('Error removing friend:', error);
            toast.error('Failed to remove friend');
        }
    }, [t, rejectConnection]);

    const blockFriend = useCallback(async (userId: string) => {
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
            } else {
                toast.error(data?.blockUser.message || 'Failed to block user');
            }
        } catch (error) {
            console.error('Error blocking user:', error);
            toast.error('Failed to block user');
        }
    }, [t, blockUserMutation]);

    return {
        sendMessage,
        addFriend,
        acceptRequest,
        ignoreRequest,
        cancelRequest,
        removeFriend,
        blockFriend,
        t,
    };
};