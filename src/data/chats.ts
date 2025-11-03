// Local Type Declarations
export type UserStatus = 'online' | 'offline' ;

export interface User {
  id: string;
  name: string;
  email: string;
  status: UserStatus;
  avatar: string;
  lastSeen: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  type: 'text' | 'image' | 'file';
  timestamp: string;
  status?: 'sent' | 'delivered' | 'read';
  imageUrl?:string
}

export interface MessageWithSender extends Message {
  sender?: User;
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  groupId?: string;
  createdAt: string;
  updatedAt: string;
}

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

export interface UserConversationPreference {
  id: string;
  userId: string;
  conversationId: string;
  unreadCount: number;
  isPinned: boolean;
  isMuted: boolean;
  lastReadMessageId?: string;
}

export interface ChatListItem {
  id: string;
  name: string;
  type: 'direct' | 'group';
  lastMessage: string;
  lastMessageTime: string;
  unread: number;
  online?: boolean;
  avatar: string;
  memberCount?: number;
}

// Primary Data Tables

export const mockUsers: User[] = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    status: 'online',
    avatar: 'JD',
    lastSeen: new Date().toISOString()
  },
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    status: 'online',
    avatar: 'JS',
    lastSeen: new Date().toISOString()
  },
  {
    id: '3',
    name: 'Mike Johnson',
    email: 'mike@example.com',
    status: 'offline',
    avatar: 'MJ',
    lastSeen: new Date(Date.now() - 1000 * 60 * 30).toISOString()
  },
  {
    id: '4',
    name: 'Sarah Wilson',
    email: 'sarah@example.com',
    status: 'offline',
    avatar: 'SW',
    lastSeen: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString()
  },
  {
    id: '5',
    name: 'David Brown',
    email: 'david@example.com',
    status: 'online',
    avatar: 'DB',
    lastSeen: new Date().toISOString()
  },
  {
    id: '6',
    name: 'Emily Davis',
    email: 'emily@example.com',
    status: 'online',
    avatar: 'ED',
    lastSeen: new Date().toISOString()
  },
  {
    id: '7',
    name: 'Alex Chen',
    email: 'alex@example.com',
    status: 'online',
    avatar: 'AC',
    lastSeen: new Date().toISOString()
  },
  {
    id: '8',
    name: 'Lisa Wang',
    email: 'lisa@example.com',
    status: 'offline',
    avatar: 'LW',
    lastSeen: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString()
  }
];


export const mockConversations: Conversation[] = [
  // Direct conversations
  { id: '1', type: 'direct', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(), updatedAt: new Date(Date.now() - 1000 * 60 * 5).toISOString() },
  { id: '2', type: 'direct', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(), updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() },
  { id: '3', type: 'direct', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(), updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString() },
  { id: '7', type: 'direct', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() },
  { id: '8', type: 'direct', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(), updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString() },
  
  // Group conversations
  { id: '4', type: 'group', groupId: '4', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(), updatedAt: new Date(Date.now() - 1000 * 60 * 10).toISOString() },
  { id: '5', type: 'group', groupId: '5', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60).toISOString(), updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString() },
  { id: '6', type: 'group', groupId: '6', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(), updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString() },
  { id: '9', type: 'group', groupId: '9', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 365).toISOString(), updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString() },
  { id: '10', type: 'group', groupId: '10', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 180).toISOString(), updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString() }
];

