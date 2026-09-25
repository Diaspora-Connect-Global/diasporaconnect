import { create } from 'zustand';
import { Message, Conversation, UserConversationPreference, User, Group, GroupMember, mockGroupsData, mockGroupMembers, mockUsers } from '@/data/chats';
import { mockMessages, mockConversations, mockUserConversationPreferences } from '@/data/chats';

// Real API message type (from GraphQL/WebSocket). attachments replaced mediaMetadata (multi-file).
export interface ApiMessage {
  id: string;
  conversationId: string;
  senderId: string;
  type: 'TEXT' | 'IMAGE' | 'FILE' | 'VIDEO' | 'AUDIO';
  content: string;
  mentions?: string[];
  replyToId?: string;
  /** File attachments (replaces mediaMetadata). Use for display and multi-file. */
  attachments?: Array<{
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
    gcsPath?: string;
    fileId?: string;
    width?: number;
    height?: number;
    duration?: number;
  }>;
  status?: 'sending' | 'sent' | 'delivered' | 'read';
  /** Blob object URLs for placeholder (status === 'sending') only. Not from API. */
  sendingPreviews?: Array<{ url?: string; mimeType: string }>;
  createdAt: string;
}

interface ChatStore {
  // State
  messages: Message[];
  apiMessages: ApiMessage[];
  conversations: Conversation[];
  preferences: UserConversationPreference[];
  users: User[];
  groups: Group[];
  groupMembers: GroupMember[];
  activeChat: { id: string; type: 'direct' | 'group' } | null;

  // Real conversation IDs (from API) - maps chatId -> conversation data
  realConversations: Map<string, { conversationId: string; type: 'DIRECT' | 'GROUP'; participantIds: string[] }>;

  // Actions
  setActiveChat: (chat: { id: string; type: 'direct' | 'group' } | null) => void;
  addMessage: (message: Message) => void;
  addApiMessage: (message: ApiMessage) => void;
  removeApiMessage: (messageId: string) => void;
  updateApiMessageStatus: (messageId: string, status: 'delivered' | 'read') => void;
  getApiMessagesByConversation: (conversationId: string) => ApiMessage[];
  clearApiMessages: (conversationId: string) => void;
  setApiMessages: (conversationId: string, messages: ApiMessage[]) => void;
  updateConversation: (conversationId: string, updates: Partial<Conversation>) => void;
  updatePreference: (conversationId: string, userId: string, updates: Partial<UserConversationPreference>) => void;
  getMessagesByConversation: (conversationId: string) => Message[];
  initializeFromMockData: () => void;
  setUsers: (users: User[]) => void;
  setGroups: (groups: Group[]) => void;

  // Real conversation management
  setRealConversation: (chatId: string, data: { conversationId: string; type: 'DIRECT' | 'GROUP'; participantIds: string[] }) => void;
  getRealConversation: (chatId: string) => { conversationId: string; type: 'DIRECT' | 'GROUP'; participantIds: string[] } | undefined;

  // Enhanced actions
  sendMessage: (conversationId: string, text: string, senderId?: string, type?: 'text' | 'image' | 'file' | 'video' | 'audio') => void;
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
  apiMessages: [],
  conversations: [],
  preferences: [],
  users: [],
  groups: [],
  groupMembers: [],
  activeChat: null,
  realConversations: new Map(),

  // Basic setters
  setUsers: (users: User[]) => set({ users }),
  setGroups: (groups: Group[]) => set({ groups }),
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

  // Add a new message (mock format)
  addMessage: (message: Message) => {
    set((state) => ({
      messages: [...state.messages, message],
    }));
    mockMessages.push(message);
  },

  // Add a real API message
  addApiMessage: (message: ApiMessage) => {
    set((state) => {
      const exists = state.apiMessages.some(m => m.id === message.id);
      if (exists) return state;
      return { apiMessages: [...state.apiMessages, message] };
    });
  },

  // Remove an API message by id (e.g. placeholder with temp id when send completes)
  removeApiMessage: (messageId: string) => {
    set((state) => ({
      apiMessages: state.apiMessages.filter(m => m.id !== messageId),
    }));
  },

  updateApiMessageStatus: (messageId: string, status: 'delivered' | 'read') => {
    set((state) => ({
      apiMessages: state.apiMessages.map(m =>
        m.id === messageId ? { ...m, status } : m
      ),
    }));
  },

  getApiMessagesByConversation: (conversationId: string) => {
    const { apiMessages } = get();
    return apiMessages
      .filter(m => m.conversationId === conversationId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  },

  clearApiMessages: (conversationId: string) => {
    set((state) => ({
      apiMessages: state.apiMessages.filter(m => m.conversationId !== conversationId),
    }));
  },

  setApiMessages: (conversationId: string, messages: ApiMessage[]) => {
    set((state) => ({
      apiMessages: [
        ...state.apiMessages.filter(m => m.conversationId !== conversationId),
        ...messages,
      ],
    }));
  },

  // Real conversation management
  setRealConversation: (chatId, data) => {
    set((state) => {
      const newMap = new Map(state.realConversations);
      newMap.set(chatId, data);
      return { realConversations: newMap };
    });
  },

  getRealConversation: (chatId) => {
    return get().realConversations.get(chatId);
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
  sendMessage: (conversationId: string, text: string, senderId: string = 'current-user', type: 'text' | 'image' | 'file' | 'video' | 'audio' = 'text') => {
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