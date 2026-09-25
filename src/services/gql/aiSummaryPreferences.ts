import { gql } from '@apollo/client';

/**
 * Settings → Privacy → "AI chat summaries". Both operations act on the
 * signed-in user only (the gateway takes the id from the JWT).
 */

export interface AiSummaryPreferences {
  /** Include my group-chat messages when the daily AI summary is written. */
  includeMyMessages: boolean;
  /** Show AI daily summaries (cards + notifications) in my group chats. */
  showSummaries: boolean;
}

export interface MyAiSummaryPreferencesData {
  myAiSummaryPreferences: AiSummaryPreferences;
}

export interface UpdateAiSummaryPreferencesData {
  updateAiSummaryPreferences: AiSummaryPreferences;
}

export interface UpdateAiSummaryPreferencesVariables {
  input: Partial<AiSummaryPreferences>;
}

export const MY_AI_SUMMARY_PREFERENCES = gql`
  query MyAiSummaryPreferences {
    myAiSummaryPreferences {
      includeMyMessages
      showSummaries
    }
  }
`;

export const UPDATE_AI_SUMMARY_PREFERENCES = gql`
  mutation UpdateAiSummaryPreferences($input: UpdateAiSummaryPreferencesInput!) {
    updateAiSummaryPreferences(input: $input) {
      includeMyMessages
      showSummaries
    }
  }
`;
