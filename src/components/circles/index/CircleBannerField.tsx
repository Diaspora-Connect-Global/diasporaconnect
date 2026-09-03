'use client';

import { useId, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { ImageIcon, X } from 'lucide-react';

import { LabelMedium } from '@/components/utils';

import { CircleAvatar, CircleBanner } from './CircleImagery';

/**
 * The avatar and banner pickers on "Create a Circle".
 *
 * ## Why the image is not sent with `createCircle`
 *
 * It cannot be. `CreateCircleRequest` in `circle.proto` carries `name`,
 * `tagline`, `description`, `handle`, `discoverable`, `join_mode`,
 * `actor_user_id` and `idempotency_key` — no `avatar_url`, no `banner_url` —
 * and that proto is frozen. Adding the fields to `CreateCircleInput` would
 * produce a mutation that accepts a URL and silently drops it, which is worse
 * than not offering the control.
 *
 * The fields live on `UpdateCircleProfileRequest`, reached through the gateway's
 * LEAD-gated `updateCircleProfile`. So creation is two calls, and this component
 * only *chooses* the file: `CreateCircleForm` owns the upload and the ordering
 * (create, then upload, then attach), because only it knows the circle id and
 * only it can decide that a failed image must not read as a failed circle.
 *
 * ## Selection is local until submit
 *
 * `preview` is a data URL held in the form, not an uploaded object. Nothing
 * reaches GCS until the circle exists, so abandoning the form uploads nothing.
 */
export interface CircleImageFieldProps {
  variant: 'avatar' | 'banner';
  /** Circle name so far — the avatar placeholder shows its first letter. */
  name: string;
  /** Local data-URL preview of the chosen file; null when nothing is chosen. */
  preview: string | null;
  /** True while the form is submitting, so the picker cannot be changed mid-flight. */
  disabled?: boolean;
  onSelect: (file: File) => void;
  onClear: () => void;
}

export function CircleImageField({
  variant,
  name,
  preview,
  disabled = false,
  onSelect,
  onClear,
}: CircleImageFieldProps) {
  const t = useTranslations('circles');
  const hintId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const isAvatar = variant === 'avatar';
  const copy = isAvatar
    ? {
        label: t('create.avatarLabel'),
        cta: t('create.avatarCta'),
        change: t('create.avatarChange'),
        remove: t('create.avatarRemove'),
        hint: t('create.avatarHint'),
      }
    : {
        label: t('create.bannerLabel'),
        cta: t('create.bannerCta'),
        change: t('create.bannerChange'),
        remove: t('create.bannerRemove'),
        hint: t('create.bannerHint'),
      };

  return (
    <div className="space-y-2">
      <LabelMedium className="text-text-primary">{copy.label}</LabelMedium>

      {/*
       * One hidden input driven by a real <button>, rather than a <label> that
       * wraps the input: a label is not focusable as a control, so keyboard
       * users reach it only by tabbing onto the invisible file input itself.
       */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onSelect(file);
          // Reset so re-picking the same file still fires `change`.
          event.target.value = '';
        }}
      />

      {preview ? (
        <div className="space-y-2">
          {isAvatar ? (
            <CircleAvatar
              name={name}
              src={preview}
              className="size-20 border border-border-subtle"
            />
          ) : (
            <CircleBanner
              src={preview}
              className="h-32 overflow-hidden rounded-md border border-border-subtle"
            />
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={disabled}
              onClick={() => inputRef.current?.click()}
              className="label-small rounded-md border border-border-subtle px-3 py-1.5 text-text-primary transition-colors hover:bg-surface-subtle disabled:cursor-not-allowed disabled:opacity-60"
            >
              {copy.change}
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={onClear}
              className="label-small inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-text-secondary transition-colors hover:bg-surface-subtle disabled:cursor-not-allowed disabled:opacity-60"
            >
              <X aria-hidden="true" className="size-3.5" />
              {copy.remove}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          aria-describedby={hintId}
          onClick={() => inputRef.current?.click()}
          className={`flex w-full flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-border-subtle bg-surface-subtle transition-colors hover:border-border-brand disabled:cursor-not-allowed disabled:opacity-60 ${
            isAvatar ? 'h-24' : 'h-32'
          }`}
        >
          <ImageIcon aria-hidden="true" className="size-6 text-text-secondary" />
          <span className="label-small text-text-primary">{copy.cta}</span>
          <span id={hintId} className="caption-small text-text-secondary">
            {copy.hint}
          </span>
        </button>
      )}
    </div>
  );
}
