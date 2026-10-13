'use client';

import { useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Loader2 } from 'lucide-react';
import { btnPrimary, fieldClass } from '../meetings/parts';
import {
  ATTENDED_VALUES,
  CIRCLE_ATTENDANCE,
  CIRCLE_COMMENT_MIN_RESPONDENTS,
  FEEDBACK_COMMENT_MAX,
  FEEDBACK_OUTCOMES,
  MEETING_ATTENDANCE,
  USEFULNESS_VALUES,
  type FeedbackAttendance,
  type FeedbackInput,
  type FeedbackOutcome,
  type FeedbackSubjectType,
  type MyFeedback,
} from '@/services/gql/networkingEventDay';

export interface FeedbackFormValue {
  input: FeedbackInput;
  stayConnected: boolean;
}

const pill = (on: boolean) =>
  `relative inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-full border px-4 text-sm font-medium has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-text-brand has-[:focus-visible]:ring-offset-1 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60 ${on ? 'border-border-brand bg-surface-brand-subtle text-text-brand' : 'border-border-subtle text-text-primary hover:bg-surface-subtle'}`;

/**
 * The one form behind both feedback sheets. Meetings and circles differ only in the attendance
 * choices, the comment notice and "Stay connected" (meetings only). Controlled by local state;
 * `onSubmit` receives a validated value. `readOnly` shows a closed window's answer.
 */
