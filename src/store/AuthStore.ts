import { create } from 'zustand';

interface AuthState {
  email: string | null;
  password: string | null;
  setCredentials: (email: string, password: string) => void;
  clearCredentials: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  email: null,
  password: null,
  setCredentials: (email, password) =>
    set({ email, password }),
  clearCredentials: () =>
    set({ email: null, password: null }),
}));