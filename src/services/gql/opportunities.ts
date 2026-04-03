import { gql } from '@apollo/client';

// ============================================
// OPPORTUNITY QUERIES
// ============================================

export const GET_OPPORTUNITY = gql`
  query GetOpportunity($id: String!) {
    getOpportunity(id: $id) {
      id
      ownerId
      ownerType
      visibility
      priorityLevel
      title
      description
      scope
      eligibilityCriteria
      status
      category
      type
      subCategory
      deliveryMode
      commitmentType
      location
      duration
      applicationMethod
      externalLink
      applicationEmail
      compensationMin
      compensationMax
      compensationCurrency
      compensationType
      benefitsSummary
      eligibilityRegions
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
  query ListOpportunities($input: ListOpportunitiesInput!) {
    listOpportunities(input: $input) {
      total
      opportunities {
        id
        ownerId
        ownerType
        visibility
        priorityLevel
        title
        description
        status
        category
        type
        deliveryMode
        commitmentType
        location
        duration
        deadline
        applicationMethod
        externalLink
        applicationEmail
        compensationMin
        compensationMax
        compensationCurrency
        compensationType
        skills
        tags
        applicationCount
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

export const OPPORTUNITIES = gql`
  query Opportunities($input: ListOpportunitiesInput!) {
    opportunities(input: $input) {
      total
      opportunities {
        id
        ownerId
        ownerType
        visibility
        priorityLevel
        title
        description
        status
        category
        type
        deliveryMode
        commitmentType
        location
        duration
        deadline
        applicationMethod
        externalLink
        applicationEmail
        compensationMin
        compensationMax
        compensationCurrency
        compensationType
        skills
        tags
        applicationCount
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
        ownerId
        ownerType
        visibility
        priorityLevel
        title
        description
        status
        category
        type
        deliveryMode
        commitmentType
        location
        duration
        deadline
        applicationMethod
        externalLink
        applicationEmail
        compensationMin
        compensationMax
        compensationCurrency
        compensationType
        skills
        tags
        applicationCount
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

// ============================================
// APPLICATION QUERIES
// ============================================

export const GET_APPLICATION = gql`
  query GetApplication($applicationId: String!) {
    getApplication(applicationId: $applicationId) {
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
      opportunity {
        id
        title
        category
        type
        applicationMethod
        deadline
      }
      applicantProfile {
        userId
        firstName
        middleName
        lastName
        email
        phone
        bio
        avatarUrl
        location
        city
        countryOfOrigin
        residenceCountry
        role
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
          deadline
          applicationMethod
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
        opportunityId
        applicantId
        status
        createdAt
        updatedAt
        reviewNotes
        coverLetter
        resumeFileRef { path filename mimeType sizeBytes }
        applicantProfile {
          userId
          firstName
          middleName
          lastName
          email
          phone
          bio
          avatarUrl
          location
          city
          countryOfOrigin
          residenceCountry
          role
        }
        opportunity {
          id
          title
          category
          type
          ownerType
          applicationMethod
          deadline
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

export const WITHDRAW_APPLICATION = gql`
  mutation WithdrawApplication($applicationId: String!) {
    withdrawApplication(applicationId: $applicationId)
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
