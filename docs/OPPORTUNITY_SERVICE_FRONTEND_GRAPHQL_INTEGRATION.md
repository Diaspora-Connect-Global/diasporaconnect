# Opportunity Service - Frontend GraphQL Integration Guide

This document summarizes the GraphQL operations exposed by the Opportunity Service and how the frontend should consume them with Apollo Client, URQL, Relay, or a similar client.

## 1. Queries

### Opportunities

- `getOpportunity(id: String!): OpportunityType`
  - Fetch a single opportunity by ID.
  - Includes user-context flags when the current user has saved or applied: `isSavedByCurrentUser`, `hasCurrentUserApplied`, `currentUserApplicationId`.

- `listOpportunities(input: ListOpportunitiesInput!): OpportunityListResponse!`
  - Advanced search, filtering, and pagination.

- `opportunities(input: ListOpportunitiesInput!): OpportunityListResponse!`
  - Alias of `listOpportunities`.

- `getOpportunityFeed(input: GetOpportunityFeedInput!): OpportunityListResponse!`
  - Feed for UI rendering, either algorithmic or chronological.

### Applications

- `getApplications(input: GetApplicationsInput!): ApplicationListResponse!`
  - Fetch applications for a specific opportunity.
  - Populates `applicantProfile`.

- `getApplication(applicationId: String!): ApplicationType`
  - Fetch a single application.

- `userApplications(limit: Int, offset: Int, status: String): ApplicationListResponse!`
  - Fetch applications submitted by the current user.

### Saved State

- `getSavedOpportunities(limit: Int, offset: Int): SavedOpportunityListResponse!`
  - Fetch the current user's saved opportunities.

## 2. Mutations

### User Actions

- `saveOpportunity(opportunityId: String!): Boolean!`
- `unsaveOpportunity(opportunityId: String!): Boolean!`
- `submitApplication(input: SubmitApplicationInput!): ID!`
- `withdrawApplication(applicationId: String!): Boolean!`

## 3. Key Object Types

### OpportunityType

```graphql
type OpportunityType {
  id: ID!
  ownerType: OwnerTypeEnum!
  ownerId: String!
  owner: OpportunityOwnerType
  type: OpportunityTypeEnum!
  category: OpportunityCategoryEnum!
  subCategory: String
  title: String!
  description: String!
  scope: String
  eligibilityCriteria: String
  deliveryMode: DeliveryModeEnum
  commitmentType: CommitmentTypeEnum
  location: String
  visibility: VisibilityEnum!
  applicationMethod: ApplicationMethodEnum
  externalLink: String
  applicationEmail: String
  formFields: [FormFieldType!]
  status: OpportunityStatusEnum!
  priorityLevel: PriorityLevelEnum!
  compensationMin: Float
  compensationMax: Float
  compensationCurrency: String
  compensationType: CompensationTypeEnum
  duration: String
  eligibilityRegions: [String!]
  benefitsSummary: String
  deadline: String
  skills: [String!]
  tags: [String!]
  applicationCount: Int
  isSavedByCurrentUser: Boolean
  hasCurrentUserApplied: Boolean
  currentUserApplicationId: String
  createdAt: String!
  updatedAt: String!
  publishedAt: String
  closedAt: String
}
```

### ApplicationType

```graphql
type ApplicationType {
  id: ID!
  opportunityId: String!
  applicantId: String!
  status: ApplicationStatusEnum!
  resumeFileRef: FileRefType
  coverLetter: String
  customAnswers: String
  reviewNotes: String
  reviewedBy: String
  reviewedAt: String
  createdAt: String!
  updatedAt: String
  opportunity: OpportunityType
  applicantProfile: Profile
}
```

## 4. Input Types

### ListOpportunitiesInput

```graphql
input ListOpportunitiesInput {
  limit: Int! = 20
  offset: Int! = 0
  type: OpportunityTypeEnum
  category: OpportunityCategoryEnum
  subCategory: String
  searchTerm: String
  ownerType: OwnerTypeEnum
  ownerId: String
  status: String
  deliveryMode: DeliveryModeEnum
  commitmentType: CommitmentTypeEnum
  location: String
  sortBy: String
  sortOrder: String
}
```

### CreateOpportunityInput and UpdateOpportunityInput

`UpdateOpportunityInput` mirrors the same fields as `CreateOpportunityInput`, but every field is nullable.

```graphql
input CreateOpportunityInput {
  ownerType: OwnerTypeEnum!
  ownerId: String!
  type: OpportunityTypeEnum!
  category: OpportunityCategoryEnum!
  title: String!
  description: String!
  visibility: VisibilityEnum!
  applicationMethod: ApplicationMethodEnum!
  scope: String
  eligibilityCriteria: String
  deliveryMode: DeliveryModeEnum
  commitmentType: CommitmentTypeEnum
  location: String
  externalLink: String
  applicationEmail: String
  compensationMin: Float
  compensationMax: Float
  compensationCurrency: String
  compensationType: CompensationTypeEnum
  duration: String
  eligibilityRegions: [String!]
  benefitsSummary: String
  deadline: String
  subCategory: String
  skills: [String!]
  tags: [String!]
  formFields: [FormFieldInput!]
}

input FormFieldInput {
  key: String!
  label: String!
  type: FormFieldTypeEnum!
  required: Boolean!
}
```

### SubmitApplicationInput

```graphql
input SubmitApplicationInput {
  opportunityId: String!
  applicationData: ApplicationDataInput!
  resumeFileRef: FileReferenceInput
}

input ApplicationDataInput {
  fullName: String!
  email: String!
  phoneNumber: String
  linkedInProfile: String
  portfolioUrl: String
  coverLetter: String
  customAnswers: String
}
```

## 5. Primary Enums

- `OpportunityTypeEnum`: `EMPLOYMENT`, `SCHOLARSHIP`, `INVESTMENT`, `FELLOWSHIP`, `INITIATIVE`, `GRANT`, `PROGRAM`, `VOLUNTEER`, `CONTRACT`
- `OpportunityCategoryEnum`: `EMPLOYMENT_CAREER`, `EDUCATION_TRAINING`, `FUNDING_GRANTS`, `FELLOWSHIPS_LEADERSHIP`, `BUSINESS_INVESTMENT`, etc.
- `VisibilityEnum`: `PUBLIC`, `COMMUNITY_ONLY`, `ASSOCIATION_ONLY`
- `ApplicationMethodEnum`: `EXTERNAL_LINK`, `IN_PLATFORM_FORM`, `EMAIL_REQUEST`
- `OpportunityStatusEnum`: `DRAFT`, `PUBLISHED`, `CLOSED`, `ARCHIVED`
- `ApplicationStatusEnum`: `PENDING`, `REVIEWING`, `ACCEPTED`, `REJECTED`, `WITHDRAWN`
- `OwnerTypeEnum`: `USER`, `COMMUNITY`, `ASSOCIATION`
- `FormFieldTypeEnum`: `text`, `email`, `textarea`, `file_upload`
- `DeliveryModeEnum`: `REMOTE`, `IN_PERSON`, `HYBRID`, `ONLINE`
- `CommitmentTypeEnum`: `FULL_TIME`, `PART_TIME`, `CONTRACT`, `ONE_TIME`, `FLEXIBLE`, `PROJECT_BASED`, `ONGOING`

## 6. Frontend Notes

- Use `opportunityId` and `applicationId` in GraphQL variables to match the backend schema.
- Query `userApplications` for current-user application history.
- Keep saved/application state in the opportunity detail query so list and detail views stay consistent.
- Prefer narrow selections on list/feed queries and richer selections on detail queries.
