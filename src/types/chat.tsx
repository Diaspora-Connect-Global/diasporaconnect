// types/chat.ts

export interface Group {
  id: string;
  name: string;
  description: string;
  avatar: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  isPublic: boolean;
}

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
}


/**
 * Represents a user in the system
 */
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  status?: 'online' | 'offline' | 'away';
  lastSeen?: string;
}

/**
 * Data needed to start a new conversation
 */
export interface ConversationStartData {
  userIds: string[];
  type: ConversationType;
  groupName?: string;
}

/**
 * Type of conversation
 */
export type ConversationType = 'direct' | 'group';

/**
 * Props for the main StartConversationModal component
 */
export interface StartConversationModalProps {
  users: User[];
  onStartConversation: (data: ConversationStartData) => void;
  trigger?: React.ReactNode;
  isLoading?: boolean;
}

/**
 * Props for the ConfirmationModal component
 */
export interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedUsers: User[];
  onConfirm: (mode: ConversationType, groupName?: string) => void;
}

/**
 * Props for individual user item in the list
 */
export interface UserItemProps {
  user: User;
  isSelected: boolean;
  onSelect: (user: User) => void;
}

/**
 * Props for selected user badge component
 */
export interface SelectedUserBadgeProps {
  user: User;
  onRemove: (userId: string) => void;
}

/**
 * State for the StartConversationModal component
 */
export interface ConversationModalState {
  selectedUsers: User[];
  searchTerm: string;
  isOpen: boolean;
  showConfirmation: boolean;
}

/**
 * State for the ConfirmationModal component
 */
export interface ConfirmationModalState {
  selectedMode: ConversationType;
  groupName: string;
}

/**
 * Response from conversation creation API
 */
export interface ConversationResponse {
  id: string;
  type: ConversationType;
  userIds: string[];
  groupName?: string;
  createdAt: string;
  updatedAt: string;
  participants?: User[];
}

/**
 * Error response from API
 */
export interface ConversationError {
  error: string;
  code?: string;
  details?: unknown;
}

/**
 * Hook return type for useConversation
 */
export interface UseConversationReturn {
  startConversation: (data: ConversationStartData) => Promise<ConversationResponse | ConversationResponse[]>;
  isLoading: boolean;
  error: ConversationError | null;
}

/**
 * Search and filter options
 */
export interface UserFilterOptions {
  searchTerm: string;
  excludeIds?: string[];
  limit?: number;
}

/**
 * Event types for conversation modals
 */
export interface ConversationModalEvents {
  onOpenChange: (open: boolean) => void;
  onUserSelect: (user: User) => void;
  onUserRemove: (userId: string) => void;
  onSearchChange: (searchTerm: string) => void;
  onConfirm: (data: ConversationStartData) => void;
  onCancel: () => void;
}