/**
 * @fileoverview Messaging-related type definitions for GraphQL operations.
 * Contains interfaces for conversations, messages, and real-time messaging.
 * @module services/gql/types/messaging
 */

// ============================================================================
// ENUMS
// ============================================================================

export type ConversationType = 'DIRECT' | 'GROUP';
export type MessageType = 'TEXT' | 'IMAGE' | 'FILE' | 'VIDEO' | 'AUDIO';
export type MessageStatus = 'SENT' | 'DELIVERED' | 'READ';

// ============================================================================
// MESSAGE TYPES
// ============================================================================

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  type: MessageType;
  content: string;
  mentions?: string[];
  replyToId?: string;
  mediaMetadata?: MediaMetadata;
  isEdited: boolean;
  createdAt: string;
  status: MessageStatus;
}

export interface MediaMetadata {
  fileId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  gcsPath: string;
  thumbnailGcsPath?: string;
  width?: number;
  height?: number;
  duration?: number;
}

export interface Conversation {
  id: string;
  type: ConversationType;
  groupId?: string;
  participantIds: string[];
  participantCount: number;
  lastMessageAt?: string;
  isActive: boolean;
  lastMessage?: Message;
}

// ============================================================================
// INPUT TYPES
// ============================================================================

export interface CreateConversationInput {
  type: ConversationType;
  participantIds: string[];
  groupId?: string;
}

export interface SendMessageInput {
  conversationId: string;
  type: MessageType;
  content: string;
  mentions?: string[];
  replyToId?: string;
  mediaMetadata?: MediaMetadataInput;
}

export interface MediaMetadataInput {
  fileId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  gcsPath: string;
  width?: number;
  height?: number;
  duration?: number;
}

export interface GetMessagesInput {
  conversationId: string;
  limit?: number;
  offset?: number;
}

// ============================================================================
// RESPONSE TYPES
// ============================================================================

// API returns a plain string (conversation ID)
export interface CreateConversationData {
  createConversation: string;
}

// API returns a plain string (message ID)
export interface SendMessageData {
  sendMessage: string;
}

// API returns a boolean
export interface MarkMessageAsReadData {
  markMessageAsRead: boolean;
}

export interface GetMessagesData {
  getMessages: {
    messages: Message[];
    total: number;
    hasMore: boolean;
  };
}

export interface GetConversationsData {
  getConversations: Conversation[];
}

// ============================================================================
// WEBSOCKET TYPES
// ============================================================================

export interface WebSocketMessage {
  conversationId: string;
  type: MessageType;
  content: string;
  mentions?: string[];
  replyToId?: string;
  metadata?: {
    fileId?: string;
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
    gcsPath?: string;
    width?: number;
    height?: number;
  };
}

export interface PresenceUpdate {
  userId: string;
  isOnline: boolean;
  timestamp: string;
}