import { create } from 'zustand';

interface VideoStore {
  globalMuted: boolean;
  setGlobalMuted: (muted: boolean) => void;
}

export const useVideoStore = create<VideoStore>((set) => ({
  globalMuted: true,
  setGlobalMuted: (muted) => set({ globalMuted: muted }),
}));
