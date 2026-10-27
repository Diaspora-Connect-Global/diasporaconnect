'use client';

import { useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useLazyQuery, useMutation } from '@apollo/client/react';
import { toast } from 'sonner';
import { EyeOff, Flag, Loader2, LogOut, MoreHorizontal, Trash2, UserMinus, UserX } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { readMutationOutcome } from '@/lib/mutationOutcome';
import {
  GET_POST_AUTHOR_RELATION,
  HIDE_POST,
  POST_REPORT_DETAILS_MAX,
  POST_REPORT_REASONS,
  REPORT_POST,
  UNFOLLOW_USER,
  type PostAuthorRelationData,
  type PostReportReason,
} from '@/services/gql/postActions';
import { REMOVE_FRIEND } from '@/services/gql/connection';
import { GET_MY_MEMBERSHIPS_COMMUNITY, LEAVE_COMMUNITY } from '@/services/gql/community';
import { LEAVE_ASSOCIATION } from '@/services/gql/associations';
import { RECORD_INTERACTION } from '@/services/gql/postsFeed';

const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand focus-visible:ring-offset-1';
const secondary = `inline-flex min-h-11 items-center justify-center rounded-full border border-border-subtle px-5 text-sm font-medium text-text-primary hover:bg-surface-subtle disabled:opacity-50 ${focusRing}`;
const primary = `inline-flex min-h-11 items-center justify-center rounded-full border border-border-brand bg-surface-brand px-5 text-sm font-medium text-text-white hover:opacity-90 disabled:opacity-50 ${focusRing}`;
const danger = `inline-flex min-h-11 items-center justify-center rounded-full border border-border-danger bg-surface-danger px-5 text-sm font-medium text-text-danger hover:opacity-90 disabled:opacity-50 ${focusRing}`;

export type PostActionOutcome = 'hidden' | 'reported';

type AuthorKind = 'person' | 'community' | 'association' | 'other';

function authorKindOf(authorEntityType?: string, authorUserId?: string): AuthorKind {
  const type = authorEntityType?.toUpperCase();
  if (type === 'COMMUNITY') return 'community';
  if (type === 'ASSOCIATION') return 'association';
  if ((!type || type === 'USER') && authorUserId) return 'person';
  return 'other';
}

/** `{ success: false }` is a refusal too — readMutationOutcome only checks for data. */
type MutationData = Record<string, { success?: boolean } | null | undefined> | null | undefined;
const succeeded = (field: string) => (d: MutationData) => (d?.[field]?.success === true ? d[field] : null);

interface PostActionsMenuProps {
  postId: string;
  /** Display name of the author (person, community or association). Never an id. */
  authorName: string;
  authorUserId?: string;
  authorEntityId?: string;
  authorEntityType?: string;
  /** The card collapses into a notice after the post is hidden or reported. */
  onDone: (outcome: PostActionOutcome) => void;
  /** Platform-admin removal, merged into this menu so the card keeps one "⋯". */
  adminDelete?: { label: string; onSelect: () => void };
}

/**
 * The "⋯" menu on someone else's post. Everyone gets "Not interested" and
 * "Report post". People: "Unfriend" when connected, "Unfollow" when following.
 * Communities and associations: "Leave" when the viewer is an active member.
 * The relationship is fetched only when the menu opens.
 *
 * Unfollow / unfriend / leave also record a negative interaction on this post,
 * so the ranked feed demotes the author right away (the follow graph itself
 * does not reach the recommender yet).
 */
