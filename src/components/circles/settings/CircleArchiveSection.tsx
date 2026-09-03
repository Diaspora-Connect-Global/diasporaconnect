'use client';

import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { useTranslations } from 'next-intl';
import { Archive } from 'lucide-react';
import { toast } from 'sonner';

import { StatusPill } from '@/components/circles/primitives';
import { ButtonType3, ButtonType4Pill } from '@/components/custom/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ARCHIVE_CIRCLE } from '@/services/gql/circles-settings';
import {
  readCircleWrite,
  refusalMessageKey,
} from '@/components/circles/governance/mutationOutcome';
import type { Circle } from '@/services/gql/types/circles';
import type {
  ArchiveCircleData,
  ArchiveCircleVariables,
} from '@/services/gql/types/circles-settings';

import { SettingsSection } from './SettingsSection';

/**
 * Archive a circle.
 *
 * ── THE COPY IS THE FEATURE HERE ────────────────────────────────────────────
 * Archiving is NOT deleting, and every string in this block is written so a
 * user cannot come away believing otherwise. `archiveCircle` sets
 * `status: 'ARCHIVED'` and stamps `archivedAt`; the circle, its members, its
 * motions, projects, challenges and audit trail all survive untouched. There is
 * no `deleteCircle` on the gateway at all — a circle's history is the record of
 * decisions its members made together, and destroying it would erase their
 * evidence rather than just closing their room.
 *
 * So this is deliberately NOT modelled on `DeleteAccountSection`, the app's
 * other destructive confirmation. That one demands the user type DELETE,
 * because it schedules an irreversible platform-wide erase. Borrowing the
 * ceremony here would teach exactly the wrong thing: the friction would say
 * "this destroys data" about an operation that destroys none, and a user who
 * has typed DELETE once for a real erase will read the second prompt as the
 * same kind of act. The confirmation is a plain, explicit dialog instead — one
 * that states what actually changes and what does not.
 *
 * ── WHAT THE COPY DOES NOT PROMISE ──────────────────────────────────────────
 * It says the circle can be brought back, not that there is a button for it.
 * `ARCHIVED` is a state on the aggregate rather than a tombstone, but the
 * gateway exposes no `unarchiveCircle` today, so restoring one is an operator
 * or governance action. Promising one-click undo would be the same class of lie
 * as calling this a delete.
 *
 * ── GATE ────────────────────────────────────────────────────────────────────
 * LEAD, despite the gateway resolver checking only `assertCircleMember`:
 * `ArchiveCircleHandler` calls `requireLead(circle, actorUserId, 'archive the
 * circle')`. A member who is not a lead reaches the read-only state and, if
 * `canPropose`, is pointed at a `DISSOLVE_CIRCLE` motion instead.
 *
 * ── AND THE STATUS TEST HERE IS NOT `isLive` ────────────────────────────────
 * Uniquely on this screen, `Circle.archive()` does NOT call `assertUsable`. It
 * goes through the status transition table, which allows `SUSPENDED →
 * ARCHIVED` — so a lead can archive a suspended circle, and gating this on
 * `isLive` like the other sections would hide a control the server honours.
 * `canArchive` is computed against the two statuses that genuinely cannot
 * reach ARCHIVED: `ARCHIVED` itself (a silent no-op) and `DISSOLVED` (no
 * outbound transitions at all).
 */
export interface CircleArchiveSectionProps {
  circle: Circle;
  /** LEAD, and the circle in a status that can still reach ARCHIVED. */
  canArchive: boolean;
  /** Whether to point a non-lead member at a DISSOLVE_CIRCLE motion instead. */
  canPropose: boolean;
  /** Refetch so the archived status comes from the server, not a guess. */
  onArchived: () => void;
}

