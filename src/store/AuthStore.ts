import { create } from 'zustand';

interface AuthState {
  email: string | null;
  setCredentials: (email: string, password: string) => void;
  clearCredentials: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  email: null,
  setCredentials: (email) =>
    set({ email }),
  clearCredentials: () =>
    set({ email: null }),
}));