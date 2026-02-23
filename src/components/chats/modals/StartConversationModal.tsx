/* eslint-disable @typescript-eslint/no-explicit-any */
// components/chats/modals/StartConversationModal.tsx
'use client';

import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Check } from 'lucide-react';
import { ConversationStartData } from '@/types/chat';
import { ConfirmationModal } from './StartConversationConfirmationModal';
import { SearchInput } from '@/components/custom/input';
import { ButtonType2, ButtonType3 } from '@/components/custom/button';
import { mockUsers, User } from '@/data/chats';
import { StartGroupConfirmationModal } from './StartGroupConfirmationModal';
import { useTranslations } from 'next-intl';
import {
    CREATE_GROUP,
    CreateGroupResponse,
    CreateGroupInput,
    GroupPrivacy,
    GET_MY_GROUPS,
} from '@/services/gql/groups';
import { CREATE_CONVERSATION } from '@/services/gql/messaging';
import type { CreateConversationData } from '@/services/gql/types/messaging';
import { GET_MY_CONNECTIONS } from '@/services/gql/connection';
import { toast } from 'sonner';
import { useMutation, useQuery } from '@apollo/client/react';
import { useAuthStore } from '@/store/useAuthStore';
import { useUserStore } from '@/store/useUserStore';
import { useChatStore } from '@/store/ChatStore';

interface StartConversationModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    type: "direct" | "group";
}

