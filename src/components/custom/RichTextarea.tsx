'use client';

import React, {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useCallback,
  useMemo,
  useId,
  forwardRef,
  useImperativeHandle,
} from 'react';
import Image from 'next/image';
import { useLazyQuery } from '@apollo/client/react';
import { useTranslations } from 'next-intl';
import { SEARCH_USERS } from '@/services/gql/connection';
import { GET_TRENDING_HASHTAGS } from '@/services/gql/postsFeed';
import type { SearchUsersResponse } from '@/services/gql/types/connection';
import { Hash, Loader2 } from 'lucide-react';
import { renderRichText } from '@/components/custom/richTextRenderer';
import { filterHashtagSuggestions, findHashtagTrigger, normaliseHashtagPool } from '@/lib/hashtagSuggestions';

/** Pool the #hashtag suggestions are filtered from: last 30 days' trending tags, fetched once. */
const HASHTAG_POOL_INPUT = { input: { limit: 50, timeRange: '30d' } } as const;
const HASHTAG_SUGGESTION_LIMIT = 6;

interface TrendingHashtagsData {
  trendingHashtags?: Array<{ id: string; tag: string; usageCount?: number | null }> | null;
}

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface MentionUser {
  userId: string;
  firstName: string;
  lastName: string;
  headline?: string;
  avatarUrl?: string;
}

export interface MentionedUser {
  userId: string;
  name: string;        // tag without spaces, e.g. "StephenBedzrah"
  displayName: string; // human-readable, e.g. "Stephen Bedzrah"
}

export interface RichTextareaHandle {
  focus: () => void;
  insertAtCursor: (text: string) => void;
  getMentionedUsers: () => MentionedUser[];
}

interface RichTextareaProps {
  value: string;
  onChange: (value: string) => void;
  onMentionsChange?: (mentions: MentionedUser[]) => void;
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
  className?: string;
  minHeight?: string;
  /** Typing `#` suggests trending hashtags. Off unless a composer opts in. */
  hashtagSuggestions?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
const RichTextarea = forwardRef<RichTextareaHandle, RichTextareaProps>(
  (
    {
      value,
      onChange,
      onMentionsChange,
      placeholder = "What's on your mind?",
      maxLength,
      disabled = false,
      className = '',
      minHeight = '200px',
      hashtagSuggestions = false,
    },
    ref,
  ) => {
    const tComposer = useTranslations('composer');
    const hashtagListId = useId();
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const backdropRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const pendingSelectionRef = useRef<{ start: number; end: number } | null>(null);

    /* — mentioned users tracking — */
    const [mentionedUsers, setMentionedUsers] = useState<MentionedUser[]>([]);
    const skipDetectionRef = useRef(false);

    /* — mention state — */
    const [mentionQuery, setMentionQuery] = useState<string | null>(null);
    const [mentionStartIdx, setMentionStartIdx] = useState<number>(-1);
    const [mentionResults, setMentionResults] = useState<MentionUser[]>([]);
    const [selectedMentionIdx, setSelectedMentionIdx] = useState(0);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });

    /* — hashtag state — */
    const [hashtagQuery, setHashtagQuery] = useState<string | null>(null);
    const [hashtagStartIdx, setHashtagStartIdx] = useState<number>(-1);
    const [selectedHashtagIdx, setSelectedHashtagIdx] = useState(0);

    /* — search query — */
    const [searchUsers, { loading: searchLoading }] =
      useLazyQuery<SearchUsersResponse>(SEARCH_USERS, {
        fetchPolicy: 'network-only',
      });

    // One request per composer (and Apollo's cache across composers), never per keystroke.
    const [loadTrendingHashtags, { data: trendingData, called: trendingCalled }] =
      useLazyQuery<TrendingHashtagsData>(GET_TRENDING_HASHTAGS, { fetchPolicy: 'cache-first' });
    const hashtagPool = useMemo(
      () => normaliseHashtagPool((trendingData?.trendingHashtags ?? []).map((h) => h.tag)),
      [trendingData],
    );
    const hashtagResults = useMemo(
      () => (hashtagQuery === null ? [] : filterHashtagSuggestions(hashtagPool, hashtagQuery, HASHTAG_SUGGESTION_LIMIT)),
      [hashtagPool, hashtagQuery],
    );
    const showHashtags = hashtagSuggestions && hashtagQuery !== null && hashtagResults.length > 0;

