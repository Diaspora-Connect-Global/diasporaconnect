import { gql } from '@apollo/client';
import type { Profile } from './types';

// Re-export enums (runtime values) and types separately
export { GroupPrivacy, MemberRole, MemberStatus } from './types';
export type {
  Group,
  GroupMember,
  GroupInvitation,
  JoinRequest,
  CreateGroupInput,
  UpdateGroupInput,
  RequestToJoinInput,
  UpdateMemberRoleInput,
  RemoveMemberInput,
  InviteToGroupInput,
  AddMemberInput,
  TransferGroupOwnershipInput,
  GetGroupResponse,
  GetMyGroupsResponse,
  SearchGroupsResponse,
  GetGroupMembersResponse,
  CheckGroupMembershipResponse,
  CreateGroupResponse,
  UpdateGroupResponse,
  DeleteGroupResponse,
  JoinGroupResponse,
  LeaveGroupResponse,
  RequestToJoinGroupResponse,
  UpdateMemberRoleResponse,
  RemoveMemberResponse,
  InviteToGroupResponse,
  AddMemberResponse,
  TransferGroupOwnershipResponse,
  AcceptGroupInvitationResponse,
  DeclineGroupInvitationResponse,
} from './types';

// ============================================================================
// GROUP QUERIES
// ============================================================================

/**
 * Get a specific group by ID.
 * 
 * @example
 * ```typescript
 * const { data } = useQuery<GetGroupResponse>(GET_GROUP, {
 *   variables: { groupId: "group-uuid-here" }
 * });
 * ```
 */
export const GET_GROUP = gql`
  query GetGroup($groupId: ID!) {
    getGroup(groupId: $groupId) {
      success
      message
      group {
        id
        name
        description
        avatarUrl
        privacy
        maxMembers
        memberCount
        ownerId
        createdAt
        updatedAt
      }
    }
  }
`;

/**
 * Get all groups the current user is a member of.
 * 
 * @example
 * ```typescript
 * const { data } = useQuery<GetMyGroupsResponse>(GET_MY_GROUPS, {
 *   variables: { limit: 20, offset: 0 }
 * });
 * ```
 */
export const GET_MY_GROUPS = gql`
  query GetMyGroups($limit: Int, $offset: Int) {
    getMyGroups(limit: $limit, offset: $offset) {
      success
      message
      total
      groups {
        id
        name
        description
        privacy
        memberCount
        ownerId
        createdAt
        avatarUrl
      }
    }
  }
`;

/**
 * Search for groups by name or description.
 * 
 * @example
 * ```typescript
 * const { data } = useQuery<SearchGroupsResponse>(SEARCH_GROUPS, {
 *   variables: { query: "developers", searchLimit: 10, searchOffset: 0 }
 * });
 * ```
 */
export const SEARCH_GROUPS = gql`
  query SearchGroups($query: String!, $searchLimit: Int, $searchOffset: Int) {
    searchGroups(query: $query, limit: $searchLimit, offset: $searchOffset) {
      success
      message
      total
      groups {
        id
        name
        description
        privacy
        memberCount
        ownerId
      }
    }
  }
`;

/**
 * Get members of a specific group.
 * 
 * @example
 * ```typescript
 * const { data } = useQuery<GetGroupMembersResponse>(GET_GROUP_MEMBERS, {
 *   variables: { groupId: "group-uuid", membersLimit: 20, membersOffset: 0 }
 * });
 * ```
 */
export const GET_GROUP_MEMBERS = gql`
  query GetGroupMembers($groupId: ID!, $membersLimit: Int, $membersOffset: Int) {
    getGroupMembers(groupId: $groupId, limit: $membersLimit, offset: $membersOffset) {
      success
      message
      total
      members {
        id
        groupId
        userId
        role
        status
        joinedAt
        createdAt
        profile {
          avatarUrl
          firstName
          lastName
          residenceCountry
          city
          trustScore
        }
      }
    }
  }
`;

/**
 * Check if the current user is a member of a group.
 * 
 * @example
 * ```typescript
 * const { data } = useQuery<CheckGroupMembershipResponse>(CHECK_GROUP_MEMBERSHIP, {
 *   variables: { groupId: "group-uuid" }
 * });
 * ```
 */
export const CHECK_GROUP_MEMBERSHIP = gql`
  query CheckGroupMembership($groupId: ID!) {
    checkGroupMembership(groupId: $groupId) {
      isMember
      role
      status
    }
  }
`;

