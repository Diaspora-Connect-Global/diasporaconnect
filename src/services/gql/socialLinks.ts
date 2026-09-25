import { gql } from '@apollo/client';

/**
 * Profile "Socials" tab. The gateway fields ship with the backend release; the
 * tab queries lazily (only when opened) and fails soft, so this file is safe
 * to ship before the backend.
 */

const SOCIAL_LINK_FIELDS = `
  id
  platform
  url
  handle
  status
  title
  imageUrl
  siteName
  checkedAt
`;

/** No userId → the caller's own links (every status). */
export const GET_SOCIAL_LINKS = gql`
  query SocialLinks($userId: ID) {
    socialLinks(userId: $userId) {
      ${SOCIAL_LINK_FIELDS}
    }
  }
`;

const RESULT_FIELDS = `
  success
  code
  message
  retryAt
  link {
    ${SOCIAL_LINK_FIELDS}
  }
`;

export const ADD_SOCIAL_LINK = gql`
  mutation AddSocialLink($platform: SocialPlatform!, $input: String!) {
    addSocialLink(platform: $platform, input: $input) {
      ${RESULT_FIELDS}
    }
  }
`;

export const UPDATE_SOCIAL_LINK = gql`
  mutation UpdateSocialLink($id: ID!, $input: String!) {
    updateSocialLink(id: $id, input: $input) {
      ${RESULT_FIELDS}
    }
  }
`;

export const REMOVE_SOCIAL_LINK = gql`
  mutation RemoveSocialLink($id: ID!) {
    removeSocialLink(id: $id) {
      ${RESULT_FIELDS}
    }
  }
`;

export const RECHECK_SOCIAL_LINK = gql`
  mutation RecheckSocialLink($id: ID!) {
    recheckSocialLink(id: $id) {
      ${RESULT_FIELDS}
    }
  }
`;
