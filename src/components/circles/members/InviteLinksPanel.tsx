'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Link2, Loader2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { ButtonType2 } from '@/components/custom/button';
import {
  CIRCLE_INVITE_LINKS,
  MINT_CIRCLE_INVITE_LINK,
  REVOKE_CIRCLE_INVITE_LINK,
} from '@/services/gql/circles-invites';
import {
  CIRCLE_INVITE_LINK_MAX_USES,
  CIRCLE_INVITE_LINK_MIN_USES,
  CIRCLE_MAX_LIVE_INVITE_LINKS,
  type CircleInviteLinksData,
  type CircleInviteLinksVariables,
  type MintCircleInviteLinkData,
  type MintCircleInviteLinkVariables,
  type RevokeCircleInviteLinkData,
  type RevokeCircleInviteLinkVariables,
} from '@/services/gql/types/circles-invites';

import { InviteLinkRow } from './InviteLinkRow';
import { MintedLinkReveal } from './MintedLinkReveal';
import { buildCircleInviteUrl, countLiveInviteLinks } from './inviteLinkStatus';

export interface InviteLinksPanelProps {
  circleId: string;
}

/** How long a new link may run. 14 days is the ceiling circle-service clamps to. */
const EXPIRY_PRESET_HOURS = [24, 24 * 7, 24 * 14] as const;
type ExpiryPresetHours = (typeof EXPIRY_PRESET_HOURS)[number];

const DEFAULT_EXPIRY_HOURS: ExpiryPresetHours = 24 * 7;
const DEFAULT_MAX_USES = 10;

/** Re-derive statuses about twice a minute — finer than a link's life, coarser than a re-render storm. */
const CLOCK_INTERVAL_MS = 30_000;

/**
 * A clock that does not exist until the component has mounted.
 *
 * `null` on the server and on the first client render, so anything derived from
 * it renders identically on both and cannot cause a hydration mismatch. See
 * `effectiveInviteLinkStatus`, which falls back to the server's own answer for
 * exactly that window.
 */
function useNow(intervalMs: number): number | null {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);

  return now;
}

/**
 * Shareable invite links — mint, inventory, revoke. LEAD ONLY.
 *
 * ── WHY THIS IS LEAD-GATED WHEN INVITING A PERSON IS NOT ────────────────────
 * Any member may invite one named person: that invitation has an addressee, it
 * appears in their inbox, and it can be withdrawn. A LINK is a bearer
 * credential — whoever holds the URL gets in, the circle cannot see who holds
 * it, and it survives being forwarded. Letting every member open the circle to
 * an audience the rest never agreed to is not the same permission, so the
 * gateway refuses it and this panel is not rendered for anyone else.
 *
 * That gate is also why the query is SKIPPED rather than simply hidden: an
 * unskipped LEAD-gated query would put a permission error on the screen of
 * every ordinary member looking at the roster.
 *
 * ── THE CAP IS SURFACED BEFORE IT BITES ─────────────────────────────────────
 * A circle may hold ten LIVE links. The count is computed here from the same
 * rule circle-service enforces (`status = 'ACTIVE' AND expires_at > now`, which
 * includes fully-spent links — see `occupiesLiveSlot`), so the mint control is
 * already disabled with an explanation by the time the tenth exists, instead of
 * failing at the server with an error the person cannot act on.
 *
 * ── MINTING NEVER INVALIDATES AN EARLIER LINK ───────────────────────────────
 * Links coexist. "Minting supersedes" would make mint destructive at a
 * distance: a lead generating a link for one group chat would silently kill the
 * one they posted in another yesterday, and everyone holding the old URL would
 * be refused with no way to know why. Killing a link is therefore explicit,
 * attributable, and asks first.
 */
