import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type SearchTab = 'all' | 'people' | 'opportunities' | 'groups' | 'events' | 'marketplace' | 'communities' | 'associations';

export interface CachedResult {
  id: string;
  label: string;
  subtext?: string;
  type: 'people' | 'opportunity' | 'event' | 'group' | 'community' | 'association' | 'product';
  href: string;
}

interface RecentEntry {
  query: string;
  results: CachedResult[];
  ts: number; // unix ms timestamp
}

interface SearchState {
  query: string;
  activeTab: SearchTab;
  recentSearches: string[];
  recentEntries: RecentEntry[];
  setQuery: (q: string) => void;
  setActiveTab: (tab: SearchTab) => void;
  addRecentSearch: (q: string) => void;
  addRecentEntry: (query: string, results: CachedResult[]) => void;
  clearRecentSearches: () => void;
}

export const useSearchStore = create<SearchState>()(
  persist(
    (set) => ({
      query: '',
      activeTab: 'all',
      recentSearches: [],
      recentEntries: [],
      setQuery: (q) => set({ query: q }),
      setActiveTab: (tab) => set({ activeTab: tab }),
      addRecentSearch: (q) =>
        set((s) => ({
          recentSearches: [q, ...s.recentSearches.filter((r) => r !== q)].slice(0, 10),
        })),
      addRecentEntry: (query, results) =>
        set((s) => {
          const newEntry: RecentEntry = {
            query,
            results: results.slice(0, 5),
            ts: Date.now(),
          };
          const filtered = s.recentEntries.filter((e) => e.query !== query);
          const newEntries = [newEntry, ...filtered].slice(0, 10);
          // Keep recentSearches in sync
          const newRecentSearches = newEntries.map((e) => e.query);
          return { recentEntries: newEntries, recentSearches: newRecentSearches };
        }),
      clearRecentSearches: () => set({ recentSearches: [], recentEntries: [] }),
    }),
    {
      name: 'search-store',
      partialize: (s) => ({ recentSearches: s.recentSearches, recentEntries: s.recentEntries }),
    }
  )
);
