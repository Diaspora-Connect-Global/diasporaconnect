import { gql } from '@apollo/client';

/**
 * Get a signed upload URL for a file.
 * category: 'avatar' | 'group_avatar' | 'chat'
 * Backend returns uploadUrl (PUT target) and publicUrl (use in message content).
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
    objectKey?: string;
    expiresAt?: string;
  };
}
