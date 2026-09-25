'use client';

import { useId } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
    ArrowRight,
    CalendarDays,
    CheckCircle2,
    Lightbulb,
    ListChecks,
    Loader2,
    MessageSquareText,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Link } from '@/i18n/navigation';
import type { ChatSummaryTopic } from '@/services/gql/types/messaging';
import { displayName, stripIds } from '@/lib/displayName';
import { formatDigestDate } from '@/lib/dailySummary';

/** Settings → Privacy → AI summaries (the section that controls this card). */
export const AI_SUMMARY_SETTINGS_HREF = '/settings#ai-summaries';

export interface DailySummaryCardProps {
    /** YYYY-MM-DD digest day. */
    digestDate?: string | null;
    messageCount?: number | null;
    /** One-line overview (the digest's `summary`). */
    overview?: string | null;
    topics?: ChatSummaryTopic[] | null;
    keyPoints?: string[] | null;
    decisions?: string[] | null;
    actionItems?: string[] | null;
    /** Jump to a topic's source messages. Omit to hide the "View messages" links. */
    onViewMessages?: (messageIds: string[], topicIndex: number) => void;
    /** Index of the topic whose messages are being fetched (shows a spinner). */
    pendingTopicIndex?: number | null;
    /** Avatar for a participant, when the caller knows one. */
    avatarFor?: (userId: string) => string | undefined;
    /**
     * Already-formatted message time ("5:26 PM"). Rendered OUTSIDE the card at
     * its bottom-right, the way every other chat message shows its time.
     */
    timestamp?: string | null;
}

/*
 * Design tokens for this card. Lavender/navy come straight from the owner's
 * design; dark mode swaps them for violet tints over the app's dark surface.
 */
const NAVY = 'text-[#141a46] dark:text-text-primary';
const BODY = 'text-[#2f3342] dark:text-text-primary/80';
/** The design's purple (Key points heading, bullets, links). */
const PURPLE = 'text-[#6440e3] dark:text-violet-300';

/**
 * The group chat's AI "Daily Summary": a lavender header (icon tile, title,
 * date + message count, decorative sun), then an inner panel with one row per
 * topic (avatar + heading + text, participants, "View messages"), a divider,
 * and key points / decisions / action items boxes. Footer: the AI-generated
 * disclosure + a link to the setting that controls it.
 *
 * Everything textual here is server-generated, so all of it goes through
 * `stripIds` (the AI may interpolate a user id) and participant names through
 * `displayName` (never the participant's `userId`, which is only a link key).
 * With no topics (older digests) it renders the overview + lists layout.
 */
