/**
 * Centralized authentication storage manager.
 * 
 * @description
 * Provides a single source of truth for managing authentication tokens,
 * user data, and session information. Supports multiple storage strategies
 * (localStorage, sessionStorage, memory) and automatic token refresh.
 * 
 * @example
 * ```typescript
 * import { authStorage } from './auth.storage';
 * 
 * // After successful login
 * authStorage.setTokens({
 *   accessToken: 'jwt-token',
 *   refreshToken: 'refresh-token',
 *   sessionId: 'session-id',
 *   expiresIn: 3600
 * });
 * 
 * authStorage.setUser(userData);
 * 
 * // Check if user is authenticated
 * if (authStorage.isAuthenticated()) {
 *   // User is logged in
 * }
 * 
 * // Get current tokens
 * const tokens = authStorage.getTokens();
 * 
 * // Clear all auth data
 * authStorage.clearAuth();
 * ```
 */

export type StorageStrategy = 'localStorage' | 'sessionStorage' | 'memory';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  sessionToken?: string;
  sessionId: string;
  expiresIn: number;
  expiresAt?: number;
}

interface UserData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface DeviceMetadata {
  fingerprint: string;
  ipAddress: string;
  userAgent: string;
  deviceId: string;
}

class AuthStorage {
  private static instance: AuthStorage;
  private strategy: StorageStrategy;
  private memoryStorage: Map<string, string>;

  // Storage keys
  private readonly KEYS = {
    ACCESS_TOKEN: 'auth_access_token',
    REFRESH_TOKEN: 'auth_refresh_token',
    SESSION_TOKEN: 'auth_session_token',
    SESSION_ID: 'auth_session_id',
    EXPIRES_AT: 'auth_expires_at',
    USER_DATA: 'auth_user_data',
    DEVICE_METADATA: 'auth_device_metadata',
    REMEMBER_ME: 'auth_remember_me',
  };

  private constructor(strategy: StorageStrategy = 'sessionStorage') {
    this.strategy = strategy;
    this.memoryStorage = new Map();
  }

  /**
   * Gets the singleton instance of AuthStorage.
   * 
   * @param strategy - Storage strategy to use (default: 'localStorage')
   * @returns {AuthStorage} Singleton instance
   */
  public static getInstance(strategy?: StorageStrategy): AuthStorage {
    if (!AuthStorage.instance) {
      AuthStorage.instance = new AuthStorage(strategy);
    }
    return AuthStorage.instance;
  }

  /**
   * Changes the storage strategy.
   * Useful for switching between persistent and session storage.
   * 
   * @param strategy - New storage strategy
   */
  public setStrategy(strategy: StorageStrategy): void {
    this.strategy = strategy;
  }

  /**
   * Gets the appropriate storage based on current strategy.
   */
  private getStorage(): Storage | null {
    if (typeof window === 'undefined') return null;
    
    switch (this.strategy) {
      case 'localStorage':
        return window.localStorage;
      case 'sessionStorage':
        return window.sessionStorage;
      case 'memory':
        return null;
      default:
        return window.localStorage;
    }
  }

  /**
   * Sets a value in storage.
   */
  private setItem(key: string, value: string): void {
    const storage = this.getStorage();
    
    if (storage) {
      try {
        storage.setItem(key, value);
      } catch (error) {
        console.error('Storage error:', error);
        // Fallback to memory storage
        this.memoryStorage.set(key, value);
      }
    } else {
      this.memoryStorage.set(key, value);
    }
  }

  /**
   * Gets a value from storage.
   */
  private getItem(key: string): string | null {
    const storage = this.getStorage();
    
    if (storage) {
      try {
        return storage.getItem(key);
      } catch (error) {
        console.error('Storage error:', error);
        return this.memoryStorage.get(key) || null;
      }
    } else {
      return this.memoryStorage.get(key) || null;
    }
  }

  /**
   * Removes a value from storage.
   */
  private removeItem(key: string): void {
    const storage = this.getStorage();
    
    if (storage) {
      try {
        storage.removeItem(key);
      } catch (error) {
        console.error('Storage error:', error);
      }
    }
    this.memoryStorage.delete(key);
  }

