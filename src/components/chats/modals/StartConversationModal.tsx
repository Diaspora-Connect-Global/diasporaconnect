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

interface StartConversationModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    type: "direct" | "group"
}

export function StartConversationModal({
    isOpen,
    onOpenChange,
    type = "direct"
}: StartConversationModalProps) {
    const t = useTranslations('chat.conversation');
    const tActions = useTranslations('actions');
    const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Fetch users when modal opens - using mock data
    useEffect(() => {
        if (isOpen) {
            fetchUsers();
        }
    }, [isOpen]);

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 500));
            // Use mock data instead of API call
            setUsers(mockUsers);
        } catch (error) {
            console.error('Failed to fetch users:', error);
            // Fallback to mock data even on error
            setUsers(mockUsers);
        } finally {
            setIsLoading(false);
        }
    };

    const startConversation = async (data: ConversationStartData) => {
        try {
            console.log('Starting conversation with:', data);

            // For now, just log and close the modal
            // You can add your actual API call later
            if (data.type === 'direct') {
                console.log('Starting direct chat with user:', data.userIds[0]);
                // window.location.href = `/chat/${conversation.id}`;
            } else {
                console.log('Creating group:', data.groupName, 'with users:', data.userIds);
                // window.location.href = `/chat/group/${conversation.id}`;
            }

            // Simulate API call delay
            await new Promise(resolve => setTimeout(resolve, 1000));

            return { id: 'temp-id', ...data };
        } catch (error) {
            console.error('Error starting conversation:', error);
            throw error;
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
            // For group messages, always show group confirmation modal regardless of user count
            setShowConfirmation(true);
        }
    };

    const handleGroupCreate = (groupName: string, groupPhoto?: string, selectedUsers?: User[]) => {
        console.log('Creating group:', { groupName, groupPhoto, selectedUsers });
        
        // Create conversation data for group
        const conversationData: ConversationStartData = {
            userIds: selectedUsers ? selectedUsers.map(u => u.id) : [],
            type: 'group',
            groupName: groupName,
        };

        handleStartConversation(conversationData);
    };

    const handleStartConversation = async (conversationData: ConversationStartData) => {
        try {
            await startConversation(conversationData);
            handleClose();
        } catch (error) {
            // Handle error (show toast, etc.)
            console.error('Failed to start conversation:', error);
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

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-2xl w-[90vw] max-h-[85vh] flex flex-col"> {/* Responsive sizing */}
                    <DialogHeader>
                        <DialogTitle>
                            {type === "group" ? t('createGroup') : t('startConversation')}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="flex-1 min-h-0 flex flex-col space-y-4"> {/* Added min-h-0 and flex-col */}
                        {/* Search Input */}
                        <div className="flex-shrink-0"> {/* Added flex-shrink-0 */}
                            <SearchInput
                                placeholder={t('searchPeople')}
                                value={searchTerm}
                                onChange={handleSearchChange}
                                onSearch={() => { }}
                            />
                        </div>

                        {/* Users List */}
                        <div className="flex-1 min-h-0 overflow-y-auto"> {/* Added min-h-0, removed fixed height */}
                            {isLoading ? (
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
                                                    <p className="text-primary font-body-large truncate">{user.name}</p>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {filteredUsers.length === 0 && !isLoading && (
                                        <div className="p-4 text-center text-muted-foreground">
                                            {t('noUsersFound')}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex-shrink-0 flex justify-end items-center space-x-2 pt-4 border-t border-border-subtle"> {/* Added flex-shrink-0 */}
                            <ButtonType3
                                className='px-4 py-2'
                                onClick={handleClose}
                            >
                                {t('cancel')}
                            </ButtonType3>
                            <ButtonType2
                                className='px-4 py-2'
                                onClick={handleStartClick}
                                disabled={!isFormValid || isLoading}
                            >
                                {type === "group" ? t('createGroup') : t('startConversation')}
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