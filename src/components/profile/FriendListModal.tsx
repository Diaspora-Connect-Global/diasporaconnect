"use client";

import { SearchInput } from "@/components/custom/input";
import FriendsCard from "@/components/home/FriendsCard";
import { useMemo, useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { FriendType } from "../friends/TypeOfFriend";
import { useRouter } from "next/navigation";
import { useQuery } from "@apollo/client/react";
import {
  GET_MY_CONNECTIONS,
  GetConnectionsResponse,
  GetFriendSuggestionsResponse,
  GET_FRIEND_SUGGESTIONS,
} from "@/services/gql/connection";
import { 
  GET_PENDING_REQUESTS_SENT,
  GET_PENDING_REQUESTS_RECEIVED,
  GetPendingRequestsResponse 
} from "@/services/gql/connection";

interface Friend {
  userId: string;
  connectionId?: string;
  name: string;
  imageSrc: string;
  mutualConnections?: number;
  tier: "starter" | "trusted" | "reliable" | "elite";
  status: FriendType;
}

interface FriendListModalProps {
  onClose?: () => void;
}

export default function FriendListModal({ onClose }: FriendListModalProps) {
  const t = useTranslations("friends");
  const router = useRouter();

  /* --------------------- State --------------------- */
  const [activeTab, setActiveTab] = useState<FriendType>("friends");
  const [searchTerm, setSearchTerm] = useState("");

  /* --------------------- GraphQL Queries --------------------- */
  // Get accepted connections (friends)
  const { 
    data: connectionsData, 
    loading: connectionsLoading, 
    refetch: refetchConnections 
  } = useQuery<GetConnectionsResponse>(GET_MY_CONNECTIONS, {
    variables: { limit: 100.0, offset: 0.0 },
    skip: activeTab !== "friends", // Only fetch when on friends tab
  });

  // Get pending requests SENT (where current user is requester)
  const { 
    data: requestsSentData, 
    loading: requestsSentLoading, 
    refetch: refetchRequestsSent 
  } = useQuery<GetPendingRequestsResponse>(GET_PENDING_REQUESTS_SENT, {
    variables: { limit: 100.0, offset: 0.0 },
    skip: activeTab !== "request-sent", // Only fetch when on request-sent tab
  });

  // Get pending requests RECEIVED (where current user is receiver)
  const { 
    data: requestsReceivedData, 
    loading: requestsReceivedLoading, 
    refetch: refetchRequestsReceived 
  } = useQuery<GetPendingRequestsResponse>(GET_PENDING_REQUESTS_RECEIVED, {
    variables: { limit: 100.0, offset: 0.0 },
    skip: activeTab !== "request-received", // Only fetch when on request-received tab
  });

  // Get friend suggestions
  const { 
    data: suggestions, 
    loading: suggestionsLoading,
    refetch: refetchSuggestions 
  } = useQuery<GetFriendSuggestionsResponse>(
    GET_FRIEND_SUGGESTIONS,
    { 
      variables: { limit: 10 },
      skip: activeTab !== "suggested", // Only fetch when on suggested tab
    }
  );

  /* --------------------- Helper: Determine tier from user data --------------------- */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getTierFromUser = (user: any): "starter" | "trusted" | "reliable" | "elite" => {
    // TODO: Implement actual tier logic based on your business rules
    // For now, returning a default
    return "starter";
  };

  /* --------------------- Transform API data to Friend[] --------------------- */
  const allFriends: Friend[] = useMemo(() => {
    const friends: Friend[] = [];
    
    // TODO: Get current user ID from auth context or session
    const currentUserId = "me"; // Replace with actual current user ID

    // Process accepted connections (friends)
    // GET_MY_CONNECTIONS only returns ACCEPTED connections
    if (connectionsData?.getConnections.connections) {
      connectionsData.getConnections.connections.forEach((connection) => {
        // Determine which user is the friend (not current user)
        const friend = connection.requesterId === currentUserId 
          ? connection.receiver 
          : connection.requester;

        friends.push({
          userId: friend.userId,
          connectionId: connection.id,
          name: `${friend.firstName} ${friend.lastName}`,
          imageSrc: friend.avatarUrl || "https://github.com/shadcn.png",
          mutualConnections: undefined, // TODO: Fetch from GET_MUTUAL_FRIENDS if needed
          tier: getTierFromUser(friend),
          status: "friends",
        });
      });
    }

    // Process pending requests SENT (current user is requester)
    if (requestsSentData?.getPendingConnections.connections) {
      requestsSentData.getPendingConnections.connections.forEach((connection) => {
        const friend = connection.receiver; // The person who received the request

        friends.push({
          userId: friend.userId,
          connectionId: connection.id,
          name: `${friend.firstName} ${friend.lastName}`,
          imageSrc: friend.avatarUrl || "https://github.com/shadcn.png",
          mutualConnections: undefined,
          tier: getTierFromUser(friend),
          status: "request-sent",
        });
      });
    }

    // Process pending requests RECEIVED (current user is receiver)
    if (requestsReceivedData?.getPendingConnections.connections) {
      requestsReceivedData.getPendingConnections.connections.forEach((connection) => {
        const friend = connection.requester; // The person who sent the request

        friends.push({
          userId: friend.userId,
          connectionId: connection.id,
          name: `${friend.firstName} ${friend.lastName}`,
          imageSrc: friend.avatarUrl || "https://github.com/shadcn.png",
          mutualConnections: undefined,
          tier: getTierFromUser(friend),
          status: "request-received",
        });
      });
    }

    // Process friend suggestions
    if (suggestions?.getFriendSuggestions.suggestions) {
      suggestions.getFriendSuggestions.suggestions.forEach((suggestion) => {
        friends.push({
          userId: suggestion.profile.userId,
          connectionId: undefined, // No connection exists yet for suggestions
          name: `${suggestion.profile.firstName} ${suggestion.profile.lastName}`,
          imageSrc: suggestion.profile.avatarUrl || "https://github.com/shadcn.png",
          mutualConnections: suggestion.mutualConnectionsCount,
          tier: getTierFromUser(suggestion.profile),
          status: "suggested",
        });
      });
    }

    return friends;
  }, [connectionsData, requestsSentData, requestsReceivedData, suggestions]);

  /* --------------------- Refetch on tab change --------------------- */
  useEffect(() => {
    switch(activeTab) {
      case "friends":
        refetchConnections();
        break;
      case "request-sent":
        refetchRequestsSent();
        break;
      case "request-received":
        refetchRequestsReceived();
        break;
      case "suggested":
        refetchSuggestions();
        break;
    }
  }, [activeTab, refetchConnections, refetchRequestsSent, refetchRequestsReceived, refetchSuggestions]);

  /* --------------------- Handle name click --------------------- */
  const handleNameClick = (userId: string) => {
    // Close the modal first
    if (onClose) {
      onClose();
    }
    
    // Then navigate to the friend's profile
    router.push(`/friend/${userId}`);
  };

  /* --------------------- Filtering --------------------- */
  const filteredFriends = useMemo(() => {
    return allFriends.filter((f) => {
      // Search filter first
      if (
        searchTerm &&
        !f.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
        return false;

      // Tab filter: match the status
      return f.status === activeTab;
    });
  }, [activeTab, searchTerm, allFriends]);

  /* --------------------- Dynamic counts --------------------- */
  const counts = useMemo(() => {
    const byStatus: Record<FriendType, number> = {
      "friends": connectionsData?.getConnections.total || 0,
      "suggested": suggestions?.getFriendSuggestions.total || 0,
      "request-received": requestsReceivedData?.getPendingConnections.total || 0,
      "request-sent": requestsSentData?.getPendingConnections.total || 0,
    };

    return byStatus;
  }, [connectionsData, requestsSentData, requestsReceivedData, suggestions]);

  const tabTitle = {
    "friends": t("titles.all", { count: counts["friends"] }),
    "suggested": t("titles.suggested"),
    "request-received": t("titles.requestReceived", { count: counts["request-received"] }),
    "request-sent": t("titles.requestSent"),
  }[activeTab];

  /* --------------------- Loading state --------------------- */
  const isLoading = connectionsLoading || requestsSentLoading || requestsReceivedLoading || suggestionsLoading;

  /* --------------------- Card renderer --------------------- */
  const renderCard = (friend: Friend) => {
    const key = `${friend.status}-${friend.userId}`;
    
    return (
      <FriendsCard
        key={key}
        userId={friend.userId}
        name={friend.name}
        imageSrc={friend.imageSrc}
        mutualConnections={friend.mutualConnections}
        tier={friend.tier}
        status={friend.status}
        onNameClick={handleNameClick}
      />
    );
  };

  /* --------------------- UI (styles untouched) --------------------- */
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
      <div className="lg:w-[80vw] overflow-y-auto">
        <div className="w-[75vw] m-auto">
          <div className="lg:flex justify-between items-center my-4">
            {/* DYNAMIC heading */}
            <p className="font-heading-xsmall">{tabTitle}</p>

            <div>
              <SearchInput
                value={searchTerm}
                onChange={setSearchTerm}
                onSearch={() => {
                  /* optional API search */
                }}
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
            <div className="grid lg:grid-cols-2 gap-6">
              {filteredFriends.map((friend) => renderCard(friend))}
            </div>
          )}

          {/* Empty state */}
          {!isLoading && filteredFriends.length === 0 && (
            <p className="text-center text-muted-foreground col-span-2">
              {t("empty")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}