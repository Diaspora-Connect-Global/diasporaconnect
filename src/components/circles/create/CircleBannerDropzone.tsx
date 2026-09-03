'use client';

import { useId, useRef, useState, type DragEvent } from 'react';
import { useTranslations } from 'next-intl';
import { ImageIcon, X } from 'lucide-react';

import { CircleBanner } from '@/components/circles/index/CircleImagery';

/**
 * The "Add a banner" dropzone on Create a Circle.
 *
 * ## Why this is not `CircleImageField`
 *
 * `components/circles/index/CircleBannerField.tsx` is a click-to-open picker
 * with a fixed `h-32` box and a label above it. The create screen's design
 * wants a real dropzone that carries its own call-to-action inside the frame
 * and holds the banner's own aspect ratio, so the preview is the shape the
 * banner will actually be rather than a letterboxed strip. That is a different
 * component, not a prop on the old one — and the old one is still used by the
 * pre-redesign form, so widening it would have changed a screen this task does
 * not own.
 *
 * ## Selection stays local until submit
 *
 * `preview` is a data URL held by the form's `useImageUpload`, not an uploaded
 * object. Nothing reaches GCS until the circle exists, so abandoning the form
 * uploads nothing. The parent owns the upload and its ordering.
 *
 * ## Drag and drop is additive, never the only route
 *
 * The frame is a real `<button>`, so click and keyboard both work and the
 * control has an accessible name; the drag handlers hang off the same element.
 * A dropzone that can only be dropped onto is unusable without a pointer.
 */
export interface CircleBannerDropzoneProps {
  /** Local data-URL preview of the chosen file; null when nothing is chosen. */
  preview: string | null;
  /** True while the form is submitting, so the picker cannot change mid-flight. */
  disabled?: boolean;
  onSelect: (file: File) => void;
  onClear: () => void;
}

/**
 * 1020 x 480 — the recommended banner, expressed as a ratio so the empty
 * dropzone and the preview are the same shape at every column width.
 */
const BANNER_ASPECT = 'aspect-[17/8]';

export function CircleBannerDropzone({
  preview,
  disabled = false,
  onSelect,
  onClear,
}: CircleBannerDropzoneProps) {
  const t = useTranslations('circles');
  const hintId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);

  const openPicker = () => inputRef.current?.click();

  const takeFirstImage = (fileList: FileList | null) => {
    const file = Array.from(fileList ?? []).find((candidate) =>
      candidate.type.startsWith('image/'),
    );
    // A drop of a PDF or a folder is ignored rather than handed to the image
    // pipeline, which would reject it later with a less obvious message.
    if (file) onSelect(file);
  };

  const handleDragOver = (event: DragEvent<HTMLElement>) => {
    if (disabled) return;
    // Without preventDefault the browser navigates to the dropped file.
    event.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => setDragging(false);

  const handleDrop = (event: DragEvent<HTMLElement>) => {
    if (disabled) return;
    event.preventDefault();
    setDragging(false);
    takeFirstImage(event.dataTransfer?.files ?? null);
  };

  return (
    <div className="space-y-2">
      {/*
       * One hidden input driven by a real <button>, rather than a <label> that
       * wraps the input: a label is not focusable as a control, so keyboard
       * users would reach it only by tabbing onto the invisible file input.
       */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        disabled={disabled}
        onChange={(event) => {
          takeFirstImage(event.target.files);
          // Reset so re-picking the same file still fires `change`.
          event.target.value = '';
        }}
      />

      {preview ? (
        <div className="space-y-2">
          <CircleBanner
            src={preview}
            className={`${BANNER_ASPECT} w-full overflow-hidden rounded-xl border border-border-subtle`}
          />

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={disabled}
              onClick={openPicker}
              className="label-small rounded-md border border-border-subtle px-3 py-1.5 text-text-primary transition-colors hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-brand disabled:cursor-not-allowed disabled:opacity-60"
            >
              {t('create.bannerChange')}
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={onClear}
              className="label-small inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-text-secondary transition-colors hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-brand disabled:cursor-not-allowed disabled:opacity-60"
            >
              <X aria-hidden="true" className="size-3.5" />
              {t('create.bannerRemove')}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          aria-describedby={hintId}
          onClick={openPicker}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`${BANNER_ASPECT} flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed bg-surface-subtle transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-brand disabled:cursor-not-allowed disabled:opacity-60 ${
            // The brand tint is drag state — interactive feedback, not decoration.
            dragging
              ? 'border-border-brand bg-surface-brand-subtle'
              : 'border-border-subtle hover:border-border-brand'
          }`}
        >
          {/*
           * `pointer-events-none` on every child: `dragleave` bubbles, so
           * dragging across the icon or the label would otherwise fire it and
           * flicker the highlight off while the pointer is still inside the
           * zone. Making the children transparent to pointer events leaves the
           * button itself as the only drag target.
           */}
          <span className="pointer-events-none flex size-11 items-center justify-center rounded-full bg-surface-default">
            <ImageIcon aria-hidden="true" className="size-5 text-text-secondary" />
          </span>
          <span className="label-medium pointer-events-none text-text-primary">
            {t('create.bannerCta')}
          </span>
          <span
            id={hintId}
            className="caption-small pointer-events-none text-text-secondary"
          >
            {t('create.bannerHint')}
          </span>
        </button>
      )}
    </div>
  );
}
