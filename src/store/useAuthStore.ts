import { create } from "zustand";
import { persist } from "zustand/middleware";

/* ===================== TYPES ===================== */

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  sessionToken?: string;
  sessionId: string;
  expiresIn: number;
  expiresAt?: number;
}

export interface UserData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

export interface DeviceMetadata {
  fingerprint: string;
  ipAddress: string;
  userAgent: string;
  deviceId: string;
}

/* ===================== STORE ===================== */

interface AuthState {
  // persisted state
  tokens: AuthTokens | null;
  user: UserData | null;
  deviceMetadata: DeviceMetadata | null;
  rememberMe: boolean;

  // computed
  isAuthenticated: () => boolean;
  isTokenExpired: () => boolean;
  needsRefresh: () => boolean;

  // actions
  setTokens: (tokens: AuthTokens) => void;
  updateAccessToken: (accessToken: string, expiresIn: number) => void;

  setUser: (user: UserData) => void;
  setDeviceMetadata: (metadata: DeviceMetadata) => void;
  setRememberMe: (remember: boolean) => void;

  clearTokens: () => void;
  clearAuth: () => void;
}

/* ===================== IMPLEMENTATION ===================== */

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // ---------- STATE ----------
      tokens: null,
      user: null,
      deviceMetadata: null,
      rememberMe: false,

      // ---------- COMPUTED ----------
      isAuthenticated: () => {
        const tokens = get().tokens;
        if (!tokens) return false;
        return !get().isTokenExpired();
      },

      isTokenExpired: () => {
        const tokens = get().tokens;
        if (!tokens?.expiresAt) return true;
        return Date.now() >= tokens.expiresAt;
      },

      needsRefresh: () => {
        const tokens = get().tokens;
        if (!tokens?.expiresAt) return true;
        const fiveMinutes = 5 * 60 * 1000;
        return Date.now() >= tokens.expiresAt - fiveMinutes;
      },

      // ---------- ACTIONS ----------
      setTokens: (tokens) => {
        const expiresAt = Date.now() + tokens.expiresIn * 1000;

        set({
          tokens: {
            ...tokens,
            expiresAt,
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
            expiresAt: Date.now() + expiresIn * 1000,
          },
        });
      },

      setUser: (user) => set({ user }),

      setDeviceMetadata: (metadata) =>
        set({ deviceMetadata: metadata }),

      setRememberMe: (remember) =>
        set({ rememberMe: remember }),

      clearTokens: () =>
        set({ tokens: null }),

      clearAuth: () =>
        set({
          tokens: null,
          user: null,
          deviceMetadata: null,
          rememberMe: false,
        }),
    }),
    {
      name: "auth-store", // localStorage key

      // 🔥 Persist ONLY these fields
      partialize: (state) => ({
        tokens: state.tokens,
        user: state.user,
        deviceMetadata: state.deviceMetadata,
        rememberMe: state.rememberMe,
      }),
    }
  )
);
