'use client';

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react';
import Image from 'next/image';
import { useLazyQuery } from '@apollo/client/react';
import { SEARCH_USERS } from '@/services/gql/connection';
import type { SearchUsersResponse } from '@/services/gql/types/connection';
import { Loader2 } from 'lucide-react';
import { renderRichText } from '@/components/custom/richTextRenderer';

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
    },
    ref,
  ) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const backdropRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    /* — mentioned users tracking — */
    const [mentionedUsers, setMentionedUsers] = useState<MentionedUser[]>([]);

    /* — mention state — */
    const [mentionQuery, setMentionQuery] = useState<string | null>(null);
    const [mentionStartIdx, setMentionStartIdx] = useState<number>(-1);
    const [mentionResults, setMentionResults] = useState<MentionUser[]>([]);
    const [selectedMentionIdx, setSelectedMentionIdx] = useState(0);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });

    /* — search query — */
    const [searchUsers, { loading: searchLoading }] =
      useLazyQuery<SearchUsersResponse>(SEARCH_USERS, {
        fetchPolicy: 'network-only',
      });

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

    /* — auto-resize textarea — */
    useEffect(() => {
      const el = textareaRef.current;
      if (el) {
        el.style.height = 'auto';
        el.style.height = Math.max(el.scrollHeight, parseInt(minHeight)) + 'px';
      }
    }, [value, minHeight]);

    /* — detect @mention trigger — */
    const detectMention = useCallback(
      (text: string, cursorPos: number) => {
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
              data.searchUsers.profiles.map((p) => ({
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

    /* — compute dropdown position (below the @ character) — */
    useEffect(() => {
      if (mentionQuery === null || !textareaRef.current || !containerRef.current)
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
      const textBefore = value.slice(0, mentionStartIdx);
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
    }, [mentionQuery, mentionStartIdx, value]);

    /* — select a mention — */
    const selectMention = useCallback(
      (user: MentionUser) => {
        const displayName = `${user.firstName} ${user.lastName}`.trim();
        const tag = displayName.replace(/\s+/g, ''); // e.g. StephenBedzrah
        const before = value.slice(0, mentionStartIdx);
        const after = value.slice(
          mentionStartIdx + 1 + (mentionQuery?.length ?? 0),
        );
        const newValue = before + `@${tag} ` + after;
        onChange(newValue);

        // Track the mentioned user
        const newMention: MentionedUser = { userId: user.userId, name: tag, displayName };
        setMentionedUsers((prev) => {
          // Avoid duplicates
          if (prev.some((m) => m.userId === user.userId)) return prev;
          const updated = [...prev, newMention];
          onMentionsChange?.(updated);
          return updated;
        });

        setMentionQuery(null);
        setMentionStartIdx(-1);
        setMentionResults([]);

        requestAnimationFrame(() => {
          const el = textareaRef.current;
          if (el) {
            const pos = before.length + tag.length + 2; // @+tag+space
            el.focus();
            el.selectionStart = el.selectionEnd = pos;
          }
        });
      },
      [value, mentionStartIdx, mentionQuery, onChange, onMentionsChange],
    );

    /* — keyboard navigation in dropdown — */
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
    };

    /* — handle input change — */
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newVal = e.target.value;
      onChange(newVal);

      // Prune mentioned users whose @Name no longer exists in the text
      setMentionedUsers((prev) => {
        const pruned = prev.filter((m) => newVal.includes(`@${m.name}`));
        if (pruned.length !== prev.length) {
          onMentionsChange?.(pruned);
        }
        return pruned;
      });

      // Detect mention right after the change
      requestAnimationFrame(() => {
        const cursor = e.target.selectionStart;
        detectMention(newVal, cursor);
      });
    };

    /* — handle click (reposition mention detection) — */
    const handleClick = () => {
      const el = textareaRef.current;
      if (el) detectMention(value, el.selectionStart);
    };

    /* — close dropdown on outside click — */
    useEffect(() => {
      const handler = (e: MouseEvent) => {
        if (
          containerRef.current &&
          !containerRef.current.contains(e.target as Node)
        ) {
          setMentionQuery(null);
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
        {/* Highlight backdrop (renders styled text behind the textarea) */}
        <div
          ref={backdropRef}
          aria-hidden
          className={`absolute inset-0 pointer-events-none overflow-hidden whitespace-pre-wrap break-words ${className}`}
          style={{
            minHeight,
            lineHeight: 'inherit',
            font: 'inherit',
            padding: 'inherit',
            color: 'inherit',
          }}
        >
          {renderRichText(value)}
        </div>

        {/* Actual textarea (transparent text so backdrop shows through) */}
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
          className={`relative w-full bg-transparent border-none outline-none resize-none caret-text-primary ${className}`}
          style={{ minHeight, color: 'transparent', caretColor: 'var(--color-text-primary, #000)' }}
        />

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
