"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@apollo/client/react";
import Header from "@/components/custom/header";
import LoadingScreen from "@/components/custom/LoadingScreen";
import { useAuthStore } from "@/store/useAuthStore";
import {
  REFRESH_TOKEN,
  RefreshTokenResponse,
} from "@/services/gql/authentication";
import { toast } from "sonner";

/* ================================
   CONSTANTS
================================ */
const REFRESH_AFTER_MS = 2 * 60 * 1000; // 2 minutes
const CHECK_INTERVAL_MS = 60 * 1000; // 1 minute
const TOKEN_ISSUED_KEY = "accessTokenIssuedAt";

/* ================================
   HELPERS
================================ */
const shouldRefreshToken = () => {
  const issuedAtRaw = localStorage.getItem(TOKEN_ISSUED_KEY);
  if (!issuedAtRaw) return true;

  const issuedAt = Number(issuedAtRaw);
  return Date.now() - issuedAt >= REFRESH_AFTER_MS;
};

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isRefreshingRef = useRef(false);

  /* ================================
     AUTH STORE
  ================================ */
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const tokens = useAuthStore((s) => s.tokens);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  /* ================================
     GRAPHQL
  ================================ */
  const [refreshTokenMutation, { loading: refreshing }] =
    useMutation<RefreshTokenResponse>(REFRESH_TOKEN, {
      onError: (error) => {
        console.error("Token refresh failed:", error);
        clearAuth();
        toast.error("Session expired. Please sign in again.");
        router.replace("/signin");
      },
    });

  /* ================================
     REFRESH SESSION
  ================================ */
  const refreshSession = async () => {
    if (isRefreshingRef.current) return;
    isRefreshingRef.current = true;

    const refreshToken = tokens?.refreshToken;
    if (!refreshToken) {
      clearAuth();
      router.replace("/signin");
      return;
    }

    try {
      const { data } = await refreshTokenMutation({
        variables: { refreshToken },
      });

      if (!data?.refreshToken?.success) {
        throw new Error("Refresh failed");
      }

      const {
        sessionToken,
        refreshToken: newRefreshToken,
        sessionTokenExpiry,
        refreshTokenExpiry,
      } = data.refreshToken;

      const sessionExpiryMs =
        Number(sessionTokenExpiry) > 1e12
          ? Number(sessionTokenExpiry)
          : Number(sessionTokenExpiry) * 1000;

      const refreshExpiryMs =
        Number(refreshTokenExpiry) > 1e12
          ? Number(refreshTokenExpiry)
          : Number(refreshTokenExpiry) * 1000;

      const expiresIn = Math.floor(
        (sessionExpiryMs - Date.now()) / 1000
      );

      useAuthStore.setState({
        tokens: {
          accessToken: sessionToken,
          refreshToken: newRefreshToken,
          sessionToken,
          sessionId: tokens?.sessionId || "",
          expiresIn,
          expiresAt: sessionExpiryMs,
          refreshTokenExpiresAt: refreshExpiryMs,
        },
      });

      // 🔑 Store issued timestamp
      localStorage.setItem(
        TOKEN_ISSUED_KEY,
        Date.now().toString()
      );

    } catch (err) {
      console.error("Refresh error:", err);
      clearAuth();
      router.replace("/signin");
    } finally {
      isRefreshingRef.current = false;
    }
  };

  /* ================================
     INITIAL + INTERVAL CHECK
  ================================ */
  useEffect(() => {
    if (!isAuthenticated || !tokens) return;

    if (shouldRefreshToken()) {
      refreshSession();
    }

    refreshIntervalRef.current = setInterval(() => {
      if (shouldRefreshToken()) {
        refreshSession();
      }
    }, CHECK_INTERVAL_MS);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [isAuthenticated, tokens]);

  /* ================================
     TAB FOCUS CHECK
  ================================ */
  useEffect(() => {
    const handleFocus = () => {
      if (isAuthenticated && shouldRefreshToken()) {
        refreshSession();
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [isAuthenticated]);

  /* ================================
     REDIRECT IF LOGGED OUT
  ================================ */
  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/signin");
    }
  }, [isAuthenticated, router]);

  /* ================================
     BLOCK RENDER
  ================================ */
  if (!isAuthenticated ) {
    return <LoadingScreen />;
  }

  return (
    <div>
      <Header>{children}</Header>
    </div>
  );
}
