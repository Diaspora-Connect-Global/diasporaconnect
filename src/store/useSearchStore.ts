import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type SearchTab = 'all' | 'people' | 'opportunities' | 'groups' | 'events' | 'marketplace' | 'communities' | 'associations';

interface SearchState {
  query: string;
  activeTab: SearchTab;
  recentSearches: string[];
  setQuery: (q: string) => void;
  setActiveTab: (tab: SearchTab) => void;
  addRecentSearch: (q: string) => void;
  clearRecentSearches: () => void;
}

export const useSearchStore = create<SearchState>()(
  persist(
    (set) => ({
      query: '',
      activeTab: 'all',
      recentSearches: [],
      setQuery: (q) => set({ query: q }),
      setActiveTab: (tab) => set({ activeTab: tab }),
      addRecentSearch: (q) =>
        set((s) => ({
          recentSearches: [q, ...s.recentSearches.filter((r) => r !== q)].slice(0, 10),
        })),
      clearRecentSearches: () => set({ recentSearches: [] }),
    }),
    { name: 'search-store', partialize: (s) => ({ recentSearches: s.recentSearches }) }
  )
);
