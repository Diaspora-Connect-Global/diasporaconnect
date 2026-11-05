'use client';

import { useEffect, useRef, useState } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { gql } from '@apollo/client';

/**
 * Finding a person to invite by name or username.
 *
 * `searchUserSummaries` is the gateway's people-picker query, and the only one
 * this should use. Its type has no contact fields, so no selection can ask for
 * them; it finds names AND exact @usernames in one request; it drops the viewer;
 * and it is throttled. It also keeps a promise `searchUsers` + `profileByUsername`
 * would break: someone who turned "Show me in search results" off is never
 * picked, not even by exact username.
 *
 * ── NOTHING HERE EVER SURFACES A USER ID ───────────────────────────────────
 * The id is the value sent as `inviteeUserId`; it is held in state only and is
 * never rendered, logged or put in an attribute the viewer can read.
 */

export const INVITE_SEARCH_PEOPLE = gql`
  query CircleInviteSearchPeople($query: String!, $limit: Int) {
    searchUserSummaries(query: $query, limit: $limit) {
      id
      displayName
      username
      avatarUrl
    }
  }
`;

export interface InvitePerson {
  /** Sent as `inviteeUserId`. Never rendered. */
  userId: string;
  name: string;
  username: string | null;
  avatarUrl: string | null;
}

export type InviteSearchState = 'idle' | 'loading' | 'ready' | 'error';

export const MIN_QUERY_LENGTH = 2;
export const MAX_RESULTS = 8;
const DEBOUNCE_MS = 300;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+?[\d\s().-]+$/;

/** What the typed text is, for deciding whether it is a search or a contact. */
export function classifyInviteText(raw: string): 'empty' | 'email' | 'phone' | 'text' {
  const text = raw.trim();
  if (!text) return 'empty';
  if (EMAIL_RE.test(text)) return 'email';
  const digits = text.replace(/\D/g, '');
  if (PHONE_RE.test(text) && digits.length >= 7 && digits.length <= 15) return 'phone';
  return 'text';
}

/** The text to search for: a leading "@" is the handle marker, not part of a name. */
export function searchTerm(raw: string): string {
  return raw.trim().replace(/^@+/, '').trim();
}

interface RawSummary {
  id?: string | null;
  displayName?: string | null;
  username?: string | null;
  avatarUrl?: string | null;
}

function toPerson(p: RawSummary): InvitePerson | null {
  // Someone with no name and no handle cannot be told apart, and the only thing
  // left to show would be an id.
  if (!p.id || (!p.displayName && !p.username)) return null;
  return {
    userId: p.id,
    name: p.displayName || `@${p.username}`,
    username: p.username ?? null,
    avatarUrl: p.avatarUrl ?? null,
  };
}

/**
 * Debounced, cancellable people search for the invite field.
 *
 * `enabled` is false while a person is already chosen or the text is a contact,
 * so a chosen name does not re-query and an email never hits people search.
 * Each new search aborts the previous request; a sequence number also drops a
 * response that lands late, because `AbortController` cannot cancel work the
 * server already started. `no-cache` so a stored list of people does not outlive
 * the picker, and someone who hides themselves stops appearing at once.
 */
export function useInvitePeopleSearch(text: string, enabled: boolean) {
  const client = useApolloClient();
  const [state, setState] = useState<InviteSearchState>('idle');
  const [people, setPeople] = useState<InvitePerson[]>([]);
  const seq = useRef(0);

  const term = searchTerm(text);
  const active = enabled && term.length >= MIN_QUERY_LENGTH;

  useEffect(() => {
    const mine = ++seq.current;
    if (!active) {
      setState('idle');
      setPeople([]);
      return;
    }
    setState('loading');
    const controller = new AbortController();

    const timer = setTimeout(async () => {
      let rows: RawSummary[] | null = null;
      try {
        const result = await client.query<{ searchUserSummaries?: RawSummary[] | null }>({
          query: INVITE_SEARCH_PEOPLE,
          variables: { query: term, limit: MAX_RESULTS },
          fetchPolicy: 'no-cache',
          context: { fetchOptions: { signal: controller.signal } },
        });
        // `errorPolicy: 'all'` resolves a failed query with `error` set, so a
        // resolved promise is not a successful search.
        if (!result.error) rows = result.data?.searchUserSummaries ?? null;
      } catch {
        rows = null;
      }
      if (mine !== seq.current) return;

      // A failed search is "search failed", never "no one found".
      setPeople((rows ?? []).map(toPerson).filter((p): p is InvitePerson => p !== null));
      setState(rows ? 'ready' : 'error');
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [active, term, client]);

  return { state, people };
}
