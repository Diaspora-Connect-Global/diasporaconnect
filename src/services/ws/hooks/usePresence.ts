'use client';

import { useState, useCallback, useEffect } from 'react';
import { useMessageClient } from './useMessageClient';
import { PresenceUpdate } from '../types';

interface UsePresenceOptions {
  jwtToken: string;
  currentUserId: string;
  userIds?: string[]; // Users to track
}

interface UserPresence {
  userId: string;
  isOnline: boolean;
  lastSeen?: string;
}

export const usePresence = ({
  jwtToken,
  currentUserId,
  userIds = [],
}: UsePresenceOptions) => {
  const [presenceMap, setPresenceMap] = useState<Map<string, UserPresence>>(
    new Map()
  );
  const [onlineCount, setOnlineCount] = useState(0);

  const { isConnected, queryPresence, queryOnlineUsers } = useMessageClient({
    jwtToken,
    currentUserId,
    onPresenceUpdate: (update: PresenceUpdate) => {
      setPresenceMap((prev) => {
        const newMap = new Map(prev);
        newMap.set(update.userId, {
          userId: update.userId,
          isOnline: update.isOnline,
          lastSeen: update.lastSeen,
        });
        return newMap;
      });
    },
  });

  // Query presence for specific users
  const fetchPresence = useCallback(
    async (userId: string) => {
      try {
        const presence = await queryPresence(userId);
        setPresenceMap((prev) => {
          const newMap = new Map(prev);
          newMap.set(userId, presence);
          return newMap;
        });
      } catch (error) {
        console.error('Failed to fetch presence:', error);
      }
    },
    [queryPresence]
  );

  // Fetch all online users
  const fetchOnlineUsers = useCallback(async () => {
    try {
      const { onlineUsers, count } = await queryOnlineUsers();
      setOnlineCount(count);

      // Update presence map with online users
      setPresenceMap((prev) => {
        const newMap = new Map(prev);
        onlineUsers.forEach((userId) => {
          newMap.set(userId, {
            userId,
            isOnline: true,
          });
        });
        return newMap;
      });
    } catch (error) {
      console.error('Failed to fetch online users:', error);
    }
  }, [queryOnlineUsers]);

  // Fetch presence for all tracked users on mount
  useEffect(() => {
    if (isConnected && userIds.length > 0) {
      userIds.forEach((userId) => {
        fetchPresence(userId);
      });
    }
  }, [isConnected, userIds, fetchPresence]);

  const isUserOnline = useCallback(
    (userId: string): boolean => {
      return presenceMap.get(userId)?.isOnline ?? false;
    },
    [presenceMap]
  );

  const getUserLastSeen = useCallback(
    (userId: string): string | undefined => {
      return presenceMap.get(userId)?.lastSeen;
    },
    [presenceMap]
  );

  return {
    presenceMap,
    onlineCount,
    isUserOnline,
    getUserLastSeen,
    fetchPresence,
    fetchOnlineUsers,
  };
};
