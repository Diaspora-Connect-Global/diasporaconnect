"use client";

import { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import { toast } from "sonner";
import { useAuthStore } from "@/store/useAuthStore";
import { useNotificationStore } from "@/store/useNotificationStore";
import type { Notification } from "@/services/gql/types/notification";

// Notifications are pushed through the API gateway WebSocket (same host as messaging).
const WS_URL =
  process.env.NEXT_PUBLIC_NOTIFICATION_WS_URL ??
  process.env.NEXT_PUBLIC_MESSAGE_WS_URL ??
  "http://localhost:3000";

export default function NotificationWebSocketProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const tokens = useAuthStore((s) => s.tokens);
  const token = tokens?.sessionToken ?? tokens?.accessToken;
  const socketRef = useRef<Socket | null>(null);

  const addLiveNotification = useNotificationStore((s) => s.addLiveNotification);
  const incrementUnreadCount = useNotificationStore((s) => s.incrementUnreadCount);
  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount);

  useEffect(() => {
    if (!token?.trim()) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      return;
    }

    const rawToken = token.replace(/^Bearer\s+/i, "");

    const socket = io(WS_URL, {
      auth: { token: rawToken },
      transports: ["websocket"],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[NotificationWS] connected");
    });

    socket.on("connect_error", (err) => {
      console.warn("[NotificationWS] connection error:", err.message);
    });

    // API gateway emits the notification object directly (no wrapper)
    socket.on("notification", (notification: Notification) => {
      addLiveNotification(notification);
      incrementUnreadCount();
      toast(notification.title, {
        description: notification.message,
      });
    });

    socket.on("notification:unread-count", ({ count }: { count: number }) => {
      if (typeof count === "number") {
        setUnreadCount(count);
      }
    });

    return () => {
      socket.off("notification");
      socket.off("notification:unread-count");
      socket.off("connect");
      socket.off("connect_error");
      // Do not disconnect on cleanup — avoids thrash on React strict-mode double-invoke.
      // Connection is torn down only when token is gone (see top of effect).
    };
  }, [token, addLiveNotification, incrementUnreadCount, setUnreadCount]);

  return <>{children}</>;
}
