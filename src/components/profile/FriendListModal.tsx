"use client";

import { SearchInput } from "@/components/custom/input";
import FriendsCard from "@/components/home/FriendsCard";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { DUMMY_USERS } from "@/data/users";
import { FriendType } from "../friends/TypeOfFriend";
import { useRouter } from "next/navigation";

interface Friend {
  userId: string;
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

  /* --------------------- Mock data from DUMMY_USERS --------------------- */
  const allFriends: Friend[] = useMemo(() => {
    return Object.values(DUMMY_USERS)
      .filter(user => user.userId !== 'me') // Exclude current user
      .map(user => ({
        userId: user.userId,
        name: user.name,
        imageSrc: user.avatarUrl,
        mutualConnections: Math.floor(Math.random() * 50) + 1, // Random mutual connections for demo
        tier: user.tier as "starter" | "trusted" | "reliable" | "elite",
        status: user.friendType,
      }));
  }, []);

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
    <div className="flex bg-surface-default h-[90vh] ">
      {/* ---------- LEFT SIDEBAR (tabs) ---------- */}
      <div className="w-[20vw] p-4 border-r min-h-[90vh] overflow-y-auto">
        <div className="mt-4 space-y-2">
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
              className={`cursor-pointer pl-3 py-1 rounded-lg ${activeTab === key
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
      <div className="w-[80vw] overflow-y-auto">
        <div className="w-[75vw] m-auto">
          <div className="flex justify-between items-center my-4">
            {/* DYNAMIC heading */}
            <p className="font-heading-xsmall">{tabTitle}</p>

            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              onSearch={() => {
                /* optional API search */
              }}
            />
          </div>

          {/* Cards grid */}
          <div className="grid lg:grid-cols-2 gap-6">
            {filteredFriends.map((friend) => renderCard(friend))}
          </div>

          {/* Empty state */}
          {filteredFriends.length === 0 && (
            <p className="text-center text-muted-foreground col-span-2">
              {t("empty")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}