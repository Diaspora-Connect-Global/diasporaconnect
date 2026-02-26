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

export interface MessageMention {
  userId: string;
  username: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  type: MessageType;
  content: string;
  mentions?: MessageMention[];
  replyToId?: string;
  mediaMetadata?: MediaMetadata;
  isEdited: boolean;
  editedAt?: string;
  isDeleted: boolean;
  createdAt: string;
  status?: MessageStatus;
}

export interface MediaMetadata {
  fileName: string;
  fileSize: number;
  mimeType: string;
  gcsPath: string;
  // Extended fields (may be present)
  fileId?: string;
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
  lastMessage?: Pick<Message, 'id' | 'senderId' | 'type' | 'content' | 'createdAt'>;
  unreadCount?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastMessageAt?: string;
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

export type GQLConversationVariables = {
  conversationId: string;
};

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

// API returns a boolean — resets unread badge for the conversation
export interface MarkConversationAsReadData {
  markConversationAsRead: boolean;
}

// API returns a boolean (per-message)
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

export type GQLConversationResponse = {
  getConversation: {
    id: string;
    type: string;
    groupId?: string | null;
    participantIds: string[];
    participantCount: number;
    createdAt: string;
    updatedAt: string;
    lastMessageAt?: string | null;
    isActive: boolean;
  } | null;
};

// ============================================================================
// WEBSOCKET TYPES
// ============================================================================

/** Payload emitted via 'message:send' WebSocket event */
export interface WebSocketSendPayload {
  conversationId: string;
  type: 'text' | 'image' | 'file' | 'video' | 'audio'; // lowercase for WS
  content: string;
  mentions?: string[];
  replyToId?: string;
  metadata?: { fileId: string; fileName: string; fileSize: number; mimeType: string; gcsPath: string };
}

/** Payload received via 'message:new' WebSocket event */
export interface WebSocketMessage {
  messageId: string;
  conversationId: string;
  senderId: string;
  encryptedData: unknown; // Server encrypts; use GraphQL for plaintext content
  type: 'text' | 'image' | 'file' | 'video' | 'audio';
  metadata?: { fileId?: string; fileName?: string; fileSize?: number; mimeType?: string; gcsPath?: string };
  replyToId?: string;
  timestamp: string;
  isOffline?: boolean;
}

export interface PresenceUpdate {
  userId: string;
  isOnline: boolean;
  lastSeen?: string;
}