// ============================================================================
// GROUP MANAGEMENT MUTATIONS
// ============================================================================

/**
 * Create a new group.
 * 
 * @example
 * ```typescript
 * const [createGroup] = useMutation<CreateGroupResponse>(CREATE_GROUP);
 * 
 * await createGroup({
 *   variables: {
 *     createInput: {
 *       name: "Tech Innovators",
 *       description: "A community for tech enthusiasts",
 *       privacy: "PUBLIC",
 *       maxMembers: 500
 *     }
 *   }
 * });
 * ```
 */
export const CREATE_GROUP = gql`
  mutation CreateGroup($createInput: CreateGroupInput!) {
    createGroup(input: $createInput) {
      success
      message
      group {
        id
        name
        description
        avatarUrl
        privacy
        maxMembers
        memberCount
        ownerId
        createdAt
      }
    }
  }
`;

/**
 * Update an existing group.
 * 
 * @example
 * ```typescript
 * const [updateGroup] = useMutation<UpdateGroupResponse>(UPDATE_GROUP);
 * 
 * await updateGroup({
 *   variables: {
 *     updateInput: {
 *       groupId: "group-uuid",
 *       name: "Updated Group Name",
 *       description: "Updated description"
 *     }
 *   }
 * });
 * ```
 */
export const UPDATE_GROUP = gql`
  mutation UpdateGroup($updateInput: UpdateGroupInput!) {
    updateGroup(input: $updateInput) {
      success
      message
      group {
        id
        name
        description
        avatarUrl
        privacy
        updatedAt
      }
    }
  }
`;

/**
 * Delete a group (only group owner can do this).
 * 
 * @example
 * ```typescript
 * const [deleteGroup] = useMutation<DeleteGroupResponse>(DELETE_GROUP);
 * 
 * await deleteGroup({
 *   variables: { deleteGroupId: "group-uuid" }
 * });
 * ```
 */
export const DELETE_GROUP = gql`
  mutation DeleteGroup($deleteGroupId: ID!) {
    deleteGroup(groupId: $deleteGroupId) {
      success
      message
    }
  }
`;

// ============================================================================
// MEMBERSHIP MUTATIONS
// ============================================================================

/**
 * Join a public group.
 * 
 * @example
 * ```typescript
 * const [joinGroup] = useMutation<JoinGroupResponse>(JOIN_GROUP);
 * 
 * await joinGroup({
 *   variables: { joinGroupId: "group-uuid" }
 * });
 * ```
 */
export const JOIN_GROUP = gql`
  mutation JoinGroup($joinGroupId: ID!) {
    joinGroup(groupId: $joinGroupId) {
      success
      message
      member {
        id
        groupId
        userId
        role
        status
        joinedAt
      }
    }
  }
`;

/**
 * Leave a group.
 * 
 * @example
 * ```typescript
 * const [leaveGroup] = useMutation<LeaveGroupResponse>(LEAVE_GROUP);
 * 
 * await leaveGroup({
 *   variables: { leaveGroupId: "group-uuid" }
 * });
 * ```
 */
export const LEAVE_GROUP = gql`
  mutation LeaveGroup($leaveGroupId: ID!) {
    leaveGroup(groupId: $leaveGroupId) {
      success
      message
    }
  }
`;

/**
 * Request to join a private group.
 * 
 * @example
 * ```typescript
 * const [requestToJoin] = useMutation<RequestToJoinGroupResponse>(REQUEST_TO_JOIN_GROUP);
 * 
 * await requestToJoin({
 *   variables: {
 *     requestInput: {
 *       groupId: "group-uuid",
 *       message: "I'd love to join this community!"
 *     }
 *   }
 * });
 * ```
 */
export const REQUEST_TO_JOIN_GROUP = gql`
  mutation RequestToJoinGroup($requestInput: RequestToJoinInput!) {
    requestToJoinGroup(input: $requestInput) {
      success
      message
      request {
        id
        groupId
        userId
        status
        message
        createdAt
      }
    }
  }
`;

/**
 * Update a member's role in a group (admin/owner only).
 * 
 * @example
 * ```typescript
 * const [updateRole] = useMutation<UpdateMemberRoleResponse>(UPDATE_MEMBER_ROLE);
 * 
 * await updateRole({
 *   variables: {
 *     roleInput: {
 *       groupId: "group-uuid",
 *       userId: "user-uuid",
 *       role: "MODERATOR"
 *     }
 *   }
 * });
 * ```
 */
