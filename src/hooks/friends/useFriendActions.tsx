import { useTranslations } from 'next-intl';
import { useCallback } from 'react';
import { toast } from 'sonner';

export const useFriendActions = () => {
    const t = useTranslations('friends');

    const sendMessage = useCallback(async (userId: string) => {
        console.log('Opening chat with user:', userId);
        toast.success(t('toasts.openingChat'));
        // await router.push(`/messages/${userId}`);
    }, [t]);

    const addFriend = useCallback(async (userId: string) => {
        console.log('Sending friend request to:', userId);
        // await api.post('/friends/request', { userId });
        toast.success(t('toasts.requestSent'));
    }, [t]);

    const acceptRequest = useCallback(async (userId: string) => {
        console.log('Accepting friend request from:', userId);
        // await api.post('/friends/accept', { userId });
        toast.success(t('toasts.friendAccepted'));
    }, [t]);

    const ignoreRequest = useCallback(async (userId: string) => {
        console.log('Ignoring friend request from:', userId);
        // await api.post('/friends/ignore', { userId });
        toast.success(t('toasts.requestIgnored'));
    }, [t]);

    const cancelRequest = useCallback(async (userId: string) => {
        console.log('Canceling friend request to:', userId);
        // await api.delete('/friends/request', { data: { userId } });
        toast.success(t('toasts.requestCancelled'));
    }, [t]);

    const removeFriend = useCallback(async (userId: string) => {
        console.log('Removing friend:', userId);
        // await api.delete('/friends', { data: { userId } });
        toast.success(t('toasts.friendRemoved'));
    }, [t]);

    const blockFriend = useCallback(async (userId: string) => {
        console.log('Blocking user:', userId);
        // await api.post('/users/block', { userId });
        toast.success(t('toasts.friendBlocked'));
    }, [t]);

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