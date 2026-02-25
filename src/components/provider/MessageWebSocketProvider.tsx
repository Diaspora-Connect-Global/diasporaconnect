"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { messageService } from "@/services/websocket/messageService";

/**
 * Connects the message WebSocket as soon as the user is authenticated,
 * so real-time messages can flow regardless of which page they're on.
 * Rendered inside the protected main layout.
 */
export default function MessageWebSocketProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const tokens = useAuthStore((s) => s.tokens);
  const accessToken = tokens?.accessToken;

  useEffect(() => {
    if (!accessToken?.trim()) {
      messageService.disconnect();
      return;
    }
    messageService.connect(accessToken);
    return () => {
      messageService.disconnect();
    };
  }, [accessToken]);

  return <>{children}</>;
}