  /**
   * Stores authentication tokens.
   * 
   * @param tokens - Token data from login/registration response
   */
  public setTokens(tokens: AuthTokens): void {
    this.setItem(this.KEYS.ACCESS_TOKEN, tokens.accessToken);
    this.setItem(this.KEYS.REFRESH_TOKEN, tokens.refreshToken);
    this.setItem(this.KEYS.SESSION_ID, tokens.sessionId);
    
    if (tokens.sessionToken) {
      this.setItem(this.KEYS.SESSION_TOKEN, tokens.sessionToken);
    }

    // Calculate and store expiration timestamp
    const expiresAt = Date.now() + (tokens.expiresIn * 1000);
    this.setItem(this.KEYS.EXPIRES_AT, expiresAt.toString());
  }

  /**
   * Retrieves authentication tokens.
   * 
   * @returns {AuthTokens | null} Token data or null if not found
   */
  public getTokens(): AuthTokens | null {
    const accessToken = this.getItem(this.KEYS.ACCESS_TOKEN);
    const refreshToken = this.getItem(this.KEYS.REFRESH_TOKEN);
    const sessionId = this.getItem(this.KEYS.SESSION_ID);
    const expiresAtStr = this.getItem(this.KEYS.EXPIRES_AT);

    if (!accessToken || !refreshToken || !sessionId) {
      return null;
    }

    return {
      accessToken,
      refreshToken,
      sessionToken: this.getItem(this.KEYS.SESSION_TOKEN) || undefined,
      sessionId,
      expiresIn: expiresAtStr ? Math.floor((parseInt(expiresAtStr) - Date.now()) / 1000) : 0,
      expiresAt: expiresAtStr ? parseInt(expiresAtStr) : undefined,
    };
  }

  /**
   * Gets the access token.
   * 
   * @returns {string | null} Access token or null
   */
  public getAccessToken(): string | null {
    return this.getItem(this.KEYS.ACCESS_TOKEN);
  }

  /**
   * Gets the refresh token.
   * 
   * @returns {string | null} Refresh token or null
   */
  public getRefreshToken(): string | null {
    return this.getItem(this.KEYS.REFRESH_TOKEN);
  }

  /**
   * Gets the session ID.
   * 
   * @returns {string | null} Session ID or null
   */
  public getSessionId(): string | null {
    return this.getItem(this.KEYS.SESSION_ID);
  }

  /**
   * Stores user data.
   * 
   * @param user - User profile data
   */
  public setUser(user: UserData): void {
    this.setItem(this.KEYS.USER_DATA, JSON.stringify(user));
  }

  /**
   * Retrieves user data.
   * 
   * @returns {UserData | null} User data or null
   */
  public getUser(): UserData | null {
    const userData = this.getItem(this.KEYS.USER_DATA);
    if (!userData) return null;

    try {
      return JSON.parse(userData) as UserData;
    } catch (error) {
      console.error('Failed to parse user data:', error);
      return null;
    }
  }

  /**
   * Stores device metadata.
   * 
   * @param metadata - Device information
   */
  public setDeviceMetadata(metadata: DeviceMetadata): void {
    this.setItem(this.KEYS.DEVICE_METADATA, JSON.stringify(metadata));
  }

  /**
   * Retrieves device metadata.
   * 
   * @returns {DeviceMetadata | null} Device metadata or null
   */
  public getDeviceMetadata(): DeviceMetadata | null {
    const metadata = this.getItem(this.KEYS.DEVICE_METADATA);
    if (!metadata) return null;

    try {
      return JSON.parse(metadata) as DeviceMetadata;
    } catch (error) {
      console.error('Failed to parse device metadata:', error);
      return null;
    }
  }

