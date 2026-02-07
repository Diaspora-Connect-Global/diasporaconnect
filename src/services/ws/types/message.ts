export interface MessageData {
  conversationId: string;
  encryptedData: {
    ciphertext: string;
    ephemeralKey: string;
  };
  type: 'text' | 'image' | 'video' | 'audio' | 'file';
  metadata?: {
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
    fileId?: string;
    key?: string;
  };
  replyToId?: string;
}

export interface IncomingMessage {
  messageId: string;
  conversationId: string;
  senderId: string;
  encryptedData: {
    ciphertext: string;
    ephemeralKey: string;
  };
  type: 'text' | 'image' | 'video' | 'audio' | 'file';
  timestamp: string;
  isOffline?: boolean;
  metadata?: {
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
    fileId?: string;
    key?: string;
  };
  replyToId?: string;
}

export interface MessageSentResponse {
  messageId: string;
  conversationId: string;
}

export interface DeliveryStatus {
  messageId: string;
  userId: string;
  status: 'delivered';
}

export interface ReadStatus {
  messageId: string;
  userId: string;
  status: 'read';
}

export interface PresenceResponse {
  userId: string;
  isOnline: boolean;
  lastSeen?: string;
}

export interface PresenceUpdate {
  userId: string;
  isOnline: boolean;
  timestamp?: string;
  lastSeen?: string;
}

export interface OnlineUsersResponse {
  onlineUsers: string[];
  count: number;
}

export interface MediaUploadRequest {
  conversationId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
}

export interface MediaUploadResponse {
  uploadUrl: string;
  fileId: string;
  key: string;
  expiresIn: number;
}

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
