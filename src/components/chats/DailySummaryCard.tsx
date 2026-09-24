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
    MessageSquare,
    Sparkles,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import type { ChatSummaryTopic } from '@/services/gql/types/messaging';
import { displayName, stripIds } from '@/lib/displayName';
import { formatDigestDate } from '@/lib/dailySummary';

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
}

function initials(name: string): string {
    const words = name.replace(/^@/, '').trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return '?';
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

/**
 * The group chat's AI "Daily Summary": header (date + message count), a
 * one-line overview, one bulletin per topic with its participants and a link
 * back to the source messages, then key points / decisions / action items.
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

    return (
        <section
            aria-labelledby={headingId}
            data-testid="daily-summary-card"
            className="w-full max-w-lg rounded-2xl border border-border-subtle bg-surface-default p-4 shadow-sm space-y-4 text-left"
        >
            <header className="flex items-center gap-3">
                <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 via-purple-600 to-fuchsia-600 shadow-sm"
                    aria-hidden="true"
                >
                    <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0">
                    <h3 id={headingId} className="text-base font-semibold text-text-primary">
                        {t('title')}
                    </h3>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-secondary">
                        {dateLabel && (
                            <span className="inline-flex items-center gap-1">
                                <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                                <time dateTime={digestDate ?? undefined}>{dateLabel}</time>
                            </span>
                        )}
                        {count !== null && (
                            <span className="inline-flex items-center gap-1">
                                <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
                                {t('messageCount', { count })}
                            </span>
                        )}
                    </div>
                    {/* Transparency: this text is machine-generated (EU AI Act). */}
                    <p
                        data-testid="daily-summary-ai-label"
                        className="mt-1 inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2 py-0.5 text-[11px] font-medium text-violet-700 dark:text-violet-300"
                    >
                        <Sparkles className="h-3 w-3" aria-hidden="true" />
                        {t('aiGenerated')}
                    </p>
                </div>
            </header>

            {overviewText && (
                <p className="text-sm leading-relaxed whitespace-pre-line text-text-primary">{overviewText}</p>
            )}

            {topicList.length > 0 && (
                <div>
                    <h4 className="sr-only">{t('topics')}</h4>
                    <ol className="space-y-3">
                        {topicList.map((topic, i) => {
                            const pending = pendingTopicIndex === i;
                            return (
                                <li
                                    key={`topic-${i}`}
                                    className="rounded-xl border border-border-subtle bg-surface-subtle/60 p-3 space-y-2"
                                >
                                    {topic.title && (
                                        <p className="text-sm font-semibold text-text-primary">{topic.title}</p>
                                    )}
                                    {topic.summary && (
                                        <p className="text-sm leading-relaxed text-text-secondary whitespace-pre-line">
                                            {topic.summary}
                                        </p>
                                    )}
                                    {topic.participants.length > 0 && (
                                        <ul
                                            aria-label={t('participants')}
                                            className="flex flex-wrap items-center gap-x-3 gap-y-1.5"
                                        >
                                            {topic.participants.map((p, j) => (
                                                <li
                                                    key={`${p.userId || 'p'}-${j}`}
                                                    className="inline-flex min-w-0 items-center gap-1.5"
                                                >
                                                    <Avatar className="h-5 w-5">
                                                        <AvatarImage src={avatarFor?.(p.userId) || undefined} alt="" />
                                                        <AvatarFallback className="text-[9px]">{initials(p.name)}</AvatarFallback>
                                                    </Avatar>
                                                    <span className="truncate text-xs text-text-primary">{p.name}</span>
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
                                            className="inline-flex items-center gap-1 rounded-md text-xs font-semibold text-text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:opacity-70"
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
                                </li>
                            );
                        })}
                    </ol>
                </div>
            )}

            {points.length > 0 && (
                <SummaryList icon={<Lightbulb className="h-4 w-4 text-amber-500" aria-hidden="true" />} title={t('keyPoints')} items={points} />
            )}
            {decided.length > 0 && (
                <SummaryList icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />} title={t('decisions')} items={decided} />
            )}
            {actions.length > 0 && (
                <SummaryList icon={<ListChecks className="h-4 w-4 text-primary" aria-hidden="true" />} title={t('actionItems')} items={actions} />
            )}
        </section>
    );
}

function SummaryList({ icon, title, items }: { icon: React.ReactNode; title: string; items: string[] }) {
    return (
        <div>
            <h4 className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-text-secondary">
                {icon}
                {title}
            </h4>
            <ul className="list-disc space-y-0.5 pl-5 text-sm text-text-primary">
                {items.map((item, i) => (
                    <li key={`${title}-${i}`}>{item}</li>
                ))}
            </ul>
        </div>
    );
}

export default DailySummaryCard;