export function CircleArchiveSection({
  circle,
  canArchive,
  canPropose,
  onArchived,
}: CircleArchiveSectionProps) {
  const t = useTranslations('circles.settings');
  const tActions = useTranslations('circles.actions');
  const [open, setOpen] = useState(false);

  const [archiveCircle, { loading: archiving }] = useMutation<
    ArchiveCircleData,
    ArchiveCircleVariables
  >(ARCHIVE_CIRCLE);

  const alreadyArchived = circle.status === 'ARCHIVED';

  const handleOpenChange = (next: boolean) => {
    // Never let the dialog be dismissed mid-flight — the user would be left
    // unsure whether it went through.
    if (archiving) return;
    setOpen(next);
  };

  const handleConfirm = async () => {
    if (archiving) return;
    try {
      const result = await archiveCircle({ variables: { circleId: circle.id } });

      /*
       * `data`, not the absence of a throw. Under the global
       * `errorPolicy: 'all'` a REFUSED mutation resolves, so the catch below
       * never fired for a server refusal — "this requires a motion", "the
       * circle is suspended", a missing-lead invariant — and this closed the
       * dialog and announced the circle archived when it was still live. Of
       * every false-success path in this feature it was the worst: the member
       * believes a circle is gone and stops looking at it.
       *
       * The refusal is classified into translated copy rather than echoing
       * circle-service's sentence, which is operator English carrying raw
       * UUIDs. See `governance/mutationOutcome.ts`.
       */
      const outcome = readCircleWrite(result, (d) => d.archiveCircle);
      if (!outcome.ok) {
        toast.error(tActions(`writeErrors.${refusalMessageKey(outcome.refusal)}`));
        return;
      }

      setOpen(false);
      toast.success(t('archive.archived'));
      onArchived();
    } catch (error) {
      const outcome = readCircleWrite({ error }, () => null);
      toast.error(tActions(`writeErrors.${refusalMessageKey(outcome.refusal)}`));
    }
  };

  if (alreadyArchived) {
    return (
      <SettingsSection
        title={t('archive.title')}
        description={t('archive.alreadyArchivedDescription')}
        aside={<StatusPill label={t('archive.statusArchived')} variant="neutral" />}
      >
        <p className="body-small text-text-secondary">{t('archive.alreadyArchivedBody')}</p>
      </SettingsSection>
    );
  }

  if (!canArchive) {
    /*
     * Two reasons land here and they need different words. DISSOLVED is a
     * property of the circle — the screen's banner has already said so, and
     * repeating it would be noise. Otherwise the reader is a member who is not
     * a lead, and the useful thing to tell them is the route that IS open.
     */
    const dissolved = circle.status === 'DISSOLVED';
    return (
      <SettingsSection title={t('archive.title')} description={t('archive.description')}>
        <p className="body-small text-text-secondary">
          {dissolved ? t('archive.dissolvedBody') : t('archive.leadOnlyBody')}
        </p>
        {!dissolved && canPropose && (
          <p className="body-small mt-4 rounded-lg bg-surface-brand-light p-4 text-text-brand">
            {t('archive.proposeInstead')}
          </p>
        )}
      </SettingsSection>
    );
  }

  return (
    <SettingsSection
      tone="danger"
      title={t('archive.title')}
      description={t('archive.description')}
    >
      <div className="space-y-4">
        <ul className="space-y-1.5">
          <li className="body-small text-text-secondary">{t('archive.bulletKept')}</li>
          <li className="body-small text-text-secondary">{t('archive.bulletQuiet')}</li>
          <li className="body-small text-text-secondary">{t('archive.bulletReversible')}</li>
        </ul>

        {/*
         * `ButtonType4Pill`'s base class is `w-fit` with no flex context, so an
         * icon beside a label needs the inline-flex here — without it the glyph
         * and the text sit on the text baseline with no gap.
         */}
        <ButtonType4Pill
          onClick={() => setOpen(true)}
          disabled={archiving}
          className="inline-flex w-full items-center justify-center gap-2 sm:w-auto"
        >
          <Archive aria-hidden="true" className="size-4" />
          {t('archive.button')}
        </ButtonType4Pill>
      </div>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent showCloseButton={!archiving} className="bg-surface-default">
          <DialogHeader>
            <DialogTitle className="text-text-primary">
              {t('archive.dialogTitle', { name: circle.name })}
            </DialogTitle>
            <DialogDescription className="text-text-secondary">
              {t('archive.dialogDescription')}
            </DialogDescription>
          </DialogHeader>

          <ul className="space-y-1.5">
            <li className="body-small text-text-secondary">{t('archive.bulletKept')}</li>
            <li className="body-small text-text-secondary">{t('archive.bulletQuiet')}</li>
            <li className="body-small text-text-secondary">
              {t('archive.bulletReversible')}
            </li>
          </ul>

          <DialogFooter>
            <ButtonType3
              onClick={() => handleOpenChange(false)}
              disabled={archiving}
              className="border border-border-subtle text-text-primary hover:bg-surface-subtle"
            >
              {t('archive.cancel')}
            </ButtonType3>
            <ButtonType4Pill onClick={() => void handleConfirm()} disabled={archiving}>
              {archiving ? t('archive.archiving') : t('archive.confirm')}
            </ButtonType4Pill>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsSection>
  );
}
