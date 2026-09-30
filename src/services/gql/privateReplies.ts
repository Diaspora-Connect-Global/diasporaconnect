import { gql } from '@apollo/client';

/**
 * Private replies — a private conversation INSIDE a group chat, attached to
 * the group message it started from, visible only to the people in it.
 *
 * A private reply IS a conversation: once started, its messages use the
 * ordinary SEND_MESSAGE / MARK_CONVERSATION_AS_READ with `privateReply.id`.
 * Its history is read with PRIVATE_REPLY_MESSAGES (not GET_MESSAGES) so the
 * membership lines' `systemEvent` never has to be added to the group chat's
 * query — a field the gateway doesn't know yet would break that whole query.
 *
 * Every document here is new; until the gateway ships them they fail on their
 * own and the feature simply doesn't appear (callers use errorPolicy 'all').
 */

export type PrivateReplyMemberManagement = 'NOBODY' | 'STARTER' | 'GROUP_ADMINS';

export type PrivateReplyEventKind =
    | 'STARTED'
    | 'MEMBERS_ADDED'
    | 'MEMBER_REMOVED'
    | 'MEMBER_LEFT'
    | 'MEMBER_LEFT_GROUP'
    | 'MANAGER_CHANGED';

export interface PrivateReplyAnchor {
    messageId: string;
    senderId: string;
    contentSnippet: string;
    createdAt?: string | null;
}

export interface PrivateReply {
    /** The private conversation's id — use it with SEND_MESSAGE. */
    id: string;
    groupConversationId: string;
    anchor?: PrivateReplyAnchor | null;
    memberUserIds: string[];
    managerUserId?: string | null;
    /** False only in a group admin's management view (members, never messages). */
    isMember: boolean;
    canManage: boolean;
    unreadCount: number;
    createdAt?: string | null;
    lastMessageAt?: string | null;
}

export interface PrivateReplySettings {
    maxMembers: number;
    memberManagement: PrivateReplyMemberManagement;
    newMembersSeeHistory: boolean;
}

export interface PrivateReplySystemEvent {
    kind: PrivateReplyEventKind | string;
    /** Empty/null for no actor (automatic) or a deleted account. */
    actorUserId?: string | null;
    /** An empty string is someone whose account was deleted. */
    targetUserIds: string[];
}

export interface PrivateReplyMessage {
    id: string;
    conversationId: string;
    senderId: string;
    type: string;
    content: string;
    attachments?: Array<{ fileName?: string; fileSize?: number; mimeType?: string; gcsPath?: string }> | null;
    isDeleted?: boolean;
    createdAt: string;
    systemEvent?: PrivateReplySystemEvent | null;
}

const PRIVATE_REPLY_FIELDS = gql`
    fragment PrivateReplyFields on PrivateReply {
        id
        groupConversationId
        anchor {
            messageId
            senderId
            contentSnippet
            createdAt
        }
        memberUserIds
        managerUserId
        isMember
        canManage
        unreadCount
        createdAt
        lastMessageAt
    }
`;

export const MY_PRIVATE_REPLIES = gql`
    ${PRIVATE_REPLY_FIELDS}
    query MyPrivateReplies($groupConversationId: ID!) {
        myPrivateReplies(groupConversationId: $groupConversationId) {
            ...PrivateReplyFields
        }
    }
`;

export const PRIVATE_REPLY = gql`
    ${PRIVATE_REPLY_FIELDS}
    query PrivateReply($id: ID!) {
        privateReply(id: $id) {
            ...PrivateReplyFields
        }
    }
`;

export const GROUP_PRIVATE_REPLIES = gql`
    ${PRIVATE_REPLY_FIELDS}
    query GroupPrivateReplies($groupConversationId: ID!, $cursor: String, $limit: Int) {
        groupPrivateReplies(groupConversationId: $groupConversationId, cursor: $cursor, limit: $limit) {
            items {
                ...PrivateReplyFields
            }
            nextCursor
        }
    }
`;

export const PRIVATE_REPLY_SETTINGS = gql`
    query PrivateReplySettings {
        privateReplySettings {
            maxMembers
            memberManagement
            newMembersSeeHistory
        }
    }
`;

export const PRIVATE_REPLY_MESSAGES = gql`
    query PrivateReplyMessages($conversationId: String!, $limit: Int) {
        getMessages(conversationId: $conversationId, limit: $limit) {
            messages {
                id
                conversationId
                senderId
                type
                content
                attachments {
                    fileName
                    fileSize
                    mimeType
                    gcsPath
                }
                isDeleted
                createdAt
                systemEvent {
                    kind
                    actorUserId
                    targetUserIds
                }
            }
            hasMore
        }
    }
`;

export const START_PRIVATE_REPLY = gql`
    ${PRIVATE_REPLY_FIELDS}
    mutation StartPrivateReply($input: StartPrivateReplyInput!) {
        startPrivateReply(input: $input) {
            privateReply {
                ...PrivateReplyFields
            }
            messageId
        }
    }
`;

export const ADD_PRIVATE_REPLY_MEMBERS = gql`
    ${PRIVATE_REPLY_FIELDS}
    mutation AddPrivateReplyMembers($privateReplyId: ID!, $userIds: [ID!]!) {
        addPrivateReplyMembers(privateReplyId: $privateReplyId, userIds: $userIds) {
            ...PrivateReplyFields
        }
    }
`;

export const REMOVE_PRIVATE_REPLY_MEMBER = gql`
    ${PRIVATE_REPLY_FIELDS}
    mutation RemovePrivateReplyMember($privateReplyId: ID!, $userId: ID!) {
        removePrivateReplyMember(privateReplyId: $privateReplyId, userId: $userId) {
            ...PrivateReplyFields
        }
    }
`;

export const LEAVE_PRIVATE_REPLY = gql`
    mutation LeavePrivateReply($privateReplyId: ID!) {
        leavePrivateReply(privateReplyId: $privateReplyId)
    }
`;

export interface MyPrivateRepliesData {
    myPrivateReplies: PrivateReply[];
}
export interface PrivateReplyData {
    privateReply: PrivateReply;
}
export interface GroupPrivateRepliesData {
    groupPrivateReplies: { items: PrivateReply[]; nextCursor: string };
}
export interface PrivateReplySettingsData {
    privateReplySettings: PrivateReplySettings;
}
export interface PrivateReplyMessagesData {
    getMessages: { messages: PrivateReplyMessage[]; hasMore: boolean };
}
export interface StartPrivateReplyData {
    startPrivateReply: { privateReply: PrivateReply; messageId: string };
}
export interface AddPrivateReplyMembersData {
    addPrivateReplyMembers: PrivateReply;
}
export interface RemovePrivateReplyMemberData {
    removePrivateReplyMember: PrivateReply | null;
}
export interface LeavePrivateReplyData {
    leavePrivateReply: boolean;
}
