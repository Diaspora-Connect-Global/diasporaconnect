'use client';

import { useId, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Check, Link2, Loader2, Send, UserPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import {
  readCircleWrite,
  refusalMessageKey,
} from '@/components/circles/governance/mutationOutcome';
import { INVITE_TO_CIRCLE } from '@/services/gql/circles';
import type {
  InviteToCircleData,
  InviteToCircleInput,
} from '@/services/gql/types/circles';

import { InvitePersonField } from './InvitePersonField';
import {
  classifyInviteText,
  useInvitePeopleSearch,
  type InvitePerson,
} from './inviteSearch';

export interface InviteCardProps {
  circleId: string;
}

/**
 * Invite ONE named person to the circle.
 *
 * ── THIS IS NOT THE INVITE-LINK PANEL, AND THE DIFFERENCE IS THE POINT ──────
 * `inviteToCircle` addresses somebody on the platform by user id: an invitation
 * that can be withdrawn. `InviteLinksPanel` mints a BEARER credential that
 * whoever holds the URL can use, that the circle cannot see the holders of, and
 * that survives being forwarded. The two sit together because they answer the
 * same question, and are kept visibly distinct because they are not the same
 * thing. The gateway limits both to a circle's leads, and the members page
 * renders this card for leads only.
 *
 * ── "COPY CIRCLE LINK" IS NOT AN INVITE LINK ────────────────────────────────
 * It copies this circle's own page URL — no token, nothing redeemable. It used
 * to be described here as unambiguous on the grounds that the API had no invite
 * tokens at all; that stopped being true the day `mintCircleInviteLink`
 * shipped, so the label now says which link it is rather than relying on there
 * being only one kind. Whether that URL gets the recipient in is the circle's
 * `joinMode`, which is the circle's decision to make, not this button's.
 *
 * ── ONE WAY TO NAME THE PERSON: PICK THEM ───────────────────────────────────
 * Only a person picked from the search sends anything (`inviteeUserId`, the
 * route that lands in their invitations inbox and notifies them). Typed text is
 * never sent as-is. An email address or phone number would have been stored as a
 * contact that nothing delivers and nothing matches to a user, so it reaches
 * nobody; the gateway now refuses such an invitation, and this card says so up
 * front ("search by name or username") instead of ticking one. Anything else
 * typed with nobody picked is likewise not sent, since it would address nobody.
 * Reaching someone who is not on the platform is the invite-link panel's job.
 *
 * The contact field is labelled rather than placeholder-only: the label is the
 * one string this card has for the action, and a visible label survives being
 * typed into where a placeholder does not.
 */
export function InviteCard({ circleId }: InviteCardProps) {
  const t = useTranslations('circles.members.invite');
  const tActions = useTranslations('circles.actions');

  const fieldId = useId();
  const hintId = `${fieldId}-hint`;

  const [text, setText] = useState('');
  const [chosen, setChosen] = useState<InvitePerson | null>(null);
  const [needsPick, setNeedsPick] = useState(false);
  const [invited, setInvited] = useState<string | null>(null);
  const [uncopiedLink, setUncopiedLink] = useState<string | null>(null);

  const kind = classifyInviteText(text);
  const searchable = kind === 'text' && !chosen;
  // Email- or phone-shaped text can never be sent; tell the person right away.
  const contactShaped = !chosen && (kind === 'email' || kind === 'phone');
  const hintKey = contactShaped ? 'nameOnly' : needsPick ? 'pickPerson' : null;
  const { state: searchState, people } = useInvitePeopleSearch(text, searchable);

  const [invite, { loading }] = useMutation<
    InviteToCircleData,
    { input: InviteToCircleInput }
  >(INVITE_TO_CIRCLE);

  async function handleCopyLink() {
    const url = `${window.location.origin}/circles/${circleId}`;
    try {
      await navigator.clipboard.writeText(url);
      setUncopiedLink(null);
      toast.success(t('circleLinkCopied'));
    } catch {
      // Clipboard access is refused outside a secure context and inside some
      // embedded browsers. Claiming success there would be a silent no-op, so
      // the link is rendered instead and can be selected by hand.
      setUncopiedLink(url);
    }
  }

  function refusalKey(outcome: { message: string | null; refusal: Parameters<typeof refusalMessageKey>[0] }) {
    // Two refusals that matter here are not in the shared classifier (which
    // answers UNKNOWN for them). Matched on the invariant prose only; the
    // sentence itself, which carries ids, is never rendered.
    const raw = (outcome.message ?? '').toLowerCase();
    if (raw.includes('already an active member')) return 'invite.alreadyMember';
    if (raw.includes('pending invitation already exists')) return 'invite.alreadyInvited';
    return `actions.writeErrors.${refusalMessageKey(outcome.refusal)}`;
  }

  function toastRefusal(key: string) {
    toast.error(key.startsWith('invite.') ? t(key.slice('invite.'.length)) : tActions(key.slice('actions.'.length)));
  }

  async function handleInvite(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    if (!chosen) {
      // Not a person we found: sending it would create an invitation nobody can
      // ever receive (an email or phone included). Say so instead.
      setNeedsPick(true);
      return;
    }
    const input: InviteToCircleInput = { circleId, inviteeUserId: chosen.userId };
    const echo = chosen.name;

    try {
      const result = await invite({ variables: { input } });

      /*
       * `data`, not the absence of a throw. The app's global
       * `errorPolicy: 'all'` RESOLVES a refused mutation with `data: null`, so
       * the catch below never saw a server refusal — a non-member calling this,
       * a malformed address, a circle that stopped being active between load
       * and submit all came back looking like nothing had happened, with the
       * field still full and no sign anything failed.
       *
       * The refusal sentence itself is never rendered: it is operator English
       * carrying raw UUIDs, in a product that ships in five locales. It is
       * classified into a key and answered from our own copy. See
       * `governance/mutationOutcome.ts`.
       */
      const outcome = readCircleWrite(result, (d) => d.inviteToCircle);
      if (!outcome.ok) {
        toastRefusal(refusalKey(outcome));
        return;
      }

      // The success signal is the echoed name below, and it is gated on the
      // outcome — never on the mere fact that the await returned.
      setInvited(echo);
      setText('');
      setChosen(null);
      setNeedsPick(false);
    } catch (error) {
      // A few failures genuinely do reject (a link-level throw, an aborted
      // request). Both paths converge on the same classified outcome.
      const outcome = readCircleWrite({ error }, () => null);
      toastRefusal(refusalKey(outcome));
    }
  }

  return (
    <section className="rounded-2xl border border-border-subtle bg-surface-default p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <UserPlus
          aria-hidden="true"
          className="mt-0.5 size-5 shrink-0 text-text-brand"
        />
        <div className="min-w-0 flex-1">
          <h2 className="label-medium text-text-primary">{t('title')}</h2>
          <p className="caption-small text-text-secondary">{t('description')}</p>
        </div>
      </div>

      <form className="mt-4 flex flex-col gap-2" onSubmit={handleInvite}>
        <label htmlFor={fieldId} className="label-small text-text-primary">
          {t('fieldLabel')}
        </label>
        <div className="flex items-start gap-2">
          <InvitePersonField
            id={fieldId}
            value={text}
            chosen={chosen !== null}
            searchable={searchable}
            state={searchState}
            people={people}
            describedBy={hintKey ? hintId : undefined}
            invalid={needsPick}
            onChange={(next) => {
              setText(next);
              setChosen(null);
              setNeedsPick(false);
              setInvited(null);
            }}
            onPick={(person) => {
              setChosen(person);
              setText(person.name);
              setNeedsPick(false);
              setInvited(null);
            }}
          />
          <button
            type="submit"
            disabled={!text.trim() || loading}
            aria-label={t('invitePerson')}
            className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-surface-brand text-text-white transition-colors hover:bg-border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-brand disabled:cursor-not-allowed disabled:bg-surface-disabled disabled:text-text-primary"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </button>
        </div>

        {hintKey && (
          <p
            id={hintId}
            role={needsPick ? 'alert' : 'status'}
            className={`caption-small break-words ${needsPick ? 'text-text-danger' : 'text-text-secondary'}`}
          >
            {t(hintKey)}
          </p>
        )}

        {/*
          Who was invited, by name. Never an id.
        */}
        {invited && (
          <p
            role="status"
            className="caption-small flex items-center gap-1.5 break-words text-text-success"
          >
            <Check className="size-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0">{t('invited', { name: invited })}</span>
          </p>
        )}
      </form>

      <button
        type="button"
        onClick={handleCopyLink}
        className="label-small mt-3 flex cursor-pointer items-center gap-2 text-text-brand"
      >
        <Link2 className="size-4 shrink-0" aria-hidden="true" />
        {t('copyCircleLink')}
      </button>

      {uncopiedLink && (
        <p className="caption-small mt-2 break-all text-text-secondary select-all">
          {uncopiedLink}
        </p>
      )}
    </section>
  );
}
