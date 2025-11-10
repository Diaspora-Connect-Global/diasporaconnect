"use client";

import { SearchInput } from "@/components/custom/input";
import FriendsCard from "@/components/home/FriendsCard";
import { toast } from "sonner";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

type TabKey = "all" | "suggested" | "request-received" | "request-sent";

interface Friend {
  name: string;
  imageSrc: string;
  mutualConnections?: number;
  tier: "starter" | "trusted" | "reliable" | "elite";
  status: TabKey;
}

export default function FriendListModal() {
  const t = useTranslations("friends");
  
  /* --------------------- State --------------------- */
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [searchTerm, setSearchTerm] = useState("");

  /* --------------------- Callbacks --------------------- */
  const handleMessage = () => toast.success(t("toasts.openingChat"));
  const handleAddFriend = () => toast.success(t("toasts.requestSent"));
  const handleAccept = () => toast.success(t("toasts.friendAccepted"));
  const handleIgnore = () => toast(t("toasts.requestIgnored"));
  const handleCancelRequest = () => toast(t("toasts.requestCancelled"));
  const handleRemoveFriend = () => toast.error(t("toasts.friendRemoved"));
  const handleBlockFriend = () => toast.error(t("toasts.friendBlocked"));

  /* --------------------- Mock data --------------------- */
  const allFriends: Friend[] = [
    {
      name: "JOHN DOE",
      imageSrc: "https://github.com/shadcn.png",
      mutualConnections: 15,
      tier: "starter",
      status: "all",
    },
    {
      name: "Jane Smith",
      imageSrc: "https://github.com/shadcn.png",
      mutualConnections: 8,
      tier: "starter",
      status: "suggested",
    },
    {
      name: "Jane Smith 3",
      imageSrc: "https://github.com/shadcn.png",
      mutualConnections: 8,
      tier: "starter",
      status: "suggested",
    },
    {
      name: "Alex Lee",
      imageSrc: "https://github.com/shadcn.png",
      mutualConnections: 3,
      tier: "starter",
      status: "request-received",
    },
    {
      name: "Sam Wilson",
      imageSrc: "https://github.com/shadcn.png",
      mutualConnections: 12,
      tier: "starter",
      status: "request-sent",
    },
  ];

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
  }, [activeTab, searchTerm]);

  /* --------------------- Dynamic counts --------------------- */
  const counts = useMemo(() => {
    const byStatus: Record<TabKey, number> = {
      all: 0,
      suggested: 0,
      "request-received": 0,
      "request-sent": 0,
    };

    allFriends.forEach((f) => {
      byStatus[f.status]++;
    });

    return byStatus;
  }, [allFriends]);

  const tabTitle = {
    all: t("titles.all", { count: counts.all }),
    suggested: t("titles.suggested"),
    "request-received": t("titles.requestReceived", { count: counts["request-received"] }),
    "request-sent": t("titles.requestSent"),
  }[activeTab];

  /* --------------------- Card renderer --------------------- */
  const renderCard = (friend: Friend) => {
    const key = `${friend.status}-${friend.name}`;
    const common = {
      name: friend.name,
      imageSrc: friend.imageSrc,
      mutualConnections: friend.mutualConnections,
      tier: friend.tier,
    };



    switch (friend.status) {
      case "all":
        return (
          <FriendsCard
            key={key}
            {...common}
            status="all-friends"
            onMessage={handleMessage}
            onRemoveFriend={handleRemoveFriend}
            onBlockFriend={handleBlockFriend}
          />
        );
      case "suggested":
        return (
          <FriendsCard
            key={key}
            {...common}
            status="suggested"
            onAddFriend={handleAddFriend}
          />
        );
      case "request-received":
        return (
          <FriendsCard
            key={key}
            {...common}
            status="request-received"
            onAccept={handleAccept}
            onIgnore={handleIgnore}
          />
        );
      case "request-sent":
        return (
          <FriendsCard
            key={key}
            {...common}
            status="request-sent"
            onCancelRequest={handleCancelRequest}
          />
        );
      // No default – exhaustive switch
    }
  };

  /* --------------------- UI (styles untouched) --------------------- */
  return (
    <div className="flex bg-surface-default h-[90vh] ">
      {/* ---------- LEFT SIDEBAR (tabs) ---------- */}
      <div className="w-[20vw] p-4 border-r min-h-[90vh] overflow-y-auto">
        <div className="mt-4 space-y-2">
          {(
            [
              { key: "all", label: t("tabs.all") },
              { key: "suggested", label: t("tabs.suggested") },
              { key: "request-received", label: t("tabs.requestReceived") },
              { key: "request-sent", label: t("tabs.requestSent") },
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
              className={`cursor-pointer pl-3 py-1 rounded-lg ${
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