export function DailySummaryCard({
    digestDate,
    messageCount,
    overview,
    topics,
    keyPoints,
    decisions,
    actionItems,
    onViewMessages,
    pendingTopicIndex = null,
    avatarFor,
    timestamp,
}: DailySummaryCardProps) {
    const t = useTranslations('chat.group.dailySummary');
    const tIdentity = useTranslations('common.identity');
    const locale = useLocale();
    const headingId = useId();
    const aMember = tIdentity('aMember');

    const clean = (s: string | null | undefined) => stripIds(s ?? '', aMember);
    const cleanList = (xs: string[] | null | undefined) =>
        (xs ?? []).map((x) => clean(x)).filter(Boolean);

    const overviewText = clean(overview);
    const topicList = (topics ?? [])
        .map((topic) => ({
            title: clean(topic.title),
            summary: clean(topic.summary),
            participants: (topic.participants ?? []).map((p) => ({
                userId: p.userId,
                name: displayName({ displayName: p.displayName }, tIdentity('unknownUser')),
            })),
            messageIds: (topic.messageIds ?? []).filter(Boolean),
        }))
        .filter((topic) => topic.title || topic.summary);
    const points = cleanList(keyPoints);
    const decided = cleanList(decisions);
    const actions = cleanList(actionItems);
    const count = typeof messageCount === 'number' && messageCount > 0 ? messageCount : null;
    const dateLabel = formatDigestDate(digestDate, locale);
    const hasLists = points.length > 0 || decided.length > 0 || actions.length > 0;
    const hasRows = topicList.length > 0 || !!overviewText;

    const card = (
        <section
            aria-labelledby={headingId}
            data-testid="daily-summary-card"
            className="w-full min-w-0 overflow-hidden rounded-3xl border border-[#e3dffb] bg-white text-left shadow-[0_6px_24px_-12px_rgba(76,58,180,0.28)] dark:border-violet-400/20 dark:bg-surface-default dark:shadow-none"
        >
            {/* Header band */}
            <header className="relative overflow-hidden rounded-b-3xl bg-gradient-to-r from-[#f5f3ff] via-[#efebfe] to-[#e7e1fd] px-3.5 py-5 sm:px-5 dark:from-violet-500/10 dark:via-violet-500/15 dark:to-violet-500/25">
                <SunIllustration className="pointer-events-none absolute inset-y-0 right-0 h-full w-32 sm:w-48" />
                <div className="relative flex items-center gap-3 sm:gap-4">
                    <SummaryTile />
                    <div className="min-w-0">
                        <h3 id={headingId} className={`text-lg font-bold leading-tight tracking-tight sm:text-xl ${NAVY}`}>
                            {t('title')}
                        </h3>
                        <div className="mt-1 flex flex-col items-start gap-y-1 text-[13px] text-[#5b6075] min-[400px]:flex-row min-[400px]:flex-wrap min-[400px]:items-center min-[400px]:gap-x-1.5 sm:gap-x-2 sm:text-sm dark:text-text-secondary">
                            {dateLabel && (
                                <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                                    <CalendarDays className="h-4 w-4" aria-hidden="true" />
                                    <time dateTime={digestDate ?? undefined}>{dateLabel}</time>
                                </span>
                            )}
                            {dateLabel && count !== null && (
                                <span aria-hidden="true" className="hidden h-1 w-1 rounded-full bg-current opacity-70 min-[400px]:block" />
                            )}
                            {count !== null && (
                                <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                                    <MessageSquareText className="h-4 w-4" aria-hidden="true" />
                                    {t('messageCount', { count })}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            <div className="px-3 pb-3 pt-4 sm:px-4 sm:pb-4">
                {(hasRows || hasLists) && (
                    <div className="space-y-4 rounded-2xl bg-[#f7f6fe] p-3 sm:p-4 dark:bg-violet-500/[0.07]">
                        {topicList.length > 0 && overviewText && (
                            <p className={`text-sm leading-relaxed whitespace-pre-line ${BODY}`}>{overviewText}</p>
                        )}

                        {topicList.length === 0 && overviewText && (
                            <div className="flex items-start gap-3">
                                <PersonAvatar />
                                <p className={`min-w-0 pt-1 text-[15px] leading-relaxed whitespace-pre-line ${BODY}`}>
                                    {overviewText}
                                </p>
                            </div>
                        )}

                        {topicList.length > 0 && (
                            <div>
                                <h4 className="sr-only">{t('topics')}</h4>
                                <ol className="space-y-4">
                                    {topicList.map((topic, i) => {
                                        const pending = pendingTopicIndex === i;
                                        const lead = topic.participants[0];
                                        return (
                                            <li key={`topic-${i}`} className="flex items-start gap-3">
                                                <PersonAvatar src={lead ? avatarFor?.(lead.userId) : undefined} />
                                                <div className="min-w-0 flex-1 space-y-1.5">
                                                    {topic.title && (
                                                        <p className={`pt-0.5 text-[15px] font-bold leading-snug ${NAVY}`}>
                                                            {topic.title}
                                                        </p>
                                                    )}
                                                    {topic.summary && (
                                                        <p className={`text-[15px] leading-relaxed whitespace-pre-line ${BODY}`}>
                                                            {topic.summary}
                                                        </p>
                                                    )}
                                                    {(topic.participants.length > 0 ||
                                                        (onViewMessages && topic.messageIds.length > 0)) && (
                                                        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 pt-0.5">
                                                            {topic.participants.length > 0 && (
                                                                <ul
                                                                    aria-label={t('participants')}
                                                                    className="flex min-w-0 flex-wrap items-center gap-x-1 gap-y-0.5 text-xs text-[#6b6f85] dark:text-text-tertiary"
                                                                >
                                                                    {topic.participants.map((p, j) => (
                                                                        <li
                                                                            key={`${p.userId || 'p'}-${j}`}
                                                                            className="inline-flex min-w-0 items-center"
                                                                        >
                                                                            <span className="truncate">
                                                                                {p.name}
                                                                                {j < topic.participants.length - 1 ? ',' : ''}
                                                                            </span>
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            )}
                                                            {onViewMessages && topic.messageIds.length > 0 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => onViewMessages(topic.messageIds, i)}
                                                                    disabled={pending}
                                                                    aria-busy={pending || undefined}
                                                                    aria-label={
                                                                        topic.title
                                                                            ? t('viewMessagesAria', { topic: topic.title })
                                                                            : t('viewMessages')
                                                                    }
                                                                    className={`ml-auto inline-flex shrink-0 items-center gap-1 rounded-md text-xs font-semibold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60 disabled:opacity-70 ${PURPLE}`}
                                                                >
                                                                    {pending ? (
                                                                        <>
                                                                            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                                                                            {t('findingMessages')}
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            {t('viewMessages')}
                                                                            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                                                                        </>
                                                                    )}
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ol>
                            </div>
                        )}

                        {hasRows && hasLists && (
                            <hr className="border-0 border-t border-[#e4e1f5] dark:border-violet-400/15" />
                        )}

                        {points.length > 0 && (
                            <SummaryList icon={<Lightbulb className="h-5 w-5" aria-hidden="true" />} title={t('keyPoints')} items={points} />
                        )}
                        {decided.length > 0 && (
                            <SummaryList icon={<CheckCircle2 className="h-5 w-5" aria-hidden="true" />} title={t('decisions')} items={decided} />
                        )}
                        {actions.length > 0 && (
                            <SummaryList icon={<ListChecks className="h-5 w-5" aria-hidden="true" />} title={t('actionItems')} items={actions} />
                        )}
                    </div>
                )}

                {/* Transparency: this text is machine-generated (EU AI Act), and the
                    reader can switch it off. */}
                <p className="mt-3 px-1 text-[11px] text-[#8a8ea3] dark:text-text-tertiary">
                    <span data-testid="daily-summary-ai-label">{t('aiGenerated')}</span>
                    <span aria-hidden="true" className="mx-1.5">
                        ·
                    </span>
                    <Link
                        href={AI_SUMMARY_SETTINGS_HREF}
                        data-testid="daily-summary-settings-link"
                        className="rounded-sm underline-offset-2 hover:text-[#6440e3] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60 dark:hover:text-violet-300"
                    >
                        {t('manageInSettings')}
                    </Link>
                </p>
            </div>
        </section>
    );

    if (!timestamp) return <div className="w-full max-w-lg">{card}</div>;
    return (
        <div className="flex w-full max-w-xl items-end gap-2">
            <div className="min-w-0 flex-1">{card}</div>
            <p className="shrink-0 pb-1 text-[10px] text-text-tertiary sm:text-xs">{timestamp}</p>
        </div>
    );
}

function SummaryList({ icon, title, items }: { icon: React.ReactNode; title: string; items: string[] }) {
    return (
        <div className="rounded-xl bg-[#efedfd] px-3 py-3 dark:bg-violet-500/[0.12]">
            <h4 className={`mb-2 flex items-center gap-2 text-[15px] font-bold ${PURPLE}`}>
                {icon}
                {title}
            </h4>
            <ul className="space-y-1.5">
                {items.map((item, i) => (
                    <li key={`${title}-${i}`} className={`flex items-start gap-3 pl-1.5 text-[15px] leading-snug ${NAVY}`}>
                        <span aria-hidden="true" className="mt-[0.45em] h-2 w-2 shrink-0 rounded-full bg-[#6440e3] dark:bg-violet-300" />
                        <span className="min-w-0">{item}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

/** Circular lavender avatar: the real picture when known, else a person silhouette. */
function PersonAvatar({ src }: { src?: string }) {
    return (
        <Avatar className="h-10 w-10 shrink-0 bg-[#e7e3fd] dark:bg-violet-500/20">
            {src && <AvatarImage src={src} alt="" />}
            <AvatarFallback className="bg-[#e7e3fd] dark:bg-violet-500/20">
                <svg viewBox="0 0 24 24" className="h-6 w-6 text-[#6d5ae6] dark:text-violet-300" aria-hidden="true">
                    <circle cx="12" cy="8.2" r="3.6" fill="currentColor" />
                    <path d="M4.8 19.2c0-3.4 3.2-5.6 7.2-5.6s7.2 2.2 7.2 5.6c0 .6-.5 1-1 1H5.8c-.6 0-1-.4-1-1z" fill="currentColor" />
                </svg>
            </AvatarFallback>
        </Avatar>
    );
}

/** Blue→purple rounded tile with a white document-with-sparkle glyph. */
function SummaryTile() {
    return (
        <div
            aria-hidden="true"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#4e6ef2] via-[#6a55ee] to-[#8b3fe8] shadow-[0_6px_14px_-6px_rgba(98,70,230,0.7)] sm:h-14 sm:w-14"
        >
            <svg viewBox="0 0 32 32" className="h-7 w-7 sm:h-8 sm:w-8">
                <path d="M9 4h10.5L25 9.5V26a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" fill="#fff" />
                <path d="M19.5 4v4a1.5 1.5 0 0 0 1.5 1.5h4" fill="#e3dcff" />
                <path d="M11 13h9M11 17h9M11 21h5" stroke="#6a55ee" strokeWidth="1.8" strokeLinecap="round" />
                <path
                    d="M23.5 19.5c.35 1.9 1.1 2.65 3 3-1.9.35-2.65 1.1-3 3-.35-1.9-1.1-2.65-3-3 1.9-.35 2.65-1.1 3-3z"
                    fill="#fff"
                    stroke="#6a55ee"
                    strokeWidth="1.1"
                    strokeLinejoin="round"
                />
            </svg>
        </div>
    );
}

/** Decorative header art: soft waves with a half-risen sun and its rays. */
function SunIllustration({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 200 110" preserveAspectRatio="xMaxYMid slice" className={className} aria-hidden="true" focusable="false">
            <path d="M40 110C70 60 130 30 200 22V110Z" className="fill-[#ddd5fc] dark:fill-violet-400/15" opacity="0.55" />
            <g className="text-[#7b5cf0] dark:text-violet-300" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round">
                <path d="M138 44l-7-4" />
                <path d="M146 33l-3-7" />
                <path d="M158 28l1-8" />
                <path d="M170 31l5-6" />
                <path d="M178 42l7-3" />
                <path d="M127 58h-8" />
                <path d="M131 70l-6 4" />
            </g>
            <path d="M136 66a19 19 0 0 1 38 0Z" className="fill-[#7b5cf0] dark:fill-violet-400" />
            <path d="M100 110C130 76 165 66 200 64V110Z" className="fill-[#cfc4fb] dark:fill-violet-400/20" opacity="0.8" />
            <path d="M150 110c14-18 32-26 50-28v28Z" className="fill-[#e6e0fd] dark:fill-violet-300/10" />
        </svg>
    );
}

export default DailySummaryCard;