    const detectHashtag = useCallback(
      (text: string, cursorPos: number) => {
        if (!hashtagSuggestions) return;
        const trigger = findHashtagTrigger(text, cursorPos);
        if (!trigger) {
          setHashtagQuery(null);
          setHashtagStartIdx(-1);
          return;
        }
        if (!trendingCalled) {
          // No suggestions is a fine outcome: the user just types the tag.
          loadTrendingHashtags({ variables: HASHTAG_POOL_INPUT, context: { silentErrors: true } }).catch(() => {});
        }
        setHashtagStartIdx(trigger.start);
        setHashtagQuery(trigger.query);
        setSelectedHashtagIdx(0);
      },
      [hashtagSuggestions, trendingCalled, loadTrendingHashtags],
    );

    /* — expose methods to parent — */
    useImperativeHandle(ref, () => ({
      focus: () => textareaRef.current?.focus(),
      getMentionedUsers: () => mentionedUsers,
      insertAtCursor: (text: string) => {
        const el = textareaRef.current;
        if (!el) {
          onChange(value + text);
          return;
        }
        const start = el.selectionStart;
        const end = el.selectionEnd;
        const newVal = value.slice(0, start) + text + value.slice(end);
        onChange(newVal);
        requestAnimationFrame(() => {
          el.focus();
          el.selectionStart = el.selectionEnd = start + text.length;
        });
      },
    }));

    /* — sync scroll between textarea and backdrop — */
    const syncScroll = useCallback(() => {
      if (textareaRef.current && backdropRef.current) {
        backdropRef.current.scrollTop = textareaRef.current.scrollTop;
        backdropRef.current.scrollLeft = textareaRef.current.scrollLeft;
      }
    }, []);

    /* — resize then restore cursor in one layout effect (order matters: resize can move caret, so restore after) — */
    useLayoutEffect(() => {
      const el = textareaRef.current;
      if (el) {
        el.style.height = 'auto';
        el.style.height = Math.max(el.scrollHeight, parseInt(minHeight)) + 'px';
      }
      const pending = pendingSelectionRef.current;
      if (pending === null) return;
      pendingSelectionRef.current = null;
      if (!el || document.activeElement !== el) return;
      const start = Math.min(pending.start, value.length);
      const end = Math.min(pending.end, value.length);
      el.selectionStart = start;
      el.selectionEnd = end;
    }, [value, minHeight]);

    /* — detect @mention trigger — */
    const detectMention = useCallback(
      (text: string, cursorPos: number) => {
        // Don't detect mentions if we're typing after a completed mention
        if (cursorPos > 0) {
          const beforeCursor = text.slice(0, cursorPos);
          // Check if we just typed after a completed mention (ends with @Name )
          const completedMentionMatch = beforeCursor.match(/@[\w\s-]+\s+\w*$/);
          if (completedMentionMatch) {
            setMentionQuery(null);
            setMentionStartIdx(-1);
            return;
          }
        }

        // Walk backwards from cursor to find the @ that triggered this
        let i = cursorPos - 1;
        while (i >= 0) {
          const ch = text[i];
          if (ch === '@') {
            // Found it — but only if it's at the start or preceded by whitespace/newline
            if (i === 0 || /\s/.test(text[i - 1])) {
              const query = text.slice(i + 1, cursorPos);
              // No spaces in the query (LinkedIn-style: each mention is a single selection)
              if (!/\s/.test(query)) {
                setMentionStartIdx(i);
                setMentionQuery(query);
                setSelectedMentionIdx(0);
                return;
              }
            }
            break;
          }
          if (/\s/.test(ch)) break;
          i--;
        }
        // No active mention
        setMentionQuery(null);
        setMentionStartIdx(-1);
      },
      [],
    );

    /* — search when mentionQuery changes — */
    useEffect(() => {
      if (mentionQuery === null) {
        setMentionResults([]);
        return;
      }

      // Fire search even for empty query (shows recent/suggested users)
      const timeout = setTimeout(async () => {
        try {
          const { data } = await searchUsers({
            variables: {
              searchUsersInput: {
                query: mentionQuery || '',
                limit: 6,
                offset: 0,
              },
            },
          });

          if (data?.searchUsers?.profiles) {
            setMentionResults(
              data.searchUsers.profiles
                .filter((p) => p.connectionStatus === 'connected')
                .map((p) => ({
                  userId: p.userId,
                  firstName: p.firstName,
                  lastName: p.lastName,
                  headline: p.headline,
                  avatarUrl: p.avatarUrl,
                })),
            );
          }
        } catch {
          setMentionResults([]);
        }
      }, 250); // debounce

      return () => clearTimeout(timeout);
    }, [mentionQuery, searchUsers]);