export const mockGroupMembers: GroupMember[] = [
  // Design Team (4) members
  { id: '1', groupId: '4', userId: '1', role: 'member', joinedAt: new Date().toISOString() },
  { id: '2', groupId: '4', userId: '3', role: 'admin', joinedAt: new Date().toISOString() },
  { id: '3', groupId: '4', userId: '4', role: 'owner', joinedAt: new Date().toISOString() },
  { id: '4', groupId: '4', userId: 'current-user', role: 'member', joinedAt: new Date().toISOString() },
  { id: '5', groupId: '4', userId: '6', role: 'member', joinedAt: new Date().toISOString() },
  { id: '21', groupId: '4', userId: '1', role: 'member', joinedAt: new Date().toISOString() },
  { id: '22', groupId: '4', userId: '3', role: 'admin', joinedAt: new Date().toISOString() },
  { id: '23', groupId: '4', userId: '4', role: 'owner', joinedAt: new Date().toISOString() },
  { id: '24', groupId: '4', userId: '6', role: 'member', joinedAt: new Date().toISOString() },

  // Project Alpha (5) members
  { id: '6', groupId: '5', userId: '3', role: 'owner', joinedAt: new Date().toISOString() },
  { id: '7', groupId: '5', userId: 'current-user', role: 'member', joinedAt: new Date().toISOString() },
  { id: '8', groupId: '5', userId: '2', role: 'admin', joinedAt: new Date().toISOString() },

  // Gaming Club (6) members
  { id: '9', groupId: '6', userId: '7', role: 'owner', joinedAt: new Date().toISOString() },
  { id: '10', groupId: '6', userId: 'current-user', role: 'admin', joinedAt: new Date().toISOString() },
  { id: '11', groupId: '6', userId: '4', role: 'member', joinedAt: new Date().toISOString() },
  { id: '12', groupId: '6', userId: '2', role: 'member', joinedAt: new Date().toISOString() },

  // Family Group (9) members
  { id: '13', groupId: '9', userId: '8', role: 'owner', joinedAt: new Date().toISOString() },
  { id: '14', groupId: '9', userId: 'current-user', role: 'member', joinedAt: new Date().toISOString() },

  // College Friends (10) members
  { id: '15', groupId: '10', userId: '1', role: 'owner', joinedAt: new Date().toISOString() },
  { id: '16', groupId: '10', userId: 'current-user', role: 'member', joinedAt: new Date().toISOString() },
  { id: '17', groupId: '10', userId: '3', role: 'member', joinedAt: new Date().toISOString() }
];
export const mockGroupsData: Group[] = [
  {
    id: '4',
    name: 'Design Team',
    description: 'UI/UX Design discussions',
    avatar: 'DT',
    createdBy: '4',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
    updatedAt: new Date().toISOString(),
    isPublic: true
  },
  {
    id: '5',
    name: 'Project Alpha',
    description: 'Project collaboration',
    avatar: 'PA',
    createdBy: '3',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60).toISOString(),
    updatedAt: new Date().toISOString(),
    isPublic: false
  },
  {
    id: '6',
    name: 'Gaming Club',
    description: 'Game nights and discussions',
    avatar: 'GC',
    createdBy: '7',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
    updatedAt: new Date().toISOString(),
    isPublic: true
  },
  {
    id: '9',
    name: 'Family Group',
    description: 'Family  and updates',
    avatar: 'FG',
    createdBy: '8',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 365).toISOString(),
    updatedAt: new Date().toISOString(),
    isPublic: false
  },
  {
    id: '10',
    name: 'College Friends',
    description: 'College buddies reunion',
    avatar: 'CF',
    createdBy: '1',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 180).toISOString(),
    updatedAt: new Date().toISOString(),
    isPublic: false
  }
];
export const mockMessages: Message[] = [
  // Direct Messages (1 - John Doe)
  { id: '1', conversationId: '1', senderId: '1', text: 'Hey there!', type: 'text', timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString() },
  { id: '2', conversationId: '1', senderId: 'current-user', text: 'Hello! How are you doing?', type: 'text', timestamp: new Date(Date.now() - 1000 * 60 * 8).toISOString() },
  { id: '3', conversationId: '1', senderId: '1', text: 'I\'m good, just working on some projects. How about you?', type: 'text', timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString() },

  // Direct Messages (2 - Jane Smith)
  { id: '4', conversationId: '2', senderId: '2', text: 'Meeting scheduled for tomorrow at 10 AM', type: 'text', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() },
  { id: '5', conversationId: '2', senderId: 'current-user', text: 'Got it, I\'ll be there!', type: 'text', timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString() },

  // Direct Messages (3 - Mike Johnson)
  { id: '6', conversationId: '3', senderId: '3', text: 'Thanks for helping me with the project!', type: 'text', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString() },
  { id: '7', conversationId: '3', senderId: 'current-user', text: 'No problem, happy to help!', type: 'text', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() },
  { id: '8', conversationId: '3', senderId: 'current-user', text: 'Let me know if you need anything else', type: 'text', timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString() },

  // Direct Messages (7 - Sarah Wilson)
  { id: '9', conversationId: '7', senderId: '4', text: 'See you at the party tonight!', type: 'text', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() },

  // Direct Messages (8 - Alex Brown)
  { id: '10', conversationId: '8', senderId: '7', text: 'The project is finally completed!', type: 'text', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString() },

  // Group Messages (4 - Design Team)
  { id: '11', conversationId: '4', senderId: '4', text: 'Final designs are ready for review', type: 'text', timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString() },
  { id: '12', conversationId: '4', senderId: '3', text: 'Great work Sarah!', type: 'text', timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString() },
  { id: '13', conversationId: '4', senderId: 'current-user', text: 'I\'ll review them this afternoon', type: 'text', timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString() },

  // Group Messages (5 - Project Alpha)
  { id: '14', conversationId: '5', senderId: '3', text: 'Deadline has been updated to Friday', type: 'text', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString() },
  { id: '15', conversationId: '5', senderId: 'current-user', text: 'Thanks for the update!', type: 'text', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() },

  // Group Messages (6 - Gaming Club)
  { id: '16', conversationId: '6', senderId: '7', text: 'Game night this Friday at 7 PM!', type: 'text', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString() },
  { id: '17', conversationId: '6', senderId: 'current-user', text: 'Count me in!', type: 'text', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() },
  { id: '18', conversationId: '6', senderId: '4', text: 'I\'ll bring the snacks!', type: 'text', timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString() },

  // Group Messages (9 - Family Group)
  { id: '19', conversationId: '9', senderId: '8', text: 'Happy birthday! everyone 🎉', type: 'text', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString() },
  { id: '20', conversationId: '9', senderId: 'current-user', text: 'Thank you everyone!', type: 'text', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString() },

  // Group Messages (10 - College Friends)
  { id: '21', conversationId: '10', senderId: '1', text: 'Reunion next month - who\'s coming?', type: 'text', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString() }
];