export function PostActionsMenu({ postId, authorName, authorUserId, authorEntityId, authorEntityType, onDone, adminDelete }: PostActionsMenuProps) {
  const t = useTranslations('postActions');
  const kind = authorKindOf(authorEntityType, authorUserId);
  const entityId = authorEntityId;
  const [dialog, setDialog] = useState<'report' | 'unfriend' | 'leave' | null>(null);
  const [busy, setBusy] = useState(false);

  const [loadPerson, person] = useLazyQuery<PostAuthorRelationData>(GET_POST_AUTHOR_RELATION, { fetchPolicy: 'network-only' });
  const [loadMembership, membership] = useLazyQuery<{ myMembership?: { status?: string | null } | null }>(GET_MY_MEMBERSHIPS_COMMUNITY, { fetchPolicy: 'network-only' });

  const [hidePost] = useMutation(HIDE_POST);
  const [unfollowUser] = useMutation(UNFOLLOW_USER);
  const [removeFriend] = useMutation(REMOVE_FRIEND);
  const [leaveCommunity] = useMutation(LEAVE_COMMUNITY);
  const [leaveAssociation] = useMutation(LEAVE_ASSOCIATION);
  const [recordInteraction] = useMutation(RECORD_INTERACTION);

  const onOpenChange = (open: boolean) => {
    if (!open) return;
    // A failed lookup just leaves the author actions out of the menu.
    if (kind === 'person' && authorUserId && !person.called) {
      loadPerson({ variables: { userId: authorUserId } }).catch(() => undefined);
    } else if ((kind === 'community' || kind === 'association') && entityId && !membership.called) {
      loadMembership({ variables: { entityId, entityType: kind === 'community' ? 'COMMUNITY' : 'ASSOCIATION' } }).catch(() => undefined);
    }
  };

  // Best effort: the action itself already succeeded, so a failed signal is not shown.
  const seeLessOfAuthor = (signal: 'UNFOLLOW' | 'LEAVE_COMMUNITY') => {
    void recordInteraction({ variables: { input: { itemType: 'POST', itemId: postId, kind: signal } } }).catch(() => undefined);
  };

  const connectionId = person.data?.getProfile?.connectionStatus?.toLowerCase() === 'connected' ? person.data.getProfile.connectionId ?? null : null;
  const isFollowing = person.data?.isFollowing?.isFollowing === true;
  const isMember = membership.data?.myMembership?.status?.toUpperCase() === 'ACTIVE';
  const relationLoading = person.loading || membership.loading;

  const run = async (call: () => Promise<unknown>, field: string, done: () => void) => {
    setBusy(true);
    try {
      const outcome = readMutationOutcome(await call(), succeeded(field));
      if (!outcome.ok) {
        toast.error(t('failed'));
        return false;
      }
      done();
      return true;
    } catch {
      toast.error(t('failed'));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const notInterested = () =>
    run(() => hidePost({ variables: { id: postId } }), 'hidePost', () => onDone('hidden'));

  const unfollow = () =>
    run(() => unfollowUser({ variables: { userId: authorUserId } }), 'unfollowUser', () => {
      seeLessOfAuthor('UNFOLLOW');
      toast.success(t('unfollowed', { name: authorName }));
    });

  const unfriend = async () => {
    if (!connectionId) return;
    const ok = await run(() => removeFriend({ variables: { input: { connectionId } } }), 'removeFriend', () => {
      seeLessOfAuthor('UNFOLLOW');
      toast.success(t('unfriended', { name: authorName }));
    });
    if (ok) setDialog(null);
  };

  const leave = async () => {
    if (!entityId) return;
    const ok = await run(
      () =>
        kind === 'community'
          ? leaveCommunity({ variables: { communityId: entityId } })
          : leaveAssociation({ variables: { associationId: entityId } }),
      kind === 'community' ? 'leaveCommunity' : 'leaveAssociation',
      () => {
        seeLessOfAuthor('LEAVE_COMMUNITY');
        toast.success(t('left', { name: authorName }));
      },
    );
    if (ok) setDialog(null);
  };

  const showAuthorSection = kind !== 'other';

  return (
    <>
      <DropdownMenu modal={false} onOpenChange={onOpenChange}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={t('menuLabel')}
            data-testid="post-actions-menu"
            className={`p-1 rounded-full hover:bg-surface-alt text-text-secondary flex-shrink-0 ${focusRing}`}
          >
            <MoreHorizontal className="w-5 h-5" aria-hidden />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60 max-w-[calc(100vw-2rem)]">
          <DropdownMenuItem disabled={busy} onSelect={() => void notInterested()} data-testid="post-action-not-interested">
            <EyeOff className="w-4 h-4 mr-2 shrink-0" aria-hidden />
            {t('notInterested')}
          </DropdownMenuItem>

          {showAuthorSection && relationLoading && (
            <DropdownMenuItem disabled>
              <Loader2 className="w-4 h-4 mr-2 shrink-0 animate-spin" aria-hidden />
              {t('loading')}
            </DropdownMenuItem>
          )}
          {kind === 'person' && connectionId && (
            <DropdownMenuItem disabled={busy} onSelect={() => setDialog('unfriend')} data-testid="post-action-unfriend">
              <UserMinus className="w-4 h-4 mr-2 shrink-0" aria-hidden />
              <span className="truncate">{t('unfriend', { name: authorName })}</span>
            </DropdownMenuItem>
          )}
          {kind === 'person' && isFollowing && (
            <DropdownMenuItem disabled={busy} onSelect={() => void unfollow()} data-testid="post-action-unfollow">
              <UserX className="w-4 h-4 mr-2 shrink-0" aria-hidden />
              <span className="truncate">{t('unfollow', { name: authorName })}</span>
            </DropdownMenuItem>
          )}
          {(kind === 'community' || kind === 'association') && isMember && (
            <DropdownMenuItem disabled={busy} onSelect={() => setDialog('leave')} data-testid="post-action-leave">
              <LogOut className="w-4 h-4 mr-2 shrink-0" aria-hidden />
              <span className="truncate">{t('leave', { name: authorName })}</span>
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setDialog('report')} data-testid="post-action-report">
            <Flag className="w-4 h-4 mr-2 shrink-0" aria-hidden />
            {t('report')}
          </DropdownMenuItem>
          {adminDelete && (
            <DropdownMenuItem variant="destructive" onSelect={adminDelete.onSelect}>
              <Trash2 className="w-4 h-4 mr-2 shrink-0" aria-hidden />
              {adminDelete.label}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {dialog === 'report' && (
        <ReportPostDialog postId={postId} onClose={(reported) => { setDialog(null); if (reported) onDone('reported'); }} />
      )}
      {dialog === 'unfriend' && (
        <ConfirmDialog
          title={t('unfriendTitle', { name: authorName })}
          body={t('unfriendBody')}
          confirmLabel={t('unfriendConfirm')}
          busy={busy}
          onConfirm={() => void unfriend()}
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog === 'leave' && (
        <ConfirmDialog
          title={t('leaveTitle', { name: authorName })}
          body={t('leaveBody')}
          confirmLabel={t('leaveConfirm')}
          busy={busy}
          onConfirm={() => void leave()}
          onCancel={() => setDialog(null)}
        />
      )}
    </>
  );
}

function ConfirmDialog({ title, body, confirmLabel, busy, onConfirm, onCancel }: { title: string; body: string; confirmLabel: string; busy: boolean; onConfirm: () => void; onCancel: () => void }) {
  const t = useTranslations('postActions');
  return (
    <Dialog open onOpenChange={(o) => { if (!o && !busy) onCancel(); }}>
      <DialogContent data-testid="post-action-confirm">
        <DialogHeader>
          <DialogTitle className="break-words">{title}</DialogTitle>
          <DialogDescription>{body}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <button type="button" disabled={busy} onClick={onCancel} className={secondary}>{t('cancel')}</button>
          <button type="button" disabled={busy} onClick={onConfirm} className={danger} data-testid="post-action-confirm-button">{confirmLabel}</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReportPostDialog({ postId, onClose }: { postId: string; onClose: (reported: boolean) => void }) {
  const t = useTranslations('postActions');
  const [reportPost] = useMutation(REPORT_POST);
  const [reason, setReason] = useState<PostReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(false);
  const groupId = useId();
  const detailsId = useId();

  const submit = async () => {
    if (!reason) return;
    setBusy(true);
    setError(false);
    try {
      const result = await reportPost({
        variables: { input: { postId, reason, details: details.trim() || undefined } },
      });
      const outcome = readMutationOutcome(result, succeeded('reportPost'));
      if (outcome.ok) setSent(true);
      else setError(true);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o && !busy) onClose(sent); }}>
      <DialogContent data-testid="post-report-dialog">
        {!sent ? (
          <>
            <DialogHeader>
              <DialogTitle>{t('reportTitle')}</DialogTitle>
              <DialogDescription>{t('reportBody')}</DialogDescription>
            </DialogHeader>
            <fieldset className="space-y-2">
              <legend id={groupId} className="mb-1 text-sm font-semibold text-text-primary">{t('reasonLabel')}</legend>
              <div role="radiogroup" aria-labelledby={groupId} className="grid gap-1.5 max-h-[45vh] overflow-y-auto">
                {POST_REPORT_REASONS.map((r) => (
                  <label key={r} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-border-subtle px-3 text-sm text-text-primary has-[:checked]:border-border-brand has-[:checked]:bg-surface-subtle">
                    <input type="radio" name="post-report-reason" value={r} checked={reason === r} onChange={() => setReason(r)} className="size-4" />
                    {t(`reason.${r}`)}
                  </label>
                ))}
              </div>
            </fieldset>
            <div>
              <label htmlFor={detailsId} className="mb-1 block text-sm font-semibold text-text-primary">{t('detailsLabel')}</label>
              <textarea
                id={detailsId}
                value={details}
                maxLength={POST_REPORT_DETAILS_MAX}
                onChange={(e) => setDetails(e.target.value)}
                rows={3}
                className={`w-full rounded-xl border border-border-subtle bg-surface-default p-3 text-base sm:text-sm text-text-primary ${focusRing}`}
                data-testid="post-report-details"
              />
              <p className="mt-1 text-xs text-muted-foreground">{t('detailsHint', { count: details.length, max: POST_REPORT_DETAILS_MAX })}</p>
            </div>
            {error && <p role="alert" className="text-sm text-text-danger">{t('failed')}</p>}
            <DialogFooter className="gap-2 sm:gap-2">
              <button type="button" disabled={busy} onClick={() => onClose(false)} className={secondary}>{t('cancel')}</button>
              <button type="button" disabled={busy || !reason} onClick={() => void submit()} className={primary} data-testid="post-report-submit">{t('submit')}</button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{t('sentTitle')}</DialogTitle>
              <DialogDescription>{t('sentBody')}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <button type="button" onClick={() => onClose(true)} className={primary} data-testid="post-report-done">{t('close')}</button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Shown in place of a post the viewer just hid or reported. */
export function PostActionNotice({ outcome }: { outcome: PostActionOutcome }) {
  const t = useTranslations('postActions');
  return (
    <p role="status" className="body-small text-text-secondary py-2">
      {outcome === 'hidden' ? t('hiddenNotice') : t('reportedNotice')}
    </p>
  );
}
