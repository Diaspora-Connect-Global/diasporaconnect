import { gql } from '@apollo/client';

// ============================================
// OPPORTUNITY QUERIES
// ============================================

export const GET_OPPORTUNITY = gql`
  query GetOpportunity($id: String!) {
    getOpportunity(id: $id) {
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
      formFields { key label type required }
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
    listOpportunities(input: $input) {
      opportunities {
        id
        ownerType
        ownerId
        owner { id name avatarUrl type }
        type
        category
        subCategory
        title
        workMode
        engagementType
        location
        salaryMin
        salaryMax
        salaryCurrency
        deadline
        applicationMethod
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
        applicationMethod
        workMode
        engagementType
        location
        salaryMin
        salaryMax
        salaryCurrency
        deadline
        applicationCount
        status
        isSavedByCurrentUser
        hasCurrentUserApplied
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

export const DRAFT_OPPORTUNITY = gql`
  mutation DraftOpportunity($id: String!) {
    draftOpportunity(id: $id)
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

// ============================================
// APPLICATION QUERIES
// ============================================

export const GET_APPLICATION = gql`
  query GetApplication($id: String!) {
    getApplication(id: $id) {
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

export const GET_USER_APPLICATIONS = gql`
  query UserApplications($limit: Int, $offset: Int, $status: String) {
    userApplications(limit: $limit, offset: $offset, status: $status) {
      applications {
        id
        opportunityId
        applicantId
        status
        coverLetter
        customAnswers
        reviewNotes
        createdAt
        updatedAt
        resumeFileRef { filename mimeType sizeBytes }
        opportunity {
          id
          title
          type
          category
          deadline
          closedAt
          status
          applicationMethod
          owner { id name avatarUrl type }
        }
      }
      total
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
  mutation ReviewApplication($applicationId: String!, $notes: String) {
    reviewApplication(applicationId: $applicationId, notes: $notes)
  }
`;

export const ACCEPT_APPLICATION = gql`
  mutation AcceptApplication($id: String!, $notes: String) {
    acceptApplication(id: $id, notes: $notes)
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
          workMode
          location
          salaryMin
          salaryMax
          salaryCurrency
          deadline
          applicationMethod
          status
          owner { id name avatarUrl type }
          isSavedByCurrentUser
          hasCurrentUserApplied
          publishedAt
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
