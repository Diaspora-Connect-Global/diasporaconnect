'use client';

import { useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Ellipsis, Flag, ShieldOff } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { focusRing } from './primitives';
import { useBlock, useReportPerson } from './useNetworking';
import { REPORT_DETAILS_MAX, REPORT_REASONS, type ReportReason } from '@/services/gql/networking';

const secondary = `inline-flex min-h-11 items-center justify-center rounded-full border border-border-subtle px-5 text-sm font-medium text-text-primary hover:bg-surface-subtle disabled:opacity-50 ${focusRing}`;
const primary = `inline-flex min-h-11 items-center justify-center rounded-full border border-border-brand bg-surface-brand px-5 text-sm font-medium text-text-white hover:opacity-90 disabled:opacity-50 ${focusRing}`;
const danger = `inline-flex min-h-11 items-center justify-center rounded-full border border-border-danger bg-surface-danger px-5 text-sm font-medium text-text-danger hover:opacity-90 disabled:opacity-50 ${focusRing}`;

/** Shown to a HIDDEN sender before an interest is sent: the recipient will see their profile. */
export function RevealConfirmDialog({ open, name, sending, onConfirm, onCancel }: { open: boolean; name?: string; sending: boolean; onConfirm: () => void; onCancel: () => void }) {
  const t = useTranslations('networking.interest');
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !sending) onCancel(); }}>
      <DialogContent data-testid="reveal-confirm">
        <DialogHeader>
          <DialogTitle>{t('confirmTitle')}</DialogTitle>
          <DialogDescription>{t('confirmBody')}</DialogDescription>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{name ? t('confirmDetailNamed', { name }) : t('confirmDetail')}</p>
        <DialogFooter className="gap-2 sm:gap-2">
          <button type="button" disabled={sending} onClick={onCancel} className={secondary} data-testid="reveal-cancel">{t('cancel')}</button>
          <button type="button" disabled={sending} onClick={onConfirm} className={primary} data-testid="reveal-send">{t('confirmSend')}</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Overflow menu for one person: Block (confirmed, never gated) and Report (reason +
 * optional details, the case reference is shown on success). The person is only ever
 * identified by name here, never by an id.
 */
export function SafetyMenu({ eventId, handle, name, onBlocked, className = '' }: { eventId: string; handle: string; name?: string | null; onBlocked?: (handle: string) => void; className?: string }) {
  const t = useTranslations('networking.safety');
  const who = name?.trim() || t('thisPerson');
  const [mode, setMode] = useState<'block' | 'report' | null>(null);
  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <button type="button" aria-label={t('menuLabel', { name: who })} data-testid="safety-menu" className={`inline-flex size-11 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-subtle ${focusRing} ${className}`}>
            <Ellipsis className="size-5" aria-hidden />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setMode('report')} data-testid="safety-report"><Flag className="size-4" aria-hidden />{t('report')}</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setMode('block')} data-testid="safety-block"><ShieldOff className="size-4" aria-hidden />{t('block')}</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {mode === 'block' && <BlockDialog eventId={eventId} handle={handle} who={who} onClose={() => setMode(null)} onBlocked={onBlocked} />}
      {mode === 'report' && <ReportDialog eventId={eventId} handle={handle} who={who} onClose={() => setMode(null)} />}
    </>
  );
}

function BlockDialog({ eventId, handle, who, onClose, onBlocked }: { eventId: string; handle: string; who: string; onClose: () => void; onBlocked?: (handle: string) => void }) {
  const t = useTranslations('networking.safety');
  const block = useBlock(eventId);
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    const ok = await block(handle);
    setBusy(false);
    if (ok) {
      toast.success(t('blocked', { name: who }));
      onClose();
      onBlocked?.(handle);
    }
  };
  return (
    <Dialog open onOpenChange={(o) => { if (!o && !busy) onClose(); }}>
      <DialogContent data-testid="block-dialog">
        <DialogHeader>
          <DialogTitle>{t('blockTitle', { name: who })}</DialogTitle>
          <DialogDescription>{t('blockBody')}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <button type="button" disabled={busy} onClick={onClose} className={secondary}>{t('cancel')}</button>
          <button type="button" disabled={busy} onClick={() => void go()} className={danger} data-testid="block-confirm">{t('blockConfirm')}</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReportDialog({ eventId, handle, who, onClose }: { eventId: string; handle: string; who: string; onClose: () => void }) {
  const t = useTranslations('networking.safety');
  const report = useReportPerson(eventId);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [caseNumber, setCaseNumber] = useState<string | null>(null);
  const groupId = useId();
  const detailsId = useId();

  const submit = async () => {
    if (!reason) return;
    setBusy(true);
    setError(null);
    const r = await report(handle, reason, details);
    setBusy(false);
    if (r.ok) setCaseNumber(r.caseNumber);
    else setError(r.message);
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o && !busy) onClose(); }}>
      <DialogContent data-testid="report-dialog">
        {caseNumber === null ? (
          <>
            <DialogHeader>
              <DialogTitle>{t('reportTitle', { name: who })}</DialogTitle>
              <DialogDescription>{t('reportBody')}</DialogDescription>
            </DialogHeader>
            <fieldset className="space-y-2">
              <legend id={groupId} className="mb-1 text-sm font-semibold text-text-primary">{t('reasonLabel')}</legend>
              <div role="radiogroup" aria-labelledby={groupId} className="grid gap-1.5">
                {REPORT_REASONS.map((r) => (
                  <label key={r} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-border-subtle px-3 text-sm text-text-primary has-[:checked]:border-border-brand has-[:checked]:bg-surface-subtle">
                    <input type="radio" name="report-reason" value={r} checked={reason === r} onChange={() => setReason(r)} className="size-4" />
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
                maxLength={REPORT_DETAILS_MAX}
                onChange={(e) => setDetails(e.target.value)}
                rows={4}
                className={`w-full rounded-xl border border-border-subtle bg-surface-default p-3 text-sm text-text-primary ${focusRing}`}
                data-testid="report-details"
              />
              <p className="mt-1 text-xs text-muted-foreground">{t('detailsHint', { count: details.length, max: REPORT_DETAILS_MAX })}</p>
            </div>
            {error && <p role="alert" className="text-sm text-text-danger" data-testid="report-error">{error}</p>}
            <DialogFooter className="gap-2 sm:gap-2">
              <button type="button" disabled={busy} onClick={onClose} className={secondary}>{t('cancel')}</button>
              <button type="button" disabled={busy || !reason} onClick={() => void submit()} className={primary} data-testid="report-submit">{t('submit')}</button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{t('sentTitle')}</DialogTitle>
              <DialogDescription>{t('sentBody')}</DialogDescription>
            </DialogHeader>
            {caseNumber && <p className="rounded-xl bg-surface-subtle p-3 text-sm text-text-primary" data-testid="report-case">{t('caseRef', { number: caseNumber })}</p>}
            <DialogFooter>
              <button type="button" onClick={onClose} className={primary} data-testid="report-done">{t('close')}</button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
