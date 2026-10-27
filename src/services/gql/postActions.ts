import { gql } from '@apollo/client';

/**
 * Actions a viewer can take on someone else's post: hide it ("not interested"),
 * report it, and act on the author — unfriend / unfollow a person, leave a
 * community or association. Unfriend uses REMOVE_FRIEND (./connection) and leave
 * uses LEAVE_COMMUNITY / LEAVE_ASSOCIATION; membership is read with
 * GET_MY_MEMBERSHIPS_COMMUNITY (./community).
 */

/** Hides the post for the viewer in every feed; the ranker also learns "see less". */
export const HIDE_POST = gql`
  mutation HidePost($id: String!) {
    hidePost(id: $id) {
      success
    }
  }
`;

export const REPORT_POST = gql`
  mutation ReportPost($input: ReportPostInput!) {
    reportPost(input: $input) {
      success
    }
  }
`;

export const UNFOLLOW_USER = gql`
  mutation UnfollowUser($userId: String!) {
    unfollowUser(userId: $userId) {
      success
      message
    }
  }
`;

/**
 * The viewer's relationship to a post's author, loaded only when the menu
 * opens. `connectionId` is what REMOVE_FRIEND needs; it is never shown.
 */
export const GET_POST_AUTHOR_RELATION = gql`
  query GetPostAuthorRelation($userId: String!) {
    getProfile(userId: $userId) {
      success
      connectionStatus
      connectionId
    }
    isFollowing(userId: $userId) {
      success
      isFollowing
    }
  }
`;

export interface PostAuthorRelationData {
  getProfile?: { success: boolean; connectionStatus?: string | null; connectionId?: string | null } | null;
  isFollowing?: { success: boolean; isFollowing: boolean } | null;
}

export const POST_REPORT_REASONS = [
  'SPAM',
  'HARASSMENT',
  'HATE_SPEECH',
  'VIOLENCE',
  'NUDITY',
  'MISINFORMATION',
  'SCAM',
  'OTHER',
] as const;
export type PostReportReason = (typeof POST_REPORT_REASONS)[number];

export const POST_REPORT_DETAILS_MAX = 500;
