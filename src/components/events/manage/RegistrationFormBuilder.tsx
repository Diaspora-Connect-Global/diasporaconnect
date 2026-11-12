'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { useTranslations } from 'next-intl';
import { ArrowDown, ArrowUp, Loader2, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { ButtonType1, ButtonType2, ButtonType3 } from '@/components/custom/button';
import RegistrationModePicker from './RegistrationModePicker';
import PageLoader from '@/components/custom/PageLoader';
import { GET_EVENT, UPDATE_EVENT, UPDATE_EVENT_FORM_FIELDS, type EventRegistrationMode, type GetEventData } from '@/services/gql/events';
import { hasErrors } from '@/lib/eventRefusal';
import {
  CHOICE_TYPES,
  DEFAULT_FIELDS,
  FIELD_TYPES,
  MAX_FIELDS,
  MAX_LABEL,
  MAX_OPTION,
  MAX_OPTIONS,
  builtinOf,
  domainOf,
  missingDefaults,
  normaliseRegistrationLink,
  parseOptions,
  serverMessageOf,
  withDefaultsRestored,
  type BuiltinId,
  type FieldType,
} from '@/lib/eventRegistrationForm';

const INPUT =
  'min-h-11 w-full rounded-md border-2 border-border-subtle bg-surface-subtle px-3 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus-visible:border-border-brand';
const ICON_BTN =
  'grid size-11 shrink-0 place-items-center rounded-full border border-border-subtle text-text-secondary hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40';

interface Draft {
  key: string;
  /** Server id of an existing question, or the reserved id of a default; absent for a new question. */
  id?: string;
  builtin: BuiltinId | null;
  label: string;
  type: FieldType;
  required: boolean;
  optionsText: string;
}

/**
 * Where people register + the organiser-built registration form. Replaces the old
 * four-type form editor on the Manage page. The form is one list: the four default
 * fields (removable, restorable) and the organiser's own questions, in the order
 * attendees see them. Saving replaces the whole form.
 */
export default function RegistrationFormBuilder({ eventId }: { eventId: string }) {
  const t = useTranslations('eventForm');
  const tb = useTranslations('eventForm.builder');
  const tw = useTranslations('eventForm.where');
  const tt = useTranslations('eventForm.types');
  const td = useTranslations('eventForm.defaults');

  const { data, loading, refetch } = useQuery<GetEventData>(GET_EVENT, { variables: { id: eventId } });
  const event = data?.getEvent;
  const registered = event?.registrationCount ?? 0;

  // ── Where do people register ──────────────────────────────────────────────
  const savedMode: EventRegistrationMode = event?.registrationMode === 'EXTERNAL' ? 'EXTERNAL' : 'IN_APP';
  const [mode, setMode] = useState<EventRegistrationMode>(savedMode);
  const [link, setLink] = useState(event?.registrationLink ?? '');
  const [linkError, setLinkError] = useState(false);
  const [showForm, setShowForm] = useState(false);
  useEffect(() => {
    setMode(event?.registrationMode === 'EXTERNAL' ? 'EXTERNAL' : 'IN_APP');
    setLink(event?.registrationLink ?? '');
  }, [event?.registrationMode, event?.registrationLink]);

  const [updateEvent, { loading: savingWhere }] = useMutation(UPDATE_EVENT);
  const saveWhere = async () => {
    let registrationLink = '';
    if (mode === 'EXTERNAL') {
      const url = normaliseRegistrationLink(link);
      if (!url) {
        setLinkError(true);
        return;
      }
      registrationLink = url;
      setLink(url);
    }
    setLinkError(false);
    try {
      const res = await updateEvent({ variables: { id: eventId, input: { registrationMode: mode, registrationLink } } });
      if (hasErrors(res) || !res.data) {
        toast.error(serverMessageOf(res) || tw('saveFailed'));
        return;
      }
      toast.success(tw('saved'));
      await refetch();
    } catch (err) {
      toast.error(serverMessageOf(err) || tw('saveFailed'));
    }
  };

  // ── The form ──────────────────────────────────────────────────────────────
  const counter = useRef(0);
  const toDrafts = (): Draft[] =>
    (event?.registrationFormFields ?? []).map((f) => {
      const builtin = builtinOf(f);
      return {
        key: f.id,
        id: f.id,
        builtin,
        label: f.label,
        type: (FIELD_TYPES as readonly string[]).includes(f.type) ? (f.type as FieldType) : 'text',
        required: f.required,
        optionsText: (f.options ?? []).join('\n'),
      };
    });
  const serverSig = JSON.stringify(event?.registrationFormFields ?? []);
  const [fields, setFields] = useState<Draft[]>([]);
  useEffect(() => {
    setFields(toDrafts());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverSig]);
  const [problem, setProblem] = useState<string | null>(null);
  const [updateFormFields, { loading: saving }] = useMutation(UPDATE_EVENT_FORM_FIELDS);

  const patch = (key: string, p: Partial<Draft>) => setFields((prev) => prev.map((f) => (f.key === key ? { ...f, ...p } : f)));
  const move = (idx: number, by: -1 | 1) =>
    setFields((prev) => {
      const j = idx + by;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
  const remove = (key: string) => setFields((prev) => prev.filter((f) => f.key !== key));
  const addQuestion = () =>
    setFields((prev) => [...prev, { key: `new-${++counter.current}`, builtin: null, label: '', type: 'text', required: false, optionsText: '' }]);
  const restore = () =>
    setFields((prev) =>
      withDefaultsRestored(prev, (d) => ({ key: d.id, id: d.id, builtin: d.id, label: d.label, type: d.type, required: d.required, optionsText: '' })),
    );

  const missing = useMemo(() => missingDefaults(fields.map((f) => ({ id: f.id, builtin: f.builtin, label: f.label, type: f.type, required: f.required }))), [fields]);
  const labelOf = (f: Draft) => (f.builtin ? td(f.builtin) : f.label.trim() || tb('questionLabel'));

  const save = async () => {
    setProblem(null);
    if (fields.length > MAX_FIELDS) return setProblem(tb('tooMany', { max: MAX_FIELDS }));
    for (const f of fields) {
      if (f.builtin) continue;
      const label = f.label.trim();
      if (!label) return setProblem(tb('labelRequired'));
      if (label.length > MAX_LABEL) return setProblem(tb('labelTooLong', { max: MAX_LABEL }));
      if (CHOICE_TYPES.has(f.type)) {
        const opts = parseOptions(f.optionsText);
        if (opts.length === 0) return setProblem(tb('optionsRequired', { label }));
        if (opts.length > MAX_OPTIONS) return setProblem(tb('optionsTooMany', { label, max: MAX_OPTIONS }));
        if (opts.some((o) => o.length > MAX_OPTION)) return setProblem(tb('optionTooLong', { max: MAX_OPTION }));
      }
    }
    const payload = fields.map((f) => {
      const def = f.builtin ? DEFAULT_FIELDS.find((d) => d.id === f.builtin) : undefined;
      return {
        id: f.id,
        label: def ? def.label : f.label.trim(),
        type: def ? def.type : f.type,
        required: f.required,
        options: !def && CHOICE_TYPES.has(f.type) ? parseOptions(f.optionsText) : undefined,
      };
    });
    try {
      const res = await updateFormFields({ variables: { input: { eventId, fields: payload } } });
      if (hasErrors(res) || !res.data) {
        setProblem(serverMessageOf(res) || tb('saveFailed'));
        return;
      }
      toast.success(tb('saved'));
      await refetch();
    } catch (err) {
      setProblem(serverMessageOf(err) || tb('saveFailed'));
    }
  };

  if (loading && !data) return <PageLoader />;

  const external = mode === 'EXTERNAL';
  const linkDomain = domainOf(normaliseRegistrationLink(link) ?? '');
  const formHidden = external && !showForm;

  return (
    <div className="space-y-6" data-testid="registration-form-builder">
      <p className="text-sm text-text-secondary">{tb('intro')}</p>

      <div className="space-y-3">
        <RegistrationModePicker
          mode={mode}
          onMode={setMode}
          link={link}
          onLink={(v) => { setLink(v); setLinkError(false); }}
          linkError={linkError}
          registeredCount={registered}
        />
        <ButtonType2 onClick={saveWhere} disabled={savingWhere} className="flex items-center gap-2" data-testid="where-save">
          {savingWhere && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {tw('save')}
        </ButtonType2>
      </div>

      {/* The form, folded away for external events */}
      {external && (
        <div className="space-y-2 rounded-lg bg-surface-subtle p-4 text-sm text-text-secondary" data-testid="external-form-note">
          <p>{linkDomain ? t('external.note', { domain: linkDomain }) : t('external.noteNoLink')}</p>
          <ButtonType3 onClick={() => setShowForm((v) => !v)} aria-expanded={showForm}>
            {showForm ? t('external.hide') : t('external.show')}
          </ButtonType3>
        </div>
      )}

      {!formHidden && (
        <section className="space-y-4" aria-labelledby="reg-form-title">
          <h3 id="reg-form-title" className="text-base font-semibold text-text-primary">{tb('title')}</h3>
          {registered > 0 && <p className="text-sm text-text-secondary" data-testid="no-new-questions">{tb('noNewQuestions')}</p>}

          {fields.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border-subtle p-4 text-sm text-text-secondary">{tb('empty')}</p>
          ) : (
            <ol className="space-y-3">
              {fields.map((f, idx) => {
                const name = labelOf(f);
                const choice = CHOICE_TYPES.has(f.type);
                return (
                  <li key={f.key} className="space-y-3 rounded-lg border border-border-subtle p-3 sm:p-4" data-testid={`builder-field-${idx}`}>
                    <div className="flex flex-wrap items-start gap-2">
                      <div className="min-w-0 flex-1 basis-48 space-y-1">
                        {f.builtin ? (
                          <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-text-primary">
                            <span className="break-words">{name}</span>
                            <span className="rounded-full bg-surface-subtle px-2 py-0.5 text-[11px] font-medium text-text-secondary">{tb('defaultTag')}</span>
                            <span className="text-xs font-normal text-text-secondary">{tt(DEFAULT_FIELDS.find((d) => d.id === f.builtin)!.type)}</span>
                          </p>
                        ) : (
                          <>
                            <label htmlFor={`q-label-${f.key}`} className="text-xs font-medium text-text-secondary">{tb('questionLabel')}</label>
                            <input
                              id={`q-label-${f.key}`}
                              value={f.label}
                              maxLength={MAX_LABEL}
                              onChange={(e) => patch(f.key, { label: e.target.value })}
                              placeholder={tb('questionPlaceholder')}
                              className={INPUT}
                            />
                          </>
                        )}
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button type="button" onClick={() => move(idx, -1)} disabled={idx === 0} aria-label={tb('moveUp', { label: name })} className={ICON_BTN}><ArrowUp className="size-4" aria-hidden /></button>
                        <button type="button" onClick={() => move(idx, 1)} disabled={idx === fields.length - 1} aria-label={tb('moveDown', { label: name })} className={ICON_BTN}><ArrowDown className="size-4" aria-hidden /></button>
                        <button type="button" onClick={() => remove(f.key)} aria-label={tb('removeField', { label: name })} className={`${ICON_BTN} text-text-danger hover:text-text-danger`}><Trash2 className="size-4" aria-hidden /></button>
                      </div>
                    </div>

                    {!f.builtin && (
                      <div className="space-y-1">
                        <label htmlFor={`q-type-${f.key}`} className="text-xs font-medium text-text-secondary">{tb('type')}</label>
                        <select
                          id={`q-type-${f.key}`}
                          value={f.type}
                          onChange={(e) => patch(f.key, { type: e.target.value as FieldType })}
                          className={INPUT}
                        >
                          {FIELD_TYPES.map((ft) => <option key={ft} value={ft}>{tt(ft)}</option>)}
                        </select>
                      </div>
                    )}

                    {!f.builtin && choice && (
                      <div className="space-y-1">
                        <label htmlFor={`q-options-${f.key}`} className="text-xs font-medium text-text-secondary">{tb('options')}</label>
                        <textarea
                          id={`q-options-${f.key}`}
                          value={f.optionsText}
                          onChange={(e) => patch(f.key, { optionsText: e.target.value })}
                          rows={3}
                          placeholder={tb('optionsPlaceholder')}
                          className="w-full resize-none rounded-md border-2 border-border-subtle bg-surface-subtle px-3 py-2 text-sm placeholder:text-text-secondary focus:outline-none focus-visible:border-border-brand"
                        />
                      </div>
                    )}

                    <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-text-secondary">
                      <input type="checkbox" checked={f.required} onChange={(e) => patch(f.key, { required: e.target.checked })} className="size-4 accent-surface-brand" />
                      {tb('required')}
                    </label>
                  </li>
                );
              })}
            </ol>
          )}

          {problem && <p role="alert" className="text-sm text-text-danger" data-testid="builder-problem">{problem}</p>}

          <div className="flex flex-wrap gap-2">
            <ButtonType1 onClick={addQuestion} disabled={fields.length >= MAX_FIELDS} className="flex items-center gap-1" data-testid="add-question">
              <Plus className="size-4" aria-hidden /> {tb('addQuestion')}
            </ButtonType1>
            {missing.length > 0 && (
              <ButtonType1 onClick={restore} className="flex items-center gap-1" data-testid="restore-defaults">
                <RotateCcw className="size-4" aria-hidden /> {fields.length === 0 ? tb('addDefaults') : tb('restore')}
              </ButtonType1>
            )}
            <ButtonType2 onClick={save} disabled={saving} className="flex items-center gap-2" data-testid="builder-save">
              {saving && <Loader2 className="size-4 animate-spin" aria-hidden />}
              {tb('save')}
            </ButtonType2>
          </div>
        </section>
      )}
    </div>
  );
}