export const UPDATE_MEMBER_ROLE = gql`
  mutation UpdateMemberRole($roleInput: UpdateMemberRoleInput!) {
    updateMemberRole(input: $roleInput) {
      success
      message
      member {
        id
        userId
        role
        status
      }
    }
  }
`;

/**
 * Remove a member from a group (admin/owner only).
 * 
 * @example
 * ```typescript
 * const [removeMember] = useMutation<RemoveMemberResponse>(REMOVE_MEMBER);
 * 
 * await removeMember({
 *   variables: {
 *     removeInput: {
 *       groupId: "group-uuid",
 *       userId: "user-uuid"
 *     }
 *   }
 * });
 * ```
 */
export const REMOVE_MEMBER = gql`
  mutation RemoveGroupMember($removeInput: GroupRemoveMemberInput!) {
    removeGroupMember(input: $removeInput) {
      success
      message
    }
  }
`;

/**
 * Add a member directly to a group (OWNER or ADMIN only).
 * Role optional: MEMBER | MODERATOR | ADMIN (default MEMBER).
 *
 * @example
 * ```typescript
 * const [addMember] = useMutation<AddMemberResponse>(ADD_MEMBER);
 * await addMember({
 *   variables: {
 *     input: { groupId: "...", userId: "...", role: MemberRole.MEMBER }
 *   }
 * });
 * ```
 */
export const ADD_MEMBER = gql`
  mutation AddMember($input: AddMemberInput!) {
    addMember(input: $input) {
      success
      message
      member { userId role status }
    }
  }
`;

/**
 * Transfer group ownership to another member (OWNER only). Previous owner becomes ADMIN.
 *
 * @example
 * ```typescript
 * const [transferOwnership] = useMutation<TransferGroupOwnershipResponse>(TRANSFER_GROUP_OWNERSHIP);
 * await transferOwnership({
 *   variables: { input: { groupId: "...", newOwnerId: "..." } }
 * });
 * ```
 */
export const TRANSFER_GROUP_OWNERSHIP = gql`
  mutation TransferGroupOwnership($input: TransferGroupOwnershipInput!) {
    transferGroupOwnership(input: $input) {
      success
      message
      previousOwner { userId role }
      newOwner { userId role }
    }
  }
`;

// ============================================================================
// INVITATION MUTATIONS
// ============================================================================

/**
 * Invite a user to join a group.
 * 
 * @example
 * ```typescript
 * const [inviteToGroup] = useMutation<InviteToGroupResponse>(INVITE_TO_GROUP);
 * 
 * await inviteToGroup({
 *   variables: {
 *     inviteInput: {
 *       groupId: "group-uuid",
 *       invitedUserId: "user-uuid"
 *     }
 *   }
 * });
 * ```
 */
export const INVITE_TO_GROUP = gql`
  mutation InviteToGroup($inviteInput: InviteToGroupInput!) {
    inviteToGroup(input: $inviteInput) {
      success
      message
      invitation {
        id
        groupId
        invitedBy
        invitedUserId
        status
        expiresAt
        createdAt
      }
    }
  }
`;

/**
 * Accept a group invitation.
 * 
 * @example
 * ```typescript
 * const [acceptInvitation] = useMutation<AcceptGroupInvitationResponse>(ACCEPT_GROUP_INVITATION);
 * 
 * await acceptInvitation({
 *   variables: { acceptInvitationId: "invitation-uuid" }
 * });
 * ```
 */
export const ACCEPT_GROUP_INVITATION = gql`
  mutation AcceptGroupInvitation($acceptInvitationId: ID!) {
    acceptGroupInvitation(invitationId: $acceptInvitationId) {
      success
      message
      member {
        id
        groupId
        userId
        role
        status
        joinedAt
      }
    }
  }
`;

/**
 * Decline a group invitation.
 * 
 * @example
 * ```typescript
 * const [declineInvitation] = useMutation<DeclineGroupInvitationResponse>(DECLINE_GROUP_INVITATION);
 * 
 * await declineInvitation({
 *   variables: { declineInvitationId: "invitation-uuid" }
 * });
 * ```
 */
export const DECLINE_GROUP_INVITATION = gql`
  mutation DeclineGroupInvitation($declineInvitationId: ID!) {
    declineGroupInvitation(invitationId: $declineInvitationId) {
      success
      message
    }
  }
`;