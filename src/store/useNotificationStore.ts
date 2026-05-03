import { create } from "zustand";
import type { Notification } from "@/services/gql/types/notification";

const MAX_LIVE = 10;

interface NotificationState {
  unreadCount: number;
  liveNotifications: Notification[];
  setUnreadCount: (n: number) => void;
  incrementUnreadCount: () => void;
  addLiveNotification: (n: Notification) => void;
  clearLiveNotifications: () => void;
}

export const useNotificationStore = create<NotificationState>()((set) => ({
  unreadCount: 0,
  liveNotifications: [],

  setUnreadCount: (n) => set({ unreadCount: Math.max(0, n) }),

  incrementUnreadCount: () =>
    set((s) => ({ unreadCount: s.unreadCount + 1 })),

  addLiveNotification: (notification) =>
    set((s) => ({
      liveNotifications: [notification, ...s.liveNotifications].slice(0, MAX_LIVE),
    })),

  clearLiveNotifications: () => set({ liveNotifications: [] }),
}));