export function InviteLinksPanel({ circleId }: InviteLinksPanelProps) {
  const t = useTranslations('circles.invites');
  const locale = useLocale();
  const now = useNow(CLOCK_INTERVAL_MS);

  const [maxUses, setMaxUses] = useState(String(DEFAULT_MAX_USES));
  const [expiryHours, setExpiryHours] =
    useState<ExpiryPresetHours>(DEFAULT_EXPIRY_HOURS);

  /*
   * The one place the freshly minted URL lives, and it lives ONLY here. Nothing
   * can return the token a second time, so it is never written to a store, a
   * query cache, a route or a log — component state that dies with the panel is
   * the correct lifetime for a credential the user is being asked to copy now.
   */
  const [mintedUrl, setMintedUrl] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const variables: CircleInviteLinksVariables = { circleId };

  const { data, loading, error } = useQuery<
    CircleInviteLinksData,
    CircleInviteLinksVariables
  >(CIRCLE_INVITE_LINKS, {
    variables,
    skip: !circleId,
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all',
  });

  const links = data?.circleInviteLinks ?? [];
  const liveCount = countLiveInviteLinks(links, now);
  const atCap = liveCount >= CIRCLE_MAX_LIVE_INVITE_LINKS;

  /*
   * A cap line is only worth showing if the count behind it is real. When the
   * links query failed outright, `links` is empty and the arithmetic would
   * cheerfully announce "0 of 10 live links in use" — a confident number that
   * happens to be fiction, and precisely the kind the person would act on.
   *
   * Minting stays ENABLED in that case rather than being blocked on a count we
   * could not take: the server enforces the cap regardless, so failing open
   * costs at worst one refusal, while failing closed would make an unrelated
   * read outage look like a limit the circle had hit.
   */
  const capKnown = !error || links.length > 0;

  const [mint, { loading: minting }] = useMutation<
    MintCircleInviteLinkData,
    MintCircleInviteLinkVariables
  >(MINT_CIRCLE_INVITE_LINK, {
    // The new link has to appear in the inventory below the reveal, and there
    // is no way to write it into the cache by hand without also deciding where
    // a mint-only payload's token would live in a normalised store.
    refetchQueries: [{ query: CIRCLE_INVITE_LINKS, variables }],
  });

  const [revoke] = useMutation<
    RevokeCircleInviteLinkData,
    RevokeCircleInviteLinkVariables
  >(REVOKE_CIRCLE_INVITE_LINK, {
    refetchQueries: [{ query: CIRCLE_INVITE_LINKS, variables }],
  });

  const parsedUses = Number.parseInt(maxUses, 10);
  const usesValid =
    Number.isFinite(parsedUses) &&
    parsedUses >= CIRCLE_INVITE_LINK_MIN_USES &&
    parsedUses <= CIRCLE_INVITE_LINK_MAX_USES;

  async function handleMint(event: React.FormEvent) {
    event.preventDefault();
    if (!usesValid || minting || (atCap && capKnown)) return;

    /*
     * An absolute instant, not a duration: `expiresAt` is an ISO timestamp and
     * circle-service clamps anything past +14 days rather than refusing it, so
     * a request for longer would succeed and quietly return something shorter.
     * The presets stay inside the ceiling so what the lead picked is what they
     * get.
     */
    const expiresAt = new Date(
      Date.now() + expiryHours * 3_600_000,
    ).toISOString();

    try {
      const { data: minted } = await mint({
        variables: { input: { circleId, maxUses: parsedUses, expiresAt } },
      });

      const token = minted?.mintCircleInviteLink?.token;
      if (!token) {
        // The gateway raises rather than returning a tokenless mint, so this is
        // belt-and-braces — but rendering a reveal panel around an empty URL
        // would be worse than saying nothing, and the global error link has
        // already spoken if the call actually failed.
        return;
      }

      setMintedUrl(buildCircleInviteUrl(window.location.origin, locale, token));
    } catch {
      // The client's global ErrorLink already toasts GraphQL failures; catching
      // here only stops the rejection escaping the submit handler unhandled.
    }
  }

  async function handleRevoke(inviteLinkId: string) {
    if (revokingId) return;
    setRevokingId(inviteLinkId);
    try {
      await revoke({ variables: { circleId, inviteLinkId } });
    } catch {
      // Surfaced by the global ErrorLink; the row simply stays as it was.
    } finally {
      setRevokingId(null);
    }
  }

  return (
    <section className="rounded-xl border border-border-subtle p-4">
      <div className="flex items-start gap-3">
        <Link2
          aria-hidden="true"
          className="mt-0.5 size-5 shrink-0 text-text-brand"
        />
        <div className="min-w-0 flex-1">
          <h2 className="label-medium text-text-primary">{t('title')}</h2>
          <p className="caption-small text-text-secondary">
            {t('description')}
          </p>
        </div>
      </div>

      {mintedUrl && (
        <div className="mt-4">
          <MintedLinkReveal
            url={mintedUrl}
            onDismiss={() => setMintedUrl(null)}
          />
        </div>
      )}

      <form className="mt-4 flex flex-wrap items-end gap-3" onSubmit={handleMint}>
        <div className="flex flex-col gap-1">
          <label
            htmlFor="circle-invite-link-uses"
            className="label-small text-text-primary"
          >
            {t('mint.maxUses')}
          </label>
          <input
            id="circle-invite-link-uses"
            type="number"
            inputMode="numeric"
            min={CIRCLE_INVITE_LINK_MIN_USES}
            max={CIRCLE_INVITE_LINK_MAX_USES}
            value={maxUses}
            onChange={(event) => setMaxUses(event.target.value)}
            aria-describedby="circle-invite-link-uses-hint"
            className="body-small w-24 rounded-full border border-border-subtle bg-surface-subtle px-4 py-2 text-text-primary outline-none focus-visible:border-text-brand"
          />
          <span
            id="circle-invite-link-uses-hint"
            className="caption-small text-text-secondary"
          >
            {t('mint.maxUsesHint', { max: CIRCLE_INVITE_LINK_MAX_USES })}
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="circle-invite-link-expiry"
            className="label-small text-text-primary"
          >
            {t('mint.expiry')}
          </label>
          <select
            id="circle-invite-link-expiry"
            value={expiryHours}
            onChange={(event) =>
              setExpiryHours(Number(event.target.value) as ExpiryPresetHours)
            }
            className="body-small rounded-full border border-border-subtle bg-surface-subtle px-4 py-2 text-text-primary outline-none focus-visible:border-text-brand"
          >
            {/*
              Presets rather than a date picker: every value here is inside the
              +14-day ceiling, so there is no way to ask for a life the server
              will silently shorten.
            */}
            {EXPIRY_PRESET_HOURS.map((hours) => (
              <option key={hours} value={hours}>
                {t(`mint.expiryOption.${hours}`)}
              </option>
            ))}
          </select>
        </div>

        <ButtonType2 type="submit" disabled={!usesValid || minting || (atCap && capKnown)}>
          <span className="flex items-center gap-2">
            {minting && (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            )}
            {t('mint.submit')}
          </span>
        </ButtonType2>
      </form>

      {/*
        Said BEFORE the mint fails, not after. `aria-live` because the cap can
        be reached by the person's own last mint, and the button going quiet
        with no explanation is the failure mode this replaces.
      */}
      {capKnown && (
        <p className="caption-small mt-2 text-text-secondary" aria-live="polite">
          {atCap
            ? t('mint.capReached', { max: CIRCLE_MAX_LIVE_INVITE_LINKS })
            : t('mint.capRemaining', {
                live: liveCount,
                max: CIRCLE_MAX_LIVE_INVITE_LINKS,
              })}
        </p>
      )}

      <div className="mt-4">
        {loading && links.length === 0 ? (
          <p className="caption-small text-text-secondary">{t('loading')}</p>
        ) : error && links.length === 0 ? (
          /*
            Degraded, not fatal: individual invitations sit right above this and
            still work, so a links outage must not take the whole invite section
            down with it.
          */
          <p className="caption-small text-text-secondary">{t('loadError')}</p>
        ) : links.length === 0 ? (
          <p className="caption-small text-text-secondary">{t('empty')}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {/*
              Every state is listed, including revoked and expired ones, because
              "revoked on Tuesday" and "never existed" must not look the same to
              a lead asking what became of the link they posted last week.
            */}
            {links.map((link) => (
              <InviteLinkRow
                key={link.id}
                link={link}
                now={now}
                onRevoke={handleRevoke}
                revoking={revokingId === link.id}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
