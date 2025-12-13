import { gql } from '@apollo/client';

// ============================================================================
// GROUP TYPES
// ============================================================================

export enum GroupPrivacy {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
}

export enum MemberRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MODERATOR = 'MODERATOR',
  MEMBER = 'MEMBER',
}

export enum MemberStatus {
  ACTIVE = 'ACTIVE',
  PENDING = 'PENDING',
  BANNED = 'BANNED',
}

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

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  role: MemberRole;
  status: MemberStatus;
  joinedAt?: string;
  createdAt: string;
}

export interface GroupInvitation {
  id: string;
  groupId: string;
  invitedBy: string;
  invitedUserId: string;
  status: string;
  expiresAt?: string;
  createdAt: string;
}

export interface JoinRequest {
  id: string;
  groupId: string;
  userId: string;
  status: string;
  message?: string;
  createdAt: string;
}

export interface CreateGroupInput {
  name: string;
  description?: string;
  avatarUrl?: string;
  privacy: GroupPrivacy;
  maxMembers?: number;
}

export interface UpdateGroupInput {
  groupId: string;
  name?: string;
  description?: string;
  avatarUrl?: string;
  privacy?: GroupPrivacy;
}

export interface RequestToJoinInput {
  groupId: string;
  message?: string;
}

export interface UpdateMemberRoleInput {
  groupId: string;
  userId: string;
  role: MemberRole;
}

export interface RemoveMemberInput {
  groupId: string;
  userId: string;
}

export interface InviteToGroupInput {
  groupId: string;
  invitedUserId: string;
}

export interface GetGroupResponse {
  getGroup: {
    success: boolean;
    message?: string;
    group: Group;
  };
}

export interface GetMyGroupsResponse {
  getMyGroups: {
    success: boolean;
    message?: string;
    total: number;
    groups: Group[];
  };
}

export interface SearchGroupsResponse {
  searchGroups: {
    success: boolean;
    message?: string;
    total: number;
    groups: Group[];
  };
}

export interface GetGroupMembersResponse {
  getGroupMembers: {
    success: boolean;
    message?: string;
    total: number;
    members: GroupMember[];
  };
}

export interface CheckGroupMembershipResponse {
  checkGroupMembership: {
    isMember: boolean;
    role?: MemberRole;
    status?: MemberStatus;
  };
}

export interface CreateGroupResponse {
  createGroup: {
    success: boolean;
    message?: string;
    group: Group;
  };
}

export interface UpdateGroupResponse {
  updateGroup: {
    success: boolean;
    message?: string;
    group: Group;
  };
}

export interface DeleteGroupResponse {
  deleteGroup: {
    success: boolean;
    message?: string;
  };
}

export interface JoinGroupResponse {
  joinGroup: {
    success: boolean;
    message?: string;
    member: GroupMember;
  };
}

export interface LeaveGroupResponse {
  leaveGroup: {
    success: boolean;
    message?: string;
  };
}

export interface RequestToJoinGroupResponse {
  requestToJoinGroup: {
    success: boolean;
    message?: string;
    request: JoinRequest;
  };
}

export interface UpdateMemberRoleResponse {
  updateMemberRole: {
    success: boolean;
    message?: string;
    member: GroupMember;
  };
}

export interface RemoveMemberResponse {
  removeMember: {
    success: boolean;
    message?: string;
  };
}

export interface InviteToGroupResponse {
  inviteToGroup: {
    success: boolean;
    message?: string;
    invitation: GroupInvitation;
  };
}

export interface AcceptGroupInvitationResponse {
  acceptGroupInvitation: {
    success: boolean;
    message?: string;
    member: GroupMember;
  };
}

export interface DeclineGroupInvitationResponse {
  declineGroupInvitation: {
    success: boolean;
    message?: string;
  };
}

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
  mutation RemoveMember($removeInput: RemoveMemberInput!) {
    removeMember(input: $removeInput) {
      success
      message
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