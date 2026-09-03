'use client';

import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { useTranslations } from 'next-intl';
import { Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { readMutationOutcome, refusalMessageKey } from '@/lib/mutationOutcome';
import {
  CANCEL_SERVICE_REQUEST,
  MY_SERVICE_REQUESTS,
  type CancelServiceRequestResponse,
} from '@/services/gql/embassyServices';

interface CancelRequestDialogProps {
  /** When set, the dialog is open and targets this request id. */
  requestId: string | null;
  /** Request number shown in the confirm copy (for context). */
  requestNumber?: string;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful cancel (e.g. to refetch the detail view). */
  onCancelled?: () => void;
}

/**
 * Shared "Cancel request" confirm dialog. Collects a required reason and calls
 * `cancelServiceRequest`, then toasts + refetches MY_SERVICE_REQUESTS so the
 * list reflects the new status. Reused by both the Track Requests list (row "…"
 * menu) and the request detail view's action bar.
 */
export function CancelRequestDialog({
  requestId,
  requestNumber,
  onOpenChange,
  onCancelled,
}: CancelRequestDialogProps) {
  const t = useTranslations('community.embassy.track.detail.cancel');
  const [reason, setReason] = useState('');

  const [cancelServiceRequest, { loading }] = useMutation<CancelServiceRequestResponse>(
    CANCEL_SERVICE_REQUEST,
    { refetchQueries: [{ query: MY_SERVICE_REQUESTS }] },
  );

  async function onConfirm() {
    if (!requestId || loading) return;
    try {
      const result = await cancelServiceRequest({ variables: { requestId, reason: reason.trim() } });
      const outcome = readMutationOutcome(result, d => d.cancelServiceRequest);
      if (!outcome.ok) {
        const key = refusalMessageKey(outcome.message, 'requests.errors');
        toast.error(t(key));
        return;
      }
      toast.success(t('success'));
      setReason('');
      onOpenChange(false);
      onCancelled?.();
    } catch (e) {
      const message = e instanceof Error ? e.message : t('error');
      toast.error(message);
    }
  }

  return (
    <Dialog
      open={requestId !== null}
      onOpenChange={(open) => {
        if (!open) setReason('');
        onOpenChange(open);
      }}
    >
      <DialogContent className="bg-surface-default">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-text-primary">
            <AlertTriangle className="size-5 text-red-500" aria-hidden />
            {t('title')}
          </DialogTitle>
          <DialogDescription className="text-text-secondary">
            {requestNumber ? t('bodyWithNumber', { number: requestNumber }) : t('body')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <label className="caption-large block text-text-primary">{t('reasonLabel')}</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder={t('reasonPlaceholder')}
            className="w-full resize-none rounded-lg border border-border-subtle bg-surface-default px-3 py-2.5 body-small text-text-primary outline-none focus:border-border-brand"
          />
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="label-medium rounded-lg border border-border-subtle px-4 py-2.5 text-text-secondary transition-colors hover:bg-surface-subtle disabled:opacity-50"
          >
            {t('keep')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading || reason.trim() === ''}
            className="label-medium inline-flex items-center justify-center gap-2 rounded-lg bg-red-500 px-5 py-2.5 text-text-white transition-colors hover:opacity-90 disabled:opacity-50"
          >
            {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {t('confirm')}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CancelRequestDialog;
