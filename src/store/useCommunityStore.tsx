import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface Community {
  id: string;
  name: string;
}

interface CommunityStore {
  communities: Community[];
  selectedCommunityId: string | null;
  
  // Actions
  setCommunities: (communities: Community[]) => void;
  addCommunity: (community: Community) => void;
  removeCommunity: (id: string) => void;
  setSelectedCommunity: (id: string | null) => void;
  clearCommunities: () => void;
  
  // Getters
  getSelectedCommunity: () => Community | null;
}

export const useCommunityStore = create<CommunityStore>()(
  persist(
    (set, get) => ({
      communities: [],
      selectedCommunityId: null,

      setCommunities: (communities) => 
        set({ communities }),

      addCommunity: (community) =>
        set((state) => ({
          communities: [...state.communities, community],
        })),

      removeCommunity: (id) =>
        set((state) => ({
          communities: state.communities.filter((c) => c.id !== id),
          selectedCommunityId: 
            state.selectedCommunityId === id ? null : state.selectedCommunityId,
        })),

      setSelectedCommunity: (id) =>
        set({ selectedCommunityId: id }),

      clearCommunities: () =>
        set({ communities: [], selectedCommunityId: null }),

      getSelectedCommunity: () => {
        const state = get();
        if (!state.selectedCommunityId) return null;
        return state.communities.find(c => c.id === state.selectedCommunityId) || null;
      },
    }),
    {
      name: 'community-storage',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        communities: state.communities,
        selectedCommunityId: state.selectedCommunityId,
      }),
    }
  )
);