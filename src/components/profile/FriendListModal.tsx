"use client";

import { SearchInput } from "@/components/custom/input";
import FriendsCard from "@/components/home/FriendsCard";
import { useMemo, useState, useEffect } from "react";
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
  GET_PENDING_REQUESTS_SENT,
  GET_PENDING_REQUESTS_RECEIVED,
  GetPendingRequestsResponse
} from "@/services/gql/connection";
import { useAuthStore } from "@/store/useAuthStore";

interface Friend {
  userId: string;
  connectionId: string;
  name: string;
  imageSrc: string;
  mutualConnections?: number;
  tier: "starter" | "trusted" | "reliable" | "elite";
  connectionStatus: "connected" | "none" | "pending_received" | "pending_sent" | "blocked";
  tabType: FriendType;
  searchQuery?: string;
  isSearching?: boolean;
}

interface FriendListModalProps {
  onClose?: () => void;
}

// Map tab numbers to FriendType
const TAB_MAP: Record<string, FriendType> = {
  "1": "friends",
  "2": "suggested",
  "3": "request-received",
  "4": "request-sent",
};

// Reverse map for setting URL params
const FRIEND_TYPE_TO_TAB: Record<FriendType, string> = {
  "friends": "1",
  "suggested": "2",
  "request-received": "3",
  "request-sent": "4",
};

export default function FriendListModal({ onClose }: FriendListModalProps) {
  const t = useTranslations("friends");
  const router = useRouter();
  const searchParams = useSearchParams();

  /* --------------------- State --------------------- */
  // Get active tab from URL param, default to "1" (friends)
  const tabParam = searchParams.get('t') || '1';
  const activeTab: FriendType = TAB_MAP[tabParam] || "friends";
  
  const [searchTerm, setSearchTerm] = useState("");

  /* --------------------- Tab navigation --------------------- */
  const setActiveTab = (friendType: FriendType) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('t', FRIEND_TYPE_TO_TAB[friendType]);
    router.push(`?${params.toString()}`);
  };

  /* --------------------- GraphQL Queries --------------------- */
  // Get accepted connections (friends)
  const {
    data: connectionsData,
    loading: connectionsLoading,
    refetch: refetchConnections
  } = useQuery<GetConnectionsResponse>(GET_MY_CONNECTIONS, {
    variables: { limit: 100.0, offset: 0.0 },
    skip: activeTab !== "friends",
  });

  // Get pending requests SENT
  const {
    data: requestsSentData,
    loading: requestsSentLoading,
    refetch: refetchRequestsSent
  } = useQuery<GetPendingRequestsResponse>(GET_PENDING_REQUESTS_SENT, {
    variables: { limit: 100.0, offset: 0.0 },
    skip: activeTab !== "request-sent",
  });

  // Get pending requests RECEIVED
  const {
    data: requestsReceivedData,
    loading: requestsReceivedLoading,
    refetch: refetchRequestsReceived
  } = useQuery<GetPendingRequestsResponse>(GET_PENDING_REQUESTS_RECEIVED, {
    variables: { limit: 100.0, offset: 0.0 },
    skip: activeTab !== "request-received",
  });

  // Get friend suggestions (when no search term)
  const {
    data: suggestions,
    loading: suggestionsLoading,
    refetch: refetchSuggestions
  } = useQuery<GetFriendSuggestionsResponse>(
    GET_FRIEND_SUGGESTIONS,
    {
      variables: { limit: 10 },
      skip: activeTab !== "suggested" || searchTerm.length > 0,
    }
  );

  // Search users (when search term exists on suggested tab)
  const [
    searchUsers,
    { data: searchResults, loading: searchLoading }
  ] = useLazyQuery<SearchUsersResponse>(SEARCH_USERS);

  /* --------------------- Handle search for suggested tab --------------------- */
  useEffect(() => {
    // Only search when on suggested tab and search term exists
    if (activeTab === "suggested" && searchTerm.length > 0) {
      const timeoutId = setTimeout(() => {
        searchUsers({
          variables: {
            searchUsersInput: {
              query: searchTerm,
              limit: 20,
              offset: 0,
            }
          }
        });
      }, 300);

      return () => clearTimeout(timeoutId);
    }
  }, [searchTerm, activeTab, searchUsers]);

  /* --------------------- Helper: Determine tier --------------------- */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getTierFromUser = (user: any): "starter" | "trusted" | "reliable" | "elite" => {
    // TODO: Implement actual tier logic
    return "starter";
  };

