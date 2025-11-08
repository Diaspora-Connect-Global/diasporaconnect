"use client";

import { SearchInput } from "@/components/custom/input";
import FriendsCard from "@/components/home/FriendsCard";
import { toast } from "sonner";
import { useMemo, useState } from "react";

type TabKey = "all" | "suggested" | "request-received" | "request-sent";

interface Friend {
  name: string;
  imageSrc: string;
  mutualConnections?: number;
  tier: "starter" | "trusted" | "reliable" | "elite";
  status: TabKey;
}

export default function FriendListModal() {
  /* --------------------- State --------------------- */
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [searchTerm, setSearchTerm] = useState("");

  /* --------------------- Callbacks --------------------- */
  const handleMessage = () => toast.success("Opening chat…");
  const handleAddFriend = () => toast.success("Friend request sent!");
  const handleAccept = () => toast.success("Friend accepted!");
  const handleIgnore = () => toast("Request ignored.");
  const handleCancelRequest = () => toast("Request cancelled.");

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
  }, []);

  const tabTitle = {
    all: `${counts.all} friends`,
    suggested: "Suggested friends",
    "request-received": `Friend requests (${counts["request-received"]})`,
    "request-sent": "Sent request",
  }[activeTab];

  /* --------------------- Card renderer --------------------- */
  const renderCard = (friend: Friend) => {
    const common = {
      key: `${friend.status}-${friend.name}`, // <-- unique key for React
      name: friend.name,
      imageSrc: friend.imageSrc,
      mutualConnections: friend.mutualConnections,
      tier: friend.tier,
    };



    switch (friend.status) {
      case "all":
        return (
          <FriendsCard
            {...common}
            status="all-friends"
            onMessage={handleMessage}
          />
        );
      case "suggested":
        return (
          <FriendsCard
            {...common}
            status="suggested"
            onAddFriend={handleAddFriend}
          />
        );
      case "request-received":
        return (
          <FriendsCard
            {...common}
            status="request-received"
            onAccept={handleAccept}
            onIgnore={handleIgnore}
          />
        );
      case "request-sent":
        return (
          <FriendsCard
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
              { key: "all", label: "All friends" },
              { key: "suggested", label: "Friend Suggestions" },
              { key: "request-received", label: "Friend request" },
              { key: "request-sent", label: "Sent request" },
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
              No friends match the current filter.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}