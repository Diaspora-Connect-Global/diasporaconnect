import { gql } from '@apollo/client';

/**
 * getUploadUrl media upload flow (see docs/FRONTEND_UPLOAD_FLOW.md):
 * 1. Request signed URL with this query (Bearer required).
 * 2. PUT the file to `uploadUrl` with header Content-Type matching `contentType` (no Authorization).
 * 3. Use `publicUrl` in your payload (e.g. message content, post media).
 *
 * Backend returns: uploadUrl (PUT target), publicUrl (readable after upload), objectKey (GCS path), expiresAt (Unix ms; signed URL typically valid 60 min).
 */
export const GET_UPLOAD_URL = gql`
  query GetUploadUrl($contentType: String!, $category: String!) {
    getUploadUrl(contentType: $contentType, category: $category) {
      uploadUrl
      publicUrl
      objectKey
      expiresAt
    }
  }
`;

export interface GetUploadUrlResponse {
  getUploadUrl: {
    uploadUrl: string;
    publicUrl: string;
    objectKey: string;
    /** Unix timestamp in milliseconds when the signed URL expires (number, not ISO string). */
    expiresAt: number;
  };
}

/** Categories supported by getUploadUrl (backend may support more). */
export type UploadCategory =
  | 'chat'
  | 'avatar'
  | 'cover'
  | 'group_avatar'
  | 'community_avatar'
  | 'community_cover'
  | 'association_avatar'
  | 'event_cover'
  | 'event_media';

/**
 * Allowed MIME types for category "chat" (see docs/FRONTEND_UPLOAD_FLOW.md).
 * Use with chatMediaContentType(file.type) so getUploadUrl and PUT header use an allowed type.
 */
export const CHAT_MEDIA_CONTENT_TYPES: readonly string[] = [
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  // Video
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/webm',
  // Audio
  'audio/mpeg',
  'audio/mp4',
  'audio/aac',
  'audio/wav',
  'audio/ogg',
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.ms-excel',                                              // .xls
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',     // .xlsx
  'application/vnd.ms-powerpoint',                                         // .ppt
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  // Text
  'text/plain',
  'text/csv',
];

/** Content types allowed for category "chat" (images only). Prefer CHAT_MEDIA_CONTENT_TYPES for full list. */
export const CHAT_IMAGE_CONTENT_TYPES = CHAT_MEDIA_CONTENT_TYPES.filter((t) =>
  t.startsWith('image/')
) as readonly string[];

const CHAT_MEDIA_SET = new Set<string>(CHAT_MEDIA_CONTENT_TYPES);

/**
 * Content type for chat media upload. Must match between getUploadUrl and PUT headers.
 * Returns fileType if it's in the allowed list for category "chat", otherwise a fallback.
 */
export function chatMediaContentType(fileType: string): string {
  if (!fileType) return 'application/octet-stream';
  return CHAT_MEDIA_SET.has(fileType) ? fileType : 'application/octet-stream';
}

/** @deprecated Use chatMediaContentType for all chat uploads (supports images, video, audio, documents, text). */
export function chatImageContentType(fileType: string): string {
  if (!fileType) return 'image/jpeg';
  return CHAT_MEDIA_SET.has(fileType) ? fileType : 'image/jpeg';
}
