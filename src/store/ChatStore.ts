import { create } from 'zustand';
import { Message, Conversation, UserConversationPreference, User, Group, GroupMember, mockGroupsData, mockGroupMembers, mockUsers } from '@/data/chats';
import { mockMessages, mockConversations, mockUserConversationPreferences } from '@/data/chats';

interface ChatStore {
  // State
  messages: Message[];
  conversations: Conversation[];
  preferences: UserConversationPreference[];
  users: User[];
  groups: Group[];
  groupMembers: GroupMember[];
  activeChat: { id: string; type: 'direct' | 'group' } | null;

  // Actions
  setActiveChat: (chat: { id: string; type: 'direct' | 'group' } | null) => void;
  addMessage: (message: Message) => void;
  updateConversation: (conversationId: string, updates: Partial<Conversation>) => void;
  updatePreference: (conversationId: string, userId: string, updates: Partial<UserConversationPreference>) => void;
  getMessagesByConversation: (conversationId: string) => Message[];
  initializeFromMockData: () => void;
  setUsers: (users: User[]) => void;
  setGroups: (groups: Group[]) => void;
  setGroupMembers: (members: GroupMember[]) => void;
  
  // New actions for enhanced functionality
  sendMessage: (conversationId: string, text: string, senderId?: string, type?: 'text' | 'image' | 'file') => void;
  markAsRead: (conversationId: string, userId?: string) => void;
  createConversation: (type: 'direct' | 'group', participants: string[], groupInfo?: Partial<Group>) => string;
  deleteMessage: (messageId: string) => void;
  getUnreadCount: (userId?: string) => number;
  getConversationById: (conversationId: string) => Conversation | undefined;
  getUserById: (userId: string) => User | undefined;
  getGroupById: (groupId: string) => Group | undefined;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  // Initial state
  messages: [],
  conversations: [],
  preferences: [],
  users: [],
  groups: [],
  groupMembers: [],
  activeChat: null,

  // Basic setters
  setUsers: (users: User[]) => set({ users }),
  setGroups: (groups: Group[]) => set({ groups }),
  setGroupMembers: (members: GroupMember[]) => set({ groupMembers }),
  setActiveChat: (activeChat) => set({ activeChat }),

  // Initialize with mock data
  initializeFromMockData: () => {
    set({
      messages: [...mockMessages],
      conversations: [...mockConversations],
      preferences: [...mockUserConversationPreferences],
      users: [...mockUsers],
      groups: [...mockGroupsData],
      groupMembers: [...mockGroupMembers],
    });
  },

  // Add a new message
  addMessage: (message: Message) => {
    set((state) => ({
      messages: [...state.messages, message],
    }));

    // Also add to mockMessages for compatibility
    mockMessages.push(message);
  },

  // Update conversation
  updateConversation: (conversationId: string, updates: Partial<Conversation>) => {
    set((state) => ({
      conversations: state.conversations.map(conv =>
        conv.id === conversationId ? { ...conv, ...updates } : conv
      ),
    }));

    // Update mock data
    const conversation = mockConversations.find(conv => conv.id === conversationId);
    if (conversation) {
      Object.assign(conversation, updates);
    }
  },

  // Update user preference
  updatePreference: (conversationId: string, userId: string, updates: Partial<UserConversationPreference>) => {
    set((state) => ({
      preferences: state.preferences.map(pref =>
        pref.conversationId === conversationId && pref.userId === userId
          ? { ...pref, ...updates }
          : pref
      ),
    }));

    // Update mock data
    const preference = mockUserConversationPreferences.find(
      pref => pref.conversationId === conversationId && pref.userId === userId
    );
    if (preference) {
      Object.assign(preference, updates);
    }
  },

