import { gql } from '@apollo/client';

// Re-export types
export type {
  Message,
  Conversation,
  ConversationType,
  MessageType,
  MessageStatus,
  CreateConversationInput,
  SendMessageInput,
  GetMessagesInput,
  CreateConversationData,
  SendMessageData,
  GetMessagesData,
  GetConversationsData,
  MarkConversationAsReadData,
  GQLConversationResponse,
  GQLConversationVariables,
  WebSocketMessage,
  PresenceUpdate,
  MediaMetadata,
  MediaMetadataInput
} from './types/messaging';

// ============================================================================
// QUERIES
// ============================================================================

export const GET_CONVERSATIONS = gql`
  query GetConversations($limit: Int, $offset: Int) {
    getConversations(limit: $limit, offset: $offset) {
      id
      type
      groupId
      participantIds
      participantCount
      lastMessage {
        id
        senderId
        type
        content
        createdAt
      }
      unreadCount
      isActive
      lastMessageAt
      createdAt
      updatedAt
    }
  }
`;

export const GET_MESSAGES = gql`
  query GetMessages($conversationId: String!, $limit: Int, $offset: Int) {
    getMessages(conversationId: $conversationId, limit: $limit, offset: $offset) {
      messages {
        id
        conversationId
        senderId
        type
        content
        mentions {
          userId
          username
        }
        replyToId
        mediaMetadata {
          fileName
          fileSize
          mimeType
          gcsPath
        }
        isEdited
        editedAt
        isDeleted
        createdAt
      }
      total
      hasMore
    }
  }
`;

export const GET_CONVERSATION_DETAILS = gql`
  query GetConversationDetails($conversationId: ID!) {
    getConversation(conversationId: $conversationId) {
      id
      type
      groupId
      participantIds
      participantCount
      createdAt
      updatedAt
      lastMessageAt
      isActive
    }
  }
`;

// ============================================================================
// MUTATIONS — Flat arguments matching the actual API
// ============================================================================

// Returns: String (conversation ID)
export const CREATE_CONVERSATION = gql`
  mutation CreateConversation(
    $type: String!
    $participantIds: [String!]!
    $groupId: String
  ) {
    createConversation(
      type: $type
      participantIds: $participantIds
      groupId: $groupId
    )
  }
`;

// Returns: String (message ID). idempotencyKey optional — same key on retry/double-send avoids duplicates.
export const SEND_MESSAGE = gql`
  mutation SendMessage(
    $conversationId: String!
    $messageType: String!
    $content: String!
    $mentions: [String!]
    $replyToId: String
    $idempotencyKey: String
  ) {
    sendMessage(
      conversationId: $conversationId
      messageType: $messageType
      content: $content
      mentions: $mentions
      replyToId: $replyToId
      idempotencyKey: $idempotencyKey
    )
  }
`;

// Returns: Boolean — call when user opens a conversation to reset badge count
export const MARK_CONVERSATION_AS_READ = gql`
  mutation MarkConversationAsRead($conversationId: ID!) {
    markConversationAsRead(conversationId: $conversationId)
  }
`;

// Returns: Boolean (per-message granularity)
export const MARK_MESSAGE_AS_READ = gql`
  mutation MarkMessageAsRead($messageId: String!) {
    markMessageAsRead(messageId: $messageId)
  }
`;
