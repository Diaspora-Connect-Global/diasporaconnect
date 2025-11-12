import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

export const useFriendActions = () => {
    const t = useTranslations('friends');

    const sendMessage = useCallback(async (userId: string) => {
        try {
            console.log('Opening chat with user:', userId);
            // await router.push(`/messages/${userId}`);
        } catch (error) {
            console.error('Failed to open message:', error);
        }
    }, []);

    const addFriend = useCallback(async (userId: string) => {
        try {
            console.log('Sending friend request to:', userId);
            // await api.post('/friends/request', { userId });
        } catch (error) {
            console.error('Failed to add friend:', error);
        }
    }, []);

    const acceptRequest = useCallback(async (userId: string) => {
        try {
            console.log('Accepting friend request from:', userId);
            // await api.post('/friends/accept', { userId });
        } catch (error) {
            console.error('Failed to accept request:', error);
        }
    }, []);

    const ignoreRequest = useCallback(async (userId: string) => {
        try {
            console.log('Ignoring friend request from:', userId);
            // await api.post('/friends/ignore', { userId });
        } catch (error) {
            console.error('Failed to ignore request:', error);
        }
    }, []);

    const cancelRequest = useCallback(async (userId: string) => {
        try {
            console.log('Canceling friend request to:', userId);
            // await api.delete('/friends/request', { data: { userId } });
        } catch (error) {
            console.error('Failed to cancel request:', error);
        }
    }, []);

    const removeFriend = useCallback(async (userId: string) => {
        try {
            console.log('Removing friend:', userId);
            // await api.delete('/friends', { data: { userId } });
        } catch (error) {
            console.error('Failed to remove friend:', error);
        }
    }, []);

    const blockFriend = useCallback(async (userId: string) => {
        try {
            console.log('Blocking user:', userId);
            // await api.post('/users/block', { userId });
        } catch (error) {
            console.error('Failed to block user:', error);
        }
    }, []);

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