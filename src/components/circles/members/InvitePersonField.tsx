'use client';

import { useId, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

import type { InvitePerson, InviteSearchState } from './inviteSearch';

export interface InvitePersonFieldProps {
  id: string;
  value: string;
  /** A person has been picked: the text is their name and no search runs. */
  chosen: boolean;
  /** Search is relevant for this text (not empty, not an email or phone). */
  searchable: boolean;
  state: InviteSearchState;
  people: InvitePerson[];
  describedBy?: string;
  invalid?: boolean;
  onChange: (text: string) => void;
  onPick: (person: InvitePerson) => void;
}

function initials(name: string): string {
  const parts = name.replace(/^@/, '').split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : '')).toUpperCase();
}

/**
 * The invite field as an ARIA 1.2 editable combobox with a list autocomplete:
 * focus stays in the input, the arrow keys move a virtual cursor
 * (`aria-activedescendant`), Enter picks, Escape closes. Results, "no one
 * found" and "search failed" are announced through one polite live region so a
 * screen-reader user hears the outcome of typing without leaving the field.
 */
export function InvitePersonField({
  id,
  value,
  chosen,
  searchable,
  state,
  people,
  describedBy,
  invalid,
  onChange,
  onPick,
}: InvitePersonFieldProps) {
  const t = useTranslations('circles.members.invite');
  const listId = useId();
  const statusId = `${id}-status`;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const showList = open && !chosen && searchable && state === 'ready' && people.length > 0;
  const optionId = (index: number) => `${listId}-opt-${index}`;

  function pick(person: InvitePerson) {
    setOpen(false);
    setActive(-1);
    onPick(person);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' && people.length > 0 && searchable && !chosen) {
      event.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % people.length);
    } else if (event.key === 'ArrowUp' && showList) {
      event.preventDefault();
      setActive((i) => (i <= 0 ? people.length - 1 : i - 1));
    } else if (event.key === 'Enter' && showList && active >= 0) {
      // Picking must not also submit the form.
      event.preventDefault();
      pick(people[active]);
    } else if (event.key === 'Escape' && showList) {
      event.preventDefault();
      setOpen(false);
      setActive(-1);
    }
  }

  let statusText = '';
  if (!chosen && searchable) {
    if (state === 'loading') statusText = t('searching');
    else if (state === 'error') statusText = t('searchFailed');
    else if (state === 'ready')
      statusText = people.length === 0 ? t('noMatches') : t('resultsFound', { count: people.length });
  }

  return (
    <div className="relative min-w-0 flex-1">
      <input
        id={id}
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={showList ? listId : undefined}
        aria-activedescendant={showList && active >= 0 ? optionId(active) : undefined}
        aria-describedby={[statusId, describedBy].filter(Boolean).join(' ')}
        aria-invalid={invalid || undefined}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        enterKeyHint="send"
        value={value}
        onChange={(event) => {
          setOpen(true);
          setActive(-1);
          onChange(event.target.value);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setOpen(false);
          setActive(-1);
        }}
        onKeyDown={onKeyDown}
        // 16px on phones: iOS Safari zooms the page into smaller fields.
        className="w-full min-w-0 rounded-full border border-border-subtle bg-surface-subtle px-4 py-2 text-base text-text-primary outline-none focus-visible:border-text-brand focus-visible:ring-2 focus-visible:ring-text-brand/40 md:text-sm"
      />

      {showList && (
        <ul
          id={listId}
          role="listbox"
          aria-label={t('resultsLabel')}
          className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-xl border border-border-subtle bg-surface-default p-1 shadow-md"
        >
          {people.map((person, index) => (
            <li
              key={person.userId}
              id={optionId(index)}
              role="option"
              aria-selected={index === active}
              // mousedown, not click: click fires after blur has closed the list.
              onMouseDown={(event) => {
                event.preventDefault();
                pick(person);
              }}
              onMouseEnter={() => setActive(index)}
              className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 ${
                index === active ? 'bg-surface-subtle' : ''
              }`}
            >
              <Avatar className="size-8">
                <AvatarImage src={person.avatarUrl ?? undefined} alt="" />
                <AvatarFallback className="caption-small">{initials(person.name)}</AvatarFallback>
              </Avatar>
              <span className="min-w-0 flex-1">
                <span className="label-small block truncate text-text-primary">{person.name}</span>
                {person.username && (
                  <span className="caption-small block truncate text-text-secondary">
                    @{person.username}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      <p
        id={statusId}
        role="status"
        aria-live="polite"
        className={
          state === 'error' && searchable && !chosen
            ? 'caption-small mt-1 px-2 text-text-danger'
            : 'caption-small mt-1 flex items-center gap-1 px-2 text-text-secondary'
        }
      >
        {state === 'loading' && searchable && !chosen && (
          <Loader2 className="size-3 animate-spin" aria-hidden="true" />
        )}
        {statusText}
      </p>
    </div>
  );
}
