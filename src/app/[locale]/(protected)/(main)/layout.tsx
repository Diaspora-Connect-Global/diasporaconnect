"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { saveRedirectUrl } from "@/lib/authRedirect";
import Header from "@/components/custom/header";
import LoadingScreen from "@/components/custom/LoadingScreen";
import { useAuthStore } from "@/store/useAuthStore";
import MessageWebSocketProvider from "@/components/provider/MessageWebSocketProvider";
import NotificationWebSocketProvider from "@/components/provider/NotificationWebSocketProvider";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useProfileGuard } from "@/hooks/useProfileGuard";
import { useSidebarBootReady } from "@/components/home/HomeSidebar";
import { OfflineBanner, IssueReporterButton, ErrorState } from "@/components/feedback";
import { useTranslations } from "next-intl";

function PushNotificationRegistrar() {
  usePushNotifications();
  return null;
}

/**
 * The authenticated shell's ONE boot gate.
 *
 * Shows a single, caption-less `LoadingScreen` until auth has rehydrated, the
 * profile check has passed AND the sidebar's data is in the Apollo cache — the
 * profile and sidebar queries are started together (one round-trip, not
 * profile → then sidebar). Only then do header, sidebar and bottom nav mount,
 * complete and in their final position, and stay mounted for the session.
 *
 * A profile check that keeps failing (network) ends in a retry screen instead
 * of an endless loader; see `useProfileGuard`.
 */
export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const hasRedirectedRef = useRef(false);
  const [hydrated, setHydrated] = useState(false);

  const tFeedback = useTranslations("feedback.error");
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const bootEnabled = hydrated && isAuthenticated;

  // Both start as soon as auth is confirmed — in parallel.
  const guard = useProfileGuard(bootEnabled);
  const sidebarReady = useSidebarBootReady(bootEnabled);

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
      // Remember where they were going. Without this, a signed-out person
      // following ANY deep link lands on the home feed afterwards — which for a
      // circle invite means the invite is silently lost, and the recipient of an
      // invite is precisely the person least likely to already have an account.
      //
      // The BROWSER path, not usePathname(): a proxy-rewritten URL such as
      // `/@steven` (served by the internal `/{locale}/u/steven` route) must come
      // back as `/@steven`, and the rewritten form is what the router may report.
      saveRedirectUrl(window.location.pathname || pathname, window.location.search);
      router.replace("/signin");
    }
  }, [hydrated, isAuthenticated, router, pathname]);

  if (bootEnabled && guard.status === "error") {
    return (
      <div className="flex h-[100svh] w-full items-center justify-center bg-background px-4">
        <ErrorState
          title={tFeedback("title")}
          description={tFeedback("description")}
          retryLabel={tFeedback("retry")}
          onRetry={guard.retry}
          retrying={guard.retrying}
        />
      </div>
    );
  }

  // One loader, one look, from first paint until the shell is complete.
  if (!bootEnabled || guard.status !== "ok" || !sidebarReady) {
    return <LoadingScreen />;
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
