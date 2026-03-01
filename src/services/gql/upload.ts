import { gql } from '@apollo/client';

/**
 * Get a signed upload URL for a file.
 * category: 'avatar' | 'group_avatar' | 'chat'
 * Chat images use category 'chat'; backend must support this for messaging image uploads.
 */
export const GET_UPLOAD_URL = gql`
  query GetUploadUrl($contentType: String!, $category: String!) {
    getUploadUrl(contentType: $contentType, category: $category) {
      url
      publicUrl
      path
    }
  }
`;

export interface GetUploadUrlResponse {
  getUploadUrl: {
    url: string;
    publicUrl: string;
    path: string;
  };
}
