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
  WebSocketMessage,
  PresenceUpdate,
  MediaMetadata,
  MediaMetadataInput
} from './types/messaging';

// ============================================================================
// QUERIES
// ============================================================================

export const GET_CONVERSATIONS = gql`
  query GetConversations {
    getConversations {
      id
      type
      groupId
      participantIds
      participantCount
      lastMessageAt
      isActive
      lastMessage {
        id
        content
        senderId
        type
        createdAt
      }
    }
  }
`;

export const GET_MESSAGES = gql`
  query GetMessages($input: GetMessagesInput!) {
    getMessages(input: $input) {
      messages {
        id
        conversationId
        senderId
        type
        content
        mentions
        replyToId
        mediaMetadata {
          fileId
          fileName
          fileSize
          mimeType
          gcsPath
          width
          height
          duration
        }
        isEdited
        createdAt
        status
      }
      total
      hasMore
    }
  }
`;

export const GET_CONVERSATION_DETAILS = gql`
  query GetConversationDetails($conversationId: ID!) {
    getConversation(id: $conversationId) {
      id
      type
      groupId
      participantIds
      participantCount
      lastMessageAt
      isActive
    }
  }
`;

// ============================================================================
// MUTATIONS
// ============================================================================

export const CREATE_CONVERSATION = gql`
  mutation CreateConversation($input: CreateConversationInput!) {
    createConversation(input: $input) {
      id
      type
      groupId
      participantIds
      participantCount
      isActive
    }
  }
`;

export const SEND_MESSAGE = gql`
  mutation SendMessage($input: SendMessageInput!) {
    sendMessage(input: $input) {
      id
      conversationId
      senderId
      type
      content
      mentions
      replyToId
      mediaMetadata {
        fileId
        fileName
        fileSize
        mimeType
        gcsPath
        width
        height
        duration
      }
      isEdited
      createdAt
      status
    }
  }
`;

export const MARK_MESSAGE_AS_READ = gql`
  mutation MarkMessageAsRead($messageId: ID!) {
    markMessageAsRead(messageId: $messageId) {
      success
    }
  }
`;