  /**
   * Sets the remember me preference.
   * 
   * @param remember - Whether to remember the user
   */
  public setRememberMe(remember: boolean): void {
    this.setItem(this.KEYS.REMEMBER_ME, remember.toString());
    
    // Switch storage strategy based on remember me
    if (remember) {
      this.setStrategy('localStorage');
    } else {
      this.setStrategy('sessionStorage');
    }
  }

  /**
   * Gets the remember me preference.
   * 
   * @returns {boolean} Whether to remember the user
   */
  public getRememberMe(): boolean {
    const rememberMe = this.getItem(this.KEYS.REMEMBER_ME);
    return rememberMe === 'true';
  }

  /**
   * Checks if the user is authenticated.
   * 
   * @returns {boolean} True if user has valid tokens
   */
  public isAuthenticated(): boolean {
    const tokens = this.getTokens();
    return tokens !== null && !this.isTokenExpired();
  }

  /**
   * Checks if the access token is expired.
   * 
   * @returns {boolean} True if token is expired
   */
  public isTokenExpired(): boolean {
    const expiresAtStr = this.getItem(this.KEYS.EXPIRES_AT);
    if (!expiresAtStr) return true;

    const expiresAt = parseInt(expiresAtStr);
    return Date.now() >= expiresAt;
  }

  /**
   * Checks if token needs refresh (expires in less than 5 minutes).
   * 
   * @returns {boolean} True if token should be refreshed
   */
  public needsRefresh(): boolean {
    const expiresAtStr = this.getItem(this.KEYS.EXPIRES_AT);
    if (!expiresAtStr) return true;

    const expiresAt = parseInt(expiresAtStr);
    const fiveMinutes = 5 * 60 * 1000;
    return Date.now() >= (expiresAt - fiveMinutes);
  }

  /**
   * Updates only the access token (used after token refresh).
   * 
   * @param accessToken - New access token
   * @param expiresIn - Token expiry time in seconds
   */
  public updateAccessToken(accessToken: string, expiresIn: number): void {
    this.setItem(this.KEYS.ACCESS_TOKEN, accessToken);
    
    const expiresAt = Date.now() + (expiresIn * 1000);
    this.setItem(this.KEYS.EXPIRES_AT, expiresAt.toString());
  }

  /**
   * Clears all authentication data.
   * Use this on logout or when tokens are invalid.
   */
  public clearAuth(): void {
    this.removeItem(this.KEYS.ACCESS_TOKEN);
    this.removeItem(this.KEYS.REFRESH_TOKEN);
    this.removeItem(this.KEYS.SESSION_TOKEN);
    this.removeItem(this.KEYS.SESSION_ID);
    this.removeItem(this.KEYS.EXPIRES_AT);
    this.removeItem(this.KEYS.USER_DATA);
    this.removeItem(this.KEYS.DEVICE_METADATA);
    this.removeItem(this.KEYS.REMEMBER_ME);
  }

  /**
   * Clears only tokens while keeping user data.
   * Useful for soft logout scenarios.
   */
  public clearTokens(): void {
    this.removeItem(this.KEYS.ACCESS_TOKEN);
    this.removeItem(this.KEYS.REFRESH_TOKEN);
    this.removeItem(this.KEYS.SESSION_TOKEN);
    this.removeItem(this.KEYS.SESSION_ID);
    this.removeItem(this.KEYS.EXPIRES_AT);
  }

  /**
   * Gets all stored authentication data.
   * Useful for debugging or migration purposes.
   * 
   * @returns {Object} All stored auth data
   */
  public getAuthState(): {
    tokens: AuthTokens | null;
    user: UserData | null;
    deviceMetadata: DeviceMetadata | null;
    rememberMe: boolean;
    isAuthenticated: boolean;
    isExpired: boolean;
  } {
    return {
      tokens: this.getTokens(),
      user: this.getUser(),
      deviceMetadata: this.getDeviceMetadata(),
      rememberMe: this.getRememberMe(),
      isAuthenticated: this.isAuthenticated(),
      isExpired: this.isTokenExpired(),
    };
  }
}

// Export singleton instance
export const authStorage = AuthStorage.getInstance();

// Export class for testing or multiple instances
export { AuthStorage };