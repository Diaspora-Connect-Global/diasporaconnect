'use client';

import { useState } from 'react';
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

export interface InviteCardProps {
  circleId: string;
}

/**
 * Invite ONE named person to the circle.
 *
 * ── THIS IS NOT THE INVITE-LINK PANEL, AND THE DIFFERENCE IS THE POINT ──────
 * `inviteToCircle` addresses somebody: a user id or a contact, an invitation
 * that lands in their inbox and can be withdrawn. It is open to every member.
 * `InviteLinksPanel` mints a BEARER credential that whoever holds the URL can
 * use, that the circle cannot see the holders of, and that survives being
 * forwarded — which is why only a lead may create one. The two sit together
 * because they answer the same question, and are kept visibly distinct because
 * they are not the same permission.
 *
 * ── "COPY CIRCLE LINK" IS NOT AN INVITE LINK ────────────────────────────────
 * It copies this circle's own page URL — no token, nothing redeemable. It used
 * to be described here as unambiguous on the grounds that the API had no invite
 * tokens at all; that stopped being true the day `mintCircleInviteLink`
 * shipped, so the label now says which link it is rather than relying on there
 * being only one kind. Whether that URL gets the recipient in is the circle's
 * `joinMode`, which is the circle's decision to make, not this button's.
 *
 * The contact field is labelled rather than placeholder-only: the label is the
 * one string this card has for the action, and a visible label survives being
 * typed into where a placeholder does not.
 */
export function InviteCard({ circleId }: InviteCardProps) {
  const t = useTranslations('circles.members.invite');
  const tActions = useTranslations('circles.actions');

  const [contact, setContact] = useState('');
  const [invited, setInvited] = useState<string | null>(null);
  const [uncopiedLink, setUncopiedLink] = useState<string | null>(null);

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

  async function handleInvite(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = contact.trim();
    if (!trimmed || loading) return;

    // `inviteeContact` is the path for someone who is not on the platform yet;
    // an existing user is matched server-side.
    try {
      const result = await invite({
        variables: { input: { circleId, inviteeContact: trimmed } },
      });

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
        toast.error(tActions(`writeErrors.${refusalMessageKey(outcome.refusal)}`));
        return;
      }

      // The success signal is the echoed contact below, and it is gated on the
      // outcome — never on the mere fact that the await returned.
      setInvited(trimmed);
      setContact('');
    } catch (error) {
      // A few failures genuinely do reject (a link-level throw, an aborted
      // request). Both paths converge on the same classified outcome.
      const outcome = readCircleWrite({ error }, () => null);
      toast.error(tActions(`writeErrors.${refusalMessageKey(outcome.refusal)}`));
    }
  }

  return (
    <section className="rounded-xl border border-border-subtle p-4">
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
        <label
          htmlFor="circle-invite-contact"
          className="label-small text-text-primary"
        >
          {t('invitePerson')}
        </label>
        <div className="flex items-center gap-2">
          <input
            id="circle-invite-contact"
            type="text"
            value={contact}
            onChange={(event) => {
              setContact(event.target.value);
              setInvited(null);
            }}
            className="body-small min-w-0 flex-1 rounded-full border border-border-subtle bg-surface-subtle px-4 py-2 text-text-primary outline-none focus-visible:border-text-brand"
          />
          <button
            type="submit"
            disabled={!contact.trim() || loading}
            aria-label={t('invitePerson')}
            className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-surface-brand text-text-white transition-colors hover:bg-border-brand disabled:cursor-not-allowed disabled:bg-surface-disabled disabled:text-text-primary"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </button>
        </div>

        {/*
          The invited contact echoed back, rather than a sentence: it names
          exactly who was invited, and says it in whatever language the address
          was typed in.
        */}
        {invited && (
          <p className="caption-small flex items-center gap-1.5 text-text-success">
            <Check className="size-4 shrink-0" aria-hidden="true" />
            {invited}
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
