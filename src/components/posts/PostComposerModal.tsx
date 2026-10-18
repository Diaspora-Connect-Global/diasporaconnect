'use client';

import { useCallback, useRef, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { PostComposerForm, type PostComposerHandle } from '@/components/posts/PostComposerForm';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Element that opened the dialog; focus goes back to it on close (the dialog has no Trigger). */
  returnFocusTo?: React.RefObject<HTMLElement | null>;
}

/**
 * The create-post form in a dialog. Esc / backdrop / X close it; with text or media in it
 * the user is asked before the draft is thrown away. Phones get a full-height sheet.
 */
export default function PostComposerModal({ open, onOpenChange, returnFocusTo }: Props) {
  const t = useTranslations('composer');
  const [dirty, setDirty] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const formRef = useRef<PostComposerHandle>(null);
  const keepRef = useRef<HTMLButtonElement>(null);

  const requestClose = useCallback(() => {
    if (confirming) {
      setConfirming(false);
      return;
    }
    if (dirty) {
      setConfirming(true);
      return;
    }
    onOpenChange(false);
  }, [confirming, dirty, onOpenChange]);

  const discard = async () => {
    setBusy(true);
    try {
      await formRef.current?.discard();
    } finally {
      setBusy(false);
      setConfirming(false);
      onOpenChange(false);
    }
  };

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) requestClose();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <DialogPrimitive.Content
          data-testid="post-composer-modal"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            returnFocusTo?.current?.focus();
          }}
          className="fixed inset-0 z-50 flex h-dvh w-full flex-col overflow-hidden bg-surface-default focus:outline-none sm:inset-auto sm:left-1/2 sm:top-1/2 sm:h-auto sm:max-h-[90dvh] sm:max-w-2xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border sm:border-border-subtle sm:shadow-xl"
        >
          <div className="flex items-center justify-between gap-3 border-b border-border-subtle px-4 py-3">
            <DialogPrimitive.Title className="min-w-0 truncate text-base font-bold text-text-primary sm:text-lg">
              {t('title')}
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">{t('description')}</DialogPrimitive.Description>
            <button
              type="button"
              onClick={requestClose}
              aria-label={t('close')}
              className="grid size-9 shrink-0 place-items-center rounded-full text-text-secondary hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4">
            <PostComposerForm
              variant="modal"
              handleRef={formRef}
              autoFocus
              onDirtyChange={setDirty}
              onPosted={() => onOpenChange(false)}
            />
          </div>

          {confirming && (
            <div className="absolute inset-0 z-10 grid place-items-center bg-black/40 p-4" onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); setConfirming(false); } }}>
              <div role="alertdialog" aria-modal="true" aria-labelledby="composer-discard-title" aria-describedby="composer-discard-desc" className="w-full max-w-sm rounded-2xl border border-border-subtle bg-surface-default p-5 shadow-xl">
                <h3 id="composer-discard-title" className="text-base font-bold text-text-primary">{t('discardTitle')}</h3>
                <p id="composer-discard-desc" className="mt-1 text-sm text-text-secondary">{t('discardBody')}</p>
                <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button type="button" onClick={discard} disabled={busy} className="rounded-full border border-border-subtle px-4 py-2 text-sm font-semibold text-text-danger hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand disabled:opacity-60">
                    {t('discardConfirm')}
                  </button>
                  <button ref={keepRef} type="button" autoFocus onClick={() => setConfirming(false)} className="rounded-full bg-surface-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-brand focus-visible:ring-offset-2">
                    {t('keepEditing')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
