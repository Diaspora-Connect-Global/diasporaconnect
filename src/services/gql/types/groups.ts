/**
 * @fileoverview Group-related type definitions for GraphQL operations.
 * Contains interfaces for group management, membership, and invitations.
 * @module services/gql/types/groups
 */

import type { Profile } from './profile';

// ============================================================================
// GROUP ENUMS
// ============================================================================

/**
 * Privacy levels for groups.
 *
 * @enum GroupPrivacy
 * @property {string} PUBLIC - Anyone can see and join the group
 * @property {string} PRIVATE - Group is hidden and requires invitation/approval
 */
export enum GroupPrivacy {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
}

/**
 * Roles that members can have within a group.
 *
 * @enum MemberRole
 * @property {string} OWNER - Group creator with full control
 * @property {string} ADMIN - Can manage members and content
 * @property {string} MODERATOR - Can moderate content
 * @property {string} MEMBER - Regular member with basic access
 */
export enum MemberRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MODERATOR = 'MODERATOR',
  MEMBER = 'MEMBER',
}

/**
 * Status of a member within a group.
 *
 * @enum MemberStatus
 * @property {string} ACTIVE - Member is active and in good standing
 * @property {string} PENDING - Member is awaiting approval
 * @property {string} BANNED - Member has been banned from the group
 */
export enum MemberStatus {
  ACTIVE = 'ACTIVE',
  PENDING = 'PENDING',
  BANNED = 'BANNED',
}

// ============================================================================
// GROUP ENTITY TYPES
// ============================================================================

/**
 * Represents a group/community.
 *
 * @interface Group
 * @property {string} id - Unique group identifier
 * @property {string} name - Group name
 * @property {string} [description] - Group description
 * @property {string} [avatarUrl] - URL to group avatar/logo
 * @property {GroupPrivacy} privacy - Group privacy setting
 * @property {number} [maxMembers] - Maximum allowed members
 * @property {number} memberCount - Current number of members
 * @property {string} ownerId - ID of the group owner
 * @property {string} createdAt - ISO timestamp when group was created
 * @property {string} updatedAt - ISO timestamp when group was last updated
 *
 * @example
 * ```typescript
 * const group: Group = {
 *   id: "group-uuid",
 *   name: "Tech Innovators",
 *   description: "A community for tech enthusiasts",
 *   avatarUrl: "https://example.com/avatar.jpg",
 *   privacy: GroupPrivacy.PUBLIC,
 *   maxMembers: 500,
 *   memberCount: 150,
 *   ownerId: "user-uuid",
 *   createdAt: "2024-01-15T10:00:00Z",
 *   updatedAt: "2024-01-20T15:30:00Z"
 * };
 * ```
 */
