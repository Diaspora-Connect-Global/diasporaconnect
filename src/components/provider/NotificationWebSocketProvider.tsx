"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { useNotificationStore } from "@/store/useNotificationStore";
import type { Notification } from "@/services/gql/types/notification";
// Reuse the shared message-service socket (already connected to the API
// gateway by MessageWebSocketProvider). The gateway emits notification events
// to the user's personal room (user:<id>) on the SAME connection, so we never
// need a second socket — opening one causes a duplicate-connection conflict.
import { messageService } from "@/services/websocket/messageService";

export default function NotificationWebSocketProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const addLiveNotification = useNotificationStore((s) => s.addLiveNotification);
  const incrementUnreadCount = useNotificationStore((s) => s.incrementUnreadCount);
  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount);

  useEffect(() => {
    // Attach to the shared socket. If the socket is not yet connected (e.g.
    // this provider mounts before MessageWebSocketProvider connects), the
    // callbacks are buffered in messageService and will fire once the socket
    // receives the events — no race condition.
    const unsubNotification = messageService.onNotification((raw) => {
      const notification = raw as Notification;
      addLiveNotification(notification);
      incrementUnreadCount();
      toast(notification.title, {
        description: notification.message,
      });
    });

    const unsubUnreadCount = messageService.onUnreadCount(({ count }) => {
      if (typeof count === "number") {
        setUnreadCount(count);
      }
    });

    return () => {
      unsubNotification();
      unsubUnreadCount();
    };
  }, [addLiveNotification, incrementUnreadCount, setUnreadCount]);

  return <>{children}</>;
}
