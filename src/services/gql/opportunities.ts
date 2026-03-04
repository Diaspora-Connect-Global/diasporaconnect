import { gql } from '@apollo/client';

// ============================================
// Opportunity Service GraphQL API
// ============================================
// Matches backend: opportunity, createOpportunity, submitApplication, saveOpportunity.
// Types: @/services/gql/types/opportunities (Opportunity, CreateOpportunityInput,
// SubmitApplicationInput, OpportunityType, ApplicationStatus).
//
// Usage:
//   const { data } = useQuery<GetOpportunityData>(GET_OPPORTUNITY, { variables: { id } });
//   const [createOpportunity] = useMutation<CreateOpportunityData>(CREATE_OPPORTUNITY);
//   const [submitApplication] = useMutation<SubmitApplicationData>(SUBMIT_APPLICATION);
//   const [saveOpportunity] = useMutation<SaveOpportunityData>(SAVE_OPPORTUNITY);
// ============================================

// ============================================
// OPPORTUNITY QUERIES
// ============================================

export const GET_OPPORTUNITY = gql`
  query GetOpportunity($id: String!) {
    opportunity(id: $id) {
      id
      ownerType
      ownerId
      owner { id name avatarUrl type }
      type
      category
      subCategory
      title
      description
      responsibilities
      requirements
      workMode
      engagementType
      location
      visibility
      applicationMethod
      externalLink
      applicationEmail
      status
      priorityLevel
      salaryMin
      salaryMax
      salaryCurrency
      deadline
      applicationCount
      skills
      tags
      isSavedByCurrentUser
      hasCurrentUserApplied
      currentUserApplicationId
      createdAt
      updatedAt
      publishedAt
      closedAt
    }
  }
`;

export const LIST_OPPORTUNITIES = gql`
  query ListOpportunities($input: ListOpportunitiesInput) {
    opportunities(input: $input) {
      opportunities {
        id
        ownerType
        ownerId
        owner { id name avatarUrl type }
        type
        category
        subCategory
        title
        description
        workMode
        engagementType
        location
        salaryMin
        salaryMax
        salaryCurrency
        deadline
        status
        priorityLevel
        applicationCount
        skills
        tags
        isSavedByCurrentUser
        hasCurrentUserApplied
        createdAt
        publishedAt
      }
      total
    }
  }
`;

export const GET_OPPORTUNITY_FEED = gql`
  query GetOpportunityFeed($input: GetOpportunityFeedInput!) {
    getOpportunityFeed(input: $input) {
      opportunities {
        id
        ownerType
        ownerId
        owner { id name avatarUrl type }
        type
        category
        title
        description
        workMode
        location
        salaryMin
        salaryMax
        salaryCurrency
        deadline
        status
        isSavedByCurrentUser
        createdAt
        publishedAt
      }
      total
    }
  }
`;

// ============================================
// OPPORTUNITY MUTATIONS
// ============================================

export const CREATE_OPPORTUNITY = gql`
  mutation CreateOpportunity($input: CreateOpportunityInput!) {
    createOpportunity(input: $input) {
      id
      title
      status
      createdAt
    }
  }
`;

export const UPDATE_OPPORTUNITY = gql`
  mutation UpdateOpportunity($id: String!, $input: UpdateOpportunityInput!) {
    updateOpportunity(id: $id, input: $input)
  }
`;

export const PUBLISH_OPPORTUNITY = gql`
  mutation PublishOpportunity($id: String!) {
    publishOpportunity(id: $id)
  }
`;

export const CLOSE_OPPORTUNITY = gql`
  mutation CloseOpportunity($id: String!, $reason: String) {
    closeOpportunity(id: $id, reason: $reason)
  }
`;

export const DELETE_OPPORTUNITY = gql`
  mutation DeleteOpportunity($id: String!) {
    deleteOpportunity(id: $id)
  }
`;

export const SET_OPPORTUNITY_PRIORITY = gql`
  mutation SetOpportunityPriority($input: SetOpportunityPriorityInput!) {
    setOpportunityPriority(input: $input)
  }
`;

// ============================================
// APPLICATION QUERIES
// ============================================

export const GET_APPLICATION = gql`
  query GetApplication($id: String!) {
    application(id: $id) {
      id
      opportunityId
      applicantId
      status
      resumeFileRef { path filename mimeType sizeBytes }
      coverLetter
      customAnswers
      reviewNotes
      reviewedBy
      reviewedAt
      createdAt
      updatedAt
    }
  }
`;

export const GET_APPLICATIONS = gql`
  query GetApplications($input: GetApplicationsInput!) {
    getApplications(input: $input) {
      applications {
        id
        opportunityId
        applicantId
        status
        resumeFileRef
        coverLetter
        customAnswers
        reviewNotes
        createdAt
      }
      total
    }
  }
`;


export const GET_USER_APPLICATIONS = gql`
  query GetUserApplications($limit: Int, $offset: Int, $status: String) {
    userApplications(limit: $limit, offset: $offset, status: $status) {
      total
      applications {
        id
        opportunityId
        applicantId
        status
        coverLetter
        reviewNotes
        createdAt
        updatedAt
        resumeFileRef { filename mimeType sizeBytes }
        opportunity {
          id
          title
          type
          category
          owner { id name avatarUrl type }
        }
      }
    }
  }
`;


// ============================================
// APPLICATION MUTATIONS
// ============================================

export const SUBMIT_APPLICATION = gql`
  mutation SubmitApplication($input: SubmitApplicationInput!) {
    submitApplication(input: $input)
  }
`;

export const REVIEW_APPLICATION = gql`
  mutation ReviewApplication($input: ReviewApplicationInput!) {
    reviewApplication(input: $input)
  }
`;

export const ACCEPT_APPLICATION = gql`
  mutation AcceptApplication($id: String!) {
    acceptApplication(id: $id)
  }
`;

export const REJECT_APPLICATION = gql`
  mutation RejectApplication($id: String!, $reason: String) {
    rejectApplication(id: $id, reason: $reason)
  }
`;

export const WITHDRAW_APPLICATION = gql`
  mutation WithdrawApplication($id: String!) {
    withdrawApplication(id: $id)
  }
`;

// ============================================
// SAVED OPPORTUNITIES QUERIES
// ============================================

export const GET_SAVED_OPPORTUNITIES = gql`
  query GetSavedOpportunities($limit: Int, $offset: Int) {
    getSavedOpportunities(limit: $limit, offset: $offset) {
      savedOpportunities {
        id
        opportunityId
        userId
        savedAt
        opportunity {
          id
          type
          category
          title
          description
          workMode
          location
          salaryMin
          salaryMax
          salaryCurrency
          deadline
          status
          owner { id name avatarUrl type }
        }
      }
      total
    }
  }
`;

// ============================================
// SAVED OPPORTUNITIES MUTATIONS
// ============================================

export const SAVE_OPPORTUNITY = gql`
  mutation SaveOpportunity($id: String!) {
    saveOpportunity(id: $id)
  }
`;

export const UNSAVE_OPPORTUNITY = gql`
  mutation UnsaveOpportunity($id: String!) {
    unsaveOpportunity(id: $id)
  }
`;