'use client';

import { useState } from 'react';
import { Check, Copy, TriangleAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ButtonType1, ButtonType2 } from '@/components/custom/button';

export interface MintedLinkRevealProps {
  /** The full shareable URL, already built. Never store or log this. */
  url: string;
  /** Dismiss the panel. The URL is unrecoverable afterwards. */
  onDismiss: () => void;
}

/**
 * The one and only showing of a freshly minted invite link.
 *
 * ── THIS IS THE ONLY TIME THE TOKEN EXISTS ON A SCREEN ──────────────────────
 * `mintCircleInviteLink` is the single operation on the whole GraphQL surface
 * that returns a raw token; `CircleInviteLink` has no such field, so no list,
 * read, refetch or cache entry can ever produce it again. That is containment
 * working as intended, not a gap — and it makes this component load-bearing.
 * If the person closes it without copying, the only remedy is to revoke the
 * link and mint another.
 *
 * Hence the shape:
 *   - the URL is VISIBLE as text, not hidden behind a copy button, so a
 *     refused clipboard (insecure context, embedded browser) still leaves
 *     something to select by hand rather than a silent no-op;
 *   - the warning is stated before the copy control, not after it;
 *   - dismissal is an explicit button whose LABEL is the confirmation
 *     ("I've copied it"), rather than an ✕ that a stray click can hit;
 *   - nothing auto-dismisses, and nothing here is written to a store, a URL of
 *     our own, or a log.
 *
 * The URL is not rendered as an anchor. It is a bearer credential; a link
 * invites a click that would spend one of its uses on the person who minted it.
 */
export function MintedLinkReveal({ url, onDismiss }: MintedLinkRevealProps) {
  const t = useTranslations('circles.invites.minted');

  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setCopyFailed(false);
    } catch {
      // Clipboard access is refused outside a secure context and inside some
      // embedded browsers. Claiming success would be a silent no-op on the one
      // thing that cannot be retried, so it says so and points at the text.
      setCopied(false);
      setCopyFailed(true);
    }
  }

  return (
    <div className="rounded-xl border border-border-subtle bg-surface-default p-4">
      <div className="flex items-start gap-2">
        <TriangleAlert
          aria-hidden="true"
          className="mt-0.5 size-5 shrink-0 text-text-warning"
        />
        <div className="min-w-0">
          <h3 className="label-medium text-text-primary">{t('title')}</h3>
          <p className="caption-small mt-0.5 text-text-warning">
            {t('shownOnce')}
          </p>
        </div>
      </div>

      {/*
        `select-all` makes one click select the whole thing, which is what the
        manual path needs when the clipboard is unavailable. Read-only text
        rather than an <input>: nothing here is editable, and a text input
        invites autofill and password managers to take an interest in a
        credential.
      */}
      <p className="body-small mt-3 rounded-lg bg-surface-subtle px-3 py-2 break-all text-text-primary select-all">
        {url}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <ButtonType2 onClick={handleCopy}>
          <span className="flex items-center gap-2">
            {copied ? (
              <Check className="size-4 shrink-0" aria-hidden="true" />
            ) : (
              <Copy className="size-4 shrink-0" aria-hidden="true" />
            )}
            {copied ? t('copied') : t('copy')}
          </span>
        </ButtonType2>

        <ButtonType1 onClick={onDismiss}>{t('dismiss')}</ButtonType1>
      </div>

      {/*
        Announced rather than only shown: the copy button's own label changes,
        but a screen-reader user who pressed it needs the outcome without
        re-reading the control — and the failure branch needs to reach them at
        all, since it changes what they must do next.
      */}
      <p className="caption-small mt-2 text-text-secondary" aria-live="polite">
        {copyFailed ? t('copyFailed') : copied ? t('copiedHint') : ''}
      </p>
    </div>
  );
}
