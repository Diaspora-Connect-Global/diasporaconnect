import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { Profile } from "@/services/gql/profile";

interface UserState {
  user: Profile | null;
  rememberMe: boolean;

  // Actions
  setUser: (user: Profile | null) => void;
  setRememberMe: (remember: boolean) => void;
  clearUser: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      rememberMe: false,

      setUser: (user) => set({ user }),
      setRememberMe: (remember) => set({ rememberMe: remember }),
      clearUser: () => set({ user: null, rememberMe: false }),
    }),
    {
      name: "user-store",
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);