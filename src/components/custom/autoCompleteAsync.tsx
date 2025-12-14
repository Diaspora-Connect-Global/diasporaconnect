/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';

interface Option<T = any> {
  id: string;
  label: string;
  data?: T; // Store any additional data
}

interface AutocompleteAsyncProps<T = any> {
  value: Option<T>[];
  onChange: (value: Option<T>[]) => void;
  fetchOptions: (query: string) => Promise<Option<T>[]>;
  onCreate?: (label: string) => Promise<Option<T>>;
  placeholder?: string;
  label?: string;
  debounceDelay?: number;
  className?: string;
  disabled?: boolean;
  maxSelections?: number;
  allowDuplicates?: boolean;
  renderOption?: (option: Option<T>, isSelected: boolean, isHighlighted: boolean) => React.ReactNode;
  renderPill?: (option: Option<T>, onRemove: () => void) => React.ReactNode;
}

export function AutocompleteAsync<T = any>({
  value = [],
  onChange,
  fetchOptions,
  onCreate,
  placeholder = 'Search or add new...',
  label,
  debounceDelay = 300,
  className,
  disabled = false,
  maxSelections,
  allowDuplicates = false,
  renderOption,
  renderPill,
}: AutocompleteAsyncProps<T>) {
  const [inputValue, setInputValue] = useState('');
  const [options, setOptions] = useState<Option<T>[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  /* ------------------------------------------------------------------ */
  /*  Debounced search                                                  */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    if (!inputValue.trim()) {
      setOptions([]);
      setIsLoading(false);
      setIsOpen(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const results = await fetchOptions(inputValue);
        setOptions(results);
        setIsOpen(true);
      } catch (e) {
        console.error(e);
        setOptions([]);
      } finally {
        setIsLoading(false);
      }
    }, debounceDelay);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [inputValue, fetchOptions, debounceDelay]);

  /* ------------------------------------------------------------------ */
  /*  Keyboard navigation                                               */
  /* ------------------------------------------------------------------ */
  const totalItems = options.length + (inputValue && onCreate && options.length === 0 ? 1 : 0);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((i) => (i < totalItems - 1 ? i + 1 : i));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((i) => (i > 0 ? i - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0) {
          if (highlightedIndex < options.length) {
            selectOption(options[highlightedIndex]);
          } else if (onCreate && inputValue) {
            createAndSelect(inputValue);
          }
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
      case 'Backspace':
        if (!inputValue && value.length) {
          removeOption(value[value.length - 1].id);
        }
        break;
    }
  };

  /* ------------------------------------------------------------------ */
  /*  Selection helpers                                                 */
  /* ------------------------------------------------------------------ */
  const isAlreadySelected = (opt: Option<T>) => {
    if (allowDuplicates) return false;
    return value.some(v => v.id === opt.id);
  };

  const canAddMore = () => {
    if (!maxSelections) return true;
    return value.length < maxSelections;
  };

  const selectOption = (opt: Option<T>) => {
    if (isAlreadySelected(opt)) {
      resetInput();
      return;
    }

    if (!canAddMore()) {
      resetInput();
      return;
    }

    onChange([...value, opt]);
    resetInput();
  };

  const createAndSelect = async (label: string) => {
    if (!onCreate) return;
    if (!canAddMore()) {
      resetInput();
      return;
    }

    try {
      const newOpt = await onCreate(label);
      if (!isAlreadySelected(newOpt)) {
        onChange([...value, newOpt]);
      }
    } catch (error) {
      console.error('Error creating option:', error);
    } finally {
      resetInput();
    }
  };

  const resetInput = () => {
    setInputValue('');
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  const removeOption = (id: string) => {
    onChange(value.filter((v) => v.id !== id));
    inputRef.current?.focus();
  };

  const clearAll = () => {
    onChange([]);
    inputRef.current?.focus();
  };

  const showCreate = onCreate && inputValue.trim() && options.length === 0 && canAddMore();
  const maxReached = maxSelections && value.length >= maxSelections;

  /* ------------------------------------------------------------------ */
  /*  Default render functions                                          */
  /* ------------------------------------------------------------------ */
  const defaultRenderOption = (opt: Option<T>, selected: boolean, highlighted: boolean) => (
    <li
      key={opt.id}
      onClick={() => selectOption(opt)}
      className={cn(
        'px-3 py-2 cursor-pointer flex items-center justify-between text-sm',
        highlighted && 'bg-surface-subtle',
        selected && 'text-surface-brand font-medium',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <span>{opt.label}</span>
      {selected && <div className="w-2 h-2 bg-surface-brand rounded-full" />}
    </li>
  );

  const defaultRenderPill = (opt: Option<T>, onRemove: () => void) => (
    <span
      key={opt.id}
      className="inline-flex items-center gap-1 px-3 py-1 border border-border-subtle text-text-brand rounded-full text-sm font-medium"
    >
      {opt.label}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        disabled={disabled}
        className="ml-1 rounded-full cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <X size={12} />
      </button>
    </span>
  );

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <label className="block text-sm font-medium text-text-primary">
          {label}
          {maxSelections && (
            <span className="ml-2 text-xs text-text-secondary">
              ({value.length}/{maxSelections})
            </span>
          )}
        </label>
      )}

      <Popover open={isOpen && !disabled} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <div
            className={cn(
              'min-h-12 px-3 py-2 bg-surface-subtle border-2 rounded-md',
              'flex flex-wrap items-center gap-2 cursor-text transition-all',
              'border-border-subtle',
              disabled && 'opacity-50 cursor-not-allowed',
              maxReached && 'bg-surface-subtle/50'
            )}
            onClick={() => !disabled && inputRef.current?.focus()}
          >
            {/* Pills */}
            {value.map((opt) =>
              renderPill
                ? renderPill(opt, () => removeOption(opt.id))
                : defaultRenderPill(opt, () => removeOption(opt.id))
            )}

            {/* Input */}
            {!maxReached && (
              <div className="flex-1 min-w-32 relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onFocus={() => inputValue && setIsOpen(true)}
                  onKeyDown={handleKeyDown}
                  placeholder={value.length === 0 ? placeholder : ''}
                  disabled={disabled}
                  className="w-full h-8 bg-transparent outline-none text-text-primary placeholder:text-text-secondary disabled:cursor-not-allowed"
                />
                {isLoading && (
                  <Loader2
                    size={16}
                    className="absolute right-0 top-1/2 -translate-y-1/2 text-surface-brand animate-spin"
                  />
                )}
              </div>
            )}

            {/* Clear all */}
            {value.length > 0 && !disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  clearAll();
                }}
                className="text-xs text-surface-brand hover:text-surface-brand/70 underline cursor-pointer"
              >
                Clear all
              </button>
            )}
          </div>
        </PopoverTrigger>

        {/* Dropdown */}
        <PopoverContent
          className="p-0 w-full"
          sideOffset={4}
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {isLoading ? (
            <div className="p-3 text-center text-sm text-text-secondary">
              <Loader2 size={16} className="inline mr-2 animate-spin" />
              Searching...
            </div>
          ) : options.length === 0 && !showCreate ? (
            <div className="p-3 text-center text-sm text-text-secondary">
              No results found, type to search
            </div>
          ) : (
            <ul>
              {options.map((opt, idx) => {
                const selected = isAlreadySelected(opt);
                const highlighted = idx === highlightedIndex;
                return renderOption
                  ? renderOption(opt, selected, highlighted)
                  : defaultRenderOption(opt, selected, highlighted);
              })}

              {showCreate && (
                <li
                  onClick={() => createAndSelect(inputValue)}
                  className={cn(
                    'px-3 py-2 cursor-pointer text-sm border-t border-border-subtle bg-surface-subtle',
                    highlightedIndex === options.length && 'bg-surface-hover'
                  )}
                >
                  <span className="text-surface-brand font-medium">
                    + Create {inputValue}
                  </span>
                </li>
              )}
            </ul>
          )}
        </PopoverContent>
      </Popover>

      {maxReached && (
        <p className="text-xs text-text-secondary">
          Maximum selections reached
        </p>
      )}
    </div>
  );
}