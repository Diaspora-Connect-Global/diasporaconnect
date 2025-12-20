"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@apollo/client/react";
import Header from "@/components/custom/header";
import LoadingScreen from "@/components/custom/LoadingScreen";
import { useAuthStore } from "@/store/useAuthStore";
import { REFRESH_TOKEN, RefreshTokenResponse } from "@/services/gql/authentication";
import { toast } from "sonner";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 🔥 Subscribe to Zustand
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const needsRefresh = useAuthStore((s) => s.needsRefresh());
  const isTokenExpired = useAuthStore((s) => s.isTokenExpired());
  const tokens = useAuthStore((s) => s.tokens);
  const updateAccessToken = useAuthStore((s) => s.updateAccessToken);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  // 🔄 GraphQL mutation for token refresh
  const [refreshTokenMutation, { loading: refreshing }] = useMutation<RefreshTokenResponse>(
    REFRESH_TOKEN,
    {
      onError: (error) => {
        console.error("Token refresh failed:", error);
        // Force logout on refresh failure
        clearAuth();
        router.replace("/signin");
        toast.error("Session expired. Please sign in again.");
      }
    }
  );

  // 🔄 Refresh token function
  const refreshSession = async () => {
    const refreshToken = tokens?.refreshToken;
    
    if (!refreshToken) {
      console.warn("No refresh token available");
      clearAuth();
      router.replace("/signin");
      return;
    }

    try {
      console.log("Refreshing session token...");
      
      const { data } = await refreshTokenMutation({
        variables: { refreshToken }
      });

      if (data?.refreshToken.success) {
        const newSessionToken = data.refreshToken.sessionToken;
        const newRefreshToken = data.refreshToken.refreshToken;
        const sessionTokenExpiry = Number(data.refreshToken.sessionTokenExpiry);
        const refreshTokenExpiry = Number(data.refreshToken.refreshTokenExpiry);

        // Convert to milliseconds if they're in seconds (timestamp < year 2100)
        const sessionExpiryMs = sessionTokenExpiry > 1e12 
          ? sessionTokenExpiry 
          : sessionTokenExpiry * 1000;
        const refreshExpiryMs = refreshTokenExpiry > 1e12 
          ? refreshTokenExpiry 
          : refreshTokenExpiry * 1000;

        // Calculate expiresIn from expiry timestamp
        const expiresIn = Math.floor((sessionExpiryMs - Date.now()) / 1000);

        // Update tokens in store
        if (newSessionToken && newRefreshToken) {
          useAuthStore.setState({
            tokens: {
              accessToken: newSessionToken,
              refreshToken: newRefreshToken,
              sessionToken: newSessionToken,
              sessionId: tokens?.sessionId || '',
              expiresIn: expiresIn,
              expiresAt: sessionExpiryMs,
              refreshTokenExpiresAt: refreshExpiryMs,
            }
          });

          console.log("Session refreshed successfully");
          toast.success("Session refreshed");
        }
      } else {
        throw new Error(data?.refreshToken.message || "Token refresh failed");
      }
    } catch (error) {
      console.error("Token refresh error:", error);
      clearAuth();
      router.replace("/signin");
      toast.error("Session expired. Please sign in again.");
    }
  };

  // 🕐 Set up automatic token refresh
  useEffect(() => {
    if (!isAuthenticated || !tokens) {
      return;
    }

    // Check if token needs immediate refresh
    if (isTokenExpired) {
      console.log("Token expired, refreshing immediately...");
      refreshSession();
      return;
    }

    // Check if token needs refresh soon
    if (needsRefresh) {
      console.log("Token expiring soon, refreshing...");
      refreshSession();
    }

    // Set up periodic check (every 1 minute)
    refreshIntervalRef.current = setInterval(() => {
      if (needsRefresh) {
        console.log("Token needs refresh (periodic check)");
        refreshSession();
      }
    }, 60 * 1000); // Check every minute

    // Cleanup interval on unmount
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [isAuthenticated, tokens, needsRefresh, isTokenExpired]);

  // 🔍 Check token on page focus (user returns to tab)
  useEffect(() => {
    const handleFocus = () => {
      if (isAuthenticated && (isTokenExpired || needsRefresh)) {
        console.log("Page focused, checking token status...");
        refreshSession();
      }
    };

    window.addEventListener("focus", handleFocus);
    
    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [isAuthenticated, isTokenExpired, needsRefresh]);

  // 🔐 Redirect when NOT authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      console.log("Not authenticated, redirecting to signin...");
      router.replace("/signin");
    }
  }, [isAuthenticated, router]);

  // ⛔ Block render while redirecting or refreshing initial expired token
  if (!isAuthenticated || (isTokenExpired && refreshing)) {
    return <LoadingScreen />;
  }

  console.log("layout runs for protected routes");

  return (
    <div className="">
      <Header>
        {children}
      </Header>
    </div>
  );
}