/**
 * @fileoverview Merges chat messages and circle artefacts into ONE conversation.
 * @module components/circles/home/timeline
 *
 * ── WHY THIS EXISTS ─────────────────────────────────────────────────────────
 * Chat is the circle. A project, a motion and a challenge are not sections
 * behind tabs — they are things that happened *in the conversation*, and they
 * have to render where they happened, with the message that argued for them
 * directly above. A vote read next to its argument is a group of friends
 * deciding something; the same vote behind a "Governance" tab is a form.
 *
 * ── THE ONLY JOIN KEY IS TIME ───────────────────────────────────────────────
 * Messages come from message-service (`getMessages`) and artefacts come from
 * circle-service (`circleMotions` / `circleProjects` / `circleChallenges`).
 * Nothing links the two: a motion carries no `messageId`, and message-service
 * has no card message type. `createdAt` is therefore the join, and interleaving
 * by it is not a workaround — it reproduces the real order of events, which is
 * exactly what the screen is showing.
 *
 * The same idiom already exists in `chats/GroupChat.tsx`, which splices the AI
 * daily digest into the message list by comparing its timestamp against each
 * message's `createdAt`.
 *
 * ── NOTHING IS EVER DROPPED ─────────────────────────────────────────────────
 * An artefact with a missing or unparseable timestamp sorts to the END rather
 * than being filtered out. A motion the circle is actively voting on must never
 * vanish from the conversation because a timestamp failed to parse — being in
 * the wrong place is recoverable, being absent is not.
 *
 * Pure and React-free on purpose, so the ordering rules are testable without a
 * renderer.
 */

import type {
  CircleChallenge,
  CircleMotion,
  CircleProject,
} from '@/services/gql/types/circles';
import type { ApiMessage } from '@/store/ChatStore';

/**
 * One row of the merged conversation.
 *
 * `iso` is kept alongside `at` because the renderer needs the original string
 * to compute a calendar-day key in the viewer's timezone (`getMessageDateKey`),
 * which an epoch number cannot answer on its own.
 */
export type CircleTimelineEntry =
  | { kind: 'message'; key: string; at: number | null; iso: string | null; message: ApiMessage }
  | { kind: 'project'; key: string; at: number | null; iso: string | null; project: CircleProject }
  | { kind: 'motion'; key: string; at: number | null; iso: string | null; motion: CircleMotion }
  | { kind: 'challenge'; key: string; at: number | null; iso: string | null; challenge: CircleChallenge };

export interface BuildCircleTimelineInput {
  messages: ApiMessage[];
  projects: CircleProject[];
  motions: CircleMotion[];
  challenges: CircleChallenge[];
}

/** Epoch milliseconds, or null for an absent or unparseable timestamp. */
function toEpoch(iso?: string | null): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime();
  return Number.isNaN(ms) ? null : ms;
}

/**
 * Pick the moment an artefact entered the conversation.
 *
 * `createdAt` is preferred over the lifecycle timestamps (`opensAt`,
 * `startsAt`): a motion scheduled to open later was still *proposed* — and
 * discussed — when it was created, and that is the message it belongs next to.
 */
function enteredAt(createdAt?: string | null, fallback?: string | null): string | null {
  return createdAt ?? fallback ?? null;
}

/**
 * Merge messages and artefacts into a single chronological list.
 *
 * Sort rules:
 *  1. Ascending by timestamp — oldest first, matching the chat reading order.
 *  2. Ties break by insertion order, and messages are inserted before
 *     artefacts. "I've just proposed a motion." therefore lands above the
 *     motion card it announces even when both carry the same millisecond.
 *  3. Entries with no usable timestamp sort last, keeping their relative order.
 */
export function buildCircleTimeline({
  messages,
  projects,
  motions,
  challenges,
}: BuildCircleTimelineInput): CircleTimelineEntry[] {
  const entries: CircleTimelineEntry[] = [];

  for (const message of messages) {
    entries.push({
      kind: 'message',
      key: `message:${message.id}`,
      at: toEpoch(message.createdAt),
      iso: message.createdAt ?? null,
      message,
    });
  }

  for (const project of projects) {
    const iso = enteredAt(project.createdAt);
    entries.push({ kind: 'project', key: `project:${project.id}`, at: toEpoch(iso), iso, project });
  }

  for (const motion of motions) {
    const iso = enteredAt(motion.createdAt, motion.opensAt);
    entries.push({ kind: 'motion', key: `motion:${motion.id}`, at: toEpoch(iso), iso, motion });
  }

  for (const challenge of challenges) {
    const iso = enteredAt(challenge.createdAt, challenge.startsAt);
    entries.push({
      kind: 'challenge',
      key: `challenge:${challenge.id}`,
      at: toEpoch(iso),
      iso,
      challenge,
    });
  }

  // Decorate with the insertion index so the tie-break is explicit rather than
  // relying on the caller knowing that Array#sort is stable.
  return entries
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => {
      if (a.entry.at === null && b.entry.at === null) return a.index - b.index;
      if (a.entry.at === null) return 1;
      if (b.entry.at === null) return -1;
      return a.entry.at - b.entry.at || a.index - b.index;
    })
    .map(({ entry }) => entry);
}

/** Every user id the timeline needs a display identity for. */
export function collectTimelineUserIds(entries: CircleTimelineEntry[]): string[] {
  const ids = new Set<string>();
  for (const entry of entries) {
    switch (entry.kind) {
      case 'message':
        if (entry.message.senderId) ids.add(entry.message.senderId);
        break;
      case 'project':
        if (entry.project.createdBy) ids.add(entry.project.createdBy);
        break;
      case 'motion':
        if (entry.motion.proposedBy) ids.add(entry.motion.proposedBy);
        break;
      case 'challenge':
        if (entry.challenge.createdBy) ids.add(entry.challenge.createdBy);
        break;
    }
  }
  return Array.from(ids);
}
