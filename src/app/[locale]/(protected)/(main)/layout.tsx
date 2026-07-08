"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Header from "@/components/custom/header";
import LoadingScreen from "@/components/custom/LoadingScreen";
import { useAuthStore } from "@/store/useAuthStore";
import MessageWebSocketProvider from "@/components/provider/MessageWebSocketProvider";
import NotificationWebSocketProvider from "@/components/provider/NotificationWebSocketProvider";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useProfileGuard } from "@/hooks/useProfileGuard";
import { OfflineBanner, IssueReporterButton } from "@/components/feedback";
import { useTranslations } from "next-intl";

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

  const t = useTranslations("common");
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());

  // Only check for a profile once auth is confirmed and the store is hydrated.
  const guardStatus = useProfileGuard(hydrated && isAuthenticated);

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

  // Block the app while we verify a profile exists. If it's missing, the guard
  // signs the user out and redirects to /signin — keep showing loading until then.
  if (guardStatus !== "ok") {
    return <LoadingScreen text={t("checkingProfile")} />;
  }

  return (
    <MessageWebSocketProvider>
      <NotificationWebSocketProvider>
        <OfflineBanner />
        <PushNotificationRegistrar />
        <div>
          <Header>{children}</Header>
        </div>
        <IssueReporterButton />
      </NotificationWebSocketProvider>
    </MessageWebSocketProvider>
  );
}