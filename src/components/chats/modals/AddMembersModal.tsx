// components/chats/modals/AddMembersModal.tsx
"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ButtonType2, ButtonType3 } from "@/components/custom/button";
import { SearchInput } from "@/components/custom/input";
import { useTranslations } from "next-intl";
import { useMutation, useQuery } from "@apollo/client/react";
import { ADD_MEMBER, AddMemberResponse, GET_GROUP_MEMBERS, MemberRole } from "@/services/gql/groups";
import { GET_MY_CONNECTIONS } from "@/services/gql/connection";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { useUserStore } from "@/store/useUserStore";

interface User {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl?: string;
  sector?: string;
}

interface Connection {
  id: string;
  requesterId: string;
  receiverId: string;
  status: string;
  requester: User;
  receiver: User;
}

interface GetMyConnectionsResponse {
  getConnections: {
    success: boolean;
    message?: string;
    connections: Connection[];
    total: number;
  };
}

interface AddMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  onMembersAdded: () => void;
  /** User IDs already in this group; they will be excluded from the list */
  existingMemberIds?: string[];
}

export function AddMembersModal({
  isOpen,
  onClose,
  groupId,
  onMembersAdded,
  existingMemberIds = [],
}: AddMembersModalProps) {
  const t = useTranslations("chat.group");

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isInviting, setIsInviting] = useState(false);

  const [addMember] = useMutation<AddMemberResponse>(ADD_MEMBER, {
    refetchQueries: [
      {
        query: GET_GROUP_MEMBERS,
        variables: { groupId, membersLimit: 100, membersOffset: 0 },
      },
    ],
    awaitRefetchQueries: true,
  });
  const user = useUserStore((state) => state.user);
  
  const currentUserId = user?.userId;

  // Query for connections
  const { data, loading } = useQuery<GetMyConnectionsResponse>(GET_MY_CONNECTIONS, {
    variables: {
      limit: 100,
      offset: 0,
    },
  });

  // Extract users from connections, filter out current user and existing group members
  const allUsers = useMemo(() => {
    if (!data?.getConnections?.connections) return [];
    const existingSet = new Set(existingMemberIds ?? []);

    const users: User[] = [];
    data.getConnections.connections.forEach((connection) => {
      // Only include accepted connections (case-insensitive check)
      if (connection.status.toLowerCase() !== "accepted") return;

      const other = connection.requesterId === currentUserId ? connection.receiver : connection.requester;
      if (existingSet.has(other.userId)) return;
      users.push(other);
    });

    return users;
  }, [data, currentUserId, existingMemberIds]);

  // Filter users based on search query
  const filteredUsers = useMemo(() => {
    if (!searchQuery) return allUsers;
    
    const query = searchQuery.toLowerCase();
    return allUsers.filter(
      (user) =>
        user.firstName.toLowerCase().includes(query) ||
        user.lastName.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        (user.sector && user.sector.toLowerCase().includes(query))
    );
  }, [allUsers, searchQuery]);

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleInvite = async () => {
    if (selectedUsers.length === 0) return;

    setIsInviting(true);
    try {
      await Promise.all(
        selectedUsers.map((userId) =>
          addMember({
            variables: {
              input: {
                groupId,
                userId,
                role: MemberRole.MEMBER,
              },
            },
          })
        )
      );

      onMembersAdded();
      onClose();
      setSelectedUsers([]);
      setSearchQuery("");
    } catch (error) {
      console.error("Failed to add members:", error);
    } finally {
      setIsInviting(false);
    }
  };

  const handleClose = () => {
    onClose();
    setSelectedUsers([]);
    setSearchQuery("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md w-[90vw] h-[90dvh] overflow-auto flex flex-col">
        <DialogHeader>
          <DialogTitle>{t("addMembers")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 min-h-0 flex flex-col">
          <div className="w-64">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              onSearch={() => {}}
              placeholder={t("searchUsers")}
              id="user-search"
            />
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto space-y-2">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-text-secondary" />
              </div>
            ) : allUsers.length === 0 ? (
              <p className="text-center text-text-secondary py-8">
                {t("noUsersFound")}
              </p>
            ) : filteredUsers.length === 0 ? (
              <p className="text-center text-text-secondary py-8">
                {t("noUsersFound")}
              </p>
            ) : (
              filteredUsers.map((user) => {
                const isSelected = selectedUsers.includes(user.userId);
                return (
                  <div
                    key={user.userId}
                    onClick={() => toggleUserSelection(user.userId)}
                    className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-surface-brand/10 border border-surface-brand"
                        : "bg-surface-default border border-border-subtle hover:bg-surface-hover"
                    }`}
                  >
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={user.avatarUrl || undefined} alt="avatar" />
                      <AvatarFallback>
                        {user.firstName[0]}
                        {user.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-xs text-text-secondary truncate">
                        {user.email}
                      </p>
                      {user.sector && (
                        <p className="text-xs text-text-tertiary truncate">
                          {user.sector}
                        </p>
                      )}
                    </div>
                    {isSelected && (
                      <div className="flex-shrink-0 w-6 h-6 bg-surface-brand rounded-full flex items-center justify-center">
                        <Check className="w-4 h-4 text-text-white" />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {selectedUsers.length > 0 && (
            <div className="text-sm text-text-secondary">
              {t("selectedCount", { count: selectedUsers.length })}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border-subtle">
          <ButtonType3
            onClick={handleClose}
            disabled={isInviting}
            className="px-4 py-2"
          >
            {t("cancel")}
          </ButtonType3>
          <ButtonType2
            onClick={handleInvite}
            disabled={selectedUsers.length === 0 || isInviting}
            className="px-4 py-2"
          >
            {isInviting
              ? t("inviting")
              : t("invite") + ` (${selectedUsers.length})`}
          </ButtonType2>
        </div>
      </DialogContent>
    </Dialog>
  );
}