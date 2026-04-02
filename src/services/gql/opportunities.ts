import { gql } from '@apollo/client';

// ============================================
// OPPORTUNITY QUERIES
// ============================================

export const GET_OPPORTUNITY = gql`
  query GetOpportunity($id: String!) {
    getOpportunity(id: $id) {
      id
      ownerType
      title
      description
      responsibilities
      requirements
      status
      category
      type
      subCategory
      workMode
      engagementType
      location
      applicationMethod
      externalLink
      applicationEmail
      formFields { key label type required }
      salaryMin
      salaryMax
      salaryCurrency
      deadline
      applicationCount
      skills
      tags
      currentUserApplicationId
      isSavedByCurrentUser
      hasCurrentUserApplied
      createdAt
      updatedAt
      publishedAt
      closedAt
      owner { id name avatarUrl type }
    }
  }
`;

export const LIST_OPPORTUNITIES = gql`
  query ListOpportunities($input: ListOpportunitiesInput) {
    listOpportunities(input: $input) {
      total
      opportunities {
        id
        ownerType
        title
        description
        status
        category
        type
        workMode
        engagementType
        location
        deadline
        applicationMethod
        externalLink
        applicationEmail
        salaryMin
        salaryMax
        salaryCurrency
        skills
        tags
        applicationCount
        priorityLevel
        isSavedByCurrentUser
        hasCurrentUserApplied
        currentUserApplicationId
        createdAt
        publishedAt
        owner { id name avatarUrl type }
      }
    }
  }
`;

export const GET_OPPORTUNITY_FEED = gql`
  query GetOpportunityFeed($input: GetOpportunityFeedInput!) {
    getOpportunityFeed(input: $input) {
      total
      opportunities {
        id
        ownerType
        title
        description
        status
        category
        type
        workMode
        engagementType
        location
        deadline
        applicationMethod
        externalLink
        applicationEmail
        salaryMin
        salaryMax
        salaryCurrency
        skills
        tags
        applicationCount
        priorityLevel
        isSavedByCurrentUser
        hasCurrentUserApplied
        currentUserApplicationId
        createdAt
        publishedAt
        owner { id name avatarUrl type }
      }
    }
  }
`;

// ============================================
// OPPORTUNITY MUTATIONS
// ============================================

export const CREATE_OPPORTUNITY = gql`
  mutation CreateOpportunity($input: CreateOpportunityInput!) {
    createOpportunity(input: $input)
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
      status
      coverLetter
      reviewNotes
      reviewedAt
      createdAt
      opportunity {
        id
        title
      }
    }
  }
`;

export const GET_USER_APPLICATIONS = gql`
  query UserApplications($limit: Int, $offset: Int, $status: String) {
    userApplications(limit: $limit, offset: $offset, status: $status) {
      total
      applications {
        id
        status
        createdAt
        updatedAt
        reviewNotes
        opportunity {
          id
          title
          category
          type
          owner { id name avatarUrl type }
        }
      }
    }
  }
`;

export const GET_APPLICATIONS = gql`
  query GetApplications($input: GetApplicationsInput!) {
    getApplications(input: $input) {
      total
      applications {
        id
        status
        createdAt
        reviewNotes
        applicantId
        coverLetter
        resumeFileRef { path filename mimeType sizeBytes }
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
      total
      savedOpportunities {
        id
        opportunityId
        savedAt
        opportunity {
          id
          title
          category
          type
          ownerType
          status
          deadline
          owner { id name avatarUrl type }
        }
      }
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