export default function FeedbackForm({
  subjectType,
  name,
  initial,
  readOnly,
  busy,
  canConnect,
  onSubmit,
}: {
  subjectType: FeedbackSubjectType;
  /** The other person's name (meetings). */
  name: string;
  initial: MyFeedback | null;
  readOnly: boolean;
  busy: boolean;
  canConnect: boolean;
  onSubmit: (value: FeedbackFormValue) => void;
}) {
  const t = useTranslations('networkingEventDay.feedback');
  const uid = useId();
  const meeting = subjectType === 'MEETING';
  const [attendance, setAttendance] = useState<FeedbackAttendance | null>(initial?.attendance ?? null);
  const [usefulness, setUsefulness] = useState<number | null>(initial?.usefulness ?? null);
  const [outcomes, setOutcomes] = useState<FeedbackOutcome[]>(initial?.outcomes ?? []);
  const [comment, setComment] = useState(initial?.comment ?? '');
  const [stay, setStay] = useState(false);
  const [problem, setProblem] = useState<'attendance' | 'usefulness' | null>(null);

  const attended = attendance !== null && ATTENDED_VALUES.includes(attendance);
  const choices: FeedbackAttendance[] = meeting ? MEETING_ATTENDANCE : CIRCLE_ATTENDANCE;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly || busy) return;
    if (!attendance) return setProblem('attendance');
    if (attended && !usefulness) return setProblem('usefulness');
    setProblem(null);
    onSubmit({
      input: {
        attendance,
        usefulness: attended ? usefulness : null,
        outcomes: attended ? outcomes : [],
        comment: comment.trim() ? comment.trim() : null,
      },
      stayConnected: meeting && canConnect && attended && stay,
    });
  };

  const toggleOutcome = (o: FeedbackOutcome, on: boolean) => setOutcomes(on ? [...outcomes, o] : outcomes.filter((x) => x !== o));
  const near = comment.length >= FEEDBACK_COMMENT_MAX - 50;

  return (
    <form onSubmit={submit} noValidate data-testid="feedback-form" data-subject={subjectType} className="space-y-5">
      <fieldset disabled={readOnly || busy} className="min-w-0 space-y-5">
        <fieldset className="min-w-0 space-y-2" aria-describedby={problem === 'attendance' ? `${uid}-att-err` : undefined}>
          <legend className="mb-1 text-sm font-semibold text-text-primary">{meeting ? t('attendance.legendMeeting') : t('attendance.legendCircle')}</legend>
          <ul className="flex flex-wrap gap-2">
            {choices.map((a) => (
              <li key={a}>
                <label className={pill(attendance === a)}>
                  <input type="radio" name={`${uid}-attendance`} value={a} checked={attendance === a} onChange={() => { setAttendance(a); setProblem(null); }} data-testid="attendance-option" data-value={a} className="absolute inset-0 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed" />
                  {attendance === a && <Check className="mr-1.5 size-4" aria-hidden />}
                  {t(`attendance.${a}`, { name })}
                </label>
              </li>
            ))}
          </ul>
          {problem === 'attendance' && <p id={`${uid}-att-err`} role="alert" data-testid="feedback-problem" className="text-sm text-text-danger">{t('needAttendance')}</p>}
        </fieldset>

        {attended && (
          <>
            <fieldset className="min-w-0 space-y-2" data-testid="usefulness-group" aria-describedby={problem === 'usefulness' ? `${uid}-use-err` : undefined}>
              <legend className="mb-1 text-sm font-semibold text-text-primary">{t('usefulness.legend')}</legend>
              <ul className="flex flex-wrap items-center gap-2">
                {USEFULNESS_VALUES.map((v) => (
                  <li key={v}>
                    <label className={pill(usefulness === v)}>
                      <input type="radio" name={`${uid}-usefulness`} value={v} checked={usefulness === v} onChange={() => { setUsefulness(v); setProblem(null); }} aria-label={t('usefulness.option', { value: v })} data-testid="usefulness-option" data-value={v} className="absolute inset-0 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed" />
                      <span aria-hidden>{v}</span>
                    </label>
                  </li>
                ))}
              </ul>
              <p className="flex justify-between text-xs text-muted-foreground" aria-hidden><span>{t('usefulness.low')}</span><span>{t('usefulness.high')}</span></p>
              {problem === 'usefulness' && <p id={`${uid}-use-err`} role="alert" data-testid="feedback-problem" className="text-sm text-text-danger">{t('needUsefulness')}</p>}
            </fieldset>

            <fieldset className="min-w-0 space-y-2" data-testid="outcomes-group">
              <legend className="mb-1 text-sm font-semibold text-text-primary">{t('outcomes.legend')}</legend>
              <ul className="flex flex-wrap gap-2">
                {FEEDBACK_OUTCOMES.map((o) => (
                  <li key={o}>
                    <label className={pill(outcomes.includes(o))}>
                      <input type="checkbox" value={o} checked={outcomes.includes(o)} onChange={(e) => toggleOutcome(o, e.target.checked)} data-testid="outcome-option" data-value={o} className="absolute inset-0 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed" />
                      {outcomes.includes(o) && <Check className="mr-1.5 size-4" aria-hidden />}
                      {t(`outcomes.${o}`)}
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>
          </>
        )}

        <div>
          <label htmlFor={`${uid}-comment`} className="mb-1 block text-sm font-semibold text-text-primary">{t('comment.label')}</label>
          <textarea
            id={`${uid}-comment`}
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, FEEDBACK_COMMENT_MAX))}
            maxLength={FEEDBACK_COMMENT_MAX}
            rows={4}
            className={`${fieldClass} text-base md:text-sm`}
            data-testid="feedback-comment"
            aria-describedby={`${uid}-comment-note ${uid}-comment-count`}
          />
          <div className="mt-1 flex flex-wrap items-start justify-between gap-2">
            <p id={`${uid}-comment-note`} data-testid="comment-note" data-kind={meeting ? 'private' : 'anonymous'} className="min-w-0 flex-1 text-xs text-muted-foreground">
              {meeting ? t('comment.privateMeeting', { name }) : t('comment.sharedCircle', { min: CIRCLE_COMMENT_MIN_RESPONDENTS })}
            </p>
            <p id={`${uid}-comment-count`} role={near ? 'status' : undefined} data-testid="comment-count" className={`text-xs tabular-nums ${near ? 'text-text-warning' : 'text-muted-foreground'}`}>
              {t('comment.count', { count: comment.length, max: FEEDBACK_COMMENT_MAX })}
            </p>
          </div>
        </div>

        {meeting && canConnect && attended && !readOnly && (
          <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-border-subtle p-3 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-text-brand">
            <input type="checkbox" checked={stay} onChange={(e) => setStay(e.target.checked)} className="mt-0.5 size-5 accent-surface-brand" data-testid="stay-connected" />
            <span className="min-w-0 text-sm">
              <span className="block font-medium text-text-primary">{t('stayConnected.label', { name })}</span>
              <span className="block text-xs text-muted-foreground">{t('stayConnected.hint', { name })}</span>
            </span>
          </label>
        )}
      </fieldset>

      {!readOnly && (
        <button type="submit" disabled={busy} className={btnPrimary} data-testid="feedback-save">
          {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {busy ? t('saving') : initial ? t('update') : t('save')}
        </button>
      )}
    </form>
  );
}
