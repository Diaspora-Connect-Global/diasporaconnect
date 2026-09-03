"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
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
const REDIRECT_URL_KEY = "redirectAfterSignin";

/* ================================
   HELPERS
================================ */
const shouldRefreshToken = () => {
  const issuedAtRaw = sessionStorage.getItem(TOKEN_ISSUED_KEY);
  if (!issuedAtRaw) return true;

  const issuedAt = Number(issuedAtRaw);
  return Date.now() - issuedAt >= REFRESH_AFTER_MS;
};

/**
 * Save the current URL to redirect back after signin
 */
const saveRedirectUrl = (url: string) => {
  // Don't save auth-related pages or home page
  const authPages = ["/signin", "/signup", "/forgot-password", "/reset-password", "/oauth/callback", "/"];
  const isAuthPage = authPages.some(page => url === page || url.startsWith(page + "?"));
  
  if (!isAuthPage) {
    sessionStorage.setItem(REDIRECT_URL_KEY, url);
  }
};

/**
 * Get and clear the saved redirect URL
 */
const getAndClearRedirectUrl = (): string | null => {
  const url = sessionStorage.getItem(REDIRECT_URL_KEY);
  if (url) {
    sessionStorage.removeItem(REDIRECT_URL_KEY);
    return url;
  }
  return null;
};

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isRefreshingRef = useRef(false);
  const hasCheckedRedirectRef = useRef(false);

  /* ================================
     AUTH STORE
  ================================ */
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const tokens = useAuthStore((s) => s.tokens);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  /* ================================
     CHECK IF CURRENT PAGE SHOULD SKIP AUTH
  ================================ */
  const isOAuthCallback = pathname?.includes('/oauth/callback');
  const isOnboarding = pathname?.includes('/onboarding');
  const shouldSkipAuthCheck = isOAuthCallback || isOnboarding;

  /* ================================
     GRAPHQL
  ================================ */
  const [refreshTokenMutation] =
    useMutation<RefreshTokenResponse>(REFRESH_TOKEN, {
      onError: (error) => {
        console.error("Token refresh failed:", error);
        
        // Don't save URL if on OAuth callback or onboarding
        if (!shouldSkipAuthCheck) {
          const currentUrl = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "");
          saveRedirectUrl(currentUrl);
        }
        
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
      // Don't save URL if on OAuth callback or onboarding
      if (!shouldSkipAuthCheck) {
        const currentUrl = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "");
        saveRedirectUrl(currentUrl);
      }
      
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
      sessionStorage.setItem(
        TOKEN_ISSUED_KEY,
        Date.now().toString()
      );

    } catch (err) {
      console.error("Refresh error:", err);
      
      // Don't save URL if on OAuth callback or onboarding
      if (!shouldSkipAuthCheck) {
        const currentUrl = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "");
        saveRedirectUrl(currentUrl);
      }
      
      clearAuth();
      router.replace("/signin");
    } finally {
      isRefreshingRef.current = false;
    }
  };

  /* ================================
     HANDLE REDIRECT AFTER SIGNIN
     This runs once when user becomes authenticated
  ================================ */
  useEffect(() => {
    // Only run once after successful authentication
    if (isAuthenticated && tokens && !hasCheckedRedirectRef.current) {
      hasCheckedRedirectRef.current = true;
      
      const redirectUrl = getAndClearRedirectUrl();
      
      if (redirectUrl) {
        // User had a previous page they wanted to visit
        console.log("Redirecting to saved URL:", redirectUrl);
        router.replace(redirectUrl);
      } else {
        // No saved URL - check if we're on an auth page and redirect to home
        const authPages = ["/signin", "/signup", "/forgot-password", "/reset-password"];
        const isOnAuthPage = authPages.some(page => pathname === page);
        
        if (isOnAuthPage) {
          console.log("No saved URL, redirecting to home");
          router.replace("/");
        }
        // Otherwise, user is already on a valid page, stay there
      }
    }
  }, [isAuthenticated, tokens, router, pathname]);

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
    // Skip auth check for OAuth callback and onboarding pages
    if (shouldSkipAuthCheck) return;

    if (!isAuthenticated) {
      // Save current URL before redirecting to signin
      const currentUrl = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "");
      saveRedirectUrl(currentUrl);
      
      router.replace("/signin");
    }
  }, [isAuthenticated, router, pathname, searchParams, shouldSkipAuthCheck]);

  /* ================================
     BLOCK RENDER
  ================================ */
  if (!isAuthenticated && !shouldSkipAuthCheck) {
    return <LoadingScreen />;
  }

  return (
    <div>
      <Header>{children}</Header>
    </div>
  );
}