'use client';

import { useMutation } from '@apollo/client/react';
import {
  ArrowRight,
  Ban,
  CircleSlash,
  Clock,
  Link2Off,
  Loader2,
  RotateCw,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  classifyRedeemFailure,
  isNewLinkPointless,
  isRetryable,
  readInviteToken,
  type CircleJoinRefusal,
} from '@/components/circles/join';
import { ButtonType2 } from '@/components/custom/button';
import { Link, useRouter } from '@/i18n/navigation';
import { CIRCLE_COLUMN_CLASS } from '@/lib/feedColumnLayout';
import { REDEEM_CIRCLE_INVITE_LINK } from '@/services/gql/circles-invites';
import type {
  RedeemCircleInviteLinkData,
  RedeemCircleInviteLinkVariables,
} from '@/services/gql/types/circles-invites';

/**
 * How long the confirmation stays on screen before the circle opens itself.
 *
 * Long enough to read WHICH circle was joined — the one fact the person came
 * here for and the only place it is ever stated — and short enough that it does
 * not read as a dead end. The button below it is live the whole time, so this
 * is a floor on the wait, never a gate.
 */
const AUTO_OPEN_MS = 1600;

/**
 * The refusals this screen actually RENDERS.
 *
 * `ALREADY_MEMBER` is excluded on purpose, and the exclusion is load-bearing
 * rather than tidy: it is the one classification that resolves to a way IN
 * (`kind: 'already'`), so it has no `circles.join.refused.*` copy — and since
 * the refusal value is used directly as an i18n key, a future edit that routed
 * it here would produce a missing-key crash at runtime, on a screen that only
 * fails for people who are already members. Excluding it makes the compiler
 * refuse that edit instead: `handleRedeem` must peel `ALREADY_MEMBER` off
 * before it can reach `setState`, which is exactly the invariant we want.
 */
type JoinRefusalShown = Exclude<CircleJoinRefusal, 'ALREADY_MEMBER'>;

/** The screen has exactly four resting places. */
type JoinState =
  | { kind: 'working' }
  | { kind: 'joined'; circleId: string; circleName: string }
  | { kind: 'already'; circleId?: string }
  | { kind: 'refused'; refusal: JoinRefusalShown };

/**
 * One state, one shape: an icon, a heading, an explanation and up to two
 * actions. Every branch of this screen renders through here so that a refusal
 * cannot accidentally look more or less alarming than its neighbour because it
 * was marked up separately.
 *
 * `tone` drives colour only. The words are the channel that survives being
 * colour-blind, so nothing here is distinguished by colour alone.
 */
