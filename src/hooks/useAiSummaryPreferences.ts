"use client";

import { useCallback } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import {
  MY_AI_SUMMARY_PREFERENCES,
  UPDATE_AI_SUMMARY_PREFERENCES,
  type AiSummaryPreferences,
  type MyAiSummaryPreferencesData,
  type UpdateAiSummaryPreferencesData,
  type UpdateAiSummaryPreferencesVariables,
} from "@/services/gql/aiSummaryPreferences";

/**
 * The signed-in user's AI group-chat summary settings (Settings → Privacy).
 *
 * One cached query shared by every caller (settings page, group chat), so the
 * chat can hide digest cards without an extra request per conversation.
 *
 * `showSummaries` for display purposes:
 *  - while the first load is in flight → `false` (an opted-out user never sees
 *    a digest flash in before it is hidden);
 *  - if the query fails (e.g. the backend is older than this client) → `true`,
 *    i.e. the pre-existing behaviour — never hide content because of an error.
 */
export function useAiSummaryPreferences(options: { skip?: boolean } = {}) {
  const { data, loading, error } = useQuery<MyAiSummaryPreferencesData>(MY_AI_SUMMARY_PREFERENCES, {
    skip: options.skip,
    fetchPolicy: "cache-first",
  });
  const [mutate, { loading: saving }] = useMutation<
    UpdateAiSummaryPreferencesData,
    UpdateAiSummaryPreferencesVariables
  >(UPDATE_AI_SUMMARY_PREFERENCES);

  const prefs: AiSummaryPreferences | null = data?.myAiSummaryPreferences ?? null;

  /**
   * Persist one or both switches. Resolves to the saved settings; throws when
   * the server refused or failed (callers revert + toast). The cache entry for
   * `myAiSummaryPreferences` is overwritten so every consumer updates at once.
   */
  const update = useCallback(
    async (patch: Partial<AiSummaryPreferences>): Promise<AiSummaryPreferences> => {
      const res = await mutate({
        variables: { input: patch },
        update(cache, { data: result }) {
          const saved = result?.updateAiSummaryPreferences;
          if (saved) {
            cache.writeQuery<MyAiSummaryPreferencesData>({
              query: MY_AI_SUMMARY_PREFERENCES,
              data: { myAiSummaryPreferences: { __typename: "AiSummaryPreferences", ...saved } as AiSummaryPreferences },
            });
          }
        },
      });
      const saved = res.data?.updateAiSummaryPreferences;
      // A refused mutation can RESOLVE with data:null (errorPolicy) — check the
      // data, not the absence of a throw.
      if (!saved || res.error) throw new Error("AI summary settings were not saved");
      return saved;
    },
    [mutate],
  );

  const showSummaries = error ? true : prefs ? prefs.showSummaries : false;

  return { prefs, loading, error, saving, update, showSummaries };
}
