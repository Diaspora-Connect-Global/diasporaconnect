# GraphQL API Documentation Template

> **For Backend Developer:** Document each endpoint using this format, grouped by entity.

---

# PROFILE

## Types
```typescript
export interface Profile {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface GetProfileResponse {
  getProfile: {
    success: boolean;
    message?: string;
    profile: Profile;
  };
}
```

---

### `getProfile` - Get Current User's Profile

#### Frontend Implementation
```typescript
export const GET_MY_PROFILE = gql`
  query GetMyProfile {
    getProfile {
      success
      message
      profile {
        userId
        email
        firstName
        lastName
        avatarUrl
        createdAt
      }
    }
  }
`;

// Usage
const { data, loading, error } = useQuery<GetProfileResponse>(GET_MY_PROFILE);

if (data?.getProfile.success) {
  const profile = data.getProfile.profile;
}
```

#### Playground
```graphql
query GetMyProfile {
  getProfile {
    success
    message
    profile {
      userId
      email
      firstName
      lastName
      avatarUrl
      createdAt
    }
  }
}
```

---

# GROUP

## Types
```typescript
export enum GroupPrivacy {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  privacy: GroupPrivacy;
  memberCount: number;
  createdAt: string;
}

export interface CreateGroupInput {
  name: string;
  description?: string;
  privacy: 'PUBLIC' | 'PRIVATE';
}

export interface GetGroupResponse {
  getGroup: {
    success: boolean;
    message?: string;
    group: Group;
  };
}

export interface GetGroupsResponse {
  getGroups: {
    success: boolean;
    message?: string;
    total: number;
    groups: Group[];
  };
}

export interface CreateGroupResponse {
  createGroup: {
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
```

---

### `getGroup` - Get Group by ID

#### Frontend Implementation
```typescript
export const GET_GROUP = gql`
  query GetGroup($groupId: ID!) {
    getGroup(groupId: $groupId) {
      success
      message
      group {
        id
        name
        description
        privacy
        memberCount
        createdAt
      }
    }
  }
`;

// Usage
const { data } = useQuery<GetGroupResponse>(GET_GROUP, {
  variables: { groupId: "uuid-here" }
});

if (data?.getGroup.success) {
  const group = data.getGroup.group;
}
```

#### Playground
```graphql
query GetGroup($groupId: ID!) {
  getGroup(groupId: $groupId) {
    success
    message
    group {
      id
      name
      description
      privacy
      memberCount
      createdAt
    }
  }
}
```
**Variables:**
```json
{
  "groupId": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

### `getGroups` - Get Groups (Paginated)

#### Frontend Implementation
```typescript
export const GET_GROUPS = gql`
  query GetGroups($limit: Int, $offset: Int) {
    getGroups(limit: $limit, offset: $offset) {
      success
      message
      total
      groups {
        id
        name
        privacy
        memberCount
      }
    }
  }
`;

// Usage
const { data } = useQuery<GetGroupsResponse>(GET_GROUPS, {
  variables: { limit: 20, offset: 0 }
});
```

#### Playground
```graphql
query GetGroups($limit: Int, $offset: Int) {
  getGroups(limit: $limit, offset: $offset) {
    success
    message
    total
    groups {
      id
      name
      privacy
      memberCount
    }
  }
}
```
**Variables:**
```json
{
  "limit": 20,
  "offset": 0
}
```

---

### `createGroup` - Create New Group

#### Frontend Implementation
```typescript
export const CREATE_GROUP = gql`
  mutation CreateGroup($input: CreateGroupInput!) {
    createGroup(input: $input) {
      success
      message
      group {
        id
        name
        privacy
        createdAt
      }
    }
  }
`;

// Usage
const [createGroup, { loading }] = useMutation<CreateGroupResponse>(CREATE_GROUP);

const handleCreate = async (formData: CreateGroupInput) => {
  const { data } = await createGroup({
    variables: {
      input: {
        name: formData.name,
        description: formData.description,
        privacy: "PUBLIC"
      }
    }
  });
  
  if (data?.createGroup.success) {
    router.push(`/groups/${data.createGroup.group.id}`);
  }
};
```

#### Playground
```graphql
mutation CreateGroup($input: CreateGroupInput!) {
  createGroup(input: $input) {
    success
    message
    group {
      id
      name
      privacy
      createdAt
    }
  }
}
```
**Variables:**
```json
{
  "input": {
    "name": "Tech Community",
    "description": "For tech enthusiasts",
    "privacy": "PUBLIC"
  }
}
```

---

### `deleteGroup` - Delete Group

#### Frontend Implementation
```typescript
export const DELETE_GROUP = gql`
  mutation DeleteGroup($groupId: ID!) {
    deleteGroup(groupId: $groupId) {
      success
      message
    }
  }
`;

// Usage
const [deleteGroup] = useMutation<DeleteGroupResponse>(DELETE_GROUP);

const handleDelete = async (groupId: string) => {
  const { data } = await deleteGroup({ variables: { groupId } });
  if (data?.deleteGroup.success) {
    toast.success("Group deleted");
  }
};
```

#### Playground
```graphql
mutation DeleteGroup($groupId: ID!) {
  deleteGroup(groupId: $groupId) {
    success
    message
  }
}
```
**Variables:**
```json
{
  "groupId": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

# AUTH

## Types
```typescript
export interface LogoutResponse {
  logout: {
    success: boolean;
    message?: string;
  };
}
```

---

### `logout` - Logout User

#### Frontend Implementation
```typescript
export const LOGOUT = gql`
  mutation Logout {
    logout {
      success
      message
    }
  }
`;

// Usage
const [logout, { loading }] = useMutation<LogoutResponse>(LOGOUT);

const handleLogout = async () => {
  const { data } = await logout();
  if (data?.logout.success) {
    router.push('/login');
  }
};
```

#### Playground
```graphql
mutation Logout {
  logout {
    success
    message
  }
}
```

---