function JoinCard({
  icon,
  tone = 'neutral',
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  tone?: 'neutral' | 'success' | 'danger';
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  // `bg-surface-danger` is a LIGHT swatch in both themes (#ffebeb / #ffc9c9),
  // so it is paired only with `text-text-danger`. Putting `text-text-primary`
  // on it would be unreadable in dark mode, where that token is near-white.
  const iconTone =
    tone === 'success'
      ? 'bg-surface-brand-light text-text-success'
      : tone === 'danger'
        ? 'bg-surface-danger text-text-danger'
        : 'bg-surface-subtle text-text-secondary';

  return (
    <section className="mx-auto flex w-full max-w-md flex-col items-center rounded-xl border border-border-subtle p-6 text-center">
      <span
        aria-hidden="true"
        className={`mb-4 flex size-12 items-center justify-center rounded-full ${iconTone}`}
      >
        {icon}
      </span>
      <h1 className="heading-small text-text-primary">{title}</h1>
      <p className="body-small mt-2 text-text-secondary">{description}</p>
      {children && (
        <div className="mt-6 flex w-full flex-col items-center gap-3">{children}</div>
      )}
    </section>
  );
}

/**
 * Redeem a circle invite link.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  THE OTHER END OF `buildCircleInviteUrl`
 * ═══════════════════════════════════════════════════════════════════════════
 * `components/circles/members/inviteLinkStatus.ts::buildCircleInviteUrl` mints
 * `${origin}/${locale}/circles/join?token=…`. This route is the only thing that
 * answers it; until it existed every link a lead copied led to a 404. The two
 * agree in one place on purpose — if the URL shape has to change, change the
 * helper and this file together.
 *
 * ── EVERY REFUSAL GETS ITS OWN WORDS ───────────────────────────────────────
 * Expired, revoked and exhausted are three different facts with three
 * different next actions, and "invalid link" for all of them tells the person
 * nothing about whether asking for another one is worth their time. A full
 * circle is a fourth: the link was perfectly good, so the copy says so and
 * explicitly does NOT suggest getting a new one, which would fail identically.
 * The classification lives in `redeemOutcome.ts` — read the doc there before
 * touching a pattern, because the server has no error codes and the message is
 * the only signal that survives the trip.
 *
 * ── ALREADY A MEMBER IS NOT A FAILURE ──────────────────────────────────────
 * circle-service refuses a member who re-clicks their own link, deliberately,
 * so that a bored member cannot burn the circle's budget. That refusal is an
 * ERROR on the wire and must not be one on the screen: the person clicked a
 * link to get into a circle they are already in, so they are taken in with a
 * note. See `handleRedeem` for why the circle id is recovered the way it is.
 *
 * ── THE MUTATION FIRES EXACTLY ONCE ────────────────────────────────────────
 * Guarded by a ref rather than by the effect's dependency list. React StrictMode
 * runs effects twice in development, and this is a mutation that consumes a use
 * of a shared, finite credential; "it happens to be idempotent server-side" is
 * not a reason to send it twice.
 *
 * ── THE TOKEN STAYS IN THE URL ─────────────────────────────────────────────
 * It is a bearer credential, and the instinct is to strip it. It is not
 * stripped, for two reasons: it is already in this person's address bar and
 * history by construction — that is how they arrived — so rewriting the bar
 * removes none of the exposure that matters (their chat app still holds it);
 * and a rewrite would break the one recovery available when the network drops
 * mid-redeem, which is to reload. The token is never logged, never persisted
 * and never pushed through the router, per `buildCircleInviteUrl`'s contract.
 * On success we `replace` rather than `push`, so the spent-token URL leaves the
 * history stack and Back cannot return to it.
 */
export default function CircleJoinPage() {
  const t = useTranslations('circles.join');
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [state, setState] = useState<JoinState>({ kind: 'working' });
  // Keyed on the token rather than a boolean: a bare `attempted` flag would
  // also swallow a genuinely DIFFERENT token arriving on the same mounted
  // route, silently showing the first link's outcome for the second link.
  // `useRef` (not state) because changing it must never trigger a render.
  const attemptedToken = useRef<string | null>(null);
  const navigated = useRef(false);

  const [redeem] = useMutation<
    RedeemCircleInviteLinkData,
    RedeemCircleInviteLinkVariables
  >(REDEEM_CIRCLE_INVITE_LINK, {
    // Joining changes `myCircles`, a ROOT_QUERY list this mutation's result
    // cannot merge into on its own. Evicting the field makes the next read
    // refetch it; `gc()` is deliberately NOT called, since collecting now would
    // drop the `Circle` entity this mutation just wrote.
    update(cache) {
      cache.evict({ id: 'ROOT_QUERY', fieldName: 'myCircles' });
    },
  });

  const handleRedeem = useCallback(async () => {
    const parsed = readInviteToken(token);
    if ('refusal' in parsed) {
      // No round trip: there is nothing here that could be redeemed, and the
      // wording for a truncated URL is better than what the server would say
      // about a token it cannot find.
      setState({ kind: 'refused', refusal: parsed.refusal });
      return;
    }

    setState({ kind: 'working' });
    try {
      const { data } = await redeem({ variables: { token: parsed.token } });
      const circle = data?.redeemCircleInviteLink?.circle;
      if (!circle?.id) {
        // The gateway raises rather than resolving without a circle, so this is
        // belt-and-braces — but a success screen with nowhere to go would be
        // worse than admitting we do not know what happened.
        setState({ kind: 'refused', refusal: 'UNKNOWN' });
        return;
      }
      setState({ kind: 'joined', circleId: circle.id, circleName: circle.name });
    } catch (error) {
      const failure = classifyRedeemFailure(error);
      if (failure.refusal === 'ALREADY_MEMBER') {
        // `circleId` is recovered from the server's message and may be absent —
        // see `classifyRedeemFailure`, which returns nothing rather than a
        // guess when the message does not lead with a UUID. Absent means the
        // card offers "my circles" instead of the circle itself: a slightly
        // longer walk, never the wrong door.
        setState({ kind: 'already', circleId: failure.circleId });
        return;
      }
      setState({ kind: 'refused', refusal: failure.refusal });
    }
  }, [redeem, token]);

  useEffect(() => {
    // StrictMode runs this twice in development and this is a mutation that
    // consumes a use of a shared, finite credential. The server happens to
    // refuse the second call (you are a member by then, and that path spends
    // no use) but relying on that would be relying on an accident.
    const attempt = token ?? '';
    if (attemptedToken.current === attempt) return;
    attemptedToken.current = attempt;
    void handleRedeem();
  }, [handleRedeem, token]);

  // Open the circle once the confirmation has been readable for a beat. Applies
  // to both ways in — a fresh join and an already-a-member — because the
  // person's intent was identical and only the note differs.
  const destination =
    state.kind === 'joined'
      ? state.circleId
      : state.kind === 'already'
        ? state.circleId
        : undefined;

  const openCircle = useCallback(() => {
    if (!destination || navigated.current) return;
    navigated.current = true;
    router.replace(`/circles/${destination}`);
  }, [destination, router]);

  useEffect(() => {
    if (!destination) return;
    const timer = window.setTimeout(openCircle, AUTO_OPEN_MS);
    return () => window.clearTimeout(timer);
  }, [destination, openCircle]);

  function retry() {
    void handleRedeem();
  }

  return (
    <div className="h-app-inner flex overflow-hidden">
      {/*
        The whole screen resolves on its own, with no action from the person
        watching it — so without a live region a screen reader would announce
        the spinner and then never mention that they joined, or why they did
        not. `polite` rather than `assertive`: it is worth waiting a beat for.
      */}
      <div className={`${CIRCLE_COLUMN_CLASS} justify-center`} aria-live="polite">
        {state.kind === 'working' && (
          <JoinCard
            icon={<Loader2 className="size-6 animate-spin" />}
            title={t('working.title')}
            description={t('working.description')}
          />
        )}

        {state.kind === 'joined' && (
          <JoinCard
            icon={<UserPlus className="size-6" />}
            tone="success"
            title={t('joined.title')}
            description={t('joined.description', { circle: state.circleName })}
          >
            <ButtonType2 size="lg" className="w-full" onClick={openCircle}>
              <span className="flex items-center justify-center gap-2">
                {t('open')}
                <ArrowRight aria-hidden="true" className="size-4" />
              </span>
            </ButtonType2>
          </JoinCard>
        )}

        {state.kind === 'already' && (
          <JoinCard
            icon={<UserCheck className="size-6" />}
            tone="success"
            title={t('already.title')}
            description={t('already.description')}
          >
            {state.circleId ? (
              <ButtonType2 size="lg" className="w-full" onClick={openCircle}>
                <span className="flex items-center justify-center gap-2">
                  {t('open')}
                  <ArrowRight aria-hidden="true" className="size-4" />
                </span>
              </ButtonType2>
            ) : (
              <Link href="/circles" className="w-full">
                <ButtonType2 size="lg" className="w-full">
                  {t('myCircles')}
                </ButtonType2>
              </Link>
            )}
          </JoinCard>
        )}

        {state.kind === 'refused' && (
          <JoinCard
            icon={<RefusalIcon refusal={state.refusal} />}
            tone="danger"
            title={t(`refused.${state.refusal}.title`)}
            description={t(`refused.${state.refusal}.description`)}
          >
            {/*
              Only the UNKNOWN bucket — network failures and anything the
              classifier did not recognise — gets a retry. Every other refusal
              is a settled fact about the link or the circle, and a button
              inviting someone to ask again would be a lie about what changed.
            */}
            {isRetryable(state.refusal) && (
              <ButtonType2 size="lg" className="w-full" onClick={retry}>
                <span className="flex items-center justify-center gap-2">
                  <RotateCw aria-hidden="true" className="size-4" />
                  {t('retry')}
                </span>
              </ButtonType2>
            )}

            {/*
              "Ask for a new link" is withheld where a new link would fail
              identically — a circle at its member cap, or one that is
              suspended. Sending someone back to a lead for something that
              cannot help is worse than saying nothing.
            */}
            {!isNewLinkPointless(state.refusal) && (
              <p className="caption-small text-text-secondary">{t('askForNewLink')}</p>
            )}

            <Link
              href="/circles"
              className="label-small text-text-brand hover:underline"
            >
              {t('myCircles')}
            </Link>
          </JoinCard>
        )}
      </div>
    </div>
  );
}

/**
 * A different mark per refusal, so the states are not distinguishable by text
 * alone at a glance. Grouped by what went wrong rather than one icon each: the
 * link itself (a broken link), the clock (it ran out of time), the circle (it
 * has no room, or it is closed).
 */
function RefusalIcon({ refusal }: { refusal: JoinRefusalShown }) {
  switch (refusal) {
    case 'EXPIRED':
      return <Clock className="size-6" />;
    case 'REVOKED':
      return <Ban className="size-6" />;
    case 'CIRCLE_FULL':
      return <Users className="size-6" />;
    case 'CIRCLE_UNAVAILABLE':
      return <CircleSlash className="size-6" />;
    default:
      return <Link2Off className="size-6" />;
  }
}