export function StartConversationModal({
    isOpen,
    onOpenChange,
    type = "direct"
}: StartConversationModalProps) {
    const t = useTranslations('chat.conversation');
    const tActions = useTranslations('actions');

    const user = useUserStore((state) => state.user);
    const currentUserId = user?.userId;

    const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const { setRealConversation, setActiveChat } = useChatStore();

    // GraphQL mutations
    const [createGroup, { loading: creatingGroup }] = useMutation<CreateGroupResponse>(CREATE_GROUP, {
        refetchQueries: [{ query: GET_MY_GROUPS, variables: { limit: 50, offset: 0 } }],
        awaitRefetchQueries: true,
    });

    const [createConversationMutation, { loading: creatingConversation }] = useMutation<CreateConversationData>(CREATE_CONVERSATION);

    // Query connections for user list
    const { data: connectionsData, loading: loadingConnections } = useQuery<any>(GET_MY_CONNECTIONS, {
        variables: { limit: 100, offset: 0 },
        skip: !isOpen,
        fetchPolicy: 'network-only',
    });

    // Fetch users (connections/friends) when modal opens - for both DMs and groups
    useEffect(() => {
        if (isOpen && currentUserId && connectionsData?.getConnections?.connections) {
            const connectionUsers = connectionsData.getConnections.connections
                .map((conn: any) => {
                    // Determine which user is NOT the current user
                    const otherUser = conn.requesterId === currentUserId
                        ? conn.receiver
                        : conn.requester;

                    return {
                        id: otherUser.userId,
                        name: `${otherUser.firstName} ${otherUser.lastName}`,
                        email: otherUser.email,
                        avatarUrl: otherUser.avatarUrl,
                        sector: otherUser.sector,
                    };
                })
                .filter((user: User, index: number, self: User[]) =>
                    user.id &&
                    user.id !== currentUserId &&
                    self.findIndex(u => u.id === user.id) === index
                );

            setUsers(connectionUsers);
        }
    }, [isOpen, connectionsData, type, currentUserId]);

    const startConversation = async (data: ConversationStartData) => {
        try {
            if (data.type === 'direct') {
                // Create a real conversation via GraphQL
                const participantIds = data.userIds;

                const { data: result } = await createConversationMutation({
                    variables: {
                        type: 'DIRECT',
                        participantIds,
                    },
                });

                if (result?.createConversation) {
                    const conversationId = result.createConversation;

                    // Store the real conversation mapping
                    const targetUserId = participantIds[0];
                    setRealConversation(targetUserId, {
                        conversationId,
                        type: 'DIRECT',
                        participantIds: [currentUserId!, ...participantIds],
                    });

                    // Set active chat to navigate to it
                    setActiveChat({ id: targetUserId, type: 'direct' });
                    sessionStorage.setItem('activeChat', JSON.stringify({ id: targetUserId, type: 'direct' }));

                    toast.success('Conversation started');
                    return { id: conversationId, ...data };
                }
            }
        } catch (error) {
            console.error('Error starting conversation:', error);
            throw error;
        }
    };

    const handleGroupCreate = async (groupName: string, groupPhoto?: string) => {
        if (!currentUserId) {
            toast.error('User not authenticated');
            return;
        }

        console.log("selectedUsers", selectedUsers);
        // Create array of member IDs including current user
        const memberIds = [
            currentUserId, // Add current user first
            ...selectedUsers.map(user => user.id) // Add selected users
        ].filter((id): id is string => id !== undefined && id !== null);

        try {
            console.log('Creating group:', { groupName, groupPhoto, memberIds });

            // Create the group using GraphQL mutation
            const createGroupInput: CreateGroupInput = {
                name: groupName,
                privacy: GroupPrivacy.PRIVATE, // You can make this configurable
                avatarUrl: groupPhoto,
                description: '', // Optional: add description field to modal
                memberIds: memberIds, // Extract user IDs from selected users
            };

            const { data } = await createGroup({
                variables: {
                    createInput: createGroupInput
                }
            });

            if (data?.createGroup?.success && data.createGroup.group) {
                const newGroup = data.createGroup.group;

                toast.success('Group created successfully');

                // Navigate to the new group chat
                // window.location.href = `/chat/group/${newGroup.id}`;

                handleClose();
            } else {
                throw new Error(data?.createGroup?.message || 'Failed to create group');
            }
        } catch (error) {
            console.error('Failed to create group:', error);
            toast.error('Group creation failed');
        }
    };

    const filteredUsers = users.filter(
        (user) =>
            user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleUserSelect = (user: User) => {
        if (selectedUsers.find((u) => u.id === user.id)) {
            setSelectedUsers(selectedUsers.filter((u) => u.id !== user.id));
        } else {
            setSelectedUsers([...selectedUsers, user]);
        }
    };

    const handleStartClick = () => {
        if (selectedUsers.length === 0) return;

        if (type === "direct") {
            // For direct messages, show confirmation only when multiple users are selected
            if (selectedUsers.length === 1) {
                // Directly start one-on-one conversation
                const conversationData: ConversationStartData = {
                    userIds: selectedUsers.map((u) => u.id),
                    type: "direct",
                };
                handleStartConversation(conversationData);
            } else {
                // Show confirmation modal when more than one user is selected for direct messages
                setShowConfirmation(true);
            }
        } else {
            // For group messages, always show group confirmation modal
            setShowConfirmation(true);
        }
    };

    const handleStartConversation = async (conversationData: ConversationStartData) => {
        try {
            await startConversation(conversationData);
            handleClose();
        } catch (error) {
            console.error('Failed to start conversation:', error);
            toast.error('Failed to start conversation');
        }
    };

    const handleConfirmation = (mode: 'direct' | 'group', groupName?: string) => {
        const conversationData: ConversationStartData = {
            userIds: selectedUsers.map((u) => u.id),
            type: mode,
            groupName: mode === 'group' ? groupName : undefined,
        };

        handleStartConversation(conversationData);
        setShowConfirmation(false);
    };

    const handleClose = () => {
        setSelectedUsers([]);
        setSearchTerm('');
        setShowConfirmation(false);
        onOpenChange(false);
    };

    const handleSearchChange = (value: string) => {
        setSearchTerm(value);
    };

    const isFormValid = selectedUsers.length > 0;
    const isLoadingUsers = loadingConnections;
    const isProcessing = creatingGroup || creatingConversation;

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-2xl w-[90vw] max-h-[85vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>
                            {type === "group" ? t('createGroup') : t('startConversation')}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="flex-1 min-h-0 flex flex-col space-y-4">
                        {/* Search Input */}
                        <div className="flex-shrink-0">
                            <SearchInput
                                placeholder={t('searchPeople')}
                                value={searchTerm}
                                onChange={handleSearchChange}
                                onSearch={() => { }}
                            />
                        </div>

                        {/* Users List */}
                        <div className="flex-1 min-h-0 overflow-y-auto">
                            {isLoadingUsers ? (
                                <div className="p-4 text-center text-muted-foreground">
                                    {t('loadingUsers')}
                                </div>
                            ) : (
                                <>
                                    {filteredUsers.map((user) => {
                                        const isSelected = selectedUsers.find((u) => u.id === user.id);
                                        return (
                                            <div
                                                key={user.id}
                                                className={`flex items-center p-3 cursor-pointer hover:bg-muted/50 ${isSelected ? 'bg-muted' : ''
                                                    }`}
                                                onClick={() => handleUserSelect(user)}
                                            >
                                                <div
                                                    className={`w-4 h-4 border rounded mr-3 flex items-center justify-center ${isSelected
                                                        ? 'bg-surface-brand border-border-brand text-primary-foreground'
                                                        : 'border-muted-foreground'
                                                        }`}
                                                >
                                                    {isSelected && <Check />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-primary font-body-large truncate">
                                                        {user.name}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {filteredUsers.length === 0 && !isLoadingUsers && (
                                        <div className="p-4 text-center text-muted-foreground">
                                            {t('noUsersFound')}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex-shrink-0 flex justify-end items-center space-x-2 pt-4 border-t border-border-subtle">
                            <ButtonType3
                                className='px-4 py-2'
                                onClick={handleClose}
                                disabled={isProcessing}
                            >
                                {t('cancel')}
                            </ButtonType3>
                            <ButtonType2
                                className='px-4 py-2'
                                onClick={handleStartClick}
                                disabled={!isFormValid || isLoadingUsers || isProcessing}
                            >
                                {isProcessing
                                    ? t('processing')
                                    : type === "group"
                                        ? t('createGroup')
                                        : t('startConversation')
                                }
                            </ButtonType2>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Show appropriate confirmation modal based on type */}
            {type === "direct" ? (
                <ConfirmationModal
                    isOpen={showConfirmation}
                    onClose={() => setShowConfirmation(false)}
                    selectedUsers={selectedUsers}
                    onConfirm={handleConfirmation}
                />
            ) : (
                <StartGroupConfirmationModal
                    isOpen={showConfirmation}
                    onClose={() => setShowConfirmation(false)}
                    selectedUsers={selectedUsers}
                    onGroupCreate={handleGroupCreate}
                />
            )}
        </>
    );
}