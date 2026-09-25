'use client';

/**
 * Profile "Socials" tab — Apollo wiring for SocialLinksPanel.
 *
 * Deploy safety: this component only mounts when the Socials tab is open, so
 * `socialLinks` is queried lazily; if the gateway does not know the field yet
 * (frontend shipped first) the query errors, and the panel shows a friendly
 * "couldn't load" state instead of breaking the profile page.
 *
 * While any link is PENDING (the server checks it in the background) the list
 * polls every few seconds, and stops as soon as none is pending — or after a
 * bounded number of polls, so a stuck check can never poll forever.
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { toast } from 'sonner';
import SocialLinksPanel, { type SocialLinkOps } from './SocialLinksPanel';
import {
  ADD_SOCIAL_LINK,
  GET_SOCIAL_LINKS,
  RECHECK_SOCIAL_LINK,
  REMOVE_SOCIAL_LINK,
  UPDATE_SOCIAL_LINK,
} from '@/services/gql/socialLinks';
import type { SocialLink, SocialLinkResult, SocialPlatform } from '@/lib/socialLinks';

const POLL_MS = 3000;
const MAX_POLLS = 40; // ~2 minutes

interface ProfileSocialsProps {
  userId: string;
  isOwnProfile: boolean;
}

export default function ProfileSocials({ userId, isOwnProfile }: ProfileSocialsProps) {
  const { data, loading, error, refetch, startPolling, stopPolling } = useQuery<{ socialLinks: SocialLink[] | null }>(
    GET_SOCIAL_LINKS,
    {
      // Own profile: no userId → the caller's own links (every status), taken from the JWT.
      variables: isOwnProfile ? {} : { userId },
      skip: !isOwnProfile && !userId,
      fetchPolicy: 'network-only',
      notifyOnNetworkStatusChange: false,
    },
  );

  const links = useMemo(() => data?.socialLinks ?? [], [data]);
  const hasPending = links.some((l) => l.status === 'PENDING');
  const polls = useRef(0);

  useEffect(() => {
    if (!isOwnProfile || !hasPending) {
      polls.current = 0;
      stopPolling();
      return;
    }
    if (polls.current >= MAX_POLLS) {
      stopPolling();
      return;
    }
    polls.current += 1;
    startPolling(POLL_MS);
    return () => stopPolling();
  }, [isOwnProfile, hasPending, data, startPolling, stopPolling]);

  const [addMutation] = useMutation<{ addSocialLink: SocialLinkResult | null }>(ADD_SOCIAL_LINK);
  const [updateMutation] = useMutation<{ updateSocialLink: SocialLinkResult | null }>(UPDATE_SOCIAL_LINK);
  const [removeMutation] = useMutation<{ removeSocialLink: SocialLinkResult | null }>(REMOVE_SOCIAL_LINK);
  const [recheckMutation] = useMutation<{ recheckSocialLink: SocialLinkResult | null }>(RECHECK_SOCIAL_LINK);

  const afterWrite = useCallback(
    async (res: SocialLinkResult | null) => {
      // Refetch on success so the list (and polling) reflect the new PENDING row.
      if (res?.success === true) {
        polls.current = 0;
        try {
          await refetch();
        } catch {
          // The write already succeeded; a failed refetch only delays the list.
        }
      }
      return res;
    },
    [refetch],
  );

  const ops = useMemo<SocialLinkOps>(
    () => ({
      add: async (platform: SocialPlatform, input: string) =>
        afterWrite((await addMutation({ variables: { platform, input } })).data?.addSocialLink ?? null),
      update: async (id: string, input: string) =>
        afterWrite((await updateMutation({ variables: { id, input } })).data?.updateSocialLink ?? null),
      remove: async (id: string) => afterWrite((await removeMutation({ variables: { id } })).data?.removeSocialLink ?? null),
      recheck: async (id: string) => afterWrite((await recheckMutation({ variables: { id } })).data?.recheckSocialLink ?? null),
    }),
    [addMutation, updateMutation, removeMutation, recheckMutation, afterWrite],
  );

  const notify = useMemo(() => ({ success: (m: string) => toast.success(m), error: (m: string) => toast.error(m) }), []);

  return (
    <SocialLinksPanel
      isOwnProfile={isOwnProfile}
      links={links}
      loading={loading}
      error={!!error && !data?.socialLinks}
      onRetry={() => {
        void refetch().catch(() => undefined);
      }}
      ops={isOwnProfile ? ops : undefined}
      notify={notify}
    />
  );
}