export const mockUserConversationPreferences: UserConversationPreference[] = [
  // Direct conversations
  { id: '1', userId: 'current-user', conversationId: '1', unreadCount: 2, isPinned: true, isMuted: false },
  { id: '2', userId: 'current-user', conversationId: '2', unreadCount: 0, isPinned: false, isMuted: false },
  { id: '3', userId: 'current-user', conversationId: '3', unreadCount: 99, isPinned: true, isMuted: false },
  { id: '7', userId: 'current-user', conversationId: '7', unreadCount: 0, isPinned: false, isMuted: false },
  { id: '8', userId: 'current-user', conversationId: '8', unreadCount: 0, isPinned: false, isMuted: false },

  // Group conversations
  { id: '4', userId: 'current-user', conversationId: '4', unreadCount: 5, isPinned: true, isMuted: false },
  { id: '5', userId: 'current-user', conversationId: '5', unreadCount: 0, isPinned: false, isMuted: false },
  { id: '6', userId: 'current-user', conversationId: '6', unreadCount: 3, isPinned: true, isMuted: false },
  { id: '9', userId: 'current-user', conversationId: '9', unreadCount: 1, isPinned: false, isMuted: false },
  { id: '10', userId: 'current-user', conversationId: '10', unreadCount: 0, isPinned: false, isMuted: false }
];

export const mockChatMessages: Record<string, MessageWithSender[]> = {};




export const chatService = {
  getDirectMessages: (): ChatListItem[] => {
    return mockConversations
      .filter(conv => conv.type === 'direct')
      .map(conv => {
        const messages = mockMessages.filter(m => m.conversationId === conv.id);
        const lastMessage = messages[messages.length - 1];
        const preferences = mockUserConversationPreferences.find(p => p.conversationId === conv.id);
        const user = mockUsers.find(u => u.id === conv.id);

        return {
          id: conv.id,
          name: user?.name || 'Unknown User',
          type: 'direct',
          lastMessage: lastMessage?.text || 'No messages yet',
          lastMessageTime: lastMessage?.timestamp || conv.createdAt,
          unread: preferences?.unreadCount || 0,
          online: user?.status === 'online',
          avatar: user?.avatar || 'UU'
        };
      });
  },

  getGroups: (): ChatListItem[] => {
    return mockConversations
      .filter(conv => conv.type === 'group')
      .map(conv => {
        const messages = mockMessages.filter(m => m.conversationId === conv.id);
        const lastMessage = messages[messages.length - 1];
        const preferences = mockUserConversationPreferences.find(p => p.conversationId === conv.id);
        const group = mockGroupsData.find(g => g.id === conv.groupId); // Use mockGroupsData here
        const memberCount = mockGroupMembers.filter(m => m.groupId === conv.groupId).length;

        return {
          id: conv.id,
          name: group?.name || 'Unknown Group',
          type: 'group',
          lastMessage: lastMessage?.text || 'No messages yet',
          lastMessageTime: lastMessage?.timestamp || conv.createdAt,
          unread: preferences?.unreadCount || 0,
          memberCount,
          avatar: group?.avatar || 'UG'
        };
      });
  },

  getMessagesByConversationId: (conversationId: string) => {
    return mockMessages
      .filter(message => message.conversationId === conversationId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .map(message => ({
        ...message,
        sender: mockUsers.find(u => u.id === message.senderId)
      }));
  }
};

// Keep the existing exports for compatibility
export const mockDirectMessages: ChatListItem[] = chatService.getDirectMessages();
export const mockGroups: ChatListItem[] = chatService.getGroups();
// Initialize mockChatMessages from your existing data
mockConversations.forEach(conv => {
  mockChatMessages[conv.id] = chatService.getMessagesByConversationId(conv.id) as MessageWithSender[];
});