    /* — compute dropdown position (below the @ or # character) — */
    const triggerIdx = mentionQuery !== null ? mentionStartIdx : showHashtags ? hashtagStartIdx : -1;
    useEffect(() => {
      if (triggerIdx < 0 || !textareaRef.current || !containerRef.current)
        return;

      const ta = textareaRef.current;
      const container = containerRef.current;

      // Use a hidden div that mirrors the textarea to find the @ position
      const mirror = document.createElement('div');
      const computedStyle = window.getComputedStyle(ta);

      // Copy all relevant styles
      mirror.style.position = 'fixed';
      mirror.style.top = '0';
      mirror.style.left = '0';
      mirror.style.visibility = 'hidden';
      mirror.style.pointerEvents = 'none';
      mirror.style.width = computedStyle.width;
      mirror.style.fontFamily = computedStyle.fontFamily;
      mirror.style.fontSize = computedStyle.fontSize;
      mirror.style.fontWeight = computedStyle.fontWeight;
      mirror.style.lineHeight = computedStyle.lineHeight;
      mirror.style.letterSpacing = computedStyle.letterSpacing;
      mirror.style.padding = computedStyle.padding;
      mirror.style.border = computedStyle.border;
      mirror.style.boxSizing = computedStyle.boxSizing;
      mirror.style.whiteSpace = 'pre-wrap';
      mirror.style.wordWrap = 'break-word';
      mirror.style.overflowWrap = 'break-word';

      // Insert text before the @, then a marker span
      const textBefore = value.slice(0, triggerIdx);
      const textNode = document.createTextNode(textBefore);
      mirror.appendChild(textNode);

      const marker = document.createElement('span');
      marker.textContent = '|';
      mirror.appendChild(marker);

      document.body.appendChild(mirror);

      const markerRect = marker.getBoundingClientRect();
      const mirrorRect = mirror.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      // Position relative to the container
      const relativeTop = markerRect.top - mirrorRect.top - ta.scrollTop;
      const relativeLeft = markerRect.left - mirrorRect.left;

      setDropdownPos({
        top: relativeTop + 28, // below the line
        left: Math.max(0, Math.min(relativeLeft, containerRect.width - 320)),
      });

      document.body.removeChild(mirror);
    }, [triggerIdx, value]);

    /* — select a mention — */
    const selectMention = useCallback(
      (user: MentionUser) => {
        const displayName = `${user.firstName} ${user.lastName}`.trim();
        const tag = displayName.replace(/\s+/g, ''); // e.g. StephenBedzrah
        const before = value.slice(0, mentionStartIdx);
        const after = value.slice(
          mentionStartIdx + 1 + (mentionQuery?.length ?? 0),
        );
        // Use a special marker to denote end of mention
        const newValue = before + `@${tag}` + String.fromCharCode(8203) + ' ' + after; // Zero-width space + space
        const cursorPos = before.length + tag.length + 2; // @+tag+zero-width+space
        
        // Track the mentioned user
        const newMention: MentionedUser = { userId: user.userId, name: tag, displayName };
        setMentionedUsers((prev) => {
          // Avoid duplicates
          if (prev.some((m) => m.userId === user.userId)) return prev;
          const updated = [...prev, newMention];
          onMentionsChange?.(updated);
          return updated;
        });

        // Clear mention state BEFORE onChange to prevent detectMention from running
        setMentionQuery(null);
        setMentionStartIdx(-1);
        setMentionResults([]);
        
        // Set flag to skip next detection
        skipDetectionRef.current = true;
        
        // Update value
        onChange(newValue);

        // Set cursor position after a short delay to ensure state updates complete
        setTimeout(() => {
          const el = textareaRef.current;
          if (el) {
            el.focus();
            el.setSelectionRange(cursorPos, cursorPos);
          }
        }, 0);
      },
      [value, mentionStartIdx, mentionQuery, onChange, onMentionsChange],
    );

