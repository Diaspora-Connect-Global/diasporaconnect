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
  GET_PENDING_CONNECTIONS,
  GetConnectionsResponse,
  GetPendingConnectionsResponse,
  Connection,
} from "@/services/gql/connection";

interface Friend {
  userId: string;
  connectionId?: string; // Add connectionId for mutations
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
  const { data: connectionsData, loading: connectionsLoading, refetch: refetchConnections } = 
    useQuery<GetConnectionsResponse>(GET_MY_CONNECTIONS, {
      variables: { limit: 100.0, offset: 0.0 },
    });

  const { data: pendingData, loading: pendingLoading, refetch: refetchPending } = 
    useQuery<GetPendingConnectionsResponse>(GET_PENDING_CONNECTIONS, {
      variables: { limit: 100.0 },
    });

  /* --------------------- Helper: Determine tier from user data --------------------- */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getTierFromUser = (user: any): "starter" | "trusted" | "reliable" | "elite" => {
    // TODO: Implement actual tier logic based on your business rules
    // For now, returning a default
    return "starter";
  };

  /* --------------------- Helper: Get connection status --------------------- */
  const getConnectionStatus = (connection: Connection, currentUserId: string): FriendType => {
    if (connection.status === "ACCEPTED") {
      return "friends";
    }
    
    if (connection.status === "PENDING") {
      // If current user is the receiver, it's a request received
      if (connection.receiverId === currentUserId) {
        return "request-received";
      }
      // If current user is the requester, it's a request sent
      if (connection.requesterId === currentUserId) {
        return "request-sent";
      }
    }
    
    return "suggested"; // Default fallback
  };

  /* --------------------- Transform API data to Friend[] --------------------- */
  const allFriends: Friend[] = useMemo(() => {
    const friends: Friend[] = [];
    
    // TODO: Get current user ID from auth context or session
    const currentUserId = "me"; // Replace with actual current user ID

    // Process accepted connections (friends)
    if (connectionsData?.getConnections.connections) {
      connectionsData.getConnections.connections.forEach((connection) => {
        if (connection.status === "ACCEPTED") {
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
        }
      });
    }

    // Process pending connections (sent and received requests)
    if (pendingData?.getPendingConnections.connections) {
      pendingData.getPendingConnections.connections.forEach((connection) => {
        const isReceived = connection.receiverId === currentUserId;
        const friend = isReceived ? connection.requester : connection.receiver;

        friends.push({
          userId: friend.userId,
          connectionId: connection.id,
          name: `${friend.firstName} ${friend.lastName}`,
          imageSrc: friend.avatarUrl || "https://github.com/shadcn.png",
          mutualConnections: undefined,
          tier: getTierFromUser(friend),
          status: isReceived ? "request-received" : "request-sent",
        });
      });
    }

    // TODO: Add suggested friends logic
    // This would typically come from a separate query or recommendation system

    return friends;
  }, [connectionsData, pendingData]);

  /* --------------------- Refetch on tab change --------------------- */
  useEffect(() => {
    if (activeTab === "friends" || activeTab === "request-sent" || activeTab === "request-received") {
      refetchConnections();
      refetchPending();
    }
  }, [activeTab, refetchConnections, refetchPending]);

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
      "friends": 0,
      "suggested": 0,
      "request-received": 0,
      "request-sent": 0,
    };

    allFriends.forEach((f) => {
      byStatus[f.status]++;
    });

    return byStatus;
  }, [allFriends]);

  const tabTitle = {
    "friends": t("titles.all", { count: counts["friends"] }),
    "suggested": t("titles.suggested"),
    "request-received": t("titles.requestReceived", { count: counts["request-received"] }),
    "request-sent": t("titles.requestSent"),
  }[activeTab];

  /* --------------------- Loading state --------------------- */
  const isLoading = connectionsLoading || pendingLoading;

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
        <div className="w-[75vw] m-auto">
          <div className="lg:flex  justify-between items-center my-4">
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