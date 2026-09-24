"use client";

/**
 * @fileoverview Settings: "Username" — Apollo wiring for UsernameSettingsForm.
 *
 * Refusals from `updateUsername` RESOLVE (errorPolicy 'all' + a
 * `{ success:false, code }` payload), so the form reads `success`/`code`,
 * never the absence of a throw. On success the profile query is refetched and
 * the persisted user store is patched so the header/profile show the new handle
 * immediately.
 *
 * @module components/settings/UsernameSection
 */

import { useCallback, useMemo } from "react";
import { useApolloClient, useMutation, useQuery } from "@apollo/client/react";
import { toast } from "sonner";

import UsernameSettingsForm from "@/components/settings/UsernameSettingsForm";
import {
  GET_MY_PROFILE,
  UPDATE_USERNAME,
  USERNAME_AVAILABILITY,
  type GetProfileResponse,
} from "@/services/gql/profile";
import type {
  UpdateUsernameResponse,
  UpdateUsernameResult,
  UsernameAvailabilityResponse,
} from "@/services/gql/types/profile";
import { useUserStore } from "@/store/useUserStore";

export default function UsernameSection() {
  const client = useApolloClient();
  const storeUser = useUserStore((s) => s.user);
  const { data, refetch } = useQuery<GetProfileResponse>(GET_MY_PROFILE);
  const [updateUsername] = useMutation<UpdateUsernameResponse>(UPDATE_USERNAME);

  const profile = data?.getProfile?.success ? data.getProfile.profile : null;
  const userId = profile?.userId ?? storeUser?.userId ?? "";
  const currentUsername = profile?.username ?? storeUser?.username ?? null;
  const nextChangeAt = profile
    ? (profile.usernameNextChangeAt ?? null)
    : (storeUser?.usernameNextChangeAt ?? null);

  const checkAvailability = useCallback(
    async (username: string) => {
      // network-only: availability changes; a cached "available" would lie.
      const { data: res } = await client.query<UsernameAvailabilityResponse>({
        query: USERNAME_AVAILABILITY,
        variables: { username },
        fetchPolicy: "network-only",
      });
      return res?.usernameAvailability ?? null;
    },
    [client],
  );

  const saveUsername = useCallback(
    async (username: string) => {
      const result = await updateUsername({ variables: { username } });
      return result.data?.updateUsername ?? null;
    },
    [updateUsername],
  );

  const onSaved = useCallback(
    async (res: UpdateUsernameResult & { username: string }) => {
      const current = useUserStore.getState().user;
      if (current) {
        useUserStore.getState().setUser({
          ...current,
          username: res.username,
          usernameChangedAt: new Date().toISOString(),
          usernameNextChangeAt: res.nextChangeAt ?? null,
        });
      }
      try {
        await refetch();
      } catch {
        // The store is already patched; a failed refetch only delays the cache.
      }
    },
    [refetch],
  );

  const notify = useMemo(
    () => ({
      success: (m: string) => toast.success(m),
      error: (m: string) => toast.error(m),
    }),
    [],
  );

  return (
    <UsernameSettingsForm
      userId={userId}
      currentUsername={currentUsername}
      nextChangeAt={nextChangeAt}
      checkAvailability={checkAvailability}
      saveUsername={saveUsername}
      onSaved={onSaved}
      notify={notify}
    />
  );
}
