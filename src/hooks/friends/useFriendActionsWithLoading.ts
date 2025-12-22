import { useFriendActions } from "@/hooks/friends/useFriendActions";
import { useFriendActionLoading } from "@/components/profile/FriendListModal";

/**
 * Enhanced friend actions hook that integrates with the loading state context
 * Use this hook in FriendActionButtons when rendered within FriendListModal
 */
export const useFriendActionsWithLoading = () => {
  const friendActions = useFriendActions();
  const { setLoadingUserId } = useFriendActionLoading();

  const wrappedActions = {
    addFriend: async (userId: string) => {
      setLoadingUserId(userId);
      try {
        await friendActions.addFriend(userId);
      } finally {
        // Small delay to show the loading state
        setTimeout(() => {
          setLoadingUserId(null);
        }, 500);
      }
    },

    acceptFriend: async (connectionId: string, userId: string) => {
      setLoadingUserId(userId);
      try {
        await friendActions.acceptRequest(connectionId);
      } finally {
        setTimeout(() => {
          setLoadingUserId(null);
        }, 500);
      }
    },

    ignoreFriend: async (connectionId: string, userId: string) => {
      setLoadingUserId(userId);
      try {
        await friendActions.ignoreRequest(connectionId);
      } finally {
        setTimeout(() => {
          setLoadingUserId(null);
        }, 500);
      }
    },

    cancelRequest: async (connectionId: string, userId: string) => {
      setLoadingUserId(userId);
      try {
        await friendActions.cancelRequest(connectionId);
      } finally {
        setTimeout(() => {
          setLoadingUserId(null);
        }, 500);
      }
    },

    removeFriend: async (connectionId: string, userId: string) => {
      setLoadingUserId(userId);
      try {
        await friendActions.removeFriend(connectionId);
      } finally {
        setTimeout(() => {
          setLoadingUserId(null);
        }, 500);
      }
    },

    blockFriend: async (userId: string) => {
      setLoadingUserId(userId);
      try {
        await friendActions.blockFriend(userId);
      } finally {
        setTimeout(() => {
          setLoadingUserId(null);
        }, 500);
      }
    },
  };

  return wrappedActions;
};
