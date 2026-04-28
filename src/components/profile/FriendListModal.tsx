"use client";

import { SearchInput } from "@/components/custom/input";
import FriendsCard from "@/components/home/FriendsCard";
import { useMemo, useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { FriendType } from "../friends/TypeOfFriend";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useLazyQuery } from "@apollo/client/react";
import {
  GET_MY_CONNECTIONS,
  GetConnectionsResponse,
  GetFriendSuggestionsResponse,
  GET_FRIEND_SUGGESTIONS,
  SEARCH_USERS,
  SearchUsersResponse,
} from "@/services/gql/connection";
import {
  GET_ALL_PENDING_CONNECTIONS,
  GetPendingRequestsResponse
} from "@/services/gql/connection";
import { useAuthStore } from "@/store/useAuthStore";
import { useUserStore } from "@/store/useUserStore";
import { resolveUserTier } from "@/lib/userTier";
import type { Tier } from "@/components/custom/userBadge";

interface Friend {
  userId: string;
  connectionId: string;
  name: string;
  imageSrc: string;
  mutualConnections?: number;
  tier?: Tier;
  connectionStatus: "connected" | "none" | "pending_received" | "pending_sent" | "blocked";
  tabType: FriendType;
  searchQuery?: string;
  isSearching?: boolean;
}

interface FriendListModalProps {
  onClose?: () => void;
}

const TAB_MAP: Record<string, FriendType> = {
  "1": "friends",
  "2": "suggested",
  "3": "request-received",
  "4": "request-sent",
};

const FRIEND_TYPE_TO_TAB: Record<FriendType, string> = {
  "friends": "1",
  "suggested": "2",
  "request-received": "3",
  "request-sent": "4",
  "blocked": "5",
};