  // Get messages by conversation
  getMessagesByConversation: (conversationId: string) => {
    const { messages } = get();
    return messages
      .filter(message => message.conversationId === conversationId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  },

  // Enhanced actions

  // Send a new message with automatic handling
  sendMessage: (conversationId: string, text: string, senderId: string = 'current-user', type: 'text' | 'image' | 'file' = 'text') => {
    const { addMessage, updateConversation, updatePreference, conversations, preferences } = get();
    
    // Create new message
    const newMessage: Message = {
      id: Date.now().toString(),
      conversationId,
      senderId,
      text,
      type,
      timestamp: new Date().toISOString(),
      status: 'sent'
    };

    // Add message
    addMessage(newMessage);

    // Update conversation timestamp
    updateConversation(conversationId, {
      updatedAt: new Date().toISOString()
    });

    // Reset unread count for sender
    updatePreference(conversationId, senderId, {
      unreadCount: 0,
      lastReadMessageId: newMessage.id
    });

    // Increment unread count for other participants
    const conversation = conversations.find(conv => conv.id === conversationId);
    if (conversation) {
      const otherParticipants = preferences.filter(pref => 
        pref.conversationId === conversationId && pref.userId !== senderId
      );
      
      otherParticipants.forEach(pref => {
        updatePreference(conversationId, pref.userId, {
          unreadCount: pref.unreadCount + 1
        });
      });
    }

    return newMessage;
  },

  // Mark all messages as read in a conversation
  markAsRead: (conversationId: string, userId: string = 'current-user') => {
    const { updatePreference, messages } = get();
    
    const lastMessage = messages
      .filter(msg => msg.conversationId === conversationId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

    if (lastMessage) {
      updatePreference(conversationId, userId, {
        unreadCount: 0,
        lastReadMessageId: lastMessage.id
      });
    }
  },

  // Create a new conversation
  createConversation: (type: 'direct' | 'group', participants: string[], groupInfo?: Partial<Group>) => {
    const { conversations, preferences, groups, groupMembers, setConversations, setPreferences, setGroups, setGroupMembers } = get();
    
    const conversationId = Date.now().toString();
    
    if (type === 'direct' && participants.length === 2) {
      // Create direct conversation
      const newConversation: Conversation = {
        id: conversationId,
        type: 'direct',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      set((state) => ({
        conversations: [...state.conversations, newConversation]
      }));

      // Create preferences for both participants
      participants.forEach(userId => {
        const newPreference: UserConversationPreference = {
          id: Date.now().toString() + userId,
          userId,
          conversationId,
          unreadCount: 0,
          isPinned: false,
          isMuted: false
        };

        set((state) => ({
          preferences: [...state.preferences, newPreference]
        }));
      });

    } else if (type === 'group') {
      // Create group conversation
      const groupId = Date.now().toString();
      const newGroup: Group = {
        id: groupId,
        name: groupInfo?.name || 'New Group',
        description: groupInfo?.description || '',
        avatar: groupInfo?.avatar || 'NG',
        createdBy: 'current-user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isPublic: groupInfo?.isPublic || false,
        ...groupInfo
      };

      const newConversation: Conversation = {
        id: conversationId,
        type: 'group',
        groupId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      set((state) => ({
        conversations: [...state.conversations, newConversation],
        groups: [...state.groups, newGroup]
      }));

      // Create group members
      participants.forEach((userId, index) => {
        const newMember: GroupMember = {
          id: Date.now().toString() + userId,
          groupId,
          userId,
          role: userId === 'current-user' ? 'owner' : index === 0 ? 'admin' : 'member',
          joinedAt: new Date().toISOString()
        };

        set((state) => ({
          groupMembers: [...state.groupMembers, newMember]
        }));

        // Create preference for each member
        const newPreference: UserConversationPreference = {
          id: Date.now().toString() + userId,
          userId,
          conversationId,
          unreadCount: 0,
          isPinned: false,
          isMuted: false
        };

        set((state) => ({
          preferences: [...state.preferences, newPreference]
        }));
      });
    }

    return conversationId;
  },

  // Delete a message
  deleteMessage: (messageId: string) => {
    set((state) => ({
      messages: state.messages.filter(msg => msg.id !== messageId)
    }));

    // Also remove from mock data
    const messageIndex = mockMessages.findIndex(msg => msg.id === messageId);
    if (messageIndex > -1) {
      mockMessages.splice(messageIndex, 1);
    }
  },

  // Get total unread count for a user
  getUnreadCount: (userId: string = 'current-user') => {
    const { preferences } = get();
    return preferences
      .filter(pref => pref.userId === userId)
      .reduce((sum, pref) => sum + pref.unreadCount, 0);
  },

  // Helper methods
  getConversationById: (conversationId: string) => {
    const { conversations } = get();
    return conversations.find(conv => conv.id === conversationId);
  },

  getUserById: (userId: string) => {
    const { users } = get();
    return users.find(user => user.id === userId);
  },

  getGroupById: (groupId: string) => {
    const { groups } = get();
    return groups.find(group => group.id === groupId);
  }
}));