// stores/authStore.ts
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface AuthTokens {
  accessToken?: string;
  refreshToken?: string;
  sessionToken?: string;
  sessionId: string;
  expiresIn: number | null;
  expiresAt?: number | string;
  refreshTokenExpiresAt?: number | string;
}

export interface DeviceMetadata {
  fingerprint: string;
  ipAddress: string;
  userAgent: string;
  deviceId: string;
}

interface AuthState {
  // Persisted state
  tokens: AuthTokens | null;
  deviceMetadata: DeviceMetadata | null;

  // Computed
  isAuthenticated: () => boolean;
  isTokenExpired: () => boolean;
  needsRefresh: () => boolean;
  isRefreshTokenExpired: () => boolean;

  // Actions
  setTokens: (tokens: AuthTokens) => void;
  updateAccessToken: (accessToken: string, expiresIn: number) => void;
  refreshTokens: (
    sessionToken: string,
    refreshToken: string,
    sessionTokenExpiry: number,
    refreshTokenExpiry: number
  ) => void;
  setDeviceMetadata: (metadata: DeviceMetadata) => void;
  clearTokens: () => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // ---------- STATE ----------
      tokens: null,
      deviceMetadata: null,

      // ---------- COMPUTED ----------
      isAuthenticated: () => {
        const tokens = get().tokens;
        if (!tokens) return false;

        const hasValidToken = tokens.sessionToken || tokens.accessToken;
        if (!hasValidToken) return false;

        if (get().isTokenExpired()) {
          return false;
        }

        return true;
      },

      isTokenExpired: () => {
        const tokens = get().tokens;
        if (!tokens?.expiresAt) return true;

        const expiresAt =
          typeof tokens.expiresAt === "string"
            ? new Date(tokens.expiresAt).getTime()
            : tokens.expiresAt;

        return Date.now() >= expiresAt;
      },

      needsRefresh: () => {
        const tokens = get().tokens;
        if (!tokens?.expiresAt) return true;

        const expiresAt =
          typeof tokens.expiresAt === "string"
            ? new Date(tokens.expiresAt).getTime()
            : tokens.expiresAt;

        const fiveMinutes = 5 * 60 * 1000;
        return Date.now() >= expiresAt - fiveMinutes;
      },

      isRefreshTokenExpired: () => {
        const tokens = get().tokens;
        if (!tokens?.refreshTokenExpiresAt) return false;

        const refreshExpiresAt =
          typeof tokens.refreshTokenExpiresAt === "string"
            ? new Date(tokens.refreshTokenExpiresAt).getTime()
            : tokens.refreshTokenExpiresAt;

        return Date.now() >= refreshExpiresAt;
      },

      // ---------- ACTIONS ----------
      setTokens: (tokens) => {
        let expiresAt: number;
        if (tokens.expiresAt) {
          expiresAt =
            typeof tokens.expiresAt === "string"
              ? new Date(tokens.expiresAt).getTime()
              : tokens.expiresAt;
        } else if (tokens.expiresIn) {
          expiresAt = Date.now() + tokens.expiresIn * 1000;
        } else {
          expiresAt = Date.now() + 24 * 60 * 60 * 1000;
        }

        let refreshTokenExpiresAt = tokens.refreshTokenExpiresAt;
        if (refreshTokenExpiresAt && typeof refreshTokenExpiresAt === "string") {
          refreshTokenExpiresAt = new Date(refreshTokenExpiresAt).getTime();
        }

        set({
          tokens: {
            ...tokens,
            expiresAt,
            refreshTokenExpiresAt,
          },
        });
      },

      updateAccessToken: (accessToken, expiresIn) => {
        const current = get().tokens;
        if (!current) return;

        set({
          tokens: {
            ...current,
            accessToken,
            expiresIn,
            expiresAt: Date.now() + expiresIn * 1000,
          },
        });
      },

      refreshTokens: (
        sessionToken,
        refreshToken,
        sessionTokenExpiry,
        refreshTokenExpiry
      ) => {
        const current = get().tokens;
        if (!current) return;

        const sessionExpiryMs =
          sessionTokenExpiry > 1e12 ? sessionTokenExpiry : sessionTokenExpiry * 1000;
        const refreshExpiryMs =
          refreshTokenExpiry > 1e12 ? refreshTokenExpiry : refreshTokenExpiry * 1000;

        const expiresIn = Math.floor((sessionExpiryMs - Date.now()) / 1000);

        set({
          tokens: {
            ...current,
            accessToken: sessionToken,
            sessionToken: sessionToken,
            refreshToken: refreshToken,
            expiresIn: expiresIn,
            expiresAt: sessionExpiryMs,
            refreshTokenExpiresAt: refreshExpiryMs,
          },
        });
      },

      setDeviceMetadata: (metadata) => set({ deviceMetadata: metadata }),

      clearTokens: () => set({ tokens: null }),

      clearAuth: () =>
        set({
          tokens: null,
          deviceMetadata: null,
        }),
    }),
    {
      name: "auth-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        tokens: state.tokens,
        deviceMetadata: state.deviceMetadata,
      }),
    }
  )
);