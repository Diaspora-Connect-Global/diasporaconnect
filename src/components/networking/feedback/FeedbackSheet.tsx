'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { btnQuiet } from '../meetings/parts';
import { formatInZone } from '@/lib/eventCalendar';
import type { MyFeedback } from '@/services/gql/networkingEventDay';
import FeedbackForm, { type FeedbackFormValue } from './FeedbackForm';
import type { FeedbackApi, FeedbackSubject } from './useFeedback';

type Connected = null | 'sent' | 'existing' | 'failed';

/**
 * One feedback sheet for a meeting or a circle. Loads the person's own earlier answer, lets them
 * change it while the window is open, and shows it read-only afterwards. "Stay connected" sends the
 * existing Connect only after the feedback itself is saved.
 */
export default function FeedbackSheet({
  open,
  onOpenChange,
  subject,
  api,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject: FeedbackSubject;
  api: FeedbackApi;
  onSaved?: (feedback: MyFeedback) => void;
}) {
  const t = useTranslations('networkingEventDay');
  const tf = useTranslations('networkingEventDay.feedback');
  const locale = useLocale();
  const meeting = subject.type === 'MEETING';
  const [loading, setLoading] = useState(false);
  const [loadKey, setLoadKey] = useState<string | null>(null);
  const [existing, setExisting] = useState<MyFeedback | null>(null);
  const [saved, setSaved] = useState<MyFeedback | null>(null);
  const [busy, setBusy] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [connected, setConnected] = useState<Connected>(null);

  useEffect(() => {
    if (!open) return;
    let live = true;
    setLoading(true);
    setLoadKey(null);
    setSaved(null);
    setErrorKey(null);
    setConnected(null);
    void api.mine(subject).then((r) => {
      if (!live) return;
      setLoading(false);
      if (r.ok) setExisting(r.feedback);
      else setLoadKey(r.key);
    });
    return () => { live = false; };
    // The subject object is rebuilt by callers; its identity is the type + id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, api, subject.type, subject.id]);

  const submit = async ({ input, stayConnected }: FeedbackFormValue) => {
    setBusy(true);
    setErrorKey(null);
    const out = await api.submit(subject, input);
    if (!out.ok) {
      setBusy(false);
      setErrorKey(out.key);
      return;
    }
    let result: Connected = null;
    if (stayConnected && subject.counterpartHandle) {
      const c = await api.connect(subject.counterpartHandle);
      result = c.ok ? (c.preExisting ? 'existing' : 'sent') : 'failed';
    }
    setBusy(false);
    setExisting(out.feedback);
    setSaved(out.feedback);
    setConnected(result);
    onSaved?.(out.feedback);
  };

  const closed = Boolean(existing && !existing.editable);
  const when = (iso: string) => formatInZone(iso, locale, subject.timezone);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!busy) onOpenChange(o); }}>
      <DialogContent data-testid="feedback-sheet" data-subject={subject.type} className="max-h-[92dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{meeting ? tf('titleMeeting', { name: subject.title }) : tf('titleCircle', { circle: subject.title })}</DialogTitle>
          <DialogDescription>{meeting ? tf('introMeeting', { name: subject.title }) : tf('introCircle')}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" aria-hidden />{tf('loading')}</p>
        ) : loadKey ? (
          <p role="alert" data-testid="feedback-load-error" className="text-sm text-text-danger">{t(`errors.${loadKey}`)}</p>
        ) : saved ? (
          <div className="space-y-4" data-testid="feedback-saved" role="status">
            <p className="flex items-start gap-2 text-sm font-medium text-text-primary"><CheckCircle2 className="mt-0.5 size-5 shrink-0 text-text-success" aria-hidden />{tf('saved.title')}</p>
            {saved.editable && saved.editableUntil && <p className="text-sm text-muted-foreground">{tf('saved.editable', { date: when(saved.editableUntil) })}</p>}
            {connected === 'sent' && <p data-testid="connect-sent" className="text-sm text-text-primary">{tf('saved.connectSent', { name: subject.title })}</p>}
            {connected === 'existing' && <p data-testid="connect-existing" className="text-sm text-text-primary">{tf('saved.connectExisting', { name: subject.title })}</p>}
            {connected === 'failed' && <p data-testid="connect-failed" className="text-sm text-text-primary">{tf('saved.connectFailed')}</p>}
            <div className="flex flex-wrap gap-2">
              {saved.editable && <button type="button" onClick={() => { setSaved(null); setConnected(null); }} className={btnQuiet} data-testid="feedback-edit">{tf('edit')}</button>}
              <button type="button" onClick={() => onOpenChange(false)} className={btnQuiet} data-testid="feedback-close">{tf('close')}</button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {existing && (
              <p data-testid="feedback-existing" className="rounded-xl bg-surface-subtle px-4 py-3 text-sm text-text-primary">
                {closed
                  ? tf('existing.closed')
                  : existing.editableUntil
                    ? tf('existing.editable', { date: when(existing.submittedAt), until: when(existing.editableUntil) })
                    : tf('existing.answered', { date: when(existing.submittedAt) })}
              </p>
            )}
            <div aria-live="assertive">
              {errorKey && <p role="alert" data-testid="feedback-error" data-error={errorKey} className="rounded-xl border border-border-danger bg-surface-danger px-4 py-3 text-sm text-text-primary">{t(`errors.${errorKey}`)}</p>}
            </div>
            <FeedbackForm
              key={existing ? `${existing.submittedAt}-${existing.updatedAt ?? ''}` : 'new'}
              subjectType={subject.type}
              name={subject.title}
              initial={existing}
              readOnly={closed}
              busy={busy}
              canConnect={Boolean(subject.counterpartHandle)}
              onSubmit={(v) => void submit(v)}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