export interface Group {
  id: string;
  name: string;
  description?: string;
  avatarUrl?: string;
  privacy: GroupPrivacy;
  maxMembers?: number;
  memberCount: number;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Represents a member of a group.
 *
 * @interface GroupMember
 * @property {Profile} profile - Member's user profile
 * @property {string} id - Unique membership identifier
 * @property {string} groupId - ID of the group
 * @property {string} userId - ID of the user
 * @property {MemberRole} role - Member's role in the group
 * @property {MemberStatus} status - Member's status
 * @property {string} [joinedAt] - ISO timestamp when member joined
 * @property {string} createdAt - ISO timestamp when membership was created
 */
export interface GroupMember {
  profile: Profile;
  id: string;
  groupId: string;
  userId: string;
  role: MemberRole;
  status: MemberStatus;
  joinedAt?: string;
  createdAt: string;
}

/**
 * Represents an invitation to join a group.
 *
 * @interface GroupInvitation
 * @property {string} id - Unique invitation identifier
 * @property {string} groupId - ID of the group
 * @property {string} invitedBy - ID of the user who sent the invitation
 * @property {string} invitedUserId - ID of the invited user
 * @property {string} status - Invitation status (pending, accepted, declined)
 * @property {string} [expiresAt] - ISO timestamp when invitation expires
 * @property {string} createdAt - ISO timestamp when invitation was created
 */
export interface GroupInvitation {
  id: string;
  groupId: string;
  invitedBy: string;
  invitedUserId: string;
  status: string;
  expiresAt?: string;
  createdAt: string;
}

/**
 * Represents a request to join a private group.
 *
 * @interface JoinRequest
 * @property {string} id - Unique request identifier
 * @property {string} groupId - ID of the group
 * @property {string} userId - ID of the requesting user
 * @property {string} status - Request status (pending, approved, rejected)
 * @property {string} [message] - Optional message from the requester
 * @property {string} createdAt - ISO timestamp when request was created
 */
export interface JoinRequest {
  id: string;
  groupId: string;
  userId: string;
  status: string;
  message?: string;
  createdAt: string;
}

// ============================================================================
// GROUP INPUT TYPES
// ============================================================================

/**
 * Input for creating a new group.
 *
 * @interface CreateGroupInput
 * @property {string} name - Name for the group
 * @property {string} [description] - Optional description
 * @property {string} [avatarUrl] - Optional avatar URL
 * @property {GroupPrivacy} privacy - Privacy setting for the group
 * @property {number} [maxMembers] - Optional maximum member limit
 * @property {string[]} [memberIds] - Optional initial member IDs to invite
 *
 * @example
 * ```typescript
 * const input: CreateGroupInput = {
 *   name: "Tech Innovators",
 *   description: "A community for tech enthusiasts",
 *   privacy: GroupPrivacy.PUBLIC,
 *   maxMembers: 500
 * };
 * ```
 */
export interface CreateGroupInput {
  name: string;
  description?: string;
  avatarUrl?: string;
  privacy: GroupPrivacy;
  maxMembers?: number;
  memberIds?: string[];
}

/**
 * Input for updating an existing group.
 *
 * @interface UpdateGroupInput
 * @property {string} groupId - ID of the group to update
 * @property {string} [name] - Updated name
 * @property {string} [description] - Updated description
 * @property {string} [avatarUrl] - Updated avatar URL
 * @property {GroupPrivacy} [privacy] - Updated privacy setting
 */
export interface UpdateGroupInput {
  groupId: string;
  name?: string;
  description?: string;
  avatarUrl?: string;
  privacy?: GroupPrivacy;
}

/**
 * Input for requesting to join a private group.
 *
 * @interface RequestToJoinInput
 * @property {string} groupId - ID of the group to join
 * @property {string} [message] - Optional message to include with request
 */
export interface RequestToJoinInput {
  groupId: string;
  message?: string;
}

/**
 * Input for updating a member's role.
 *
 * @interface UpdateMemberRoleInput
 * @property {string} groupId - ID of the group
 * @property {string} userId - ID of the member
 * @property {MemberRole} role - New role to assign
 */
export interface UpdateMemberRoleInput {
  groupId: string;
  userId: string;
  role: MemberRole;
}

/**
 * Input for removing a member from a group.
 *
 * @interface RemoveMemberInput
 * @property {string} groupId - ID of the group
 * @property {string} userId - ID of the member to remove
 */
export interface RemoveMemberInput {
  groupId: string;
  userId: string;
}

/**
 * Input for inviting a user to a group.
 *
 * @interface InviteToGroupInput
 * @property {string} groupId - ID of the group
 * @property {string} invitedUserId - ID of the user to invite
 */
export interface InviteToGroupInput {
  groupId: string;
  invitedUserId: string;
}

/**
 * Input for directly adding a member to a group (OWNER/ADMIN only).
 *
 * @interface AddMemberInput
 * @property {string} groupId - ID of the group
 * @property {string} userId - ID of the user to add
 * @property {MemberRole} [role] - Optional role: MEMBER | MODERATOR | ADMIN (default MEMBER)
 */
export interface AddMemberInput {
  groupId: string;
  userId: string;
  role?: MemberRole;
}

/**
 * Input for transferring group ownership (OWNER only). Previous owner becomes ADMIN.
 *
 * @interface TransferGroupOwnershipInput
 * @property {string} groupId - ID of the group
 * @property {string} newOwnerId - ID of the new owner
 */
export interface TransferGroupOwnershipInput {
  groupId: string;
  newOwnerId: string;
}

// ============================================================================
// GROUP RESPONSE TYPES
// ============================================================================

/**
 * Response from getting a single group.
 *
 * @interface GetGroupResponse
 */
export interface GetGroupResponse {
  getGroup: {
    success: boolean;
    message?: string;
    group: Group;
  };
}

/**
 * Response from getting user's groups.
 *
 * @interface GetMyGroupsResponse
 */
export interface GetMyGroupsResponse {
  getMyGroups: {
    success: boolean;
    message?: string;
    total: number;
    groups: Group[];
  };
}

/**
 * Response from searching groups.
 *
 * @interface SearchGroupsResponse
 */
export interface SearchGroupsResponse {
  searchGroups: {
    success: boolean;
    message?: string;
    total: number;
    groups: Group[];
  };
}

/**
 * Response from getting group members.
 *
 * @interface GetGroupMembersResponse
 */
export interface GetGroupMembersResponse {
  getGroupMembers: {
    success: boolean;
    message?: string;
    total: number;
    /** Backend pagination flag: more rows exist beyond the current page. */
    hasMore?: boolean;
    members: GroupMember[];
  };
}

/**
 * Response from checking group membership.
 *
 * @interface CheckGroupMembershipResponse
 */
export interface CheckGroupMembershipResponse {
  checkGroupMembership: {
    isMember: boolean;
    role?: MemberRole;
    status?: MemberStatus;
  };
}

/**
 * Response from creating a group.
 *
 * @interface CreateGroupResponse
 */
export interface CreateGroupResponse {
  createGroup: {
    success: boolean;
    message?: string;
    group: Group;
  };
}

/**
 * Response from updating a group.
 *
 * @interface UpdateGroupResponse
 */
export interface UpdateGroupResponse {
  updateGroup: {
    success: boolean;
    message?: string;
    group: Group;
  };
}

/**
 * Response from deleting a group.
 *
 * @interface DeleteGroupResponse
 */
export interface DeleteGroupResponse {
  deleteGroup: {
    success: boolean;
    message?: string;
  };
}

/**
 * Response from joining a group.
 *
 * @interface JoinGroupResponse
 */
export interface JoinGroupResponse {
  joinGroup: {
    success: boolean;
    message?: string;
    member: GroupMember;
  };
}

/**
 * Response from leaving a group.
 *
 * @interface LeaveGroupResponse
 */
export interface LeaveGroupResponse {
  leaveGroup: {
    success: boolean;
    message?: string;
  };
}

/**
 * Response from requesting to join a group.
 *
 * @interface RequestToJoinGroupResponse
 */
export interface RequestToJoinGroupResponse {
  requestToJoinGroup: {
    success: boolean;
    message?: string;
    request: JoinRequest;
  };
}

/**
 * Response from updating a member's role.
 *
 * @interface UpdateMemberRoleResponse
 */
export interface UpdateMemberRoleResponse {
  updateMemberRole: {
    success: boolean;
    message?: string;
    member: GroupMember;
  };
}

/**
 * Response from removing a member.
 *
 * @interface RemoveMemberResponse
 */
export interface RemoveMemberResponse {
  removeGroupMember: {
    success: boolean;
    message?: string;
  };
}

/**
 * Response from inviting a user to a group.
 *
 * @interface InviteToGroupResponse
 */
export interface InviteToGroupResponse {
  inviteToGroup: {
    success: boolean;
    message?: string;
    invitation: GroupInvitation;
  };
}

/**
 * Response from adding a member to a group.
 *
 * @interface AddMemberResponse
 */
export interface AddMemberResponse {
  addMember: {
    success: boolean;
    message?: string;
    member?: { userId: string; role: MemberRole; status: string };
  };
}

/**
 * Response from transferring group ownership.
 *
 * @interface TransferGroupOwnershipResponse
 */
export interface TransferGroupOwnershipResponse {
  transferGroupOwnership: {
    success: boolean;
    message?: string;
    previousOwner?: { userId: string; role: string };
    newOwner?: { userId: string; role: string };
  };
}

/**
 * Response from accepting a group invitation.
 *
 * @interface AcceptGroupInvitationResponse
 */
export interface AcceptGroupInvitationResponse {
  acceptGroupInvitation: {
    success: boolean;
    message?: string;
    member: GroupMember;
  };
}

/**
 * Response from declining a group invitation.
 *
 * @interface DeclineGroupInvitationResponse
 */
export interface DeclineGroupInvitationResponse {
  declineGroupInvitation: {
    success: boolean;
    message?: string;
  };
}