export default function FriendListModal({ onClose }: FriendListModalProps) {
  const t = useTranslations("friends");
  const router = useRouter();
  const searchParams = useSearchParams();

  /* --------------------- State --------------------- */
  const tabParam = searchParams.get('t') || '1';
  const activeTab: FriendType = TAB_MAP[tabParam] || "friends";
  
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [shouldShowStaleResults, setShouldShowStaleResults] = useState(false);
  const [dismissedSuggestedIds, setDismissedSuggestedIds] = useState<Set<string>>(new Set());
  
  // Ref to track the latest search term to prevent stale updates
  const searchTermRef = useRef(searchTerm);
  searchTermRef.current = searchTerm;

  /* --------------------- Tab navigation --------------------- */
  const setActiveTab = (friendType: FriendType) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('t', FRIEND_TYPE_TO_TAB[friendType]);
    router.push(`?${params.toString()}`);
  };

  /* --------------------- GraphQL Queries --------------------- */
  const {
    data: connectionsData,
    loading: connectionsLoading,
    refetch: refetchConnections
  } = useQuery<GetConnectionsResponse>(GET_MY_CONNECTIONS, {
    variables: { limit: 100.0, offset: 0.0 },
    skip: activeTab !== "friends",
  });

  const {
    data: pendingConnectionsData,
    loading: pendingConnectionsLoading,
  } = useQuery<GetPendingRequestsResponse>(GET_ALL_PENDING_CONNECTIONS, {
    variables: { limit: 100.0, offset: 0.0 },
    skip:
      activeTab !== "request-sent" && activeTab !== "request-received",
  });

  const {
    data: suggestions,
    loading: suggestionsLoading,
    refetch: refetchSuggestions
  } = useQuery<GetFriendSuggestionsResponse>(
    GET_FRIEND_SUGGESTIONS,
    {
      variables: { limit: 10 },
      skip: activeTab !== "suggested" || debouncedSearchTerm.length > 0,
    }
  );

  const [
    searchUsers,
    { data: searchResults, loading: searchLoading, called: searchCalled }
  ] = useLazyQuery<SearchUsersResponse>(SEARCH_USERS, {
    fetchPolicy: 'network-only', // Ensure fresh data
  });

  /* --------------------- Debounce search term --------------------- */
  useEffect(() => {
    // When user starts typing, immediately hide stale results
    if (searchTerm.length > 0 && activeTab === "suggested") {
      setShouldShowStaleResults(false);
      setIsSearching(true);
    }
    
    const timeoutId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500); // Increased to 500ms for better debouncing

    return () => clearTimeout(timeoutId);
  }, [searchTerm, activeTab]);

  /* --------------------- Handle search for suggested tab --------------------- */
  useEffect(() => {
    if (activeTab === "suggested" && debouncedSearchTerm.length > 0) {
      setIsSearching(true);
      setShouldShowStaleResults(false);
      
      searchUsers({
        variables: {
          searchUsersInput: {
            query: debouncedSearchTerm,
            limit: 20,
            offset: 0,
          }
        }
      }).then(() => {
        // Only update state if this is still the current search term
        if (searchTermRef.current === debouncedSearchTerm) {
          setIsSearching(false);
          setShouldShowStaleResults(true);
        }
      }).catch(() => {
        if (searchTermRef.current === debouncedSearchTerm) {
          setIsSearching(false);
          setShouldShowStaleResults(true);
        }
      });
    } else {
      setIsSearching(false);
      setShouldShowStaleResults(true);
    }
  }, [debouncedSearchTerm, activeTab, searchUsers]);

  /* --------------------- Helper: Determine tier --------------------- */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getTierFromUser = (user: any): Tier | undefined => {
    return resolveUserTier({
      tier: user?.tier,
      verificationTier: user?.verificationTier,
      trustScore: user?.trustScore,
    });
  };

  /* --------------------- Transform API data to Friend[] --------------------- */
  const allFriends: Friend[] = useMemo(() => {
    const friends: Friend[] = [];
    
    const currentUserId = useUserStore.getState().user?.userId;
    
    if (!currentUserId) {
      console.warn("Current user ID not available");
      return friends;
    }

    const isSearchingOnSuggestedTab = activeTab === "suggested" && debouncedSearchTerm.length > 0;

    // Process accepted connections (friends)
    if (connectionsData?.getConnections.connections) {
      connectionsData.getConnections.connections.forEach((connection) => {
        const isRequester = connection.requesterId === currentUserId;
        const friend = isRequester ? connection.receiver : connection.requester;
        
        friends.push({
          userId: friend.userId,
          connectionId: connection.id,
          name: `${friend.firstName} ${friend.lastName}`,
          imageSrc: `${friend.avatarUrl}`,
          mutualConnections: undefined,
          tier: getTierFromUser(friend),
          connectionStatus: "connected",
          tabType: "friends",
          searchQuery: "",
          isSearching: false,
        });
      });
    }

    // Pending (outbound + inbound) — one query, split by role vs current user
    const pendingList = pendingConnectionsData?.getPendingConnections.connections;
    if (pendingList) {
      pendingList
        .filter((connection) => connection.requesterId === currentUserId)
        .forEach((connection) => {
          friends.push({
            userId: connection.receiver.userId,
            connectionId: connection.id,
            name: `${connection.receiver.firstName} ${connection.receiver.lastName}`,
            imageSrc: connection.receiver.avatarUrl || "",
            mutualConnections: undefined,
            tier: getTierFromUser(connection.receiver),
            connectionStatus: "pending_sent",
            tabType: "request-sent",
            searchQuery: "",
            isSearching: false,
          });
        });

      pendingList
        .filter((connection) => connection.receiverId === currentUserId)
        .forEach((connection) => {
          friends.push({
            userId: connection.requester.userId,
            connectionId: connection.id,
            name: `${connection.requester.firstName} ${connection.requester.lastName}`,
            imageSrc: connection.requester.avatarUrl || "",
            mutualConnections: undefined,
            tier: getTierFromUser(connection.requester),
            connectionStatus: "pending_received",
            tabType: "request-received",
            searchQuery: "",
            isSearching: false,
          });
        });
    }

    // Process friend suggestions OR search results (for suggested tab)
    if (activeTab === "suggested") {
      // Only show results if we're allowed to (not in the middle of typing/searching)
      if (isSearchingOnSuggestedTab && searchResults?.searchUsers.profiles && shouldShowStaleResults) {
        searchResults.searchUsers.profiles.forEach((profile) => {
          const connectionStatus = profile.connectionStatus ?? "none";
          friends.push({
            userId: profile.userId,
            connectionId: profile.connectionId ?? "",
            name: `${profile.firstName} ${profile.lastName}`,
            imageSrc: `${profile.avatarUrl}`,
            mutualConnections: undefined,
            tier: getTierFromUser(profile),
            connectionStatus: connectionStatus as Friend["connectionStatus"],
            tabType: "suggested",
            searchQuery: debouncedSearchTerm,
            isSearching: true,
          });
        });
      } else if (!isSearchingOnSuggestedTab && suggestions?.getFriendSuggestions.suggestions) {
        suggestions.getFriendSuggestions.suggestions.forEach((suggestion) => {
          const profile = suggestion.profile;
          const connectionStatus = profile.connectionStatus ?? "none";
          friends.push({
            userId: profile.userId,
            connectionId: profile.connectionId ?? "",
            name: `${profile.firstName} ${profile.lastName}`,
            imageSrc: profile.avatarUrl,
            mutualConnections: suggestion.mutualConnectionsCount,
            tier: getTierFromUser(profile),
            connectionStatus: connectionStatus as Friend["connectionStatus"],
            tabType: "suggested",
            searchQuery: "",
            isSearching: false,
          });
        });
      }
    }

    return friends;
  }, [
    activeTab,
    debouncedSearchTerm,
    connectionsData,
    pendingConnectionsData,
    suggestions,
    searchResults,
    shouldShowStaleResults,
  ]);

  /* --------------------- Clear search on tab change --------------------- */
  useEffect(() => {
    setSearchTerm("");
    setDebouncedSearchTerm("");
    setIsSearching(false);
    setShouldShowStaleResults(true);
    setDismissedSuggestedIds(new Set());
  }, [activeTab]);

  /* --------------------- Handle name click --------------------- */
  const handleNameClick = (userId: string) => {
    if (onClose) {
      onClose();
    }
    router.push(`/${userId}`);
  };

  /* --------------------- Filtering --------------------- */
  const filteredFriends = useMemo(() => {
    return allFriends.filter((f) => {
      if (f.tabType !== activeTab) return false;

      if (activeTab === "suggested" && dismissedSuggestedIds.has(f.userId)) return false;

      if (activeTab !== "suggested" && searchTerm) {
        if (!f.name.toLowerCase().includes(searchTerm.toLowerCase())) {
          return false;
        }
      }

      return true;
    });
  }, [activeTab, searchTerm, allFriends, dismissedSuggestedIds]);

  /* --------------------- Dynamic counts --------------------- */
  const counts = useMemo(() => {
    const pendingConns =
      pendingConnectionsData?.getPendingConnections.connections;
    const receivedCount =
      pendingConns?.filter((c) => c.receiverId === useUserStore.getState().user?.userId)
        .length ?? 0;
    const sentCount =
      pendingConns?.filter((c) => c.requesterId === useUserStore.getState().user?.userId)
        .length ?? 0;

    const byStatus: Record<FriendType, number> = {
      friends: connectionsData?.getConnections.total || 0,
      suggested:
        debouncedSearchTerm.length > 0
          ? searchResults?.searchUsers.total || 0
          : suggestions?.getFriendSuggestions.total || 0,
      "request-received": receivedCount,
      "request-sent": sentCount,
      blocked: 0,
    };

    return byStatus;
  }, [
    debouncedSearchTerm,
    connectionsData,
    pendingConnectionsData,
    suggestions,
    searchResults,
  ]);

  const tabTitleMap: Record<FriendType, string> = {
    "friends": t("titles.all", { count: counts["friends"] }),
    "suggested": debouncedSearchTerm.length > 0
      ? `${t("titles.searchResults")} (${counts["suggested"]})`
      : t("titles.suggested"),
    "request-received": t("titles.requestReceived", { count: counts["request-received"] }),
    "request-sent": t("titles.requestSent"),
    "blocked": "",
  };
  const tabTitle = tabTitleMap[activeTab];

  /* --------------------- Loading state --------------------- */
  const isLoading = (() => {
    // If we're typing but haven't debounced yet, show the user's typing feedback
    const isTypingButNotDebounced = searchTerm !== debouncedSearchTerm && searchTerm.length > 0;
    
    // For suggested tab with search
    if (activeTab === "suggested" && debouncedSearchTerm.length > 0) {
      return isSearching || searchLoading || isTypingButNotDebounced;
    }
    
    // For suggested tab without search
    if (activeTab === "suggested") {
      return suggestionsLoading;
    }

    if (activeTab === "friends") {
      return connectionsLoading;
    }

    if (activeTab === "request-sent" || activeTab === "request-received") {
      return pendingConnectionsLoading;
    }

    return false;
  })();

  /* --------------------- Card renderer --------------------- */
  const renderCard = (friend: Friend) => {
    const key = `${friend.tabType}-${friend.userId}`;
    const onConnectionAction = friend.tabType === "suggested"
      ? () => setDismissedSuggestedIds(prev => new Set([...prev, friend.userId]))
      : undefined;

    return (
      <FriendsCard
        key={key}
        userId={friend.userId}
        name={friend.name}
        imageSrc={friend.imageSrc}
        mutualConnections={friend.mutualConnections}
        tier={friend.tier}
        status={friend.connectionStatus}
        connectionId={friend.connectionId}
        onNameClick={handleNameClick}
        onConnectionAction={onConnectionAction}
        searchQuery={friend.searchQuery}
        isSearching={friend.isSearching}
      />
    );
  };

  /* --------------------- UI --------------------- */
  return (
    <div className="lg:flex bg-surface-default h-[90dvh]">
      {/* ---------- LEFT SIDEBAR (tabs) ---------- */}
      <div className="lg:w-[20vw] lg:p-4 border-r lg:min-h-[90vh] overflow-y-auto">
        <div className="mt-4 space-y-2 flex lg:flex-col">
          {(
            [
              { key: "friends" as FriendType, label: t("tabs.all") },
              { key: "suggested" as FriendType, label: t("tabs.suggested") },
              { key: "request-received" as FriendType, label: t("tabs.requestReceived") },
              { key: "request-sent" as FriendType, label: t("tabs.requestSent") },
            ] as const
          ).map(({ key, label }) => (
            <div
              key={key}
              role="button"
              tabIndex={0}
              onClick={() => setActiveTab(key)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") setActiveTab(key);
              }}
              className={`cursor-pointer pl-3 py-1 px-2 rounded-lg ${
                activeTab === key
                  ? "bg-surface-brand-subtle text-text-brand"
                  : "text-text-secondary"
              }`}
            >
              <p>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ---------- RIGHT CONTENT ---------- */}
      <div className="lg:w-[80vw] overflow-y-auto bg-surface-default lg:h-[90dvh]">
        <div className="lg:w-[75vw] m-auto">
          <div className="lg:flex justify-between items-center my-4">
            <p className="heading-xsmall w-[75vw] mx-auto lg:w-fit">{tabTitle}</p>

            <div className="w-[75vw] lg:w-fit mx-auto">
              <SearchInput
                value={searchTerm}
                onChange={setSearchTerm}
                onSearch={() => {
                  // Search is handled automatically by useEffect
                }}
                placeholder={
                  activeTab === "suggested"
                    ? t("searchUsers") || "Search users..."
                    : t("search") || "Search..."
                }
              />
            </div>
          </div>

          {/* Loading state */}
          {isLoading && (
            <p className="text-center text-muted-foreground">
              {t("loading") || "Loading..."}
            </p>
          )}

          {/* Cards grid */}
          {!isLoading && (
            <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-6">
              {filteredFriends.map((friend) => renderCard(friend))}
            </div>
          )}

          {/* Empty state */}
          {!isLoading && filteredFriends.length === 0 && (
            <p className="text-center text-muted-foreground col-span-2">
              {debouncedSearchTerm.length > 0 && activeTab === "suggested"
                ? t("noSearchResults") || "No users found"
                : t("empty")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}