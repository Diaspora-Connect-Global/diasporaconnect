'use client';

/**
 * Profile "Socials" tab — presentational. All transport is injected (`ops`),
 * so the dev harness can drive every state without a backend; the Apollo
 * wiring lives in ProfileSocials.
 *
 * Mutations resolve with `{ success, code }` — a refusal is NOT a throw, and
 * under errorPolicy 'all' a failed request can resolve with no payload at all.
 * Every op result is therefore checked for `success === true` explicitly.
 */

import { useId, useMemo, useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { Check, ExternalLink, Globe, Link2, Loader2, Pencil, Plus, RefreshCw, Trash2, AlertCircle } from 'lucide-react';
import type { IconType } from 'react-icons';
import {
  FaFacebook,
  FaGithub,
  FaInstagram,
  FaLinkedin,
  FaSnapchat,
  FaTelegram,
  FaThreads,
  FaTiktok,
  FaXTwitter,
  FaYoutube,
} from 'react-icons/fa6';
import { EmptyState } from '@/components/feedback';
import {
  MAX_SOCIAL_LINKS,
  MAX_WEBSITE_LINKS,
  PLATFORM_LABELS,
  PLATFORM_PLACEHOLDERS,
  SOCIAL_LINK_REFUSAL_CODES,
  SOCIAL_PLATFORMS,
  isSafeHttpsUrl,
  previewSocialLink,
  type SocialLink,
  type SocialLinkResult,
  type SocialLinkStatus,
  type SocialPlatform,
} from '@/lib/socialLinks';

export interface SocialLinkOps {
  add: (platform: SocialPlatform, input: string) => Promise<SocialLinkResult | null>;
  update: (id: string, input: string) => Promise<SocialLinkResult | null>;
  remove: (id: string) => Promise<SocialLinkResult | null>;
  recheck: (id: string) => Promise<SocialLinkResult | null>;
}

export interface SocialLinksPanelProps {
  isOwnProfile: boolean;
  links: SocialLink[];
  loading: boolean;
  error: boolean;
  onRetry?: () => void;
  /** Required for the owner view; ignored for others. */
  ops?: SocialLinkOps;
  notify: { success: (m: string) => void; error: (m: string) => void };
}

const NAVY = 'text-[#1B2A5E]';

const PLATFORM_ICONS: Record<SocialPlatform, IconType | typeof Globe> = {
  X: FaXTwitter,
  INSTAGRAM: FaInstagram,
  FACEBOOK: FaFacebook,
  LINKEDIN: FaLinkedin,
  TIKTOK: FaTiktok,
  YOUTUBE: FaYoutube,
  GITHUB: FaGithub,
  THREADS: FaThreads,
  SNAPCHAT: FaSnapchat,
  TELEGRAM: FaTelegram,
  WEBSITE: Globe,
};

function PlatformIcon({ platform, className }: { platform: SocialPlatform; className?: string }) {
  const Icon = PLATFORM_ICONS[platform] ?? Link2;
  return <Icon aria-hidden className={className} />;
}

const STATUS_STYLES: Record<SocialLinkStatus, string> = {
  CONFIRMED: 'bg-[#E8F5EE] text-[#1E7A4C]',
  UNCONFIRMED: 'bg-[#FFF4E0] text-[#8A5A00]',
  NOT_FOUND: 'bg-[#FDECEC] text-[#B42318]',
  PENDING: 'bg-[#EEF3FC] text-[#1F5FD6]',
};

function StatusChip({ status, label }: { status: SocialLinkStatus; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[status]}`}>
      {status === 'PENDING' && <Loader2 aria-hidden className="h-3 w-3 animate-spin" />}
      {status === 'CONFIRMED' && <Check aria-hidden className="h-3 w-3" />}
      {label}
    </span>
  );
}

type FormState = { mode: 'add' } | { mode: 'edit'; link: SocialLink } | null;

export default function SocialLinksPanel({ isOwnProfile, links, loading, error, onRetry, ops, notify }: SocialLinksPanelProps) {
  const t = useTranslations('profile.socials');
  const [form, setForm] = useState<FormState>(null);
  const [confirmingRemove, setConfirmingRemove] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const canEdit = isOwnProfile && !!ops;
  const visible = isOwnProfile ? links : links.filter((l) => l.status === 'CONFIRMED' || l.status === 'UNCONFIRMED');
  const atLimit = links.length >= MAX_SOCIAL_LINKS;

  const refusalMessage = (res: SocialLinkResult | null): string => {
    const code = res?.code && (SOCIAL_LINK_REFUSAL_CODES as readonly string[]).includes(res.code) ? res.code : null;
    if (code === 'RATE_LIMITED') {
      const when = res?.retryAt ? new Date(res.retryAt) : null;
      return when && !Number.isNaN(when.getTime())
        ? t('errors.RATE_LIMITED', { time: when.toLocaleString() })
        : t('errors.RATE_LIMITED_NO_TIME');
    }
    if (code === 'LIMIT_REACHED') return t('errors.LIMIT_REACHED', { max: MAX_SOCIAL_LINKS, websites: MAX_WEBSITE_LINKS });
    if (code) return t(`errors.${code}`);
    return t('errors.failed');
  };

  const run = async (id: string, fn: () => Promise<SocialLinkResult | null>, successMsg: string): Promise<boolean> => {
    setBusyId(id);
    try {
      const res = await fn();
      if (res?.success === true) {
        notify.success(successMsg);
        return true;
      }
      notify.error(refusalMessage(res));
      return false;
    } catch {
      notify.error(t('errors.failed'));
      return false;
    } finally {
      setBusyId(null);
    }
  };

  if (loading && links.length === 0) {
    return (
      <div className="p-4 lg:p-6 space-y-3" aria-busy="true" aria-live="polite">
        <h3 className={`text-lg font-semibold ${NAVY}`}>{t('title')}</h3>
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-xl animate-pulse">
            <div className="w-10 h-10 rounded-full bg-surface-subtle" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 bg-surface-subtle rounded" />
              <div className="h-3 w-48 bg-surface-subtle rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error && links.length === 0) {
    return (
      <div className="p-4 lg:p-6">
        <h3 className={`text-lg font-semibold ${NAVY} mb-2`}>{t('title')}</h3>
        <div role="alert" className="flex flex-col items-center gap-3 rounded-xl border border-[#E7ECF5] bg-[#F7F9FD] px-4 py-8 text-center">
          <AlertCircle aria-hidden className="h-6 w-6 text-[#1B2A5E]/60" />
          <p className={`text-sm ${NAVY}`}>{t('loadError')}</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="rounded-full border border-[#1F5FD6] px-4 py-1.5 text-sm font-medium text-[#1F5FD6] hover:bg-[#1F5FD6]/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5FD6]/40"
            >
              {t('retry')}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0 p-4 lg:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className={`text-lg font-semibold ${NAVY}`}>{t('title')}</h3>
          {visible.length > 0 && (
            <span className="rounded-full bg-surface-subtle px-2 py-0.5 text-xs text-text-secondary">{visible.length}</span>
          )}
        </div>
        {canEdit && !form && (
          <button
            type="button"
            onClick={() => setForm({ mode: 'add' })}
            disabled={atLimit}
            title={atLimit ? t('errors.LIMIT_REACHED', { max: MAX_SOCIAL_LINKS, websites: MAX_WEBSITE_LINKS }) : undefined}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#1F5FD6] px-4 py-2 text-sm font-medium text-white hover:bg-[#1A52BB] disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5FD6]/40 focus-visible:ring-offset-2"
          >
            <Plus aria-hidden className="h-4 w-4" />
            {t('add')}
          </button>
        )}
      </div>

      {canEdit && form && (
        <SocialLinkForm
          key={form.mode === 'edit' ? form.link.id : 'add'}
          initial={form.mode === 'edit' ? form.link : null}
          existing={links}
          onCancel={() => setForm(null)}
          onSubmit={async (platform, input) => {
            const ok =
              form.mode === 'edit'
                ? await run(form.link.id, () => ops!.update(form.link.id, input), t('updated'))
                : await run('new', () => ops!.add(platform, input), t('added'));
            if (ok) setForm(null);
            return ok;
          }}
          submitting={busyId === 'new' || (form.mode === 'edit' && busyId === form.link.id)}
        />
      )}

      {visible.length === 0 ? (
        !form && (
          <EmptyState
            icon={Link2}
            size="sm"
            title={isOwnProfile ? t('emptyOwnTitle') : t('emptyOther')}
            description={isOwnProfile ? t('emptyOwn') : undefined}
          />
        )
      ) : (
        <ul className="space-y-2" aria-label={t('listLabel')}>
          {visible.map((link) => (
            <li key={link.id}>
              {isOwnProfile ? (
                <OwnLinkRow
                  link={link}
                  busy={busyId === link.id}
                  confirming={confirmingRemove === link.id}
                  disabled={!canEdit}
                  onEdit={() => {
                    setConfirmingRemove(null);
                    setForm({ mode: 'edit', link });
                  }}
                  onRecheck={() => void run(link.id, () => ops!.recheck(link.id), t('recheckStarted'))}
                  onAskRemove={() => setConfirmingRemove(link.id)}
                  onCancelRemove={() => setConfirmingRemove(null)}
                  onConfirmRemove={async () => {
                    const ok = await run(link.id, () => ops!.remove(link.id), t('removed'));
                    if (ok) setConfirmingRemove(null);
                  }}
                />
              ) : (
                <PublicLinkRow link={link} />
              )}
            </li>
          ))}
        </ul>
      )}

      {isOwnProfile && visible.length > 0 && (
        <p className="mt-4 text-xs text-text-secondary">{t('limitNote', { max: MAX_SOCIAL_LINKS, websites: MAX_WEBSITE_LINKS })}</p>
      )}
    </div>
  );
}

function LinkText({ link }: { link: SocialLink }) {
  const secondary = link.title && link.title !== link.handle ? link.title : PLATFORM_LABELS[link.platform];
  return (
    <span className="block min-w-0 flex-1">
      <span className={`block truncate text-sm font-semibold ${NAVY}`}>{link.handle}</span>
      <span className="block truncate text-xs text-text-secondary">{secondary}</span>
    </span>
  );
}

function IconBubble({ platform }: { platform: SocialPlatform }) {
  return (
    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#EEF3FC] text-[#1B2A5E]">
      <PlatformIcon platform={platform} className="h-[18px] w-[18px]" />
    </span>
  );
}

/** Someone else's profile: a plain outbound link. Only CONFIRMED / UNCONFIRMED reach here. */
function PublicLinkRow({ link }: { link: SocialLink }) {
  const t = useTranslations('profile.socials');
  if (!isSafeHttpsUrl(link.url)) return null;
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="group flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-surface-subtle focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5FD6]/40"
    >
      <IconBubble platform={link.platform} />
      <LinkText link={link} />
      {link.status === 'CONFIRMED' && <StatusChip status="CONFIRMED" label={t('status.CONFIRMED')} />}
      <ExternalLink aria-hidden className="h-4 w-4 flex-shrink-0 text-[#1B2A5E]/40 group-hover:text-[#1F5FD6]" />
      <span className="sr-only">{t('opensInNewTab')}</span>
    </a>
  );
}

interface OwnLinkRowProps {
  link: SocialLink;
  busy: boolean;
  confirming: boolean;
  disabled: boolean;
  onEdit: () => void;
  onRecheck: () => void;
  onAskRemove: () => void;
  onCancelRemove: () => void;
  onConfirmRemove: () => void;
}

function OwnLinkRow({ link, busy, confirming, disabled, onEdit, onRecheck, onAskRemove, onCancelRemove, onConfirmRemove }: OwnLinkRowProps) {
  const t = useTranslations('profile.socials');
  const platform = PLATFORM_LABELS[link.platform];
  const iconBtn =
    'inline-flex h-9 w-9 items-center justify-center rounded-full text-[#1B2A5E]/70 hover:bg-[#EEF3FC] hover:text-[#1F5FD6] disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5FD6]/40';
  const help = link.status === 'UNCONFIRMED' || link.status === 'NOT_FOUND' ? t(`statusHelp.${link.status}`) : null;

  return (
    <div className="rounded-xl border border-[#E7ECF5] p-3">
      {/* Wraps on narrow phones: status + actions drop below the handle instead of squeezing it. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex min-w-[10rem] flex-1 items-center gap-3">
          <IconBubble platform={link.platform} />
          {isSafeHttpsUrl(link.url) ? (
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="min-w-0 flex-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5FD6]/40"
            >
              <LinkText link={link} />
              <span className="sr-only">{t('opensInNewTab')}</span>
            </a>
          ) : (
            <LinkText link={link} />
          )}
        </div>
        <div className="ml-auto flex flex-shrink-0 items-center gap-1">
          <StatusChip status={link.status} label={t(`status.${link.status}`)} />
          <button type="button" className={iconBtn} onClick={onEdit} disabled={disabled || busy} aria-label={t('edit', { platform })} title={t('editShort')}>
            <Pencil aria-hidden className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={iconBtn}
            onClick={onRecheck}
            disabled={disabled || busy || link.status === 'PENDING'}
            aria-label={t('recheck', { platform })}
            title={t('recheckShort')}
          >
            <RefreshCw aria-hidden className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} />
          </button>
          <button type="button" className={iconBtn} onClick={onAskRemove} disabled={disabled || busy} aria-label={t('remove', { platform })} title={t('removeShort')}>
            <Trash2 aria-hidden className="h-4 w-4" />
          </button>
        </div>
      </div>
      {help && <p className="mt-2 text-xs sm:pl-[52px] text-text-secondary">{help}</p>}
      {confirming && (
        <div role="alertdialog" aria-label={t('confirmRemove')} className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-[#FDECEC]/60 p-3">
          <p className={`mr-auto text-sm ${NAVY}`}>{t('confirmRemove')}</p>
          <button
            type="button"
            onClick={onCancelRemove}
            className="rounded-full px-3 py-1.5 text-sm font-medium text-[#1B2A5E] hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5FD6]/40"
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirmRemove}
            disabled={busy}
            autoFocus
            className="rounded-full bg-[#B42318] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#9A1C13] disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B42318]/40"
          >
            {t('confirmRemoveYes')}
          </button>
        </div>
      )}
    </div>
  );
}

interface SocialLinkFormProps {
  initial: SocialLink | null;
  existing: SocialLink[];
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (platform: SocialPlatform, input: string) => Promise<boolean>;
}

function SocialLinkForm({ initial, existing, submitting, onCancel, onSubmit }: SocialLinkFormProps) {
  const t = useTranslations('profile.socials');
  const ids = useId();
  const websites = existing.filter((l) => l.platform === 'WEBSITE').length;
  const taken = useMemo(() => new Set(existing.filter((l) => l.platform !== 'WEBSITE').map((l) => l.platform)), [existing]);
  const available = SOCIAL_PLATFORMS.filter((p) =>
    initial ? p === initial.platform : p === 'WEBSITE' ? websites < MAX_WEBSITE_LINKS : !taken.has(p),
  );
  const [platform, setPlatform] = useState<SocialPlatform>(initial?.platform ?? available[0] ?? 'WEBSITE');
  const [input, setInput] = useState(initial?.url ?? '');
  const preview = previewSocialLink(platform, input);
  const label = PLATFORM_LABELS[platform];

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!preview.ok || submitting) return;
    await onSubmit(platform, input.trim());
  };

  return (
    <form onSubmit={submit} className="mb-4 space-y-3 rounded-xl border border-[#E7ECF5] bg-[#F7F9FD] p-4" aria-label={initial ? t('editTitle') : t('addTitle')}>
      <p className={`text-sm font-semibold ${NAVY}`}>{initial ? t('editTitle') : t('addTitle')}</p>
      <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
        <div>
          <label htmlFor={`${ids}-platform`} className={`mb-1 block text-xs font-medium ${NAVY}`}>
            {t('platform')}
          </label>
          <select
            id={`${ids}-platform`}
            value={platform}
            disabled={!!initial}
            onChange={(e) => setPlatform(e.target.value as SocialPlatform)}
            className="h-10 w-full rounded-lg border border-[#D5DDEB] bg-white px-3 text-sm text-[#1B2A5E] disabled:opacity-70 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5FD6]/40"
          >
            {(initial ? [initial.platform] : available).map((p) => (
              <option key={p} value={p}>
                {PLATFORM_LABELS[p]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${ids}-input`} className={`mb-1 block text-xs font-medium ${NAVY}`}>
            {t('linkLabel')}
          </label>
          <input
            id={`${ids}-input`}
            type="text"
            inputMode="url"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            autoFocus
            maxLength={2048}
            value={input}
            placeholder={PLATFORM_PLACEHOLDERS[platform]}
            onChange={(e) => setInput(e.target.value)}
            aria-describedby={`${ids}-preview ${ids}-notice`}
            aria-invalid={!preview.ok && preview.code !== 'EMPTY'}
            className="h-10 w-full rounded-lg border border-[#D5DDEB] bg-white px-3 text-sm text-[#1B2A5E] placeholder:text-[#1B2A5E]/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5FD6]/40"
          />
        </div>
      </div>

      <p id={`${ids}-preview`} aria-live="polite" className="min-h-[1.25rem] text-xs">
        {preview.ok ? (
          <span className="text-[#1E7A4C]">{t('previewAs', { url: preview.url })}</span>
        ) : preview.code === 'WRONG_PLATFORM' ? (
          <span className="text-[#B42318]">{t('previewWrongPlatform', { platform: label })}</span>
        ) : preview.code === 'INVALID_URL' ? (
          <span className="text-[#B42318]">{t('previewInvalid', { platform: label })}</span>
        ) : null}
      </p>

      <p id={`${ids}-notice`} className="text-xs text-text-secondary">
        {t('publicNotice')}
      </p>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full px-4 py-2 text-sm font-medium text-[#1B2A5E] hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5FD6]/40"
        >
          {t('cancel')}
        </button>
        <button
          type="submit"
          disabled={!preview.ok || submitting}
          className="inline-flex items-center gap-1.5 rounded-full bg-[#1F5FD6] px-4 py-2 text-sm font-medium text-white hover:bg-[#1A52BB] disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5FD6]/40 focus-visible:ring-offset-2"
        >
          {submitting && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />}
          {submitting ? t('saving') : t('save')}
        </button>
      </div>
    </form>
  );
}