/* --------------------- Transform API data to Friend[] --------------------- */
const allFriends: Friend[] = useMemo(() => {
  const friends: Friend[] = [];
  
  // Get current user ID from Zustand auth store
  const currentUserId = useAuthStore.getState().user?.userId;
  
  if (!currentUserId) {
    console.warn("Current user ID not available");
    return friends;
  }

  // Determine if we're in search mode for the suggested tab
  const isSearchingOnSuggestedTab = activeTab === "suggested" && searchTerm.length > 0;

  // Process accepted connections (friends)
  if (connectionsData?.getConnections.connections) {
    connectionsData.getConnections.connections.forEach((connection) => {
      const isRequester = connection.requesterId === currentUserId;
      const friend = isRequester ? connection.receiver : connection.requester;
      
      friends.push({
        userId: friend.userId,
        connectionId: connection.id,
        name: `${friend.firstName} ${friend.lastName}`,
        imageSrc: friend.avatarUrl || "https://github.com/shadcn.png",
        mutualConnections: undefined,
        tier: getTierFromUser(friend),
        connectionStatus: "connected",
        tabType: "friends",
        searchQuery: "",
        isSearching: false,
      });
    });
  }

  // Process pending requests SENT
  if (requestsSentData?.getPendingConnections.connections) {
    requestsSentData.getPendingConnections.connections.forEach((connection) => {
      const friend = connection.receiver;
      friends.push({
        userId: friend.userId,
        connectionId: connection.id,
        name: `${friend.firstName} ${friend.lastName}`,
        imageSrc: friend.avatarUrl || "https://github.com/shadcn.png",
        mutualConnections: undefined,
        tier: getTierFromUser(friend),
        connectionStatus: friend.connectionStatus,
        tabType: "request-sent",
        searchQuery: "",
        isSearching: false,
      });
    });
  }

  // Process pending requests RECEIVED
  if (requestsReceivedData?.getPendingConnections.connections) {
    requestsReceivedData.getPendingConnections.connections.forEach((connection) => {
      const friend = connection.requester;
      friends.push({
        userId: friend.userId,
        connectionId: connection.id,
        name: `${friend.firstName} ${friend.lastName}`,
        imageSrc: friend.avatarUrl || "https://github.com/shadcn.png",
        mutualConnections: undefined,
        tier: getTierFromUser(friend),
        connectionStatus: friend.connectionStatus,
        tabType: "request-received",
        searchQuery: "",
        isSearching: false,
      });
    });
  }

  // Process friend suggestions OR search results (for suggested tab)
  if (activeTab === "suggested") {
    if (isSearchingOnSuggestedTab && searchResults?.searchUsers.profiles) {
      // Use search results when searching
      searchResults.searchUsers.profiles.forEach((profile) => {
        friends.push({
          userId: profile.userId,
          connectionId: profile.connectionId,
          name: `${profile.firstName} ${profile.lastName}`,
          imageSrc: "https://github.com/shadcn.png",
          mutualConnections: undefined,
          tier: getTierFromUser(profile),
          connectionStatus: profile.connectionStatus,
          tabType: "suggested",
          searchQuery: searchTerm,
          isSearching: true,
        });
      });
    } else if (suggestions?.getFriendSuggestions.suggestions) {
      // Use suggestions when not searching
      suggestions.getFriendSuggestions.suggestions.forEach((suggestion) => {
        friends.push({
          userId: suggestion.profile.userId,
          connectionId: suggestion.profile.connectionId,
          name: `${suggestion.profile.firstName} ${suggestion.profile.lastName}`,
          imageSrc: suggestion.profile.avatarUrl || "https://github.com/shadcn.png",
          mutualConnections: suggestion.mutualConnectionsCount,
          tier: getTierFromUser(suggestion.profile),
          connectionStatus: suggestion.profile.connectionStatus,
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
  searchTerm,
  connectionsData,
  requestsSentData,
  requestsReceivedData,
  suggestions,
  searchResults
]);

  /* --------------------- Clear search on tab change --------------------- */
  useEffect(() => {
    // Clear search term when changing tabs
    setSearchTerm("");
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
      // Tab filter - match by tabType instead of status
      if (f.tabType !== activeTab) return false;

      // Search filter (only for non-suggested tabs, as suggested tab handles search via API)
      if (activeTab !== "suggested" && searchTerm) {
        if (!f.name.toLowerCase().includes(searchTerm.toLowerCase())) {
          return false;
        }
      }

      return true;
    });
  }, [activeTab, searchTerm, allFriends]);

  /* --------------------- Dynamic counts --------------------- */
  const counts = useMemo(() => {
    const byStatus: Record<FriendType, number> = {
      "friends": connectionsData?.getConnections.total || 0,
      "suggested": searchTerm.length > 0
        ? (searchResults?.searchUsers.total || 0)
        : (suggestions?.getFriendSuggestions.total || 0),
      "request-received": requestsReceivedData?.getPendingConnections.total || 0,
      "request-sent": requestsSentData?.getPendingConnections.total || 0,
    };

    return byStatus;
  }, [
    searchTerm,
    connectionsData,
    requestsSentData,
    requestsReceivedData,
    suggestions,
    searchResults
  ]);

  const tabTitle = {
    "friends": t("titles.all", { count: counts["friends"] }),
    "suggested": searchTerm.length > 0
      ? `${t("titles.searchResults")} (${counts["suggested"]})`
      : t("titles.suggested"),
    "request-received": t("titles.requestReceived", { count: counts["request-received"] }),
    "request-sent": t("titles.requestSent"),
  }[activeTab];

  /* --------------------- Loading state --------------------- */
  const isLoading =
    connectionsLoading ||
    requestsSentLoading ||
    requestsReceivedLoading ||
    suggestionsLoading ||
    searchLoading;

  /* --------------------- Card renderer --------------------- */
  const renderCard = (friend: Friend) => {
    const key = `${friend.tabType}-${friend.userId}`;

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
        searchQuery={friend.searchQuery}
        isSearching={friend.isSearching}
      />
    );
  };

  /* --------------------- UI --------------------- */
  return (
    <div className="lg:flex bg-surface-default h-[90vh] ">
      {/* ---------- LEFT SIDEBAR (tabs) ---------- */}
      <div className="lg:w-[20vw] p-4 border-r lg:min-h-[90vh] overflow-y-auto">
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
              className={`cursor-pointer pl-3 py-1 px-2 rounded-lg ${activeTab === key
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
      <div className="lg:w-[80vw] overflow-y-auto">
        <div className="lg:w-[75vw] m-auto">
          <div className="lg:flex justify-between items-center my-4">
            {/* DYNAMIC heading */}
            <p className="font-heading-xsmall w-[75vw]  mx-auto lg:w-fit ">{tabTitle}</p>

            <div className="w-[75vw] lg:w-fit  mx-auto">
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
            <div className="grid lg:grid-cols-2 lg:gap-6">
              {filteredFriends.map((friend) => renderCard(friend))}
            </div>
          )}

          {/* Empty state */}
          {!isLoading && filteredFriends.length === 0 && (
            <p className="text-center text-muted-foreground col-span-2">
              {searchTerm.length > 0 && activeTab === "suggested"
                ? t("noSearchResults") || "No users found"
                : t("empty")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}