import { create } from "zustand";
import { persist } from "zustand/middleware";

/* ===================== TYPES ===================== */

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  sessionToken?: string;
  sessionId: string;
  expiresIn: number | null;
  expiresAt?: number | string; // Support both timestamp formats
  refreshTokenExpiresAt?: number | string; // Support both timestamp formats
}

export interface UserData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role?: string;
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
  isRefreshTokenExpired: () => boolean;

  // actions
  setTokens: (tokens: AuthTokens) => void;
  updateAccessToken: (accessToken: string, expiresIn: number) => void;
  refreshTokens: (sessionToken: string, refreshToken: string, sessionTokenExpiry: number, refreshTokenExpiry: number) => void;

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
        
        // Check if refresh token is still valid
        if (get().isRefreshTokenExpired()) {
          return false;
        }
        
        return true;
      },

      isTokenExpired: () => {
        const tokens = get().tokens;
        if (!tokens?.expiresAt) return true;
        
        // Handle both string and number timestamps
        const expiresAt = typeof tokens.expiresAt === 'string' 
          ? new Date(tokens.expiresAt).getTime() 
          : tokens.expiresAt;
        
        return Date.now() >= expiresAt;
      },

      needsRefresh: () => {
        const tokens = get().tokens;
        if (!tokens?.expiresAt) return true;
        
        // Handle both string and number timestamps
        const expiresAt = typeof tokens.expiresAt === 'string' 
          ? new Date(tokens.expiresAt).getTime() 
          : tokens.expiresAt;
        
        // Refresh 5 minutes before expiry
        const fiveMinutes = 5 * 60 * 1000;
        return Date.now() >= expiresAt - fiveMinutes;
      },

      isRefreshTokenExpired: () => {
        const tokens = get().tokens;
        if (!tokens?.refreshTokenExpiresAt) return false; // If no expiry set, assume valid
        
        // Handle both string and number timestamps
        const refreshExpiresAt = typeof tokens.refreshTokenExpiresAt === 'string'
          ? new Date(tokens.refreshTokenExpiresAt).getTime()
          : tokens.refreshTokenExpiresAt;
        
        return Date.now() >= refreshExpiresAt;
      },

      // ---------- ACTIONS ----------
      setTokens: (tokens) => {
        // Handle expiresAt - convert string to number if needed
        let expiresAt: number;
        if (tokens.expiresAt) {
          expiresAt = typeof tokens.expiresAt === 'string'
            ? new Date(tokens.expiresAt).getTime()
            : tokens.expiresAt;
        } else if (tokens.expiresIn) {
          expiresAt = Date.now() + tokens.expiresIn * 1000;
        } else {
          expiresAt = Date.now() + (24 * 60 * 60 * 1000); // Default 24 hours
        }

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
            expiresIn,
            expiresAt: Date.now() + expiresIn * 1000,
          },
        });
      },

      refreshTokens: (sessionToken, refreshToken, sessionTokenExpiry, refreshTokenExpiry) => {
        const current = get().tokens;
        if (!current) return;

        // Convert timestamps to milliseconds if they're in seconds
        const sessionExpiryMs = sessionTokenExpiry > 1e12 ? sessionTokenExpiry : sessionTokenExpiry * 1000;
        const refreshExpiryMs = refreshTokenExpiry > 1e12 ? refreshTokenExpiry : refreshTokenExpiry * 1000;
        
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