/**
 * @fileoverview WebSocket message types for the message service.
 * These mirror the exact event payloads defined in the API spec.
 *
 * MessageType casing:
 *  - WebSocket (emit/listen):  lowercase ('text', 'image', etc.)
 *  - GraphQL (mutations/queries): uppercase ('TEXT', 'IMAGE', etc.)
 */

// ─── Emit Payloads (client → server) ────────────────────────────────────────

/** Optional metadata for media messages (IMAGE, VIDEO, FILE, AUDIO) */
export interface MessageSendMetadata {
  fileId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  gcsPath: string;
}

/** Emitted via 'message:send'. For media: upload first via media:request-upload-url, then send with metadata. */
export interface MessageData {
  conversationId: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'file';
  content: string;
  mentions?: string[];
  replyToId?: string;
  metadata?: MessageSendMetadata;
}

/** Emitted via 'message:delivered' */
export interface DeliveryEmit {
  messageId: string;
  userId: string;
  conversationId: string;
}

/** Emitted via 'message:read' */
export interface ReadEmit {
  messageId: string;
  userId: string;
  conversationId: string;
}

/** Emitted via 'media:request-upload-url' */
export interface MediaUploadRequest {
  conversationId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
}

// ─── Listen Payloads (server → client) ──────────────────────────────────────

/** Received via 'message:sent' */
export interface MessageSentResponse {
  messageId: string;
  conversationId: string;
}

/**
 * Received via 'message:new'.
 * The server encrypts content at rest; `encryptedData` is opaque here.
 * Fetch plaintext via GraphQL `getMessages`.
 */
export interface IncomingMessage {
  messageId: string;
  conversationId: string;
  senderId: string;
  encryptedData: unknown;
  type: 'text' | 'image' | 'video' | 'audio' | 'file';
  metadata?: MessageSendMetadata;
  replyToId?: string;
  timestamp: string;
  /** true when delivered on reconnect (offline queue) */
  isOffline?: boolean;
}

/** Received via 'message:delivery' */
export interface DeliveryStatus {
  messageId: string;
  userId: string;
  status: 'delivered';
}

/** Received via 'message:read' */
export interface ReadStatus {
  messageId: string;
  userId: string;
  status: 'read';
}

/** Received via 'media:upload-url' */
export interface MediaUploadResponse {
  uploadUrl: string;
  fileId: string;
  key: string;
  expiresIn: number;
}

/** Received via 'presence:update' */
export interface PresenceUpdate {
  userId: string;
  isOnline: boolean;
  lastSeen?: string;
}

/** Response when querying a single user's presence */
export interface PresenceResponse {
  userId: string;
  isOnline: boolean;
  lastSeen?: string;
}

/** Response from querying online users list */
export interface OnlineUsersResponse {
  onlineUsers: string[];
  count: number;
}

/** Received via 'pong' */
export interface PongResponse {
  timestamp: number;
}

// ─── Misc ───────────────────────────────────────────────────────────────────

/** Lowercase WS message type alias */
export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'file';

export type SupportedMimeType =
  // Images
  | 'image/jpeg'
  | 'image/png'
  | 'image/gif'
  | 'image/webp'
  // Videos
  | 'video/mp4'
  | 'video/quicktime'
  | 'video/x-msvideo'
  // Audio
  | 'audio/mpeg'
  | 'audio/mp4'
  | 'audio/aac'
  | 'audio/wav'
  // Documents
  | 'application/pdf'
  | 'application/msword'
  | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

export const SUPPORTED_MIME_TYPES: SupportedMimeType[] = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'audio/mpeg',
  'audio/mp4',
  'audio/aac',
  'audio/wav',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
