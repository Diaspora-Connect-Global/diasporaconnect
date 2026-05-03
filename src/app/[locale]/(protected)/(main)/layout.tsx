"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Header from "@/components/custom/header";
import LoadingScreen from "@/components/custom/LoadingScreen";
import { useAuthStore } from "@/store/useAuthStore";
import MessageWebSocketProvider from "@/components/provider/MessageWebSocketProvider";
import NotificationWebSocketProvider from "@/components/provider/NotificationWebSocketProvider";
import { usePushNotifications } from "@/hooks/usePushNotifications";

function PushNotificationRegistrar() {
  usePushNotifications();
  return null;
}

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const hasRedirectedRef = useRef(false);
  const [hydrated, setHydrated] = useState(false);

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());

  // Wait for Zustand to rehydrate from localStorage before checking auth
  useEffect(() => {
    const unsubscribe = useAuthStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });

    // If already hydrated (fast path), set immediately
    if (useAuthStore.persist.hasHydrated()) {
      setHydrated(true);
    }

    return unsubscribe;
  }, []);

  // Redirect to signin only after hydration confirms no valid session
  useEffect(() => {
    if (hydrated && !isAuthenticated && !hasRedirectedRef.current) {
      hasRedirectedRef.current = true;
      router.replace("/signin");
    }
  }, [hydrated, isAuthenticated, router]);

  // Show loading until hydrated and authenticated
  if (!hydrated || !isAuthenticated) {
    return <LoadingScreen />;
  }

  return (
    <MessageWebSocketProvider>
      <NotificationWebSocketProvider>
        <PushNotificationRegistrar />
        <div>
          <Header>{children}</Header>
        </div>
      </NotificationWebSocketProvider>
    </MessageWebSocketProvider>
  );
}