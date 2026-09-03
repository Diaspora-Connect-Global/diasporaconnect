'use client';

import { useId, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { ImagePlus, X } from 'lucide-react';

import { CircleAvatar } from '@/components/circles/index/CircleImagery';
import { LabelMedium } from '@/components/utils';

/**
 * The circle's profile picture on Create a Circle.
 *
 * ## Why it is here at all
 *
 * The redesign brief describes only a banner in the left column, but the
 * screen it replaces already offered an avatar, and a circle's avatar is what
 * every list, header and chat bubble in the feature renders. Dropping the
 * control would not simplify the screen — it would quietly remove a capability
 * and push every founder to Settings for something they were about to do here.
 * So it stays, deliberately compact: one round preview and a text button, so
 * the banner remains the left column's visual anchor.
 *
 * ## Compact, not a second dropzone
 *
 * Two large dashed frames stacked would read as one control repeated. This is
 * a row, and it is the only place in the create flow where the avatar's actual
 * shape — a circle — is shown before submit.
 */
export interface CircleAvatarPickerProps {
  /** Circle name so far — the placeholder shows its first letter. */
  name: string;
  /** Local data-URL preview of the chosen file; null when nothing is chosen. */
  preview: string | null;
  disabled?: boolean;
  onSelect: (file: File) => void;
  onClear: () => void;
}

export function CircleAvatarPicker({
  name,
  preview,
  disabled = false,
  onSelect,
  onClear,
}: CircleAvatarPickerProps) {
  const t = useTranslations('circles');
  const hintId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="space-y-2">
      <LabelMedium className="text-text-primary">
        {t('create.avatarLabel')}
      </LabelMedium>

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

      <div className="flex items-center gap-3">
        {preview ? (
          <CircleAvatar
            name={name}
            src={preview}
            className="size-14 border border-border-subtle"
          />
        ) : (
          <span className="flex size-14 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-border-subtle bg-surface-subtle">
            <ImagePlus
              aria-hidden="true"
              className="size-5 text-text-secondary"
            />
          </span>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={disabled}
              aria-describedby={hintId}
              onClick={() => inputRef.current?.click()}
              className="label-small rounded-md border border-border-subtle px-3 py-1.5 text-text-primary transition-colors hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-brand disabled:cursor-not-allowed disabled:opacity-60"
            >
              {preview ? t('create.avatarChange') : t('create.avatarCta')}
            </button>

            {preview && (
              <button
                type="button"
                disabled={disabled}
                onClick={onClear}
                className="label-small inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-text-secondary transition-colors hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-brand disabled:cursor-not-allowed disabled:opacity-60"
              >
                <X aria-hidden="true" className="size-3.5" />
                {t('create.avatarRemove')}
              </button>
            )}
          </div>

          <p id={hintId} className="caption-small mt-1 text-text-secondary">
            {t('create.avatarHint')}
          </p>
        </div>
      </div>
    </div>
  );
}
