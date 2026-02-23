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

// Returns: String (message ID)
export const SEND_MESSAGE = gql`
  mutation SendMessage(
    $conversationId: String!
    $messageType: String!
    $content: String!
    $mentions: [String]
    $replyToId: String
  ) {
    sendMessage(
      conversationId: $conversationId
      messageType: $messageType
      content: $content
      mentions: $mentions
      replyToId: $replyToId
    )
  }
`;

// Returns: Boolean
export const MARK_MESSAGE_AS_READ = gql`
  mutation MarkMessageAsRead($messageId: String!) {
    markMessageAsRead(messageId: $messageId)
  }
`;
