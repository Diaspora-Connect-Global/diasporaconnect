// components/chats/modals/StartConversationModal.tsx
'use client';

import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { X, Check } from 'lucide-react';
import { User, ConversationStartData } from '@/types/chat';
import { ConfirmationModal } from './StartConversationConfirmationModal';
import { SearchInput } from '@/components/custom/input';
import { ButtonType2, ButtonType3 } from '@/components/custom/button';
import { mockUsers } from '@/data/chats';

interface StartConversationModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}




export function StartConversationModal({
    isOpen,
    onOpenChange,
}: StartConversationModalProps) {
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

    const handleRemoveUser = (userId: string) => {
        setSelectedUsers(selectedUsers.filter((u) => u.id !== userId));
    };

    const handleStartClick = () => {
        if (selectedUsers.length === 0) return;

        if (selectedUsers.length === 1) {
            // Directly start one-on-one conversation
            const conversationData: ConversationStartData = {
                userIds: selectedUsers.map((u) => u.id),
                type: 'direct',
            };
            handleStartConversation(conversationData);
        } else {
            // Show confirmation modal ONLY when more than one user is selected
            setShowConfirmation(true);
        }
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

    // Add debug logging
    console.log('Modal isOpen:', isOpen);
    console.log('Selected users:', selectedUsers.length);
    console.log('Total users:', users.length);


    return (
        <>
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent className="lg:min-w-[45rem]">
                    <DialogHeader>
                        <DialogTitle>Start Conversation</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        {/* Search Input */}
                        <div className="relative">
                            <SearchInput
                                placeholder="Search people..."
                                value={searchTerm}
                                onChange={handleSearchChange}
                                onSearch={() => {}} // You can implement search if needed
                            />
                        </div>

                        {/* Selected Users */}
                        {selectedUsers.length > 0 && (
                            <div className="space-y-2">
                                <Label>Selected ({selectedUsers.length})</Label>
                                <div className="flex flex-wrap gap-2">
                                    {selectedUsers.map((user) => (
                                        <Badge
                                            key={user.id}
                                            variant="secondary"
                                            className="px-3 py-1 text-sm"
                                        >
                                            {user.name}
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveUser(user.id)}
                                                className="ml-1 hover:text-destructive"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Users List */}
                        <div className="max-h-120 overflow-y-auto">
                            {isLoading ? (
                                <div className="p-4 text-center text-muted-foreground">
                                    Loading users...
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
                                                    <p className="text-sm font-medium truncate">{user.name}</p>
                                                    
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {filteredUsers.length === 0 && !isLoading && (
                                        <div className="p-4 text-center text-muted-foreground">
                                            No users found
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-end items-center space-x-2 pt-4">
                            <ButtonType3
                                className='p-3'
                                onClick={handleClose}
                            >
                                Cancel
                            </ButtonType3>
                            <ButtonType2
                                className='px-3 py-3'
                                onClick={handleStartClick}
                                disabled={!isFormValid || isLoading}
                            >
                                {selectedUsers.length === 1 ? 'Start Conversation' : 'Continue'}
                            </ButtonType2>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Confirmation Modal - Only shown when multiple users are selected */}
            <ConfirmationModal
                isOpen={showConfirmation}
                onClose={() => setShowConfirmation(false)}
                selectedUsers={selectedUsers}
                onConfirm={handleConfirmation}
            />
        </>
    );
}