    /* — select a hashtag: replaces the typed `#prefix` with `#tag ` — */
    const selectHashtag = useCallback(
      (tag: string) => {
        if (hashtagQuery === null || hashtagStartIdx < 0) return;
        const before = value.slice(0, hashtagStartIdx);
        const after = value.slice(hashtagStartIdx + 1 + hashtagQuery.length);
        const insert = `#${tag}` + (after.startsWith(' ') ? '' : ' ');
        const cursorPos = before.length + insert.length + (after.startsWith(' ') ? 1 : 0);
        setHashtagQuery(null);
        setHashtagStartIdx(-1);
        onChange(before + insert + after);
        setTimeout(() => {
          const el = textareaRef.current;
          if (el) {
            el.focus();
            el.setSelectionRange(cursorPos, cursorPos);
          }
        }, 0);
      },
      [value, hashtagStartIdx, hashtagQuery, onChange],
    );

    /* — keyboard navigation in dropdown — */
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (showHashtags) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedHashtagIdx((i) => (i < hashtagResults.length - 1 ? i + 1 : 0));
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedHashtagIdx((i) => (i > 0 ? i - 1 : hashtagResults.length - 1));
          return;
        }
        if (e.key === 'Enter' || e.key === 'Tab') {
          e.preventDefault();
          selectHashtag(hashtagResults[Math.min(selectedHashtagIdx, hashtagResults.length - 1)]);
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          // The composer dialog skips its own Esc while aria-expanded is true (see PostComposerModal).
          setHashtagQuery(null);
          return;
        }
      }

      if (mentionQuery !== null && mentionResults.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedMentionIdx((i) =>
            i < mentionResults.length - 1 ? i + 1 : 0,
          );
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedMentionIdx((i) =>
            i > 0 ? i - 1 : mentionResults.length - 1,
          );
          return;
        }
        if (e.key === 'Enter' || e.key === 'Tab') {
          e.preventDefault();
          selectMention(mentionResults[selectedMentionIdx]);
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          setMentionQuery(null);
          return;
        }
      }

      // Handle backspace to delete entire mentions
      if (e.key === 'Backspace') {
        const el = e.target as HTMLTextAreaElement;
        const cursorPos = el.selectionStart;
        const selectionEnd = el.selectionEnd;
        
        // Only handle if no text is selected (single cursor position)
        if (cursorPos === selectionEnd && cursorPos > 0) {
          // Look for mention pattern before cursor
          const beforeCursor = value.slice(0, cursorPos);
          const mentionMatch = beforeCursor.match(/@[\w\s-]+$/); // Match mention at end
          
          if (mentionMatch) {
            e.preventDefault();
            const mentionStart = cursorPos - mentionMatch[0].length;
            const newValue = value.slice(0, mentionStart) + value.slice(cursorPos);
            onChange(newValue);
            
            // Update cursor position
            requestAnimationFrame(() => {
              el.focus();
              el.selectionStart = el.selectionEnd = mentionStart;
            });
            return;
          }
        }
      }
    };

    /* — handle input change — */
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newVal = e.target.value;
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      pendingSelectionRef.current = { start, end };
      onChange(newVal);

      // Prune mentioned users whose @Name no longer exists in the text
      setMentionedUsers((prev) => {
        const pruned = prev.filter((m) => newVal.includes(`@${m.name}`));
        if (pruned.length !== prev.length) {
          onMentionsChange?.(pruned);
        }
        return pruned;
      });

      // Skip detection if we just selected a mention
      if (skipDetectionRef.current) {
        skipDetectionRef.current = false;
        return;
      }

      // Detect mention right after the change
      requestAnimationFrame(() => {
        const cursor = e.target.selectionStart;
        detectMention(newVal, cursor);
        detectHashtag(newVal, cursor);
      });
    };

    /* — handle click (reposition mention detection) — */
    const handleClick = () => {
      const el = textareaRef.current;
      if (el) {
        detectMention(value, el.selectionStart);
        detectHashtag(value, el.selectionStart);
      }
    };

    /* — close dropdown on outside click — */
    useEffect(() => {
      const handler = (e: MouseEvent) => {
        if (
          containerRef.current &&
          !containerRef.current.contains(e.target as Node)
        ) {
          setMentionQuery(null);
          setHashtagQuery(null);
        }
      };
      document.addEventListener('mousedown', handler);
      return () => document.removeEventListener('mousedown', handler);
    }, []);

    const showDropdown = mentionQuery !== null;

    /* ---------------------------------------------------------------- */
    /*  Render                                                          */
    /* ---------------------------------------------------------------- */
    return (
      <div ref={containerRef} className="relative">
        {/* Backdrop hidden so cursor aligns with visible textarea text (no overlay layout drift) */}
        <div
          ref={backdropRef}
          aria-hidden
          className={`absolute inset-0 pointer-events-none overflow-hidden whitespace-pre-wrap break-words invisible ${className}`}
          style={{
            minHeight,
            lineHeight: 'inherit',
            font: 'inherit',
            padding: 'inherit',
            color: 'inherit',
          }}
        >
          {renderRichText(value, undefined, true)}
        </div>

        {/* Visible textarea — caret and text match; no transparent overlay */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onClick={handleClick}
          onScroll={syncScroll}
          placeholder={placeholder}
          maxLength={maxLength}
          disabled={disabled}
          className={`relative w-full bg-transparent border-none outline-none resize-none text-text-primary caret-text-primary ${className}`}
          style={{ minHeight, caretColor: 'var(--color-text-primary, #000)' }}
          {...(hashtagSuggestions && {
            'aria-autocomplete': 'list' as const,
            'aria-expanded': showHashtags,
            'aria-controls': showHashtags ? hashtagListId : undefined,
            'aria-activedescendant': showHashtags ? `${hashtagListId}-${selectedHashtagIdx}` : undefined,
          })}
        />

        {/* Hashtag suggestions (trending tags matching what was typed after #) */}
        {showHashtags && (
          <div
            className="absolute z-50 w-64 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-border-subtle bg-surface-default shadow-2xl"
            style={{ top: dropdownPos.top, left: Math.max(0, dropdownPos.left) }}
            data-testid="hashtag-suggestions"
          >
            <p className="border-b border-border-subtle px-3 py-2 text-xs font-medium text-text-secondary">
              {tComposer('trendingHashtags')}
            </p>
            <ul id={hashtagListId} role="listbox" aria-label={tComposer('hashtagSuggestions')} className="max-h-60 overflow-y-auto py-1">
              {hashtagResults.map((tag, idx) => (
                <li
                  key={tag}
                  id={`${hashtagListId}-${idx}`}
                  role="option"
                  aria-selected={idx === selectedHashtagIdx}
                  onMouseDown={(e) => {
                    e.preventDefault(); // keep focus in the textarea
                    selectHashtag(tag);
                  }}
                  onMouseEnter={() => setSelectedHashtagIdx(idx)}
                  className={`flex min-h-10 cursor-pointer items-center gap-2 px-3 text-sm text-text-primary ${
                    idx === selectedHashtagIdx ? 'bg-surface-subtle' : 'hover:bg-surface-subtle/50'
                  }`}
                >
                  <Hash className="size-4 shrink-0 text-text-brand" aria-hidden />
                  <span className="truncate">{tag}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Mention dropdown */}
        {showDropdown && (
          <div
            className="absolute z-50 w-80 max-h-72 overflow-y-auto bg-surface-default border border-border-subtle rounded-xl shadow-2xl"
            style={{ top: dropdownPos.top, left: Math.max(0, dropdownPos.left) }}
          >
            {/* Header */}
            <div className="px-3 py-2 border-b border-border-subtle">
              <p className="text-xs text-text-secondary font-medium">
                {mentionQuery ? `Searching for "${mentionQuery}"` : 'Type a name to search'}
              </p>
            </div>

            {searchLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-text-secondary" />
              </div>
            ) : mentionResults.length > 0 ? (
              mentionResults.map((user, idx) => (
                <button
                  key={user.userId}
                  onMouseDown={(e) => {
                    e.preventDefault(); // prevent textarea blur
                    selectMention(user);
                  }}
                  onMouseEnter={() => setSelectedMentionIdx(idx)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors cursor-pointer ${
                    idx === selectedMentionIdx
                      ? 'bg-surface-subtle'
                      : 'hover:bg-surface-subtle/50'
                  }`}
                >
                  <Image
                    src={user.avatarUrl || '/PROFILE.png'}
                    alt={`${user.firstName} ${user.lastName}`}
                    width={36}
                    height={36}
                    className="w-9 h-9 rounded-full object-cover border border-border-subtle flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {user.firstName} {user.lastName}
                    </p>
                    {user.headline && (
                      <p className="text-xs text-text-secondary truncate">
                        {user.headline}
                      </p>
                    )}
                  </div>
                </button>
              ))
            ) : (
              <div className="px-3 py-4 text-center">
                <p className="text-sm text-text-secondary">
                  {mentionQuery ? 'No users found' : 'Start typing a name…'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  },
);

RichTextarea.displayName = 'RichTextarea';
export default RichTextarea;
